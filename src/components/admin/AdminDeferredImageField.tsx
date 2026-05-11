"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { isSafeThemeAssetUrl } from "@/lib/theme-asset-url";
import styles from "./AdminDeferredImageField.module.scss";

type Props = {
  label: string;
  savedUrl: string;
  pendingFile: File | null;
  onPickFile: (file: File | null) => void;
  /** Xóa URL đã lưu trong DB (sau khi bấm Lưu mới áp dụng). */
  onClearSaved?: () => void;
  disabled?: boolean;
  hint?: string;
  /** Dòng chính trong vùng trống (mặc định «Chọn ảnh»). */
  emptyTitle?: string;
  /** Dòng phụ định dạng file (vd. JPEG, PNG…). */
  acceptSummary?: string;
  /** Dòng phụ dung lượng. */
  maxSizeHint?: string;
};

/**
 * Chọn file ảnh; không hiển thị URL. Parent upload khi bấm Lưu / Tạo.
 * Giao diện: vùng dashed khi trống; preview viền nét đứt + nút tròn gỡ khi có ảnh.
 */
export function AdminDeferredImageField({
  label,
  savedUrl,
  pendingFile,
  onPickFile,
  onClearSaved,
  disabled,
  hint = "",
  emptyTitle = "Chọn ảnh",
  acceptSummary = "Cho phép JPEG, JPG, PNG, GIF, WebP.",
  maxSizeHint = "Dung lượng gợi ý: dưới 5 MB.",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!pendingFile) {
      setBlobUrl(null);
      return;
    }
    const u = URL.createObjectURL(pendingFile);
    setBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [pendingFile]);

  const resolvedSaved = savedUrl.trim() && isSafeThemeAssetUrl(savedUrl) ? savedUrl.trim() : "";
  const src = blobUrl || resolvedSaved;

  const openPicker = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    onPickFile(file);
  }

  function onDropFiles(files: FileList | null) {
    if (disabled || !files?.length) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) return;
    onPickFile(file);
  }

  const showFabClear = Boolean(pendingFile || (resolvedSaved && onClearSaved));

  return (
    <div className={styles.root}>
      <span className={styles.label}>{label}</span>
      {hint ? (
        <p className={styles.hint} data-admin-print-hide>
          {hint}
        </p>
      ) : null}

      {!src ? (
        <button
          type="button"
          className={styles.dropZone}
          disabled={disabled}
          onClick={openPicker}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onDropFiles(e.dataTransfer.files);
          }}
          style={dragOver ? { borderColor: "rgba(0, 128, 128, 0.45)", background: "#e8f5f1" } : undefined}
        >
          <span className={styles.dropIcon} aria-hidden>
            <ImagePlus size={40} strokeWidth={1.35} />
          </span>
          <span className={styles.dropTitle}>{emptyTitle}</span>
          <span className={styles.dropMeta}>{acceptSummary}</span>
          <span className={styles.dropMeta}>{maxSizeHint}</span>
        </button>
      ) : (
        <div className={styles.previewWrap}>
          <button
            type="button"
            className={styles.previewReplaceHit}
            disabled={disabled}
            aria-label={pendingFile ? "Đổi ảnh khác" : "Đổi ảnh — bấm để chọn file khác"}
            onClick={openPicker}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className={styles.previewImg} loading="lazy" decoding="async" />
          </button>
          {showFabClear ? (
            <button
              type="button"
              className={styles.fabClear}
              disabled={disabled}
              aria-label={pendingFile ? "Bỏ ảnh vừa chọn" : "Gỡ ảnh đã lưu"}
              onClick={(e) => {
                e.stopPropagation();
                if (pendingFile) onPickFile(null);
                else onClearSaved?.();
              }}
            >
              ×
            </button>
          ) : null}
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*" hidden disabled={disabled} onChange={(e) => onPick(e)} />
    </div>
  );
}
