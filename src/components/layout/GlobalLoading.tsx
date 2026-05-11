"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { NAV_INDICATOR_FAILSAFE_MS } from "@/lib/fetch-client";
import styles from "./GlobalLoading.module.scss";

type Ctx = {
  /** Full-screen overlay — gọi khi submit form / chờ API dài */
  setOverlay: (open: boolean) => void;
};

const LoadingCtx = createContext<Ctx | null>(null);

export function useGlobalOverlayLoading(): (open: boolean) => void {
  const c = useContext(LoadingCtx);
  return useCallback((open: boolean) => c?.setOverlay(open) ?? void 0, [c]);
}

function NavigationChrome() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, setNavigating] = useState(false);
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const prevKey = useRef(routeKey);
  const navFailSafeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearNavFailSafe = useCallback(() => {
    if (navFailSafeRef.current) {
      clearTimeout(navFailSafeRef.current);
      navFailSafeRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (routeKey !== prevKey.current) {
      prevKey.current = routeKey;
      clearNavFailSafe();
      setNavigating(false);
    }
  }, [routeKey, clearNavFailSafe]);

  useEffect(() => {
    return () => clearNavFailSafe();
  }, [clearNavFailSafe]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest("a[href]");
      if (!el) return;
      const a = el as HTMLAnchorElement;
      if (a.hasAttribute("data-no-global-nav-loading")) return;
      if (a.download) return;
      if (a.target && a.target !== "" && a.target !== "_self") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const nextPath = url.pathname;
      const nextSearch = url.search;
      const currentPath = pathname;
      const currentSearch =
        searchParams.toString().length > 0 ? `?${searchParams.toString()}` : "";
      const nextFull = `${nextPath}${nextSearch}`;
      const curFull = `${currentPath}${currentSearch}`;
      if (nextFull === curFull) return;
      clearNavFailSafe();
      setNavigating(true);
      navFailSafeRef.current = setTimeout(() => {
        navFailSafeRef.current = null;
        setNavigating(false);
      }, NAV_INDICATOR_FAILSAFE_MS);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, searchParams, clearNavFailSafe]);

  return (
    <div
      className={styles.topRail}
      data-active={navigating ? "true" : undefined}
      aria-hidden
    >
      <div className={styles.topBar} />
    </div>
  );
}

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const setOverlay = useCallback((open: boolean) => setOverlayOpen(open), []);
  const value = useMemo(() => ({ setOverlay }), [setOverlay]);

  return (
    <LoadingCtx.Provider value={value}>
      <Suspense fallback={null}>
        <NavigationChrome />
      </Suspense>
      {overlayOpen ? (
        <div className={styles.overlay} role="alertdialog" aria-busy="true" aria-label="Đang xử lý">
          <div className={styles.overlayCard}>
            <Spinner size="lg" label="Đang xử lý" />
          </div>
        </div>
      ) : null}
      {children}
    </LoadingCtx.Provider>
  );
}
