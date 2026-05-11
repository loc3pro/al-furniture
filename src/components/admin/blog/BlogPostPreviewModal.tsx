"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useState } from "react";
import { prepareShopHtmlForRender } from "@/lib/sanitize-shop-html";
import styles from "./BlogPostPreviewModal.module.scss";

export type BlogPostPreviewPayload = {
  title: string;
  authorName: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  content: string;
};

export function BlogPostPreviewModal({
  open,
  onClose,
  payload,
}: {
  open: boolean;
  onClose: () => void;
  payload: BlogPostPreviewPayload | null;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const html = useMemo(() => prepareShopHtmlForRender(payload?.content ?? ""), [payload?.content]);

  const publishLabel = useMemo(() => {
    if (!payload?.publishedAt) return "—";
    const t = Date.parse(payload.publishedAt);
    if (Number.isNaN(t)) return "—";
    return new Date(t).toLocaleDateString("vi-VN");
  }, [payload?.publishedAt]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!mounted) return null;
  if (!open || !payload) return null;

  const modal = (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Xem trước nội dung
          </h2>
          <button type="button" className={`btn btn--secondary ${styles.closeBtn}`} onClick={onClose}>
            Đóng
          </button>
        </div>
        <p className={styles.hint}>Gần giống trang public — ảnh/video chỉ hiện nếu URL đúng.</p>
        <div className={styles.scrollBody}>
          <header className={styles.meta}>
            <span>
              {payload.authorName.trim() || "—"} · {publishLabel}
            </span>
            <h3 className={styles.articleTitle}>{payload.title.trim() || "Tiêu đề bài viết"}</h3>
          </header>
          {payload.thumbnailUrl ? (
            <div className={styles.thumbWrap}>
              {/* Preview admin chấp nhận mọi URL (http/https, đường dẫn tương đối, blob: cho ảnh chưa upload) — không qua loader Next */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={payload.thumbnailUrl} alt="" className={styles.thumbImg} />
            </div>
          ) : null}
          {payload.content.trim() ? (
            <div className="blog-content" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <p className={styles.empty}>Chưa có nội dung trong ô soạn thảo.</p>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
