"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import {
  AppstoreOutlined,
  AuditOutlined,
  BankOutlined,
  BarChartOutlined,
  CameraOutlined,
  CodeOutlined,
  DashboardOutlined,
  FileTextOutlined,
  GiftOutlined,
  HomeOutlined,
  MenuOutlined,
  MessageOutlined,
  PictureOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  PlusCircleOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { useAdminChatUnreadTotal } from "@/components/admin/AdminChatBadgeProvider";
import { useAdminAppearance } from "@/components/admin/AdminAppearanceContext";
import { isSafeThemeAssetUrl } from "@/lib/theme-asset-url";
import {
  ADMIN_NAV_SECTIONS,
  adminNavItemActive,
  branchHasActiveChild,
  getAdminSelectedMenuKey,
  isNavBranch,
  type AdminNavBranch,
  type AdminNavLeaf,
  type AdminNavNode,
  type AdminNavSection,
} from "@/components/admin/admin-nav-config";
import styles from "@/app/admin/admin-shell.module.scss";

const NAV_ICON_BY_HREF: Record<string, ReactNode> = {
  "/admin": <DashboardOutlined />,
  "/admin/homepage": <HomeOutlined />,
  "/admin/banners": <PictureOutlined />,
  "/admin/blog": <FileTextOutlined />,
  "/admin/navigation-menu": <MenuOutlined />,
  "/admin/products": <ShoppingOutlined />,
  "/admin/categories": <AppstoreOutlined />,
  "/admin/shop-the-look": <CameraOutlined />,
  "/admin/orders": <ShoppingCartOutlined />,
  "/admin/stores-banking": <BankOutlined />,
  "/admin/users": <UserOutlined />,
  "/admin/chat": <MessageOutlined />,
  "/admin/reports": <BarChartOutlined />,
  "/admin/audit": <AuditOutlined />,
  "/admin/spin-wheel": <GiftOutlined />,
  "/admin/settings": <SettingOutlined />,
  "/admin/faq": <QuestionCircleOutlined />,
  "/admin/html-suggestions": <CodeOutlined />,
};

const BRANCH_ICON_BY_ID: Record<string, ReactNode> = {
  "nav-content": <HomeOutlined />,
  "nav-products": <ShoppingOutlined />,
  "nav-orders": <ShoppingCartOutlined />,
  "nav-customers": <UserOutlined />,
  "nav-reports": <BarChartOutlined />,
  "nav-settings": <SettingOutlined />,
};

type MeUser = {
  name: string | null;
  email: string | null;
  role: string;
  avatarUrl: string | null;
};

function itemContent(label: string, href: string, chatUnread: number): ReactNode {
  if (href === "/admin/chat" && chatUnread > 0) {
    return (
      <span className={styles.menuItemRow}>
        <span className={styles.navItemText}>{label}</span>
        <span className={styles.navBadge}>{chatUnread > 99 ? 99 : chatUnread}</span>
      </span>
    );
  }
  return <span className={styles.navItemText}>{label}</span>;
}

function collectRequiredExpandedIds(pathname: string | null, sections: AdminNavSection[]): string[] {
  const ids: string[] = [];
  for (const sec of sections) {
    for (const n of sec.items) {
      if (isNavBranch(n) && branchHasActiveChild(pathname, n)) ids.push(n.id);
    }
  }
  return ids;
}

export function AdminShellSider({
  logoUrl = null,
  brandBesideText = null,
  showBrandBesideLogo = false,
  storeName,
  collapsed,
  onCollapse,
  isLgUp,
  navSections = ADMIN_NAV_SECTIONS,
}: {
  logoUrl?: string | null;
  brandBesideText?: string | null;
  showBrandBesideLogo?: boolean;
  storeName: string;
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  isLgUp: boolean;
  navSections?: AdminNavSection[];
}) {
  const pathname = usePathname();
  const chatUnread = useAdminChatUnreadTotal();
  const { density } = useAdminAppearance();
  const [me, setMe] = useState<MeUser | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const railMode = Boolean(isLgUp && collapsed);

  useEffect(() => {
    const required = collectRequiredExpandedIds(pathname, navSections);
    if (required.length === 0) return;
    setExpandedIds((prev) => {
      const s = new Set(prev);
      required.forEach((id) => s.add(id));
      return [...s];
    });
  }, [pathname, navSections]);

  const toggleBranch = useCallback((id: string) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const branchExpanded = useCallback(
    (id: string) => expandedIds.includes(id),
    [expandedIds],
  );

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

  const safeLogo = logoUrl && isSafeThemeAssetUrl(logoUrl) ? logoUrl.trim() : null;
  const beside = (brandBesideText ?? "").trim();
  const extraWordmark = Boolean(safeLogo && showBrandBesideLogo && beside);

  const selectedKey = getAdminSelectedMenuKey(pathname);
  const chatFooterActive = adminNavItemActive(pathname, "/admin/chat");

  const displayName = (me?.name?.trim() || me?.email?.trim() || "Admin").slice(0, 32);
  const roleLabel =
    me?.role === "ADMIN" ? "Quản trị" : me?.role === "SELLER" ? "Nhân viên bán hàng" : me?.role ?? "";

  const renderLeaf = (item: AdminNavLeaf) => {
    const active = item.href === selectedKey;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={active ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
          prefetch={false}
          title={railMode ? item.label : undefined}
        >
          <span className={styles.navIcon}>{NAV_ICON_BY_HREF[item.href]}</span>
          {itemContent(item.label, item.href, chatUnread)}
        </Link>
      </li>
    );
  };

  const renderBranch = (branch: AdminNavBranch) => {
    const open = branchExpanded(branch.id);
    const childActive = branchHasActiveChild(pathname, branch);
    const firstHref = branch.children[0]?.href ?? "/admin";
    const icon = BRANCH_ICON_BY_ID[branch.id] ?? NAV_ICON_BY_HREF[firstHref];

    if (railMode) {
      const railActive = branch.children.some((c) => adminNavItemActive(pathname, c.href));
      return (
        <li key={branch.id}>
          <Link
            href={firstHref}
            className={railActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
            prefetch={false}
            title={branch.label}
          >
            <span className={styles.navIcon}>{icon}</span>
          </Link>
        </li>
      );
    }

    return (
      <li key={branch.id} className={styles.navBranch}>
        <button
          type="button"
          className={
            childActive && open
              ? `${styles.navBranchHead} ${styles.navBranchHeadActive}`
              : open
                ? `${styles.navBranchHead} ${styles.navBranchHeadOpen}`
                : styles.navBranchHead
          }
          aria-expanded={open}
          onClick={() => toggleBranch(branch.id)}
        >
          <span className={styles.navIcon}>{icon}</span>
          <span className={styles.navItemText}>{branch.label}</span>
          <ChevronRight
            size={18}
            strokeWidth={2.25}
            className={open ? `${styles.navBranchChevron} ${styles.navBranchChevronOpen}` : styles.navBranchChevron}
            aria-hidden
          />
        </button>
        {open ? (
          <ul className={styles.navSubList}>
            {branch.children.map((c) => {
              const subActive = adminNavItemActive(pathname, c.href);
              return (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    className={subActive ? `${styles.navSubLink} ${styles.navSubLinkActive}` : styles.navSubLink}
                    prefetch={false}
                  >
                    {itemContent(c.label, c.href, chatUnread)}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </li>
    );
  };

  const renderNode = (n: AdminNavNode) => (isNavBranch(n) ? renderBranch(n) : renderLeaf(n));

  return (
    <aside
      className={`${styles.shellSider} ${density === "compact" ? styles.shellSiderCompact : ""}`}
      data-admin-sider
      data-admin-sider-collapsed={collapsed ? "true" : "false"}
      data-admin-sider-rail={railMode ? "true" : undefined}
    >
      <div className={styles.siderInner}>
        {isLgUp ? (
          <button
            type="button"
            className={styles.siderEdgeCollapse}
            aria-label={collapsed ? "Mở menu" : "Thu menu"}
            onClick={() => onCollapse(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight size={16} strokeWidth={2.5} aria-hidden />
            ) : (
              <ChevronLeft size={16} strokeWidth={2.5} aria-hidden />
            )}
          </button>
        ) : null}

        <div className={styles.siderBrand}>
          <div className={styles.siderBrandMain}>
            <Link href="/admin" className={styles.siderBrandLink} title={`${storeName} — Admin`}>
              <span className={styles.siderBrandRow}>
                {safeLogo ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- theme URL from DB */}
                    <img src={safeLogo} alt="" className={styles.siderBrandLogo} />
                  </>
                ) : null}
                <span className={styles.siderStoreName}>{storeName}</span>
                {extraWordmark ? <span className={styles.siderBrandWordmark}>{beside}</span> : null}
              </span>
            </Link>
          </div>
        </div>

        <nav className={styles.navScroll} aria-label="Menu admin">
          {navSections.map((section, si) => (
            <div key={si} className={styles.navSection}>
              {railMode && si > 0 ? (
                <div className={styles.navRailSep} aria-hidden>
                  <span className={styles.navRailSepDots}>···</span>
                </div>
              ) : null}
              {section.title ? <p className={styles.navGroupTitle}>{section.title}</p> : null}
              <ul className={styles.navList}>{section.items.map((item) => renderNode(item))}</ul>
            </div>
          ))}
        </nav>

        {railMode ? (
          <div className={`${styles.siderFooter} ${styles.siderFooterRail}`}>
            <Link
              href="/admin/chat"
              className={chatFooterActive ? styles.siderFooterIconBtnActive : styles.siderFooterIconBtn}
              aria-label={chatUnread > 0 ? `Chat — ${chatUnread} tin chờ` : "Chat khách hàng"}
              title="Chat"
            >
              <MessageOutlined />
            </Link>
            <LogoutButton
              className={styles.siderFooterIconBtn}
              redirectTo="/auth/login"
              aria-label="Đăng xuất"
              title="Đăng xuất"
              unstyled
            >
              <LogOut size={18} strokeWidth={2.25} aria-hidden />
            </LogoutButton>
            <div className={styles.siderFooterRailAvatar} title={displayName}>
              <span className={styles.siderUserAvatar} aria-hidden>
                {me?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.avatarUrl} alt="" />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.siderAdminStrip}>
              <div className={styles.siderUserCard}>
                <span className={styles.chromeAvatar} aria-hidden>
                  {me?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={me.avatarUrl} alt="" />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </span>
                <div className={styles.siderUserTexts}>
                  <span className={styles.siderUserLine1}>{displayName}</span>
                  <span className={styles.siderUserLine2}>{roleLabel}</span>
                </div>
              </div>
            </div>
            <div className={styles.siderFooter}>
            <div className={styles.siderFooterStack}>
              <Link
                href="/admin/chat"
                className={chatFooterActive ? styles.siderFooterSettingsActive : styles.siderFooterSettings}
                aria-label={chatUnread > 0 ? `Chat — ${chatUnread} tin chờ` : "Chat khách hàng"}
                title="Chat"
              >
                <span className={styles.siderFooterChatRow}>
                  <span>Chat</span>
                  {chatUnread > 0 ? (
                    <span className={styles.navBadge}>{chatUnread > 99 ? 99 : chatUnread}</span>
                  ) : null}
                </span>
              </Link>
              <LogoutButton className={styles.siderLogout} redirectTo="/auth/login">
                Đăng xuất
              </LogoutButton>
            </div>
          </div>
          </>
        )}
      </div>
    </aside>
  );
}
