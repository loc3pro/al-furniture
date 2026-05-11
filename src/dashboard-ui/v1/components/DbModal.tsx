"use client";

import type { ReactNode } from "react";

export type DbModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Wider modal (e.g. forms with side-by-side on desktop) */
  wide?: boolean;
};

export function DbModal({ open, title, onClose, children, wide }: DbModalProps) {
  if (!open) return null;
  return (
    <div
      className="db-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="db-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="db-modal-title"
        style={wide ? { maxWidth: 720 } : undefined}
      >
        <div className="db-modal__head">
          <h2 id="db-modal-title" className="db-modal__title">
            {title}
          </h2>
          <button type="button" className="db-modal__close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>
        <div className="db-modal__body">{children}</div>
      </div>
    </div>
  );
}
