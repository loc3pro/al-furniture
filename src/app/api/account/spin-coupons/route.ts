import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/** Coupon do vòng quay của user — lịch sử + hạn */
export async function GET() {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.issuedSpinCoupon.findMany({
    where: { userId: session.sub },
    orderBy: { issuedAt: "desc" },
    take: 40,
    include: {
      segment: {
        select: {
          label: true,
          discountType: true,
          discountValue: true,
          discountMaxVnd: true,
          minOrderAmount: true,
        },
      },
    },
  });

  return NextResponse.json({
    coupons: rows.map((r) => ({
      id: r.id,
      code: r.code,
      label: r.segment.label,
      discountType: r.segment.discountType,
      discountValue: r.segment.discountValue,
      discountMaxVnd: r.segment.discountMaxVnd,
      minOrderAmount: r.segment.minOrderAmount,
      issuedAt: r.issuedAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      usedAt: r.usedAt?.toISOString() ?? null,
    })),
  });
}
