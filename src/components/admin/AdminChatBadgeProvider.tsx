"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Đồng bộ an toàn nếu miss push Redis (hiếm). Không poll nhanh — realtime qua SSE.
 */
const BADGE_SAFETY_REFRESH_MS = 180_000;

const ChatBadgeTotalContext = createContext(0);

export function AdminChatBadgeProvider({ children }: { children: ReactNode }) {
  const [total, setTotal] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  const fetchBadge = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/chat/badge", { credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (typeof data.total === "number") setTotal(data.total);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let safetyTimer: ReturnType<typeof setInterval> | null = null;
    let attempt = 0;

    const backoff = () => Math.min(30_000, 1500 * 2 ** Math.min(attempt, 4));

    function clearReconnect() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    }

    function closeEs() {
      clearReconnect();
      esRef.current?.close();
      esRef.current = null;
    }

    function scheduleReconnect() {
      if (cancelled) return;
      attempt += 1;
      clearReconnect();
      reconnectTimer = setTimeout(() => connectEs(), backoff());
    }

    function connectEs() {
      if (cancelled || document.visibilityState !== "visible") return;
      closeEs();
      const es = new EventSource("/api/admin/chat/badge-events");
      esRef.current = es;
      es.onopen = () => {
        attempt = 0;
      };
      es.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data) as { type?: string; total?: number };
          if (d?.type === "badge" && typeof d.total === "number") setTotal(d.total);
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => {
        closeEs();
        void fetchBadge();
        scheduleReconnect();
      };
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        attempt = 0;
        void fetchBadge();
        connectEs();
      } else {
        closeEs();
      }
    }

    void fetchBadge();
    if (document.visibilityState === "visible") {
      connectEs();
    }

    safetyTimer = setInterval(() => {
      if (document.visibilityState === "visible") void fetchBadge();
    }, BADGE_SAFETY_REFRESH_MS);

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      closeEs();
      if (safetyTimer) clearInterval(safetyTimer);
    };
  }, [fetchBadge]);

  return <ChatBadgeTotalContext.Provider value={total}>{children}</ChatBadgeTotalContext.Provider>;
}

export function useAdminChatUnreadTotal(): number {
  return useContext(ChatBadgeTotalContext);
}
