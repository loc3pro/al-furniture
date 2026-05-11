import type { ReactNode } from "react";
import styles from "./AdminPageLayout.module.scss";

type Props = {
  /** Thanh tiêu đề — thường là `<AdminStickyPageHeader>` (mặc định pin=&quot;frame&quot;). */
  header?: ReactNode;
  /** Nút / tìm kiếm / lọc ngay dưới header — thường bọc `<AdminToolbarStrip>`, cố định khi cuộn. */
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  scrollClassName?: string;
};

/**
 * Bố cục admin chuẩn: header cố định phía trên cột nội dung, tùy chọn toolbar cố định ngay dưới header,
 * phần còn lại cuộn trong khối scroll — không phụ thuộc `position:sticky` trên `document`.
 */
export function AdminPageLayout({ header, toolbar, children, className, scrollClassName }: Props) {
  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      {header != null ? <div data-admin-print-hide>{header}</div> : null}
      {toolbar != null ? <div data-admin-print-hide>{toolbar}</div> : null}
      <div className={[styles.scroll, scrollClassName].filter(Boolean).join(" ")}>{children}</div>
    </div>
  );
}
