"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./ChatImageLightbox.module.scss";

type Props = {
  src: string | null;
  onClose: () => void;
};

export function ChatImageLightbox({ src, onClose }: Props) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, onClose]);

  if (!src || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={styles.root}
      role="dialog"
      aria-modal="true"
      aria-label="Ảnh phóng to"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button type="button" className={styles.closeFab} onClick={onClose} aria-label="Đóng">
        <X size={22} strokeWidth={2} />
      </button>
      <div
        className={styles.imgWrap}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- URL động / blob */}
        <img src={src} alt="" className={styles.img} />
      </div>
    </div>,
    document.body,
  );
}
