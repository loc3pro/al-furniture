import type { ReactNode } from "react";
import styles from "./AdminStickyPageHeader.module.scss";

type Props = {
  children: ReactNode;
  /** Extra class on the header root (page module CSS). */
  className?: string;
  /** `surface` = thẻ trắng (mặc định); `muted` = nền --admin-bg. */
  variant?: "surface" | "muted";
  /**
   * `frame` — đặt phía trên vùng cuộn (kết hợp `AdminPageLayout`).
   * `scroll` — sticky trong khối đã có overflow:auto (toolbar trong form dài).
   */
  pin?: "frame" | "scroll";
  /** Bỏ gạch dưới + bóng riêng — dùng khi ngay dưới là `AdminToolbarStrip` (một section liền). */
  joinToolbarBelow?: boolean;
};

/** Thanh tiêu đề / toolbar đầu trang admin — đồng bộ với AdminPageLayout. */
export function AdminStickyPageHeader({
  children,
  className,
  variant = "surface",
  pin = "frame",
  joinToolbarBelow = false,
}: Props) {
  let base: string;
  if (variant === "muted") {
    base = pin === "scroll" ? styles.rootMutedScroll : styles.rootMutedFrame;
  } else {
    base = pin === "scroll" ? styles.rootScroll : styles.rootFrame;
  }
  return (
    <div className={[base, joinToolbarBelow ? styles.joinToolbarBelow : null, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
