"use client";

import dynamic from "next/dynamic";
import { SectionLoading } from "@/components/ui/SectionLoading";
import type { ChartPoint } from "./AdminCharts";

const AdminChartsLazy = dynamic(
  () => import("./AdminCharts").then((m) => ({ default: m.AdminCharts })),
  {
    loading: () => <SectionLoading fill label="Đang tải biểu đồ" />,
    ssr: false,
  },
);

export function AdminChartsGate({ data }: { data: ChartPoint[] }) {
  return <AdminChartsLazy data={data} />;
}
