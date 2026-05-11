/** Kích thước trang mặc định cho danh sách admin (sản phẩm, blog, danh mục…). */
export const ADMIN_PAGE_SIZE_DEFAULT = 20;

/** Đơn hàng giữ 12 như trước — import riêng nếu cần. */
export const ADMIN_ORDERS_PAGE_SIZE = 12;

/** Banner / khối nhỏ — ít phần tử trên trang. */
export const ADMIN_COMPACT_PAGE_SIZE = 6;

/** Danh sách phiên chat admin — khớp API `pageSize` mặc định. */
export const ADMIN_CHAT_PAGE_SIZE = 15;

/** Giá trị chọn trong UI — khớp clamp API (8–40). */
export const ADMIN_CHAT_PAGE_SIZE_OPTIONS = [8, 12, 15, 20, 25, 30, 40] as const;

/** Query `pageSize` cho `/admin/chat` — luộn trong [8, 40]. */
export function parseAdminChatPageSize(raw: string | undefined): number {
  const n = parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return ADMIN_CHAT_PAGE_SIZE;
  return Math.min(40, Math.max(8, n));
}

export function parseAdminPage(raw: string | undefined): number {
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/** Danh sách số trang cho UI (1 … n, có gap …). */
export function compactAdminPageList(
  current: number,
  totalPages: number,
): ({ kind: "page"; n: number } | { kind: "gap" })[] {
  if (totalPages <= 8) {
    return Array.from({ length: totalPages }, (_, i) => ({ kind: "page" as const, n: i + 1 }));
  }
  const want = new Set<number>();
  want.add(1);
  want.add(totalPages);
  for (let d = -1; d <= 1; d++) {
    const p = current + d;
    if (p >= 1 && p <= totalPages) want.add(p);
  }
  const sorted = [...want].sort((a, b) => a - b);
  const out: ({ kind: "page"; n: number } | { kind: "gap" })[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) out.push({ kind: "gap" });
    out.push({ kind: "page", n: sorted[i]! });
  }
  return out;
}
