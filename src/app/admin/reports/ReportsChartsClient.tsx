"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

import { NoDataEmpty } from "@/components/ui/NoDataEmpty";
import styles from "./reports-charts.module.scss";

const PIE_COLORS = ["#2c2620", "#8b7355", "#a89880", "#6b6560", "#c4a882", "#5c5348", "#e8dfd4"];

export type StatusSlice = { name: string; value: number };
export type TopBarRow = { name: string; sold: number; revenue: number };
export type DailyRow = { day: string; revenue: number; orders: number };
export type WishInterestRow = { name: string; wishes: number };

export function ReportsChartsClient({
  statusSlices,
  topProducts,
  dailyCompleted,
  topWishlisted,
  rangeLabel,
}: {
  statusSlices: StatusSlice[];
  topProducts: TopBarRow[];
  dailyCompleted: DailyRow[];
  topWishlisted: WishInterestRow[];
  /** Hiển thị dưới tiêu đề biểu đồ doanh thu theo ngày */
  rangeLabel: string;
}) {
  const hasPie = statusSlices.some((s) => s.value > 0);
  const hasBar = topProducts.length > 0;
  const hasLine = dailyCompleted.length > 0;
  const hasWish = topWishlisted.length > 0;

  return (
    <div className={styles.grid}>
      <section className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Đơn theo trạng thái</h3>
        {hasPie ? (
          <div className={styles.chartBox} style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height={300} minWidth={0}>
              <PieChart>
                <Pie
                  data={statusSlices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={false}
                >
                  {statusSlices.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]!} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [Number(value ?? 0), "Số đơn"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <NoDataEmpty dense className={styles.emptyChart} />
        )}
      </section>

      <section className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Biến thể bán chạy (số lượng)</h3>
        {hasBar ? (
          <div className={styles.chartBox} style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height={320} minWidth={0}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => (String(v).length > 18 ? `${String(v).slice(0, 18)}…` : String(v))}
                />
                <Tooltip formatter={(value) => [`${Number(value ?? 0)}`, "Đã bán (cái)"]} />
                <Bar dataKey="sold" name="Đã bán" fill="#8b7355" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <NoDataEmpty dense className={styles.emptyChart} />
        )}
      </section>

      <section className={`${styles.chartCard} ${styles.wide}`}>
        <h3 className={styles.chartTitle}>Sản phẩm được quan tâm nhất (wishlist)</h3>
        {hasWish ? (
          <div className={styles.chartBox} style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height={320} minWidth={0}>
              <BarChart data={topWishlisted} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => (String(v).length > 18 ? `${String(v).slice(0, 18)}…` : String(v))}
                />
                <Tooltip formatter={(value) => [`${Number(value ?? 0)}`, "Lượt thích"]} />
                <Bar dataKey="wishes" name="Wishlist" fill="#5c5348" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <NoDataEmpty dense className={styles.emptyChart} />
        )}
      </section>

      <section className={`${styles.chartCard} ${styles.wide}`}>
        <h3 className={styles.chartTitle}>Doanh thu đơn hoàn thành</h3>
        <p className={styles.chartRange}>{rangeLabel}</p>
        {hasLine ? (
          <div className={styles.chartBox} style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height={300} minWidth={0}>
              <LineChart data={dailyCompleted} margin={{ left: 4, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis
                  yAxisId="rev"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(n) => `${Math.round(Number(n) / 1_000_000)}tr`}
                />
                <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value, name) => {
                    const n = typeof value === "number" ? value : Number(value);
                    return String(name) === "revenue"
                      ? [`${n.toLocaleString("vi-VN")} ₫`, "Doanh thu"]
                      : [n, "Số đơn"];
                  }}
                />
                <Legend />
                <Line
                  yAxisId="rev"
                  type="monotone"
                  dataKey="revenue"
                  name="Doanh thu (₫)"
                  stroke="#2c2620"
                  strokeWidth={2}
                  dot={false}
                />
                <Line yAxisId="ord" type="monotone" dataKey="orders" name="Số đơn" stroke="#8b7355" strokeWidth={1.5} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <NoDataEmpty dense className={styles.emptyChart} description="Không có đơn hoàn thành trong khoảng này." />
        )}
      </section>
    </div>
  );
}
