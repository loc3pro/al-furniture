import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

/** Xuất JPEG từ vùng crop (`croppedAreaPixels` của react-easy-crop = toạ độ theo ảnh gốc). */
export async function getCroppedBannerBlob(
  imageSrc: string,
  pixelCrop: Area,
  outputWidth: number,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không vẽ được ảnh");

  const cropAspect = pixelCrop.width / pixelCrop.height;
  canvas.width = outputWidth;
  canvas.height = Math.max(1, Math.round(outputWidth / cropAspect));

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas trống"));
      },
      "image/jpeg",
      0.92,
    );
  });
}
