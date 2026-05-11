"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { dispatchSessionRefresh } from "@/lib/session-cache-events";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: Record<string, unknown>) => void;
          prompt: (momentNotification?: (n: unknown) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export function GoogleSignIn({ redirectTo = "/" }: { redirectTo?: string }) {
  const router = useRouter();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const [apiErr, setApiErr] = useState<string | null>(null);

  const handleCredential = useCallback(
    async (credential: string) => {
      setApiErr(null);
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApiErr(typeof data.error === "string" ? data.error : "Đăng nhập Google thất bại");
        return;
      }
      dispatchSessionRefresh();
      router.refresh();
      router.push(redirectTo);
    },
    [router, redirectTo],
  );

  /** Đóng One Tap / FedCM khi rời trang — tránh AbortError khi điều hướng (vd. sang checkout). */
  useEffect(() => {
    return () => {
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, []);

  if (!clientId) {
    return (
      <p className="muted" style={{ fontSize: "0.85rem" }}>
        Thêm <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> để bật đăng nhập Google.
      </p>
    );
  }

  return (
    <>
      {apiErr ? (
        <p style={{ color: "crimson", fontSize: "0.85rem", marginBottom: "0.5rem" }}>{apiErr}</p>
      ) : null}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => {
          if (!window.google?.accounts?.id) return;
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (resp: { credential?: string }) => {
              if (resp.credential) void handleCredential(resp.credential);
            },
            auto_select: false,
            itp_support: true,
            cancel_on_tap_outside: true,
          });
          /** Không gọi prompt() ở đây: FedCM/One Tap tự mở rồi user chuyển trang → AbortError & log GSI_LOGGER. */
        }}
      />
      <button
        type="button"
        className="btn btn--ghost"
        style={{ width: "100%", justifyContent: "center" }}
        onClick={() => {
          window.google?.accounts?.id?.prompt();
        }}
      >
        Đăng nhập bằng Google
      </button>
    </>
  );
}
