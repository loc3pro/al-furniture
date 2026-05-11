import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { variantUnitPrice } from "@/lib/money";
import { parseContentLocaleParam } from "@/lib/content-locale";
import { mapProductListItem } from "@/lib/localized-product-dto";

type Ctx = { params: Promise<{ locale: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { locale: raw } = await ctx.params;
  const locale = parseContentLocaleParam(raw);
  if (!locale) {
    return NextResponse.json({ error: "Locale must be vi or en" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const categorySlug = searchParams.get("category");
  const q = searchParams.get("q")?.trim();

  const where =
    categorySlug || q
      ? {
          AND: [
            categorySlug ? { category: { slug: categorySlug } } : {},
            q
              ? {
                  OR: [
                    { nameVi: { contains: q, mode: "insensitive" as const } },
                    { nameEn: { contains: q, mode: "insensitive" as const } },
                    { descriptionVi: { contains: q, mode: "insensitive" as const } },
                    { descriptionEn: { contains: q, mode: "insensitive" as const } },
                  ],
                }
              : {},
          ],
        }
      : {};

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ isFeatured: "desc" }, { soldCount: "desc" }, { createdAt: "desc" }],
    include: {
      category: { select: { nameVi: true, nameEn: true, slug: true } },
      variants: { select: { priceAdjustment: true, imageUrls: true } },
    },
  });

  const data = products.map((p) => {
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
          const urls = v.imageUrls as unknown;
          if (Array.isArray(urls) && typeof urls[0] === "string") return urls[0] as string;
          return null;
        })
        .find(Boolean) ?? null;
    return mapProductListItem(p, locale, { minPrice, thumbUrl });
  });

  return NextResponse.json({ products: data });
}
