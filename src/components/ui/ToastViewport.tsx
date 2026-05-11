"use client";

import { useEffect, useState } from "react";
import { APP_TOAST_EVENT, type AppToastDetail } from "@/lib/app-toast";
import styles from "./ToastViewport.module.scss";

type Toast = { id: number; message: string; variant: "success" | "error" };

let toastId = 0;

const DEFAULT_MS = 5200;

export type ToastViewportProps = {
  surface: "shop" | "admin";
  /** Chỉ dùng khi `surface="admin"`. */
  adminDark?: boolean;
  /** Thời hiển thị mỗi toast (ms). */
  durationMs?: number;
};

export function ToastViewport({ surface, adminDark = false, durationMs = DEFAULT_MS }: ToastViewportProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const ce = e as CustomEvent<AppToastDetail>;
      const d = ce.detail;
      if (!d?.message?.trim()) return;
      const id = ++toastId;
      const variant = d.variant === "error" ? "error" : "success";
      setToasts((prev) => [...prev, { id, message: d.message.trim(), variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    }
    window.addEventListener(APP_TOAST_EVENT, onToast as EventListener);
    return () => window.removeEventListener(APP_TOAST_EVENT, onToast as EventListener);
  }, [durationMs]);

  if (toasts.length === 0) return null;

  return (
    <div
      className={styles.viewport}
      aria-live="polite"
      aria-relevant="additions"
      data-surface={surface}
      data-admin-dark={surface === "admin" && adminDark ? "true" : undefined}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${styles.toast} ${t.variant === "error" ? styles.toastErr : styles.toastOk}`}
          role="status"
        >
          <span
            className={t.variant === "error" ? `${styles.mark} ${styles.markErr}` : `${styles.mark} ${styles.markOk}`}
            aria-hidden
          >
            {t.variant === "error" ? "!" : "OK"}
          </span>
          <span className={styles.toastText}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
