import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseContentLocaleParam } from "@/lib/content-locale";
import { buildProductCardForLook } from "@/lib/shop-the-look-product-meta";

type Ctx = { params: Promise<{ locale: string; slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { slug, locale: raw } = await ctx.params;
  const locale = parseContentLocaleParam(raw);
  if (!locale) {
    return NextResponse.json({ error: "Locale must be vi or en" }, { status: 400 });
  }

  const decoded = decodeURIComponent(slug).trim();
  if (!decoded) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const look = await prisma.shopTheLook.findFirst({
    where: { slug: decoded, published: true },
    include: {
      hotspots: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            include: {
              variants: {
                orderBy: { createdAt: "asc" },
                take: 4,
                select: { priceAdjustment: true, imageUrls: true },
              },
            },
          },
        },
      },
    },
  });

  if (!look) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const hotspots = look.hotspots.map((h, idx) => ({
    id: h.id,
    sortOrder: h.sortOrder ?? idx,
    xPercent: h.xPercent,
    yPercent: h.yPercent,
    product: buildProductCardForLook(h.product, locale),
  }));

  return NextResponse.json({
    look: {
      id: look.id,
      slug: look.slug,
      title: look.title,
      subtitle: look.subtitle,
      heroImageUrl: look.heroImageUrl,
      editorZoom: look.editorZoom,
    },
    hotspots,
  });
}
