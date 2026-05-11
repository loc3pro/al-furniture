import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseContentLocaleParam } from "@/lib/content-locale";
import { mapProductDetailForApi } from "@/lib/localized-product-dto";

type Ctx = { params: Promise<{ locale: string; id: string }> };

/** GET — `id` có thể là `Product.id` (cuid) hoặc `slug`. */
export async function GET(_req: Request, ctx: Ctx) {
  const { locale: raw, id: param } = await ctx.params;
  const locale = parseContentLocaleParam(raw);
  if (!locale) {
    return NextResponse.json({ error: "Locale must be vi or en" }, { status: 400 });
  }

  const key = param?.trim();
  if (!key) {
    return NextResponse.json({ error: "Thiếu tham số" }, { status: 400 });
  }

  const include = {
    category: { select: { nameVi: true, nameEn: true, slug: true } },
    variants: { orderBy: [{ colorLabelVi: "asc" as const }, { sizeLabelVi: "asc" as const }] },
  };

  const product =
    (await prisma.product.findUnique({
      where: { id: key },
      include,
    })) ??
    (await prisma.product.findUnique({
      where: { slug: key },
      include,
    }));

  if (!product) {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }

  return NextResponse.json({ product: mapProductDetailForApi(product, locale) });
}
