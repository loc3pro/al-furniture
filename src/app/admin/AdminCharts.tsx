"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export type ChartPoint = { day: string; amount: number; orders: number };

export function AdminCharts({ data }: { data: ChartPoint[] }) {
  return (
    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
      <div className="card" style={{ padding: "1rem", minHeight: 300 }}>
        <div className="muted" style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
          Doanh thu 7 ngày (đơn hoàn thành)
        </div>
        <div style={{ width: "100%", height: 260, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height={260} minWidth={0}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d) => String(d).slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(n) => `${Math.round(Number(n) / 1_000_000)}tr`} />
              <Tooltip formatter={(v) => [Number(v ?? 0).toLocaleString("vi-VN") + " ₫", "Doanh thu"]} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#2c2620"
                fill="#8b7355"
                fillOpacity={0.25}
                name="Doanh thu"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card" style={{ padding: "1rem", minHeight: 300 }}>
        <div className="muted" style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
          Số đơn hoàn thành / ngày
        </div>
        <div style={{ width: "100%", height: 260, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height={260} minWidth={0}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d) => String(d).slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [v ?? 0, "Đơn"]} />
              <Bar dataKey="orders" name="Đơn" fill="#8b7355" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
