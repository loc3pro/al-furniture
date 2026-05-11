"use client";

import type { ReactNode } from "react";

export function DbTag({ tone = "default", children }: { tone?: "default" | "success"; children: ReactNode }) {
  const cn = tone === "success" ? "db-tag db-tag--success" : "db-tag";
  return <span className={cn}>{children}</span>;
}
