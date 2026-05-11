"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import styles from "./AdminRightPanel.module.scss";

export type AdminPanelSide = "left" | "right";

type PanelSlot = {
  title: string | null;
  content: ReactNode;
  /** Thanh nút cố định đáy panel — thường dùng `AdminRightPanelFooterSimple` / `AdminRightPanelFooterCrud`. */
  footer?: ReactNode;
};

export type PanelPayload = {
  title?: string | null;
  content: ReactNode;
  footer?: ReactNode;
  /** Mặc định phải — mở một bên thì đóng bên kia. Trái: xem `openLeftAssistPanel`. */
  side?: AdminPanelSide;
};

export type AdminRightPanelContextValue = {
  open: boolean;
  leftSlot: PanelSlot | null;
  rightSlot: PanelSlot | null;
  openPanel: (payload: PanelPayload) => void;
  /** Panel trái gợi ý HTML — không đóng panel phải (vd. form tạo SP đang mở). */
  openLeftAssistPanel: (payload: PanelPayload) => void;
  closePanel: () => void;
  /** Chỉ đóng panel trái (khi mở đôi). */
  closeLeft: () => void;
  /** Chỉ đóng panel phải (khi mở đôi). */
  closeRight: () => void;
};

const AdminRightPanelContext = createContext<AdminRightPanelContextValue | null>(null);

export function AdminRightPanelProvider({ children }: { children: ReactNode }) {
  const [leftSlot, setLeftSlot] = useState<PanelSlot | null>(null);
  const [rightSlot, setRightSlot] = useState<PanelSlot | null>(null);

  const open = leftSlot !== null || rightSlot !== null;

  const closePanel = useCallback(() => {
    setLeftSlot(null);
    setRightSlot(null);
  }, []);

  const closeLeft = useCallback(() => {
    setLeftSlot(null);
  }, []);

  const closeRight = useCallback(() => {
    setRightSlot(null);
  }, []);

  const openPanel = useCallback((payload: PanelPayload) => {
    const side = payload.side ?? "right";
    const slot: PanelSlot = {
      title: payload.title ?? null,
      content: payload.content,
      ...(payload.footer !== undefined ? { footer: payload.footer } : {}),
    };
    if (side === "left") {
      setLeftSlot(slot);
      setRightSlot(null);
    } else {
      setRightSlot(slot);
      setLeftSlot(null);
    }
  }, []);

  const openLeftAssistPanel = useCallback((payload: PanelPayload) => {
    setLeftSlot({
      title: payload.title ?? null,
      content: payload.content,
      ...(payload.footer !== undefined ? { footer: payload.footer } : {}),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePanel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closePanel]);

  useEffect(() => {
    const html = document.documentElement;
    if (!open) {
      html.removeAttribute("data-admin-side-panel-open");
      return;
    }
    html.setAttribute("data-admin-side-panel-open", "true");
    return () => html.removeAttribute("data-admin-side-panel-open");
  }, [open]);

  const value = useMemo(
    () => ({
      open,
      leftSlot,
      rightSlot,
      openPanel,
      openLeftAssistPanel,
      closePanel,
      closeLeft,
      closeRight,
    }),
    [open, leftSlot, rightSlot, openPanel, openLeftAssistPanel, closePanel, closeLeft, closeRight],
  );

  return <AdminRightPanelContext.Provider value={value}>{children}</AdminRightPanelContext.Provider>;
}

/**
 * Render qua `document.body` — tránh nằm trong `.main` / `.mainViewport` (`overflow: hidden`)
 * làm cắt nội dung panel, chồng lớp lạ, hoặc vệt mép (subpixel) giữa backdrop và panel.
 * Vị trí vẫn `position: fixed` theo viewport.
 */
export function AdminRightPanelOutlet() {
  const ctx = useContext(AdminRightPanelContext);
  if (!ctx) return null;

  const { leftSlot, rightSlot, closePanel, closeLeft, closeRight } = ctx;
  const dual = leftSlot !== null && rightSlot !== null;
  if (!leftSlot && !rightSlot) return null;

  const tree = (
    <div
      className={`${styles.root} ${dual ? styles.dual : ""}`.trim()}
      data-admin-right-panel=""
    >
      <button type="button" className={styles.backdrop} aria-label="Đóng tất cả panel" onClick={closePanel} />
      {leftSlot ? (
        <AdminDockedPanel
          side="left"
          title={leftSlot.title}
          footer={leftSlot.footer}
          onClose={dual ? closeLeft : closePanel}
          dual={dual}
        >
          {leftSlot.content}
        </AdminDockedPanel>
      ) : null}
      {rightSlot ? (
        <AdminDockedPanel
          side="right"
          title={rightSlot.title}
          footer={rightSlot.footer}
          onClose={dual ? closeRight : closePanel}
          dual={dual}
        >
          {rightSlot.content}
        </AdminDockedPanel>
      ) : null}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(tree, document.body);
}

export function useAdminRightPanel(): AdminRightPanelContextValue {
  const ctx = useContext(AdminRightPanelContext);
  if (!ctx) {
    throw new Error("useAdminRightPanel must be used inside AdminRightPanelProvider");
  }
  return ctx;
}

export function useAdminRightPanelOptional(): AdminRightPanelContextValue | null {
  return useContext(AdminRightPanelContext);
}

function AdminDockedPanel({
  side,
  title,
  footer,
  onClose,
  dual,
  children,
}: {
  side: AdminPanelSide;
  title: string | null;
  footer?: ReactNode;
  onClose: () => void;
  dual: boolean;
  children: ReactNode;
}) {
  const dock = side === "left" ? styles.panelDockLeft : styles.panelDockRight;
  const headClass = [styles.panelHead, side === "left" ? styles.panelHeadDockLeft : styles.panelHeadDockRight]
    .filter(Boolean)
    .join(" ");
  const aria = title ?? (side === "left" ? "Panel trái" : "Panel phải");
  const dualW =
    dual && side === "left" ? styles.panelWhenDualLeft : dual && side === "right" ? styles.panelWhenDualRight : "";

  return (
    <div
      className={`${styles.panel} ${dock} ${dualW}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-label={aria}
    >
      <header className={headClass}>
        {side === "left" ? (
          <>
            <button type="button" className={styles.panelCloseBtn} onClick={onClose} aria-label="Đóng panel">
              <X className={styles.panelCloseIcon} aria-hidden strokeWidth={2.25} />
            </button>
            <h2 className={styles.panelTitle}>{title ?? "Chi tiết"}</h2>
          </>
        ) : (
          <>
            <h2 className={styles.panelTitle}>{title ?? "Chi tiết"}</h2>
            <button type="button" className={styles.panelCloseBtn} onClick={onClose} aria-label="Đóng panel">
              <X className={styles.panelCloseIcon} aria-hidden strokeWidth={2.25} />
            </button>
          </>
        )}
      </header>
      <div className={styles.panelBody}>{children}</div>
      {footer != null ? footer : null}
    </div>
  );
}
