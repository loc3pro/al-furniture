import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Danh sách “Shop the Look” đăng — chỉ bản published. */
export async function GET() {
  const looks = await prisma.shopTheLook.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      heroImageUrl: true,
      _count: { select: { hotspots: true } },
    },
  });
  return NextResponse.json({
    looks: looks.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      subtitle: l.subtitle,
      heroImageUrl: l.heroImageUrl,
      hotspotCount: l._count.hotspots,
    })),
  });
}
