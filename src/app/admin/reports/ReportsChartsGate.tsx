"use client";

import dynamic from "next/dynamic";
import styles from "./reports.module.scss";
import type { DailyRow, StatusSlice, TopBarRow, WishInterestRow } from "./ReportsChartsClient";

const ReportsChartsLazy = dynamic(
  () => import("./ReportsChartsClient").then((m) => ({ default: m.ReportsChartsClient })),
  {
    loading: () => <p className={styles.muted}>Đang tải biểu đồ…</p>,
    ssr: false,
  },
);

export function ReportsChartsGate(props: {
  statusSlices: StatusSlice[];
  topProducts: TopBarRow[];
  dailyCompleted: DailyRow[];
  topWishlisted: WishInterestRow[];
  rangeLabel: string;
}) {
  return <ReportsChartsLazy {...props} />;
}
