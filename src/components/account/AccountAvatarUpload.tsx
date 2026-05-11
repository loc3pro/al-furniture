"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import styles from "./AccountAvatarUpload.module.scss";

export function AccountAvatarUpload({
  savedUrl,
  pendingFile,
  onPickFile,
  disabled,
}: {
  /** URL đã lưu trên server (hiển thị khi chưa chọn ảnh mới). */
  savedUrl: string;
  pendingFile: File | null;
  onPickFile: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFile) {
      setBlobUrl(null);
      return;
    }
    const u = URL.createObjectURL(pendingFile);
    setBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [pendingFile]);

  const displayUrl = blobUrl || (savedUrl.startsWith("http") ? savedUrl : "");

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file?.type.startsWith("image/")) return;
    onPickFile(file);
  }

  const controlsDisabled = disabled;

  return (
    <div className={styles.root}>
      <span className={styles.label}>Ảnh đại diện</span>
      <div className={styles.card}>
        <div className={styles.previewCol}>
          <button
            type="button"
            className={styles.avatarHit}
            disabled={controlsDisabled}
            aria-label={displayUrl ? "Đổi ảnh đại diện" : "Chọn ảnh đại diện"}
            onClick={() => inputRef.current?.click()}
          >
            {displayUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayUrl} alt="" className={styles.avatarImg} loading="lazy" decoding="async" />
            ) : (
              <span className={styles.avatarPlaceholder} aria-hidden>
                <ImagePlus size={32} strokeWidth={1.35} />
              </span>
            )}
          </button>
          {pendingFile ? (
            <button
              type="button"
              className={styles.fabClear}
              disabled={controlsDisabled}
              aria-label="Bỏ ảnh vừa chọn"
              onClick={(e) => {
                e.stopPropagation();
                onPickFile(null);
              }}
            >
              ×
            </button>
          ) : null}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className="btn btn--primary"
            disabled={controlsDisabled}
            onClick={() => inputRef.current?.click()}
          >
            {pendingFile ? "Đổi ảnh" : "Chọn ảnh"}
          </button>
          {pendingFile ? (
            <button type="button" className="btn btn--ghost" disabled={controlsDisabled} onClick={() => onPickFile(null)}>
              Bỏ ảnh vừa chọn
            </button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            disabled={controlsDisabled}
            onChange={(e) => onPick(e)}
          />
        </div>
      </div>
      <p className={styles.hint}>JPEG, PNG, WebP — gợi ý dưới 5 MB.</p>
    </div>
  );
}
