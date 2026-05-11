"use client";

import dynamic from "next/dynamic";
import { SectionLoading } from "@/components/ui/SectionLoading";

export default dynamic(
  () => import("./HomePageAdminClient").then((m) => ({ default: m.HomePageAdminClient })),
  {
    loading: () => <SectionLoading fill label="Đang tải cấu hình trang chủ" />,
    ssr: false,
  },
);
