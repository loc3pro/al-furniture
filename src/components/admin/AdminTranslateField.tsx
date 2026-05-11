"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AdminTinyMceEditor } from "@/components/admin/AdminTinyMceEditor";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { viHtmlShouldSkipAutoTranslate } from "@/lib/vi-html-skip-auto-translate";
import { Spinner } from "@/components/ui/Spinner";
import styles from "./AdminTranslateField.module.scss";

const DEBOUNCE_MS = 500;

export type AdminTranslateFieldProps = {
  viLabel?: string;
  enLabel?: string;
  viValue: string;
  enValue: string;
  onViChange: (next: string) => void;
  onEnChange: (next: string) => void;
  disabled?: boolean;
  /** > 1 → textarea */
  rows?: number;
  viMaxLength?: number;
  enMaxLength?: number;
  className?: string;
  autoFocusVi?: boolean;
  /** Editor HTML (TinyMCE) — tự dịch VI→EN qua LibreTranslate `format: html` (giữ thẻ). */
  richText?: boolean;
  /** Chiều cao editor rich (px) */
  richMinHeight?: number;
  /**
   * Khi true: nếu `viValue` có thẻ HTML cấu trúc/nhúng (bảng, ảnh, script…) thì không gọi dịch.
   * Mặc định bằng `richText` — blog/textarea song ngữ có thể truyền `true` dù không dùng TinyMCE.
   */
  skipAutoTranslateWhenStructuralHtml?: boolean;
};

/**
 * Cặp ô VI / EN: gõ VI → debounce 500ms → POST /api/translate → điền EN.
 * Rich text: chỉ tự dịch sau khi user đã chỉnh VI (tránh TinyMCE sinh HTML gây dịch nền).
 * Có thẻ HTML cấu trúc/nhúng trong VI → không gọi API dịch (giữ EN do user chỉnh).
 * Admin sửa EN thì không ghi đè tự động (trạng thái cục bộ đến khi remount).
 */
export function AdminTranslateField({
  viLabel = "Tiếng Việt",
  enLabel = "English",
  viValue,
  enValue,
  onViChange,
  onEnChange,
  disabled,
  rows = 3,
  viMaxLength,
  enMaxLength,
  className,
  autoFocusVi,
  richText,
  richMinHeight = 320,
  skipAutoTranslateWhenStructuralHtml,
}: AdminTranslateFieldProps) {
  const fieldId = useId();
  const viFieldId = `${fieldId}-vi`;
  const enFieldId = `${fieldId}-en`;
  const debouncedVi = useDebouncedValue(viValue, DEBOUNCE_MS);
  const [enEdited, setEnEdited] = useState(false);
  const viTouchedRef = useRef(false);
  const requestGenRef = useRef(0);
  const [translating, setTranslating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const multiline = rows > 1;
  const InputTag = multiline ? "textarea" : "input";

  const onViInput = useCallback(
    (next: string) => {
      viTouchedRef.current = true;
      onViChange(next);
    },
    [onViChange],
  );

  const onEnInput = useCallback(
    (next: string) => {
      setEnEdited(true);
      onEnChange(next);
    },
    [onEnChange],
  );

  const enRef = useRef(enValue);
  enRef.current = enValue;

  /** Tránh phụ thuộc identity `onEnChange` (form thường truyền inline) — mỗi re-render (vd. mở panel gợi ý HTML) không được gọi lại effect dịch. */
  const onEnChangeRef = useRef(onEnChange);
  onEnChangeRef.current = onEnChange;

  const checkStructuralHtml =
    skipAutoTranslateWhenStructuralHtml ?? Boolean(richText);

  useEffect(() => {
    if (disabled) return;
    /** Đã chỉnh EN và còn nội dung → không ghi đè tự động; EN trống (kể cả user xóa hết) → cho dịch lại từ VI. */
    if (enEdited && enRef.current.trim()) return;

    /**
     * EN trống → dịch từ VI ngay (kể cả rich text / mở form sửa), không cần chạm ô VI trước.
     * EN đã có: chỉ đồng bộ khi user đã sửa VI (tránh dịch nền khi mở form có bản dịch sẵn).
     */
    const allowAuto = viTouchedRef.current || !enRef.current.trim();
    if (!allowAuto) return;

    const q = debouncedVi.trim();
    if (!q) {
      setTranslating(false);
      setErr(null);
      onEnChangeRef.current("");
      return;
    }

    if (checkStructuralHtml && viHtmlShouldSkipAutoTranslate(debouncedVi)) {
      setTranslating(false);
      setErr(null);
      return;
    }

    requestGenRef.current += 1;
    const gen = requestGenRef.current;
    setTranslating(true);
    setErr(null);

    void (async () => {
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            text: debouncedVi,
            format: richText ? "html" : "auto",
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          translated?: string;
          error?: string;
        };
        if (gen !== requestGenRef.current) return;
        if (!res.ok) {
          setErr(data.error ?? "Không dịch được");
          return;
        }
        if (typeof data.translated === "string") {
          onEnChangeRef.current(data.translated);
        }
      } catch {
        if (gen !== requestGenRef.current) return;
        setErr("Lỗi mạng");
      } finally {
        if (gen === requestGenRef.current) {
          setTranslating(false);
        }
      }
    })();
  }, [checkStructuralHtml, debouncedVi, disabled, enEdited, richText]);

  const enBusy = translating || disabled;

  if (richText) {
    return (
      <div className={`${styles.wrap} ${styles.wrapRich} ${className ?? ""}`.trim()}>
        <div className={styles.row}>
          <span className={styles.labelOnly}>{viLabel}</span>
          <AdminTinyMceEditor
            value={viValue}
            onChange={(v) => onViInput(v)}
            disabled={disabled}
            minHeight={richMinHeight}
            placeholder="Mô tả (Tiếng Việt) — hoặc Mã HTML"
          />
        </div>

        <div className={styles.row}>
          <span className={styles.labelOnly}>{enLabel}</span>
          <div className={`${styles.enInputShell} ${styles.enInputShellRich}`.trim()}>
            <AdminTinyMceEditor
              value={enValue}
              onChange={(v) => onEnInput(v)}
              disabled={enBusy}
              minHeight={richMinHeight}
              placeholder="Mô tả (English)"
            />
            {translating ? (
              <div className={styles.translatingOverlay} aria-live="polite">
                <Spinner size="sm" label="Đang dịch sang tiếng Anh" />
              </div>
            ) : null}
          </div>
        </div>

        {err ? <p className={styles.err}>{err}</p> : null}
      </div>
    );
  }

  return (
    <div className={`${styles.wrap} ${className ?? ""}`.trim()}>
      <div className={styles.row}>
        <label className={styles.labelOnly} htmlFor={viFieldId}>
          {viLabel}
        </label>
        <InputTag
          id={viFieldId}
          className={multiline ? styles.inputMultiline : undefined}
          value={viValue}
          onChange={(e) => onViInput(e.target.value)}
          disabled={disabled}
          maxLength={viMaxLength}
          rows={multiline ? rows : undefined}
          autoFocus={autoFocusVi}
        />
      </div>

      <div className={styles.row}>
        <label className={styles.labelOnly} htmlFor={enFieldId}>
          {enLabel}
        </label>
        <div
          className={`${styles.enInputShell} ${multiline ? styles.enInputShellMultiline : ""}`.trim()}
        >
          <InputTag
            id={enFieldId}
            className={multiline ? styles.inputMultiline : undefined}
            value={enValue}
            onChange={(e) => onEnInput(e.target.value)}
            disabled={enBusy}
            maxLength={enMaxLength}
            rows={multiline ? rows : undefined}
            aria-busy={translating}
          />
          {translating ? (
            <div className={styles.translatingOverlay} aria-live="polite">
              <Spinner size="sm" label="Đang dịch sang tiếng Anh" />
            </div>
          ) : null}
        </div>
      </div>

      {err ? <p className={styles.err}>{err}</p> : null}
    </div>
  );
}
