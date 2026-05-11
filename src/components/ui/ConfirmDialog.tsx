"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import styles from "./ConfirmDialog.module.scss";

export type ConfirmOptions = {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Nút xác nhận đỏ — nên bật cho xóa / thao tác không hoàn tác */
  danger?: boolean;
};

export type ConfirmInput = string | ConfirmOptions;

type OpenState = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger: boolean;
};

function normalize(input: ConfirmInput): OpenState {
  if (typeof input === "string") {
    return { title: "Xác nhận", message: input, danger: false };
  }
  return {
    title: input.title ?? "Xác nhận",
    message: input.message,
    confirmLabel: input.confirmLabel,
    cancelLabel: input.cancelLabel,
    danger: input.danger ?? false,
  };
}

type AskConfirm = (input: ConfirmInput) => Promise<boolean>;

const ConfirmCtx = createContext<AskConfirm | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<OpenState | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const askConfirm = useCallback((input: ConfirmInput) => {
    return new Promise<boolean>((resolve) => {
      const prev = resolveRef.current;
      if (prev) prev(false);
      resolveRef.current = resolve;
      setOpen(normalize(input));
    });
  }, []);

  const finish = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setOpen(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

  const titleId = useId();
  const descId = useId();

  const dialog =
    mounted &&
    open &&
    createPortal(
      <div className={styles.backdrop} role="presentation" onClick={() => finish(false)}>
        <div
          className={styles.modal}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id={titleId} className={styles.title}>
            {open.title}
          </h2>
          <div id={descId} className={styles.body}>
            {open.message}
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btn}
              autoFocus={open.danger}
              onClick={() => finish(false)}
            >
              {open.cancelLabel ?? "Huỷ"}
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.primary} ${open.danger ? styles.danger : ""}`}
              autoFocus={!open.danger}
              onClick={() => finish(true)}
            >
              {open.confirmLabel ?? "Đồng ý"}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <ConfirmCtx.Provider value={askConfirm}>
      {children}
      {dialog}
    </ConfirmCtx.Provider>
  );
}

export function useConfirm(): AskConfirm {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmDialogProvider");
  }
  return ctx;
}
