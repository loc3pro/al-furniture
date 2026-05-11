"use client";

import { useEffect, useRef } from "react";
import type { ContentLocale } from "@/lib/content-locale";

/** Ghi nhận lượt xem qua API (cookie dedup) — tránh tăng viewCount mỗi lần SSR/prefetch. */
export function ProductViewRecorder({
  productId,
  locale,
}: {
  productId: string;
  locale: ContentLocale;
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void fetch(`/api/${locale}/products/${encodeURIComponent(productId)}/record-view`, {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => {
      /* ignore */
    });
  }, [productId, locale]);

  return null;
}
