import Link from "next/link";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { prisma } from "@/lib/prisma";
import { formatVnd } from "@/lib/money";
import { getSession } from "@/lib/session";
import type { ChartPoint } from "./AdminCharts";
import { AdminChartsGate } from "./AdminChartsGate";
import styles from "./admin-dashboard.module.scss";
import { OrderStatus, Role } from "@prisma/client";

function last7DaysKeys() {
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

export default async function AdminHomePage() {
  const session = await getSession();
  const isSeller = session?.role === Role.SELLER;

  let revenueCompleted = 0;
  let orderTotalCount = 0;
  let orderCompletedCount = 0;
  let productCount = 0;
  let pendingFulfillment = 0;
  let chartData: ChartPoint[] = [];

  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [aggCompleted, ocAll, ocCompleted, pc, pendingN, ordersCompletedWindow] = await Promise.all([
      prisma.order.aggregate({
        where: { status: OrderStatus.COMPLETED },
        _sum: { totalAmount: true },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { status: OrderStatus.COMPLETED } }),
      prisma.product.count(),
      prisma.order.count({
        where: {
          status: {
            in: [
              OrderStatus.PENDING,
              OrderStatus.PAID,
              OrderStatus.PROCESSING,
              OrderStatus.SHIPPING,
            ],
          },
        },
      }),
      prisma.order.findMany({
        where: {
          status: OrderStatus.COMPLETED,
          createdAt: { gte: since },
        },
        select: { totalAmount: true, createdAt: true },
      }),
    ]);

    revenueCompleted = aggCompleted._sum.totalAmount ?? 0;
    orderTotalCount = ocAll;
    orderCompletedCount = ocCompleted;
    productCount = pc;
    pendingFulfillment = pendingN;

    const keys = last7DaysKeys();
    const map = new Map<string, { amount: number; orders: number }>();
    for (const k of keys) map.set(k, { amount: 0, orders: 0 });
    for (const o of ordersCompletedWindow) {
      const k = o.createdAt.toISOString().slice(0, 10);
      if (!map.has(k)) continue;
      const cur = map.get(k)!;
      cur.amount += o.totalAmount;
      cur.orders += 1;
      map.set(k, cur);
    }
    chartData = keys.map((day) => ({
      day,
      amount: map.get(day)?.amount ?? 0,
      orders: map.get(day)?.orders ?? 0,
    }));
  } catch {
    /* no DB */
  }

  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader>
          <header className={`adminPageHeaderRow ${styles.head}`}>
            <div className="adminPageHeaderMain">
              <h1 className={styles.title}>Tổng quan</h1>
              <p className={styles.lead}>
                Doanh thu hiển thị chỉ từ đơn <strong>Hoàn thành</strong>. Biểu đồ 7 ngày cũng chỉ gồm đơn hoàn
                thành trong khoảng thời gian đó.
              </p>
            </div>
          </header>
        </AdminStickyPageHeader>
      }
    >
      {isSeller ? (
        <section className={styles.sellerShopCard} aria-label="Đi tắt cửa hàng">
          <p className={styles.sellerShopCardTitle}>Về cửa hàng</p>
          <p className={styles.sellerShopCardLead}>
            Bạn đang ở khu admin. Chỉ mở storefront khi bấm nút bên dưới.
          </p>
          <div className={styles.sellerShopCardActions}>
            <Link href="/" className={styles.sellerShopCardAction} prefetch={false} target="_blank" rel="noreferrer">
              Mở cửa hàng (tab mới) →
            </Link>
          </div>
        </section>
      ) : null}
      <div className={styles.grid}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Doanh thu (đơn hoàn thành)</span>
          <span className={styles.kpiValue}>{formatVnd(revenueCompleted)}</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Đơn hoàn thành</span>
          <span className={styles.kpiValue}>{orderCompletedCount}</span>
          <span className={styles.kpiHint}>trên {orderTotalCount} đơn tổng</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Đang xử lý / giao</span>
          <span className={styles.kpiValue}>{pendingFulfillment}</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Sản phẩm</span>
          <span className={styles.kpiValue}>{productCount}</span>
        </div>
      </div>

      <AdminChartsGate data={chartData} />
    </AdminPageLayout>
  );
}
