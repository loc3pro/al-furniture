import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { variantUnitPrice } from "@/lib/money";
import { pickProductName, parseContentLocaleParam } from "@/lib/content-locale";
import { findProductIdsMatchingSearchOrdered, sortByIdOrder } from "@/lib/product-search";

type Ctx = { params: Promise<{ locale: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { locale: raw } = await ctx.params;
  const locale = parseContentLocaleParam(raw);
  if (!locale) {
    return NextResponse.json({ error: "Locale must be vi or en" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ hits: [] });
  }

  try {
    const ids = await findProductIdsMatchingSearchOrdered(q, null, { limit: 24 });
    if (ids.length === 0) {
      return NextResponse.json({ hits: [] });
    }

    const rows = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        nameVi: true,
        nameEn: true,
        slug: true,
        soldCount: true,
        basePrice: true,
        salePrice: true,
        discountPercent: true,
        variants: { select: { priceAdjustment: true, imageUrls: true } },
      },
    });
    const ordered = sortByIdOrder(rows, ids);

    const hits = ordered.map((p) => {
      const dto = {
        basePrice: p.basePrice,
        salePrice: p.salePrice,
        discountPercent: p.discountPercent,
      };
      const minPrice =
        p.variants.length === 0
          ? variantUnitPrice(dto, 0)
          : Math.min(...p.variants.map((v) => variantUnitPrice(dto, v.priceAdjustment)));
      const thumbUrl =
        p.variants
          .map((v) => {
            const u = v.imageUrls as unknown;
            return Array.isArray(u) && typeof u[0] === "string" ? u[0] : null;
          })
          .find(Boolean) ?? null;
      return {
        id: p.id,
        name: pickProductName(p, locale),
        slug: p.slug,
        minPrice,
        thumbUrl,
        soldCount: p.soldCount,
      };
    });

    return NextResponse.json({ hits });
  } catch (e) {
    console.warn("[search] DB search failed:", e);
    return NextResponse.json({ hits: [] });
  }
}
