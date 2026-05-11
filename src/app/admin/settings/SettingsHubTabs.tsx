"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SettingsHubTabs.module.scss";

const TABS = [
  { href: "/admin/settings/theme", label: "Theme & cửa hàng" },
  { href: "/admin/settings/integration", label: "Tích hợp hệ thống" },
  { href: "/admin/settings/keys", label: "Khóa & biến" },
] as const;

function tabActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export function SettingsHubTabs() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Cài đặt — chọn mục">
      <div className={styles.inner}>
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            prefetch={false}
            className={tabActive(pathname, t.href) ? styles.tabActive : styles.tab}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
