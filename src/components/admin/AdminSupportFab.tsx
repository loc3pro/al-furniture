"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminChatUnreadTotal } from "@/components/admin/AdminChatBadgeProvider";
import dockStyles from "@/components/messaging/MessageFabDock.module.scss";
import styles from "./AdminSupportFab.module.scss";

/** FAB vào hội thoại admin — cùng vị trí bottom-right với chat cửa hàng */
export function AdminSupportFab() {
  const pathname = usePathname();
  const total = useAdminChatUnreadTotal();

  if (pathname === "/admin/chat") return null;

  return (
    <Link
      href="/admin/chat"
      className={`${dockStyles.dock} ${styles.fab}`}
      aria-label={total > 0 ? `${total} tin nhắn chờ` : "Tin nhắn khách hàng"}
    >
      <span className={styles.inner}>
        <span className={styles.label}>Tin nhắn</span>
        {total > 0 ? (
          <span className={`${styles.badge} ${styles.badgePulse}`}>
            {total > 99 ? "99+" : total}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
