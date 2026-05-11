"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { AdminAppearanceProvider, useAdminAppearance } from "@/components/admin/AdminAppearanceContext";
import { AdminChatBadgeProvider } from "@/components/admin/AdminChatBadgeProvider";
import { AdminMobileChrome } from "@/components/admin/AdminMobileChrome";
import { AdminShellSider } from "@/components/admin/AdminShellSider";
import { AdminRightPanelOutlet, AdminRightPanelProvider } from "@/components/admin/AdminRightPanel";
import { ToastViewport } from "@/components/ui/ToastViewport";
import { AppMessageBanner } from "@/components/layout/AppMessageBanner";
import type { AdminNavSection } from "@/components/admin/admin-nav-config";
import { ADMIN_NAV_SECTIONS } from "@/components/admin/admin-nav-config";
import styles from "@/app/admin/admin-shell.module.scss";

const ADMIN_LG_MIN_PX = 992;

function AdminShellInner({
  children,
  adminLogoUrl = null,
  adminBrandBesideText = null,
  adminShowBrandBesideLogo = false,
  adminStoreName,
  navSections = ADMIN_NAV_SECTIONS,
}: {
  children: ReactNode;
  adminLogoUrl?: string | null;
  adminBrandBesideText?: string | null;
  adminShowBrandBesideLogo?: boolean;
  adminStoreName: string;
  navSections?: AdminNavSection[];
}) {
  const { dark, density, motionReduced } = useAdminAppearance();
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const [bannerH, setBannerH] = useState(0);
  /** Cố định SSR = desktop để khớp lần hydrate; chỉnh sau mount qua matchMedia (tránh mismatch viewport). */
  const [isLgUp, setIsLgUp] = useState(true);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  const expandedW = density === "compact" ? 248 : 264;
  const railW = 72;
  const siderInnerW = isLgUp && siderCollapsed ? railW : expandedW;
  const mainOffset = isLgUp ? siderInnerW : 0;
  const mobileDrawerOpen = !isLgUp && !siderCollapsed;

  useEffect(() => {
    if (!isLgUp) setSiderCollapsed(true);
  }, [isLgUp]);

  useLayoutEffect(() => {
    const mq = window.matchMedia(`(min-width: ${ADMIN_LG_MIN_PX}px)`);
    const apply = () => setIsLgUp(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useLayoutEffect(() => {
    const el = bannerRef.current;
    if (!el) return;
    const apply = () => setBannerH(el.offsetHeight);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileDrawerOpen]);

  const shellStyle = {
    ["--admin-shell-banner-h" as string]: `${bannerH}px`,
    ["--admin-sider-inner-w" as string]: `${siderInnerW}px`,
    ["--admin-sider-expanded-w" as string]: `${expandedW}px`,
    ["--admin-sider-rail-w" as string]: `${railW}px`,
    ["--admin-main-offset" as string]: `${mainOffset}px`,
  } as CSSProperties;

  return (
    <AdminRightPanelProvider>
      <AdminChatBadgeProvider>
        <div
          className={styles.shell}
          style={shellStyle}
          data-admin-shell
          data-admin-dashboard-v1
          data-admin-sider-open={!siderCollapsed ? "true" : undefined}
          data-admin-mobile-drawer={mobileDrawerOpen ? "true" : undefined}
          data-admin-dark={dark ? "true" : undefined}
          data-admin-density={density}
          data-admin-motion={motionReduced ? "reduced" : undefined}
        >
          <div ref={bannerRef} className={styles.shellBanner} data-admin-shell-banner>
            <AppMessageBanner variant="admin" />
          </div>
          {mobileDrawerOpen ? (
            <button
              type="button"
              className={styles.shellSiderBackdrop}
              aria-label="Đóng menu"
              onClick={() => setSiderCollapsed(true)}
            />
          ) : null}
          <div className={styles.shellBody}>
            <AdminShellSider
              logoUrl={adminLogoUrl}
              brandBesideText={adminBrandBesideText}
              showBrandBesideLogo={adminShowBrandBesideLogo}
              storeName={adminStoreName}
              collapsed={siderCollapsed}
              onCollapse={setSiderCollapsed}
              isLgUp={isLgUp}
              navSections={navSections}
            />
            <div className={styles.mainColumn} data-admin-main-column>
              {!isLgUp ? <AdminMobileChrome onOpenMenu={() => setSiderCollapsed(false)} /> : null}
              <div className={styles.mainStage}>
                <main className={styles.main}>
                  <div className={styles.mainViewport}>{children}</div>
                </main>
                <AdminRightPanelOutlet />
              </div>
            </div>
          </div>
          <ToastViewport surface="admin" adminDark={dark} durationMs={4500} />
        </div>
      </AdminChatBadgeProvider>
    </AdminRightPanelProvider>
  );
}

export function AdminShell({
  children,
  adminLogoUrl = null,
  adminBrandBesideText = null,
  adminShowBrandBesideLogo = false,
  adminStoreName,
  navSections = ADMIN_NAV_SECTIONS,
}: {
  children: ReactNode;
  adminLogoUrl?: string | null;
  adminBrandBesideText?: string | null;
  adminShowBrandBesideLogo?: boolean;
  adminStoreName: string;
  navSections?: AdminNavSection[];
}) {
  return (
    <AdminAppearanceProvider>
      <AdminShellInner
        adminLogoUrl={adminLogoUrl}
        adminBrandBesideText={adminBrandBesideText}
        adminShowBrandBesideLogo={adminShowBrandBesideLogo}
        adminStoreName={adminStoreName}
        navSections={navSections}
      >
        {children}
      </AdminShellInner>
    </AdminAppearanceProvider>
  );
}
