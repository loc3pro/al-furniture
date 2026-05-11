import type { CartLine } from "@/features/cart/cartSlice";

export function cartDistinctLineCount(lines: CartLine[]): number {
  return lines.length;
}

/** Tổng số lượng (cộng dồn từng dòng). */
export function cartPieceCount(lines: CartLine[]): number {
  return lines.reduce((n, l) => n + l.quantity, 0);
}

/**
 * Chuỗi gọn cho sidebar/checkout: số dòng giỏ × tổng số cái.
 * Ví dụ: "2 mặt hàng · 5 cái"
 */
export function formatCartLinesAndPieces(lines: CartLine[]): string {
  const rows = cartDistinctLineCount(lines);
  const pieces = cartPieceCount(lines);
  if (rows === 0) return "0 mặt hàng · 0 cái";
  return `${rows} mặt hàng · ${pieces} cái`;
}

/** Tooltip / aria cho icon giỏ (đủ ngữ cảnh). */
export function cartCheckoutSummaryTitle(lines: CartLine[]): string {
  if (lines.length === 0) return "Giỏ hàng trống";
  return `Giỏ hàng — ${formatCartLinesAndPieces(lines)}`;
}
