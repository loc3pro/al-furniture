"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { HERO_BANNER_ASPECT, HERO_BANNER_OUTPUT_WIDTH } from "@/lib/hero-banner";
import { getCroppedBannerBlob } from "@/lib/image-crop-client";
import styles from "./AdminBannerImageField.module.scss";

type Props = {
  label: string;
  savedUrl: string;
  pendingFile: File | null;
  onPickFile: (file: File | null) => void;
  disabled?: boolean;
  hint?: string;
};

export function AdminBannerImageField({
  label,
  savedUrl,
  pendingFile,
  onPickFile,
  disabled,
  hint = "Bấm vào ô bên dưới để chọn ảnh — căn chỉnh khung 19:9.",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const rawPickRef = useRef<File | null>(null);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const croppedPixelsRef = useRef<Area | null>(null);

  useEffect(() => {
    if (!pendingFile) {
      setBlobUrl(null);
      return;
    }
    const u = URL.createObjectURL(pendingFile);
    setBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [pendingFile]);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  const src = blobUrl || (savedUrl.startsWith("http") ? savedUrl : "");

  const closeCropper = useCallback(() => {
    setCropOpen(false);
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
    rawPickRef.current = null;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    croppedPixelsRef.current = null;
  }, [cropSrc]);

  useEffect(() => {
    if (!cropOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCropper();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [cropOpen, closeCropper]);

  const onCropComplete = useCallback((_c: Area, pixels: Area) => {
    croppedPixelsRef.current = pixels;
  }, []);

  function onNativePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    rawPickRef.current = file;
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropOpen(true);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    croppedPixelsRef.current = null;
  }

  async function confirmCrop() {
    if (!cropSrc || !rawPickRef.current) {
      closeCropper();
      return;
    }
    const pixels = croppedPixelsRef.current;
    if (!pixels) {
      closeCropper();
      return;
    }
    try {
      const blob = await getCroppedBannerBlob(cropSrc, pixels, HERO_BANNER_OUTPUT_WIDTH);
      const base = rawPickRef.current.name.replace(/\.[^.]+$/, "") || "banner";
      const out = new File([blob], `${base}-banner.jpg`, { type: "image/jpeg" });
      onPickFile(out);
    } finally {
      closeCropper();
    }
  }

  function cancelCrop() {
    closeCropper();
  }

  function clearPending() {
    onPickFile(null);
  }

  return (
    <div className={styles.wrap}>
      {label ? <span className={styles.label}>{label}</span> : null}
      {hint ? <p className={`muted ${styles.hint}`}>{hint}</p> : null}
      <div className={styles.previewShell}>
        {src ? (
          <>
            <button
              type="button"
              className={styles.previewHit}
              disabled={disabled}
              aria-label={pendingFile ? "Đổi ảnh khác — bấm để chọn file khác" : "Đổi ảnh — bấm để chọn file khác"}
              onClick={() => inputRef.current?.click()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className={styles.previewImg} loading="lazy" decoding="async" />
              <span className={styles.previewHoverLabel} aria-hidden>
                {pendingFile ? "Bấm để đổi ảnh khác" : "Bấm để đổi ảnh"}
              </span>
            </button>
            {pendingFile ? (
              <button
                type="button"
                className={styles.fabClear}
                disabled={disabled}
                aria-label="Bỏ ảnh vừa chọn"
                title="Bỏ ảnh vừa chọn"
                onClick={(e) => {
                  e.stopPropagation();
                  clearPending();
                }}
              >
                ×
              </button>
            ) : null}
          </>
        ) : (
          <button
            type="button"
            className={styles.previewEmptyZone}
            disabled={disabled}
            aria-label="Chọn ảnh banner"
            onClick={() => inputRef.current?.click()}
          >
            <span className={styles.previewEmptyIcon} aria-hidden>
              <ImagePlus size={40} strokeWidth={1.35} />
            </span>
            <span className={styles.previewEmptyTitle}>Chọn ảnh banner</span>
            <span className={styles.previewEmptyMeta}>JPEG, PNG, WebP — sau đó căn khung 19:9.</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden disabled={disabled} onChange={onNativePick} />

      {cropOpen && cropSrc ? (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="banner-crop-title">
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <div id="banner-crop-title">Căn chỉnh banner (19:9)</div>
              <p className={styles.modalSub}>
                Kéo để chọn vùng hiển thị. Ảnh xuất {HERO_BANNER_OUTPUT_WIDTH}px ngang — khớp carousel trang chủ.
              </p>
            </div>
            <div className={styles.cropWrap}>
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={HERO_BANNER_ASPECT}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                restrictPosition={false}
              />
            </div>
            <div className={styles.zoomRow}>
              <span>Thu phóng</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Thu phóng vùng crop"
              />
            </div>
            <div className={styles.modalFoot}>
              <button type="button" className="btn btn--ghost adminCancelGhost" onClick={cancelCrop}>
                Hủy
              </button>
              <button type="button" className="btn btn--primary" onClick={() => void confirmCrop()}>
                Áp dụng ảnh đã crop
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
