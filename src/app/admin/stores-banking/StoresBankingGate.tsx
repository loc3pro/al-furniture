"use client";

import dynamic from "next/dynamic";
import { SectionLoading } from "@/components/ui/SectionLoading";

const StoresBankingClient = dynamic(
  () => import("./StoresBankingClient").then((m) => ({ default: m.StoresBankingClient })),
  {
    loading: () => <SectionLoading fill label="Đang tải cửa hàng & ngân hàng" />,
    ssr: false,
  },
);

export function StoresBankingGate() {
  return <StoresBankingClient />;
}
