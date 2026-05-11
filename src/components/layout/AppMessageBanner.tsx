"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./AppMessageBanner.module.scss";

export type AppMessageKind = "info" | "warning" | "promo";

type Props = {
  variant: "shop" | "admin";
};

function storageKey(message: string, variant: Props["variant"]) {
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = (hash << 5) - hash + message.charCodeAt(i);
    hash |= 0;
  }
  return `furniture_app_msg_${variant}_${hash}`;
}

/**
 * Banner thông báo chung — nội dung từ NEXT_PUBLIC_APP_MESSAGE (build-time).
 * Shop: NEXT_PUBLIC_APP_MESSAGE + NEXT_PUBLIC_APP_MESSAGE_KIND
 * Admin: NEXT_PUBLIC_ADMIN_APP_MESSAGE nếu có, không thì dùng APP_MESSAGE
 */
export function AppMessageBanner({ variant }: Props) {
  const rawShop = process.env.NEXT_PUBLIC_APP_MESSAGE?.trim() ?? "";
  const rawAdmin = process.env.NEXT_PUBLIC_ADMIN_APP_MESSAGE?.trim() ?? "";
  const message = variant === "admin" ? rawAdmin || rawShop : rawShop;

  const kindEnv = (process.env.NEXT_PUBLIC_APP_MESSAGE_KIND ?? "info").toLowerCase();
  const kind: AppMessageKind =
    kindEnv === "warning" || kindEnv === "promo" ? kindEnv : "info";

  const key = useMemo(() => (message ? storageKey(message, variant) : ""), [message, variant]);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!message || !key) return;
    try {
      setDismissed(localStorage.getItem(key) === "1");
    } catch {
      setDismissed(false);
    }
  }, [message, key]);

  if (!message || dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  return (
    <div
      className={styles.banner}
      data-variant={variant}
      data-kind={kind}
      role="region"
      aria-label="Thông báo"
    >
      <div className={styles.inner}>
        <p className={styles.text}>{message}</p>
        <button type="button" className={styles.dismiss} onClick={dismiss} aria-label="Đóng thông báo">
          ×
        </button>
      </div>
    </div>
  );
}
