import { OrderStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { orderStatusLabel } from "@/lib/order-status-vi";

export type ReportsSummaryStatusRow = { status: OrderStatus; count: number; sum: number };
export type ReportsSummaryPaymentRow = { method: string; count: number; sum: number };
export type ReportsSummaryCategoryRow = { name: string; products: number };
export type ReportsSummaryDailyRow = { day: string; revenue: number; orders: number };
export type ReportsSummaryTopProduct = { name: string; sold: number; revenue: number };
export type ReportsSummaryWishRow = { name: string; wishes: number };

export type ReportsSummaryPayload = {
  range: { from: string; to: string };
  kpis: {
    revenueCompleted: number;
    ordersCompleted: number;
    newCustomers: number;
  };
  byStatus: ReportsSummaryStatusRow[];
  paymentRows: ReportsSummaryPaymentRow[];
  categoryRows: ReportsSummaryCategoryRow[];
  dailyCompleted: ReportsSummaryDailyRow[];
  topProducts: ReportsSummaryTopProduct[];
  topWishlisted: ReportsSummaryWishRow[];
  statusSlices: { name: string; value: number }[];
};

const MAX_RANGE_DAYS = 366;

/** Chuỗi YYYY-MM-DD → UTC start of day */
export function utcDayStart(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/** Chuỗi YYYY-MM-DD → UTC end of day */
export function utcDayEnd(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59.999Z`);
}

export function dateKeysInclusiveUtc(fromIso: string, toIso: string): string[] {
  const keys: string[] = [];
  const start = utcDayStart(fromIso);
  const end = utcDayStart(toIso);
  if (start > end) return keys;
  const d = new Date(start);
  while (d <= end) {
    keys.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return keys;
}

export function parseIsoDateOrNull(s: string | null): string | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return null;
  const t = Date.parse(`${s.trim()}T00:00:00.000Z`);
  return Number.isNaN(t) ? null : s.trim();
}

export function validateRangeDays(fromIso: string, toIso: string): number | null {
  const keys = dateKeysInclusiveUtc(fromIso, toIso);
  const n = keys.length;
  if (n === 0) return null;
  if (n > MAX_RANGE_DAYS) return null;
  return n;
}

export async function getAdminReportsSummary(fromIso: string, toIso: string): Promise<ReportsSummaryPayload> {
  const fromDate = utcDayStart(fromIso);
  const toDate = utcDayEnd(toIso);
  const dailyKeys = dateKeysInclusiveUtc(fromIso, toIso);
  const dailyMap = new Map<string, { revenue: number; orders: number }>();
  for (const k of dailyKeys) dailyMap.set(k, { revenue: 0, orders: 0 });

  let byStatus: ReportsSummaryStatusRow[] = [];
  let paymentRows: ReportsSummaryPaymentRow[] = [];
  let categoryRows: ReportsSummaryCategoryRow[] = [];
  let topProducts: ReportsSummaryTopProduct[] = [];
  let topWishlisted: ReportsSummaryWishRow[] = [];
  let revenueCompleted = 0;
  let ordersCompleted = 0;
  let newCustomers = 0;

  try {
    const [
      statusGroups,
      compAgg,
      payGroups,
      catGroups,
      userCount,
      ordersCompletedInRange,
      topAggRows,
      wishGroups,
    ] = await Promise.all([
      prisma.order.groupBy({
        by: ["status"],
        where: { createdAt: { gte: fromDate, lte: toDate } },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { status: OrderStatus.COMPLETED, createdAt: { gte: fromDate, lte: toDate } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      prisma.order.groupBy({
        by: ["paymentMethod"],
        where: { createdAt: { gte: fromDate, lte: toDate } },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      prisma.product.groupBy({
        by: ["categoryId"],
        where: { createdAt: { gte: fromDate, lte: toDate } },
        _count: { _all: true },
        orderBy: { _count: { categoryId: "desc" } },
        take: 12,
      }),
      prisma.user.count({
        where: { createdAt: { gte: fromDate, lte: toDate }, role: Role.CUSTOMER },
      }),
      prisma.order.findMany({
        where: { status: OrderStatus.COMPLETED, createdAt: { gte: fromDate, lte: toDate } },
        select: { totalAmount: true, createdAt: true },
      }),
      prisma.$queryRaw<Array<{ productVariantId: string; sold: bigint; revenue: bigint }>>(Prisma.sql`
        SELECT oi."productVariantId",
               SUM(oi.quantity)::bigint AS sold,
               SUM(oi.quantity * oi.price)::bigint AS revenue
        FROM "OrderItem" oi
        INNER JOIN "Order" o ON o.id = oi."orderId"
        WHERE o.status = 'COMPLETED'::"OrderStatus"
          AND o."createdAt" >= ${fromDate}
          AND o."createdAt" <= ${toDate}
        GROUP BY oi."productVariantId"
        ORDER BY SUM(oi.quantity * oi.price) DESC
        LIMIT 10
      `),
      prisma.$queryRaw<Array<{ productId: string; cnt: bigint }>>(Prisma.sql`
        SELECT "productId", COUNT(*)::bigint AS cnt
        FROM "Wishlist"
        WHERE "createdAt" >= ${fromDate} AND "createdAt" <= ${toDate}
        GROUP BY "productId"
        ORDER BY COUNT(*) DESC
        LIMIT 15
      `),
    ]);

    byStatus = statusGroups.map((g) => ({
      status: g.status,
      count: g._count._all,
      sum: g._sum.totalAmount ?? 0,
    }));

    revenueCompleted = compAgg._sum.totalAmount ?? 0;
    ordersCompleted = compAgg._count._all;
    newCustomers = userCount;

    paymentRows = payGroups.map((g) => ({
      method: String(g.paymentMethod),
      count: g._count._all,
      sum: g._sum.totalAmount ?? 0,
    }));

    const catIds = catGroups.map((c) => c.categoryId);
    const cats =
      catIds.length > 0
        ? await prisma.category.findMany({
            where: { id: { in: catIds } },
            select: { id: true, nameVi: true },
          })
        : [];
    const cmap = new Map(cats.map((c) => [c.id, c.nameVi]));
    categoryRows = catGroups.map((g) => ({
      name: cmap.get(g.categoryId) ?? g.categoryId,
      products: g._count._all,
    }));

    for (const o of ordersCompletedInRange) {
      const k = o.createdAt.toISOString().slice(0, 10);
      if (!dailyMap.has(k)) continue;
      const cur = dailyMap.get(k)!;
      cur.revenue += o.totalAmount;
      cur.orders += 1;
      dailyMap.set(k, cur);
    }

    const variantIds = topAggRows.map((x) => x.productVariantId);
    const variants =
      variantIds.length > 0
        ? await prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            include: { product: { select: { nameVi: true } } },
          })
        : [];
    const vmap = new Map(variants.map((v) => [v.id, v]));

    topProducts = topAggRows.map((row) => {
      const v = vmap.get(row.productVariantId);
      return {
        name: v ? v.product.nameVi : row.productVariantId,
        sold: Number(row.sold),
        revenue: Number(row.revenue),
      };
    });

    const wishProductIds = wishGroups.map((w) => w.productId);
    const wishProducts =
      wishProductIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: wishProductIds } },
            select: { id: true, nameVi: true },
          })
        : [];
    const wishNameById = new Map(wishProducts.map((p) => [p.id, p.nameVi]));
    topWishlisted = wishGroups.map((w) => ({
      name: wishNameById.get(w.productId) ?? w.productId,
      wishes: Number(w.cnt),
    }));
  } catch {
    /* giữ mảng rỗng */
  }

  const statusSlices = byStatus.map((r) => ({
    name: orderStatusLabel(r.status),
    value: r.count,
  }));

  const dailyCompleted = dailyKeys.map((day) => {
    const g = dailyMap.get(day)!;
    return { day, revenue: g.revenue, orders: g.orders };
  });

  return {
    range: { from: fromIso, to: toIso },
    kpis: {
      revenueCompleted,
      ordersCompleted,
      newCustomers,
    },
    byStatus,
    paymentRows,
    categoryRows,
    dailyCompleted,
    topProducts,
    topWishlisted,
    statusSlices,
  };
}
