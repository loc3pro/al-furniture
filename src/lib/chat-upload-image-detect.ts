/** MIME hoặc đuôi — dùng API upload (khớp client). */
export function isChatRasterUpload(file: File): boolean {
  const t = (file.type || "").toLowerCase().trim();
  if (t.startsWith("image/")) return true;
  const base = (file.name ?? "").split(/[/\\]/).pop() ?? "";
  return /\.(jpe?g|png|gif|webp|avif|heic|bmp|jfif)$/i.test(base);
}

/** Đọc vài byte đầu — JPEG / PNG / GIF / WebP (khi MIME sai). */
export async function sniffLikelyRasterImageMagic(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (head.length < 3) return false;
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return true;
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return true;
  if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46) return true;
  if (
    head.length >= 12 &&
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x46 &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50
  ) {
    return true;
  }
  return false;
}
