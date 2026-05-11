"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Menu, MessageCircle } from "lucide-react";
import { useAdminChatUnreadTotal } from "@/components/admin/AdminChatBadgeProvider";
import { ADMIN_NAV_FLAT } from "@/components/admin/admin-nav-config";
import styles from "./AdminMobileChrome.module.scss";

type MeUser = {
  name: string | null;
  email: string | null;
  role: string;
  avatarUrl: string | null;
};

const SEGMENT_FALLBACK: Record<string, string> = {
  new: "Tạo mới",
  edit: "Sửa",
  settings: "Cài đặt",
  chat: "Chat",
  faq: "FAQ",
  audit: "Nhật ký",
  reports: "Báo cáo",
  banners: "Banner",
  blog: "Blog",
  categories: "Danh mục",
  products: "Sản phẩm",
  orders: "Đơn hàng",
  users: "Người dùng",
  homepage: "Trang chủ",
  "navigation-menu": "Menu header",
  "shop-the-look": "Shop the Look",
  "stores-banking": "Cửa hàng & NH",
  "spin-wheel": "Vòng quay",
  "html-suggestions": "Gợi ý HTML",
};

function looksLikeId(seg: string): boolean {
  if (/^[a-f0-9-]{20,}$/i.test(seg)) return true;
  if (/^c[a-z0-9]{6,}$/i.test(seg)) return true;
  if (/^\d{10,}$/.test(seg)) return true;
  return false;
}

function labelForHref(href: string, segment: string): string {
  const fromNav = ADMIN_NAV_FLAT.find((x) => x.href === href);
  if (fromNav) return fromNav.label;
  if (SEGMENT_FALLBACK[segment]) return SEGMENT_FALLBACK[segment];
  if (looksLikeId(segment)) return "Chi tiết";
  return segment.replace(/-/g, " ");
}

function buildCrumbs(pathname: string | null): { href: string; label: string }[] {
  if (!pathname) return [{ href: "/admin", label: "Tổng quan" }];
  const path = pathname.split("?")[0]?.replace(/\/+$/, "") || "/admin";
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0 || parts[0] !== "admin") {
    return [{ href: "/admin", label: "Tổng quan" }];
  }
  const out: { href: string; label: string }[] = [];
  let acc = "";
  for (let i = 0; i < parts.length; i++) {
    acc += `/${parts[i]}`;
    const seg = parts[i]!;
    out.push({ href: acc, label: labelForHref(acc, seg) });
  }
  return out;
}

export function AdminMobileChrome({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const chatUnread = useAdminChatUnreadTotal();
  const [me, setMe] = useState<MeUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "same-origin" });
        const d = (await r.json().catch(() => ({}))) as { user?: MeUser | null };
        if (!cancelled) setMe(d.user ?? null);
      } catch {
        if (!cancelled) setMe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const crumbs = useMemo(() => buildCrumbs(pathname), [pathname]);
  const displayName = (me?.name?.trim() || me?.email?.trim() || "Admin").slice(0, 28);
  const roleLabel =
    me?.role === "ADMIN"
      ? "Quản trị"
      : me?.role === "SELLER"
        ? "Nhân viên bán hàng"
        : me?.role === "USER"
          ? "Khách hàng"
          : (me?.role ?? "").trim();

  const settingsLabel = [displayName, roleLabel].filter(Boolean).join(" · ") || "Cài đặt";

  return (
    <div className={styles.root} data-admin-mobile-chrome>
      <div className={styles.row}>
        <button type="button" className={styles.menuBtn} aria-label="Mở menu điều hướng" onClick={onOpenMenu}>
          <Menu size={20} strokeWidth={2.25} aria-hidden />
        </button>
        <nav className={styles.crumbs} aria-label="Đường dẫn">
          {crumbs.map((c, i) => (
            <Fragment key={c.href}>
              {i > 0 ? (
                <span className={styles.sep} aria-hidden>
                  /
                </span>
              ) : null}
              {i === crumbs.length - 1 ? (
                <span className={styles.crumbCurrent} title={c.label}>
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className={styles.crumbLink} prefetch={false} title={c.label}>
                  {c.label}
                </Link>
              )}
            </Fragment>
          ))}
        </nav>
        <Link
          href="/admin/chat"
          className={styles.chatLink}
          aria-label={chatUnread > 0 ? `Chat — ${chatUnread} tin chờ` : "Chat khách hàng"}
          title="Chat"
        >
          <MessageCircle size={20} strokeWidth={2.1} aria-hidden />
          {chatUnread > 0 ? (
            <span className={styles.chatBadge}>{chatUnread > 99 ? "99+" : String(chatUnread)}</span>
          ) : null}
        </Link>
        <Link
          href="/admin/settings"
          className={styles.userLink}
          title={`Cài đặt — ${settingsLabel}`}
          aria-label={`Cài đặt & tích hợp — ${settingsLabel}`}
          prefetch={false}
        >
          <span className={styles.avatar} aria-hidden>
            {me?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL từ session
              <img src={me.avatarUrl} alt="" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </span>
        </Link>
      </div>
    </div>
  );
}
