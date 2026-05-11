import type { Prisma } from "@prisma/client";
import { OrderStatus } from "@prisma/client";

export type OrderListTab = "all" | "active" | "completed" | "cancelled";

export type OrderSortField = "date" | "total" | "status";

export function parseOrderListTab(raw: string | undefined): OrderListTab {
  if (raw === "active" || raw === "completed" || raw === "cancelled") return raw;
  return "all";
}

export function parseOrderSort(rawSort: string | undefined, rawDir: string | undefined): {
  field: OrderSortField;
  dir: "asc" | "desc";
} {
  const field: OrderSortField =
    rawSort === "total" || rawSort === "status" ? rawSort : "date";
  const dir = rawDir === "asc" ? "asc" : "desc";
  return { field, dir };
}

export function orderByFromSort(field: OrderSortField, dir: "asc" | "desc"): Prisma.OrderOrderByWithRelationInput {
  if (field === "total") return { totalAmount: dir };
  if (field === "status") return { status: dir };
  return { createdAt: dir };
}

/** Lọc theo tab + từ khóa (mã đơn, SĐT / email / tên user khi có tài khoản) */
export function buildOrderListWhere(tab: OrderListTab, q: string): Prisma.OrderWhereInput {
  const parts: Prisma.OrderWhereInput[] = [];

  if (tab === "active") {
    parts.push({
      status: {
        in: [
          OrderStatus.PENDING,
          OrderStatus.PAID,
          OrderStatus.PROCESSING,
          OrderStatus.SHIPPING,
        ],
      },
    });
  } else if (tab === "completed") {
    parts.push({ status: OrderStatus.COMPLETED });
  } else if (tab === "cancelled") {
    parts.push({
      status: {
        in: [OrderStatus.CANCELLED, OrderStatus.RETURNED, OrderStatus.REFUNDED, OrderStatus.FAILED],
      },
    });
  }

  const term = q.trim();
  if (term) {
    parts.push({
      OR: [
        { orderNumber: { contains: term, mode: "insensitive" } },
        { id: { contains: term, mode: "insensitive" } },
        { user: { is: { phone: { contains: term } } } },
        { user: { is: { email: { contains: term, mode: "insensitive" } } } },
        { user: { is: { name: { contains: term, mode: "insensitive" } } } },
      ],
    });
  }

  if (parts.length === 0) return {};
  return { AND: parts };
}

/** Tham số URL cố định (không có `page`) — dùng cho phân trang RSC. */
export function ordersPaginationFilterQuery(
  tab: OrderListTab,
  q: string,
  sort: OrderSortField = "date",
  dir: "asc" | "desc" = "desc",
): Record<string, string> {
  const out: Record<string, string> = {};
  if (tab !== "all") out.tab = tab;
  if (q.trim()) out.q = q.trim();
  const isDefaultSort = sort === "date" && dir === "desc";
  if (!isDefaultSort) {
    out.sort = sort;
    out.dir = dir;
  }
  return out;
}

export function ordersListQuery(
  tab: OrderListTab,
  q: string,
  page: number,
  sort: OrderSortField = "date",
  dir: "asc" | "desc" = "desc"
): string {
  const p = new URLSearchParams();
  const base = ordersPaginationFilterQuery(tab, q, sort, dir);
  for (const [k, v] of Object.entries(base)) p.set(k, v);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Tối đa số ID đơn gửi kèm một lần xuất CSV (bulk). */
export const ORDER_EXPORT_IDS_MAX = 500;

/**
 * Parse `ids` từ query (phân tách bằng dấu phẩy / khoảng trắng).
 * Trả về `null` nếu không có ID hợp lệ → API xuất toàn bộ theo bộ lọc như cũ.
 */
export function parseOrderIdsParam(raw: string | null | undefined): string[] | null {
  if (!raw?.trim()) return null;
  const parts = raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (out.length >= ORDER_EXPORT_IDS_MAX) break;
    if (p.length < 15 || p.length > 36) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out.length ? out : null;
}

/** Giới hạn số đơn in hóa đơn HTML một lần (hiệu năng + trình duyệt). */
export const ORDER_PRINT_IDS_MAX = 40;

/** Query cho `/admin/orders/invoice-print?ids=…`. */
export function appendInvoicePrintQuery(ids: string[]): string {
  if (ids.length === 0) return "";
  const p = new URLSearchParams();
  p.set("ids", ids.slice(0, ORDER_PRINT_IDS_MAX).join(","));
  return `?${p.toString()}`;
}

/** Gắn `ids` vào query xuất (khi đã chọn một hoặc nhiều đơn). */
export function appendOrderIdsToExportQuery(baseQuery: string, ids: string[]): string {
  if (ids.length === 0) return baseQuery;
  const qs = baseQuery.startsWith("?") ? baseQuery.slice(1) : baseQuery;
  const p = new URLSearchParams(qs);
  p.set("ids", ids.slice(0, ORDER_EXPORT_IDS_MAX).join(","));
  const s = p.toString();
  return s ? `?${s}` : "?";
}
