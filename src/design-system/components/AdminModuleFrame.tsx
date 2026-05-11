"use client";

import { memo } from "react";
import cls from "./AdminModuleFrame.module.scss";

export type AdminModuleFrameProps = {
  header: React.ReactNode;
  filters?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Bố cục chuẩn admin: Header (sticky) → Filter → Nội dung (scroll) → Footer (sticky, hành động).
 * Chiều rộng max cố định; flex min-height:0 để không nhảy khi nội dung đổi.
 */
function AdminModuleFrameInner({ header, filters, footer, children, className }: AdminModuleFrameProps) {
  return (
    <div className={[cls.shell, className].filter(Boolean).join(" ")}>
      <header className={cls.header}>{header}</header>
      {filters != null ? <div className={cls.filters}>{filters}</div> : null}
      <div className={cls.scroll}>{children}</div>
      {footer != null ? <footer className={cls.footer}>{footer}</footer> : null}
    </div>
  );
}

export const AdminModuleFrame = memo(AdminModuleFrameInner);

AdminModuleFrame.displayName = "AdminModuleFrame";
