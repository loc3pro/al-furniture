/** Nhận diện đính kèm là ảnh để hiển thị <img> — kể cả URL Cloudinary không có đuôi file rõ ràng. */
export function isChatImageAttachment(
  attachmentUrl: string | null | undefined,
  attachmentName?: string | null,
): boolean {
  if (!attachmentUrl?.trim()) return false;

  const name = (attachmentName ?? "").trim();
  if (name && /\.(jpe?g|png|gif|webp|avif)$/i.test(name)) return true;

  let pathOnly = attachmentUrl;
  try {
    pathOnly = new URL(attachmentUrl).pathname;
  } catch {
    /* relative hoặc không chuẩn — dùng nguyên chuỗi */
  }

  const lastSeg = pathOnly.split("/").pop() ?? "";
  if (/\.(jpe?g|png|gif|webp|avif)$/i.test(lastSeg)) return true;

  const lower = attachmentUrl.toLowerCase();
  if (lower.includes("res.cloudinary.com") && lower.includes("/image/upload/")) return true;

  return /\.(jpe?g|png|gif|webp|avif)(\?|#|$)/i.test(attachmentUrl);
}

/**
 * File chọn từ `<input type="file">`: nhiều trình duyệt/OS để `type` rỗng hoặc `octet-stream`
 * dù file là ảnh — không được lọc chỉ bằng `type.startsWith("image/")`.
 */
export function isLocalImagePick(f: File): boolean {
  const t = (f.type || "").toLowerCase().trim();
  if (t.startsWith("image/")) return true;
  if (t && t !== "application/octet-stream") return false;
  const base = (f.name ?? "").split(/[/\\]/).pop() ?? "";
  return /\.(jpe?g|png|gif|webp|avif|heic|bmp|jfif)$/i.test(base);
}
