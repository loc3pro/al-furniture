"use client";

import { formatVnd } from "@/lib/money";

/** Badge góc ảnh (-X%) */
export function ProductCardDiscountBadge({ percent }: { percent: number }) {
  if (percent < 1) return null;
  return <span className="product-card__discountBadge">-{percent}%</span>;
}

/** Khối giá dưới tên: giá sale + gạch ngang giá gốc */
export function ProductCardPrices({
  salePrice,
  originalPrice,
}: {
  salePrice: number;
  originalPrice: number | null;
}) {
  const showOrig = originalPrice != null && originalPrice > salePrice;
  if (!showOrig) {
    return <div className="price">{formatVnd(salePrice)}</div>;
  }
  return (
    <div className="product-card__priceLine">
      <span className="product-card__priceSale">{formatVnd(salePrice)}</span>
      <span className="product-card__priceOrig">{formatVnd(originalPrice)}</span>
    </div>
  );
}
