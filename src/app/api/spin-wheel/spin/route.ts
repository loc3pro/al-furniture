import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { weightedPickIndex } from "@/lib/spin-coupon-discount";
import { generateSpinCouponCode } from "@/lib/spin-code";
import { vietnamDayEndUtc, vietnamDayStartUtc } from "@/lib/vn-day";

/** Quay vòng — chỉ user đăng nhập; server quyết định kết quả theo trọng số & tồn kho */
export async function POST() {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Đăng nhập để quay." }, { status: 401 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const cfg = await tx.spinWheelConfig.findUnique({ where: { id: "default" } });
      const now = new Date();
      if (!cfg?.eventActive) {
        throw new Error("EVENT_OFF");
      }
      if (cfg.startsAt && now < cfg.startsAt) throw new Error("EVENT_OFF");
      if (cfg.endsAt && now > cfg.endsAt) throw new Error("EVENT_OFF");

      const dayStart = vietnamDayStartUtc(now);
      const dayEnd = vietnamDayEndUtc(now);
      const spinsToday = await tx.spinWheelSpinLog.count({
        where: {
          userId: session.sub,
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      });
      if (spinsToday >= cfg.maxSpinsPerUserDay) {
        throw new Error("LIMIT_DAY");
      }

      const allSegs = await tx.spinWheelSegment.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      });

      const eligible = allSegs.filter((s) => s.quantityWon < s.quantityCap && s.weight > 0);
      if (eligible.length === 0) {
        throw new Error("EMPTY_POOL");
      }

      const weights = eligible.map((s) => s.weight);
      const idx = weightedPickIndex(weights);
      if (idx < 0) throw new Error("PICK_FAIL");
      const segment = eligible[idx]!;

      const updated = await tx.spinWheelSegment.updateMany({
        where: {
          id: segment.id,
          quantityWon: { lt: segment.quantityCap },
        },
        data: { quantityWon: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw new Error("STOCK_RACE");
      }

      let code = generateSpinCouponCode();
      for (let attempt = 0; attempt < 8; attempt++) {
        const clash = await tx.issuedSpinCoupon.findUnique({ where: { code }, select: { id: true } });
        if (!clash) break;
        code = generateSpinCouponCode();
      }

      const expiresAt = new Date(now.getTime() + segment.validityDays * 24 * 60 * 60 * 1000);

      const coupon = await tx.issuedSpinCoupon.create({
        data: {
          code,
          userId: session.sub,
          segmentId: segment.id,
          expiresAt,
        },
      });

      await tx.spinWheelSpinLog.create({
        data: {
          userId: session.sub,
          segmentId: segment.id,
        },
      });

      const winIndex = allSegs.findIndex((s) => s.id === segment.id);
      const nSeg = Math.max(1, allSegs.length);
      const slice = 360 / nSeg;
      const winIdx = winIndex >= 0 ? winIndex : 0;
      /** Góc tâm ô trúng (0° = 12h, chiều kim đồng hồ) — khớp conic-gradient trên client */
      const centerDeg = winIdx * slice + slice / 2;
      const spins = 6;
      /** Kim chỉ ở dưới (6h) → cần đưa tâm ô trúng tới 180° sau khi quay */
      const alignToPointer =
        ((180 - (centerDeg % 360)) + 360) % 360;
      const rotationDeg = spins * 360 + alignToPointer;

      return {
        code: coupon.code,
        label: segment.label,
        discountType: segment.discountType,
        discountValue: segment.discountValue,
        discountMaxVnd: segment.discountMaxVnd,
        expiresAt: coupon.expiresAt.toISOString(),
        winIndex: winIdx,
        segmentId: segment.id,
        rotationDeg,
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "EVENT_OFF") {
      return NextResponse.json({ error: "Sự kiện chưa mở hoặc đã kết thúc." }, { status: 400 });
    }
    if (msg === "LIMIT_DAY") {
      return NextResponse.json({ error: "Bạn đã hết lượt quay hôm nay." }, { status: 429 });
    }
    if (msg === "EMPTY_POOL" || msg === "STOCK_RACE") {
      return NextResponse.json({ error: "Hết phần quà — thử lại sau." }, { status: 409 });
    }
    if (msg === "PICK_FAIL") {
      return NextResponse.json({ error: "Không quay được." }, { status: 500 });
    }
    console.error(e);
    return NextResponse.json({ error: "Không quay được." }, { status: 500 });
  }
}
