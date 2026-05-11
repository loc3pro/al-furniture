"use client";

import dynamic from "next/dynamic";
import type { ThemeSettings } from "@prisma/client";
import type { ThemeFormProps } from "@/app/admin/theme/ThemeForm";
import { SectionLoading } from "@/components/ui/SectionLoading";

const ThemeForm = dynamic(() => import("./ThemeForm").then((m) => ({ default: m.ThemeForm })), {
  loading: () => <SectionLoading fill label="Đang tải form theme" />,
  ssr: false,
});

type GateProps = { initial: ThemeSettings | null } & Omit<ThemeFormProps, "initial">;

export function ThemeFormGate(props: GateProps) {
  return <ThemeForm {...props} />;
}
