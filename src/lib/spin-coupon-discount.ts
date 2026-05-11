/** Giảm giá từ segment vòng quay (PERCENT hoặc FIXED VNĐ). PERCENT + discountMaxVnd: min(% đơn, trần). */

export function computeSpinCouponDiscount(
  subtotal: number,
  discountType: string,
  discountValue: number,
  discountMaxVnd?: number | null,
): number {
  if (subtotal <= 0) return 0;
  if (discountType === "FIXED") {
    return Math.min(subtotal, Math.max(0, discountValue));
  }
  const pct = Math.min(100, Math.max(0, discountValue));
  let fromPct = Math.round((subtotal * pct) / 100);
  const cap =
    discountMaxVnd != null && Number(discountMaxVnd) > 0 ? Math.floor(Number(discountMaxVnd)) : null;
  if (cap != null) {
    fromPct = Math.min(fromPct, cap);
  }
  return Math.min(subtotal, Math.max(0, fromPct));
}

/** Ran giữa 0 và sum(weights)-1 theo trọng số */
export function weightedPickIndex(weights: number[]): number {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || weights.length === 0) return -1;
  let r = Math.random() * sum;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r < 0) return i;
  }
  return weights.length - 1;
}
