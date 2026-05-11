"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedBannerBlob } from "@/lib/image-crop-client";
import { PRODUCT_GALLERY_ASPECT, PRODUCT_GALLERY_OUTPUT_WIDTH } from "@/lib/product-gallery-image";
import styles from "./VariantImagesField.module.scss";

type Props = {
  existingUrls: string[];
  newFiles: File[];
  onExistingUrlsChange: (urls: string[]) => void;
  /** Dùng callback để tránh ghi đè khi thêm nhiều ảnh liên tiếp (hàng đợi crop). */
  onNewFilesChange: (next: File[] | ((prev: File[]) => File[])) => void;
  disabled?: boolean;
};

export function VariantImagesField({
  existingUrls,
  newFiles,
  onExistingUrlsChange,
  onNewFilesChange,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [blobUrls, setBlobUrls] = useState<string[]>([]);

  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const rawPickRef = useRef<File | null>(null);
  const fileQueueRef = useRef<File[]>([]);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const croppedPixelsRef = useRef<Area | null>(null);
  const [cropReady, setCropReady] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const urls = newFiles.map((f) => URL.createObjectURL(f));
    setBlobUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [newFiles]);

  const revokeCropPreview = useCallback(() => {
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    rawPickRef.current = null;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    croppedPixelsRef.current = null;
    setCropReady(false);
    setCropError(null);
  }, []);

  const dismissCropper = useCallback(() => {
    fileQueueRef.current = [];
    setCropOpen(false);
    revokeCropPreview();
  }, [revokeCropPreview]);

  const openCropForFile = useCallback((file: File) => {
    rawPickRef.current = file;
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropOpen(true);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    croppedPixelsRef.current = null;
    setCropReady(false);
    setCropError(null);
  }, []);

  useEffect(() => {
    if (!cropOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissCropper();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [cropOpen, dismissCropper]);

  const onCropComplete = useCallback((_c: Area, pixels: Area) => {
    croppedPixelsRef.current = pixels;
    setCropReady(Boolean(pixels?.width && pixels?.height));
  }, []);

  function onNativePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (files.length === 0) return;
    fileQueueRef.current.push(...files);
    if (!cropOpen) {
      const first = fileQueueRef.current.shift();
      if (first) openCropForFile(first);
    }
  }

  async function confirmCrop() {
    if (!cropSrc || !rawPickRef.current) {
      dismissCropper();
      return;
    }
    const pixels = croppedPixelsRef.current;
    if (!pixels?.width) {
      setCropError("Chờ ảnh hiển thị đủ rồi kéo/zoom khung crop trước khi áp dụng.");
      return;
    }
    setApplying(true);
    setCropError(null);
    try {
      const blob = await getCroppedBannerBlob(cropSrc, pixels, PRODUCT_GALLERY_OUTPUT_WIDTH);
      const file = new File([blob], `variant-${Date.now()}.jpg`, { type: "image/jpeg" });
      onNewFilesChange((prev) => [...prev, file]);
    } catch (ex) {
      setCropError(ex instanceof Error ? ex.message : "Không xử lý được ảnh");
      return;
    } finally {
      setApplying(false);
    }

    setCropSrc((prevUrl) => {
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      return null;
    });
    rawPickRef.current = null;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    croppedPixelsRef.current = null;
    setCropReady(false);

    const next = fileQueueRef.current.shift();
    if (next) {
      openCropForFile(next);
    } else {
      setCropOpen(false);
    }
  }

  function removeExisting(i: number) {
    onExistingUrlsChange(existingUrls.filter((_, j) => j !== i));
  }

  function removeNew(i: number) {
    onNewFilesChange((prev) => prev.filter((_, j) => j !== i));
  }

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Ảnh biến thể</span>
      <p className={styles.hint}>
        Thêm ảnh — căn khung 3:4 trước khi áp dụng (JPEG). Có thể chọn <strong>nhiều file một lúc</strong> (Ctrl/Shift
        khi chọn); từng ảnh sẽ mở crop lần lượt. Nhấn <strong>Lưu</strong> ở form sản phẩm để upload.
      </p>
      <div className={styles.grid}>
        {existingUrls.map((url, i) => (
          <div key={`ex-${url}-${i}`} className={styles.thumb}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" loading="lazy" decoding="async" />
            <button
              type="button"
              className={styles.remove}
              disabled={disabled}
              onClick={() => removeExisting(i)}
              aria-label="Gỡ ảnh đã lưu"
            >
              ×
            </button>
          </div>
        ))}
        {newFiles.map((f, i) => (
          <div key={`${f.name}-${f.size}-${f.lastModified}-${i}`} className={styles.thumb}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={blobUrls[i]} alt="" loading="lazy" decoding="async" />
            <button
              type="button"
              className={styles.remove}
              disabled={disabled}
              onClick={() => removeNew(i)}
              aria-label="Bỏ ảnh mới"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.addTile}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          aria-label="Thêm ảnh biến thể"
        >
          <span className={styles.addTileIcon} aria-hidden>
            <ImagePlus size={28} strokeWidth={1.35} />
          </span>
          <span className={styles.addTileTitle}>Thêm ảnh</span>
          <span className={styles.addTileMeta}>JPEG, PNG… — căn khung 3:4</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          disabled={disabled}
          onChange={(e) => onNativePick(e)}
        />
      </div>

      {cropOpen && cropSrc ? (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="variant-crop-title">
          <div className={styles.modal}>
            <div className={styles.modalHead}>
              <div id="variant-crop-title">Căn ảnh sản phẩm (3:4)</div>
              <p className={styles.modalSub}>Kéo zoom để vừa khung. Áp dụng để thêm vào danh sách.</p>
              {fileQueueRef.current.length > 0 ? (
                <p className={styles.queueHint}>Còn {fileQueueRef.current.length} ảnh sẽ crop tiếp theo.</p>
              ) : null}
            </div>
            {cropError ? <p className={styles.cropError}>{cropError}</p> : null}
            <div className={styles.cropWrap}>
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={PRODUCT_GALLERY_ASPECT}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className={styles.zoomRow}>
              <span>Zoom</span>
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
              <button type="button" className="btn btn--ghost" onClick={dismissCropper} disabled={applying}>
                Huỷ
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void confirmCrop()}
                disabled={applying || !cropReady}
              >
                {applying ? "Đang xử lý…" : "Áp dụng ảnh đã crop"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
