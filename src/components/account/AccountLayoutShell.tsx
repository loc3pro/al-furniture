"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Gift, Globe, ListOrdered, LogOut, Mail, MapPin, Star, User } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { CHAT_AVATAR_USER } from "@/lib/chat-constants";
import { resolveUserAvatarSrc } from "@/lib/user-avatar";
import { useAccount } from "./AccountContext";
import { AccountShellSkeleton } from "./AccountShellSkeleton";
import styles from "./accountShell.module.scss";

const nav = [
  { href: "/account", label: "Thông tin tài khoản", icon: User, exact: true },
  { href: "/account/orders", label: "Lịch sử đơn hàng", icon: ListOrdered },
  { href: "/account/coupons", label: "Voucher & mã giảm", icon: Gift },
  { href: "/account/addresses", label: "Địa chỉ đã lưu", icon: MapPin },
  { href: "/account/reviews", label: "Đánh giá đơn hàng", icon: Star },
];

export function AccountLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me } = useAccount();

  useEffect(() => {
    if (me === null) {
      router.replace("/auth/login?next=/account");
    }
  }, [me, router]);

  if (me === undefined) {
    return <AccountShellSkeleton />;
  }

  if (!me) return null;

  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const sidebarAvatarSrc = resolveUserAvatarSrc(me.avatarUrl, CHAT_AVATAR_USER);

  return (
    <div className={`container ${styles.shell}`} data-account-shell>
      <aside className={styles.sidebar} data-account-print-hide>
        <div className={styles.userBlock}>
          <Link href="/account" className={styles.avatar} title="Thông tin tài khoản" aria-label="Thông tin tài khoản">
            {/* eslint-disable-next-line @next/next/no-img-element — URL đã lọc qua resolveUserAvatarSrc */}
            <img src={sidebarAvatarSrc} alt="" loading="lazy" decoding="async" />
          </Link>
          <div className={styles.userMeta}>
            <p className={styles.userName}>{me.name?.trim() || "Khách"}</p>
            <p className={styles.userEmail}>{me.email ?? "—"}</p>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Tài khoản">
          {nav.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
              >
                <Icon size={18} className={styles.navIcon} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        {(contactEmail || siteUrl) && (
          <div className={styles.contact}>
            {contactEmail ? (
              <div className={styles.contactRow}>
                <Mail size={14} aria-hidden style={{ marginTop: 2, flexShrink: 0 }} />
                <span>
                  Email liên hệ:{" "}
                  <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                </span>
              </div>
            ) : null}
            {siteUrl ? (
              <div className={styles.contactRow}>
                <Globe size={14} aria-hidden style={{ marginTop: 2, flexShrink: 0 }} />
                <span>
                  Website:{" "}
                  <a href={siteUrl} target="_blank" rel="noreferrer">
                    {siteUrl.replace(/^https?:\/\//, "")}
                  </a>
                </span>
              </div>
            ) : null}
          </div>
        )}

        <LogoutButton className={styles.logout} unstyled redirectTo="/" aria-label="Đăng xuất">
          <span className={styles.logoutInner}>
            <LogOut size={18} aria-hidden className={styles.logoutIcon} />
            <span className={styles.logoutText}>Đăng xuất</span>
          </span>
        </LogoutButton>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
