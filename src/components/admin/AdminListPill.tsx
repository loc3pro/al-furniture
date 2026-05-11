"use client";

import type { ReactNode } from "react";
import styles from "./AdminListPill.module.scss";

export type AdminListPillTone = "neutral" | "blue" | "green" | "amber" | "rose";

type Props = {
  tone: AdminListPillTone;
  children: ReactNode;
  /** `title` trên nhãn (tooltip + a11y khi cắt ellipsis) */
  title?: string;
  /** Thêm class trên wrapper .pill */
  className?: string;
  /** Ellipsis + max-width trên .label */
  truncate?: boolean;
  /** Mono trong nhãn (mã / slug) */
  mono?: boolean;
  /** Tabular nums (số / ngày) */
  tabular?: boolean;
};

export function AdminListPill({ tone, children, title, className, truncate, mono, tabular }: Props) {
  return (
    <span className={[styles.pill, className].filter(Boolean).join(" ")} data-tone={tone}>
      <span
        className={[
          styles.label,
          truncate ? styles.labelTruncate : "",
          mono ? styles.labelMono : "",
          tabular ? styles.labelTabular : "",
        ]
          .filter(Boolean)
          .join(" ")}
        title={title}
      >
        {children}
      </span>
    </span>
  );
}
