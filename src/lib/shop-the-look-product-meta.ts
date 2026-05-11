import { productSaleBase } from "@/lib/money";
import { variantUnitPrice } from "@/lib/money";
import type { ContentLocale } from "@/lib/content-locale";
import { pickProductName } from "@/lib/content-locale";

function parseImageUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => typeof u === "string" && u.length > 0);
}

/** Ảnh đại diện: biến thể đầu, ảnh đầu tiên trong gallery. */
export function firstVariantThumb(variants: { imageUrls: unknown }[]): string | null {
  for (const v of variants) {
    const urls = parseImageUrls(v.imageUrls);
    if (urls[0]) return urls[0]!;
  }
  return null;
}

export type ProductCardForLook = {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  salePrice: number | null;
  discountPercent: number;
  thumbUrl: string | null;
  displayPriceVnd: number;
};

type ProductWithVariants = {
  id: string;
  nameVi: string;
  nameEn: string;
  slug: string;
  basePrice: number;
  salePrice: number | null;
  discountPercent: number;
  variants: { priceAdjustment: number; imageUrls: unknown }[];
};

export function buildProductCardForLook(p: ProductWithVariants, locale: ContentLocale): ProductCardForLook {
  const v0 = p.variants[0];
  const thumbUrl = firstVariantThumb(p.variants);
  const adj = v0?.priceAdjustment ?? 0;
  const displayPriceVnd = v0
    ? variantUnitPrice(
        { basePrice: p.basePrice, salePrice: p.salePrice ?? null, discountPercent: p.discountPercent },
        adj,
      )
    : productSaleBase(p);
  return {
    id: p.id,
    name: pickProductName(p, locale),
    slug: p.slug,
    basePrice: p.basePrice,
    salePrice: p.salePrice,
    discountPercent: p.discountPercent,
    thumbUrl,
    displayPriceVnd,
  };
}
