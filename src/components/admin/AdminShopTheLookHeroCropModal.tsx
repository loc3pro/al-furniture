"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { getCroppedImageBlob } from "@/lib/canvas-crop";
import styles from "./AdminShopTheLookHeroCropModal.module.scss";

type Props = {
  imageSrc: string;
  onCancel: () => void;
  /** File JPEG đã crop — upload Cloudinary ở bước Lưu. */
  onConfirm: (file: File) => void | Promise<void>;
};

export function AdminShopTheLookHeroCropModal({ imageSrc, onCancel, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_area: Area, areaPx: Area) => {
    setCroppedAreaPixels(areaPx);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;
    setBusy(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      const file = new File([blob], "hero.jpg", { type: "image/jpeg" });
      await onConfirm(file);
    } finally {
      setBusy(false);
    }
  }, [croppedAreaPixels, imageSrc, onConfirm]);

  return (
    <div className={styles.backdrop} role="presentation" onClick={onCancel}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Cắt ảnh hero" onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Cắt ảnh hero</h3>
        <p className={styles.hint}>Kéo khung, zoom để chọn vùng. Tỷ lệ tùy ý.</p>
        <div className={styles.cropWrap}>
          <Cropper image={imageSrc} crop={crop} zoom={zoom} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
        </div>
        <label className={styles.zoomRow}>
          Zoom
          <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </label>
        <div className={styles.actions}>
          <button type="button" className="btn btn--ghost adminCancelGhost" disabled={busy} onClick={onCancel}>
            Hủy
          </button>
          <button type="button" className="btn btn--primary" disabled={busy || !croppedAreaPixels} onClick={() => void handleConfirm()}>
            {busy ? "Đang xử lý…" : "Dùng ảnh đã cắt"}
          </button>
        </div>
      </div>
    </div>
  );
}
