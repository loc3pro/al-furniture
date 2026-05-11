"use client";

import type { ReactNode } from "react";
import cls from "./AdminSearchFilterRow.module.scss";

export type AdminSearchFilterRowProps = {
  search: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Ô tìm trái — nhóm select lọc căn phải (kiểu danh sách sản phẩm). */
  filtersAlignEnd?: boolean;
};

export function AdminSearchFilterRow({
  search,
  filters,
  actions,
  className,
  filtersAlignEnd = false,
}: AdminSearchFilterRowProps) {
  return (
    <div className={[cls.root, filtersAlignEnd ? cls.rootFiltersEnd : null, className].filter(Boolean).join(" ")}>
      <div className={cls.search}>{search}</div>
      {filters != null ? <div className={cls.filters}>{filters}</div> : null}
      {actions != null ? <div className={cls.actions}>{actions}</div> : null}
    </div>
  );
}
