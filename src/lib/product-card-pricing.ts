import { variantListPrice, variantUnitPrice } from "@/lib/money";

export type ProductCardPricing = {
  salePrice: number;
  originalPrice: number | null;
  /** Hiển thị badge -X%; 0 = không hiện badge */
  discountBadgePercent: number;
};

/**
 * Giá thấp nhất trên card (min biến thể): niêm yết vs sau giảm.
 */
export function productCardMinPricing(product: {
  basePrice: number;
  salePrice: number | null;
  discountPercent?: number | null;
  variants: { priceAdjustment: number }[];
}): ProductCardPricing {
  const productDto = {
    basePrice: product.basePrice,
    salePrice: product.salePrice,
    discountPercent: product.discountPercent ?? undefined,
  };

  if (product.variants.length === 0) {
    const unitSale = variantUnitPrice(productDto, 0);
    const list = variantListPrice(product.basePrice, 0);
    if (product.discountPercent == null || product.discountPercent <= 0 || list <= unitSale) {
      return { salePrice: unitSale, originalPrice: null, discountBadgePercent: 0 };
    }
    const rawPct = ((list - unitSale) / list) * 100;
    const rounded = Math.round(rawPct);
    const discountBadgePercent = rounded > 0 ? Math.min(99, rounded) : 1;
    return { salePrice: unitSale, originalPrice: list, discountBadgePercent };
  }

  let bestSale = Infinity;
  let listAtBest = product.basePrice;
  for (const v of product.variants) {
    const u = variantUnitPrice(productDto, v.priceAdjustment);
    if (u < bestSale) {
      bestSale = u;
      listAtBest = variantListPrice(product.basePrice, v.priceAdjustment);
    }
  }
  const unitSale = bestSale;
  const unitOriginal = listAtBest;
  if (unitSale >= unitOriginal || unitOriginal <= 0) {
    return { salePrice: unitSale, originalPrice: null, discountBadgePercent: 0 };
  }
  const rawPct = ((unitOriginal - unitSale) / unitOriginal) * 100;
  const rounded = Math.round(rawPct);
  const discountBadgePercent = rounded > 0 ? Math.min(99, rounded) : 1;
  return {
    salePrice: unitSale,
    originalPrice: unitOriginal,
    discountBadgePercent,
  };
}
