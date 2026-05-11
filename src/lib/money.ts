export function formatVnd(cents: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(cents);
}

/** Tham số SP để tính giá một biến thể (theo % giảm trên giá gốc). */
export type VariantPricingProduct = {
  basePrice: number;
  salePrice: number | null;
  discountPercent?: number | null;
};

/**
 * Niêm yết dùng để tính % giảm: **giá gốc biến thể** nếu > 0, không thì **giá gốc sản phẩm**.
 * (Trường DB `priceAdjustment` lưu giá gốc biến thể; 0 = kế thừa giá gốc SP.)
 */
export function variantListPrice(productBasePrice: number, variantBaseOrZero: number): number {
  return variantBaseOrZero > 0 ? variantBaseOrZero : productBasePrice;
}

/**
 * Giá bán một biến thể (VNĐ / đơn vị) cho khách:
 * `computeSalePrice( giá gốc biến thể hoặc giá gốc SP , discountPercent )`.
 */
export function variantUnitPrice(product: VariantPricingProduct, variantBaseOrZero: number): number {
  const list = variantListPrice(product.basePrice, variantBaseOrZero);
  const d = Math.min(100, Math.max(0, Math.round(product.discountPercent ?? 0)));
  return computeSalePrice(list, d);
}

/** Giá SP sau % giảm (VNĐ); làm tròn */
export function computeSalePrice(basePrice: number, discountPercent: number): number {
  const p = Math.min(100, Math.max(0, Math.round(discountPercent)));
  return Math.max(0, Math.round((basePrice * (100 - p)) / 100));
}

/**
 * Giá đơn vị gốc để tính biến thể (trước khi cộng priceAdjustment).
 * - Có `salePrice` trong DB → dùng (đã lưu khi tạo/sửa SP).
 * - `salePrice` null nhưng có `discountPercent` > 0 → tính từ % (dữ liệu cũ / chưa backfill).
 * - Còn lại → `basePrice`.
 */
export function productSaleBase(product: {
  basePrice: number;
  salePrice: number | null;
  discountPercent?: number | null;
}) {
  if (product.salePrice != null) {
    return product.salePrice;
  }
  const d = product.discountPercent ?? 0;
  if (d > 0) {
    return computeSalePrice(product.basePrice, d);
  }
  return product.basePrice;
}
