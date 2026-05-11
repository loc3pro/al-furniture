"use client";

import type { ReactNode } from "react";
import styles from "./AdminRightPanel.module.scss";

function mergeFooterClass(extra?: string) {
  return [styles.panelFooter, extra].filter(Boolean).join(" ").trim() || undefined;
}

type FooterRoot = "footer" | "div";

/** Một hàng nút căn phải, cùng chiều cao / min-width (không bắt 3 cột). */
export function AdminRightPanelFooterSimple({
  children,
  as = "footer",
  className,
}: {
  children: ReactNode;
  /** `div`: nhúng trong panel (tránh `<footer>` lồng + class bleed). */
  as?: FooterRoot;
  className?: string;
}) {
  const Root = as === "div" ? "div" : "footer";
  return (
    <Root
      className={mergeFooterClass(className)}
      {...(as === "div" ? { role: "group" as const } : {})}
    >
      <div className={styles.panelFooterActions}>{children}</div>
    </Root>
  );
}

/**
 * Ba ô: Tạo → Cập nhật → Xóa (ô trống nếu không dùng).
 * - Chỉ **Cập nhật + Xóa**: một hàng (không lưới 3 cột).
 * - Chỉ **Tạo + Hủy** (không Cập nhật): hai nút chia đều, cho phép xuống dòng — tránh cột giữa trống ép nút.
 */
export function AdminRightPanelFooterCrud({
  create,
  update,
  delete: del,
  as = "footer",
  className,
}: {
  create?: ReactNode;
  update?: ReactNode;
  delete?: ReactNode;
  as?: FooterRoot;
  className?: string;
}) {
  const Root = as === "div" ? "div" : "footer";
  const updateDeleteOnly = !create && update != null && del != null;
  const createDeleteOnly = create != null && del != null && update == null;

  return (
    <Root
      className={mergeFooterClass(className)}
      {...(as === "div" ? { role: "group" as const } : {})}
    >
      {updateDeleteOnly ? (
        <div className={styles.panelFooterUpdateDelete}>
          {update}
          {del}
        </div>
      ) : createDeleteOnly ? (
        <div className={styles.panelFooterCreateDelete}>
          {create}
          {del}
        </div>
      ) : (
        <div className={styles.panelFooterCrudGrid}>
          <div className={styles.panelFooterCrudCell}>{create ?? null}</div>
          <div className={styles.panelFooterCrudCell}>{update ?? null}</div>
          <div className={styles.panelFooterCrudCell}>{del ?? null}</div>
        </div>
      )}
    </Root>
  );
}
