"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fetchWithTimeout, DEFAULT_CLIENT_FETCH_TIMEOUT_MS } from "@/lib/fetch-client";
import { SESSION_REFRESH_EVENT } from "@/lib/session-cache-events";

/** Khớp payload GET /api/auth/me */
export type ShopSessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  avatarUrl: string | null;
  linkedGoogle: boolean;
  hasPassword: boolean;
};

type Status = "loading" | "ready";

type ShopSessionContextValue = {
  status: Status;
  user: ShopSessionUser | null;
  refresh: (force?: boolean) => Promise<void>;
};

const ShopSessionContext = createContext<ShopSessionContextValue | null>(null);

const STALE_MS = 45_000;

export function ShopSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<ShopSessionUser | null>(null);
  const lastOkAtRef = useRef(0);
  const inflightRef = useRef<Promise<void> | null>(null);
  const statusRef = useRef<Status>(status);
  statusRef.current = status;

  const fetchSession = useCallback(async (force = false) => {
    if (inflightRef.current) {
      await inflightRef.current;
      return;
    }

    const now = Date.now();
    if (!force && statusRef.current === "ready" && now - lastOkAtRef.current < STALE_MS) {
      return;
    }

    const run = (async () => {
      try {
        const r = await fetchWithTimeout(
          "/api/auth/me",
          { credentials: "same-origin" },
          DEFAULT_CLIENT_FETCH_TIMEOUT_MS,
        );
        const d = await r.json().catch(() => ({}));
        const u = d.user as ShopSessionUser | null | undefined;
        setUser(u ?? null);
        lastOkAtRef.current = Date.now();
      } catch {
        setUser(null);
        lastOkAtRef.current = Date.now();
      } finally {
        setStatus("ready");
      }
    })();

    inflightRef.current = run;
    try {
      await run;
    } finally {
      inflightRef.current = null;
    }
  }, []);

  useEffect(() => {
    void fetchSession(true);
  }, [fetchSession]);

  useEffect(() => {
    const onRefresh = () => {
      void fetchSession(true);
    };
    window.addEventListener(SESSION_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(SESSION_REFRESH_EVENT, onRefresh);
  }, [fetchSession]);

  /** Đồng bộ sau khi tab ngủ — chỉ khi dữ liệu đã cũ (STALE_MS). */
  useEffect(() => {
    const onFocus = () => {
      void fetchSession(false);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchSession]);

  const refresh = useCallback(async (force = true) => {
    await fetchSession(force);
  }, [fetchSession]);

  const value = useMemo<ShopSessionContextValue>(
    () => ({ status, user, refresh }),
    [status, user, refresh],
  );

  return <ShopSessionContext.Provider value={value}>{children}</ShopSessionContext.Provider>;
}

export function useShopSession(): ShopSessionContextValue {
  const v = useContext(ShopSessionContext);
  if (!v) {
    throw new Error("useShopSession must be used within ShopSessionProvider");
  }
  return v;
}
