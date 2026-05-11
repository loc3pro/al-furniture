import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatVnd } from "@/lib/money";
import {
  buildOrderListWhere,
  orderByFromSort,
  ordersListQuery,
  ordersPaginationFilterQuery,
  parseOrderListTab,
  parseOrderSort,
  type OrderListTab,
  type OrderSortField,
} from "./order-list-filters";
import { ADMIN_ORDERS_PAGE_SIZE } from "@/lib/admin-pagination";
import { AdminOrdersPageClient, type AdminOrderListRowDto } from "./AdminOrdersPageClient";
import { staffDisplayName } from "@/lib/admin-staff-label";

const PAGE_SIZE = ADMIN_ORDERS_PAGE_SIZE;

const orderInclude = {
  items: {
    select: {
      quantity: true,
      productVariant: {
        select: {
          product: { select: { nameVi: true } },
        },
      },
    },
  },
  user: { select: { email: true, phone: true, name: true } },
  placedBy: { select: { name: true, email: true } },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function totalQty(order: OrderRow): number {
  return order.items.reduce((s, x) => s + x.quantity, 0);
}

function mapOrderToDto(o: OrderRow): AdminOrderListRowDto {
  const addr = o.shippingAddress as Record<string, string>;
  const summary =
    o.items.length === 0
      ? "—"
      : o.items.length === 1
        ? o.items[0]!.productVariant.product.nameVi
        : `${o.items[0]!.productVariant.product.nameVi} +${o.items.length - 1}`;
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    createdAtLabel: new Date(o.createdAt).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    status: o.status,
    totalLabel: formatVnd(o.totalAmount),
    productSummary: summary,
    customerName: addr?.name ?? o.user?.name ?? "—",
    placedByLabel: staffDisplayName(o.placedBy),
    qty: totalQty(o),
  };
}

type PageProps = {
  searchParams: Promise<{ tab?: string; q?: string; page?: string; sort?: string; dir?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tab = parseOrderListTab(sp.tab);
  const q = (sp.q ?? "").trim();
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const skip = (pageNum - 1) * PAGE_SIZE;

  const { field: sortField, dir: sortDir } = parseOrderSort(sp.sort, sp.dir);
  const orderBy = orderByFromSort(sortField, sortDir);

  const where = buildOrderListWhere(tab, q);

  const qHref = (t: OrderListTab, p: number, sf: OrderSortField, sd: "asc" | "desc") =>
    `/admin/orders${ordersListQuery(t, q, p, sf, sd)}`;

  let orders: OrderRow[] = [];
  let total = 0;
  try {
    ;[orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy,
        skip,
        take: PAGE_SIZE,
        include: orderInclude,
      }),
      prisma.order.count({ where }),
    ]);
  } catch {
    orders = [];
    total = 0;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function hrefForSortColumn(col: OrderSortField): string {
    const dir =
      sortField === col ? (sortDir === "asc" ? "desc" : "asc") : col === "status" ? "asc" : "desc";
    return qHref(tab, 1, col, dir);
  }

  const sortHrefs: Record<OrderSortField, string> = {
    date: hrefForSortColumn("date"),
    total: hrefForSortColumn("total"),
    status: hrefForSortColumn("status"),
  };

  const exportBaseQuery = ordersListQuery(tab, q, 1, sortField, sortDir);
  const rowsDto = orders.map(mapOrderToDto);

  return (
    <AdminOrdersPageClient
      tab={tab}
      q={q}
      sortField={sortField}
      sortDir={sortDir}
      exportBaseQuery={exportBaseQuery}
      sortHrefs={sortHrefs}
      rows={rowsDto}
      pageNum={pageNum}
      totalPages={totalPages}
      totalItems={total}
      pageSize={PAGE_SIZE}
      paginationNav={{
        pathname: "/admin/orders",
        query: ordersPaginationFilterQuery(tab, q, sortField, sortDir),
        defaultPageSize: PAGE_SIZE,
      }}
    />
  );
}
