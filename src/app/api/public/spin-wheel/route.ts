import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SPIN_WHEEL_SEGMENT_PALETTE } from "@/lib/spin-wheel-palette";

/** Trạng thái vòng quay cho banner + trang quay (không lộ trọng số / tồn kho) */
export async function GET() {
  try {
    const cfg = await prisma.spinWheelConfig.findUnique({ where: { id: "default" } });
    const now = new Date();
    let active = Boolean(cfg?.eventActive);
    if (cfg?.startsAt && now < cfg.startsAt) active = false;
    if (cfg?.endsAt && now > cfg.endsAt) active = false;

    const segmentsRaw = await prisma.spinWheelSegment.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true, sortOrder: true },
    });

    const palette = SPIN_WHEEL_SEGMENT_PALETTE;
    const segments = segmentsRaw.map((s, i) => ({
      id: s.id,
      label: s.label,
      color: palette[i % palette.length]!,
    }));

    return NextResponse.json({
      active,
      bannerTitle: cfg?.bannerTitle ?? "Vòng quay may mắn",
      maxSpinsPerUserDay: cfg?.maxSpinsPerUserDay ?? 5,
      segments,
    });
  } catch {
    return NextResponse.json({
      active: false,
      bannerTitle: "Vòng quay may mắn",
      maxSpinsPerUserDay: 5,
      segments: [],
    });
  }
}
