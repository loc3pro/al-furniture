"use client";

import type { ReactNode } from "react";
import styles from "./AdminPanelStickyToolbar.module.scss";

/**
 * Khối sticky đầu vùng cuộn panel phải — giống toolbar form tạo/chỉnh sản phẩm.
 * Đặt bọc hàng nút submit / Hủy (hoặc nội dung tuỳ ý).
 */
export function AdminPanelStickyToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={[styles.stickyRoot, className].filter(Boolean).join(" ")}>{children}</div>;
}

/** Hàng nút chia đều ngang (primary trước, Hủy cuối). */
export function AdminPanelToolbarActions({ children }: { children: ReactNode }) {
  return <div className={styles.actionsRow}>{children}</div>;
}
