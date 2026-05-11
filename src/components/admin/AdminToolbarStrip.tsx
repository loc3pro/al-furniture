import type { ReactNode } from "react";
import styles from "./AdminToolbarStrip.module.scss";

type Props = {
  children: ReactNode;
  className?: string;
  /** Giảm khoảng trên + bóng — dùng khi sát {@link AdminStickyPageHeader} với `joinToolbarBelow`. */
  joinHeaderAbove?: boolean;
};

/**
 * Hàng nút / tìm kiếm / lọc ngay dưới {@link AdminStickyPageHeader} — cố định khi cuộn (đặt trong {@link AdminPageLayout} `toolbar`).
 * Cùng lề ngang với header và vùng `.scroll` (`--admin-section-pad-x` trên `.main`).
 */
export function AdminToolbarStrip({ children, className, joinHeaderAbove = false }: Props) {
  return (
    <div className={[styles.root, joinHeaderAbove ? styles.joinHeaderAbove : null, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
