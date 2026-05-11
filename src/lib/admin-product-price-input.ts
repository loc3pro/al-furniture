/** Giá gốc tối thiểu (VNĐ) — lớn hơn 1000. */
export const MIN_PRODUCT_BASE_PRICE = 1001;

/** Chỉ chữ số → số nguyên (bỏ số 0 thừa đầu chuỗi). */
export function parseMoneyDigits(raw: string): number {
  const d = raw.replace(/\D/g, "");
  if (d === "") return 0;
  const n = parseInt(d, 10);
  return Number.isFinite(n) ? n : 0;
}

/** % giảm giá 0–100, chỉ chữ số. */
export function parseDiscountDigits(raw: string): number {
  const d = raw.replace(/\D/g, "");
  if (d === "") return 0;
  let n = parseInt(d, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** Số nguyên ₫ có thể âm (điều chỉnh giá biến thể). */
export function parseSignedMoneyDigits(raw: string): number {
  const s = raw.trim();
  const neg = s.startsWith("-");
  const digits = s.replace(/^-/, "").replace(/\D/g, "");
  if (digits === "") return 0;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n)) return 0;
  const v = neg ? -n : n;
  return Math.min(500_000_000, Math.max(-500_000_000, v));
}
