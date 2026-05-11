import type { Metadata } from "next";
import { LuckyWheelPageClient } from "@/components/spin-wheel/LuckyWheelPageClient";

export const metadata: Metadata = {
  title: "Vòng quay may mắn",
  robots: { index: false, follow: false },
};

export default function LuckyWheelPage() {
  return <LuckyWheelPageClient />;
}
