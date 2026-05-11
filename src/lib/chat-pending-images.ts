import { CHAT_MAX_IMAGE_BYTES, CHAT_MAX_PENDING_IMAGES } from "@/lib/chat-upload-constants";

/** Hàng chờ ảnh trước khi gửi — đồng bộ shop / admin */
export type ChatPendingImageRow = {
  id: string;
  file: File;
  previewUrl: string;
};

export function chatImageDedupeKey(file: File): string {
  return `${file.name}:${file.size}`;
}

/**
 * Gộp ảnh đã chọn với batch mới: không trùng (name+size), tối đa CHAT_MAX_PENDING_IMAGES,
 * bỏ file quá dung lượng.
 */
export function mergeIncomingImages(
  existingRows: ChatPendingImageRow[],
  picked: File[],
  newId: () => string,
): { merged: ChatPendingImageRow[]; error: string | null } {
  const merged: ChatPendingImageRow[] = [...existingRows];
  const keys = new Set(existingRows.map((r) => chatImageDedupeKey(r.file)));
  let skippedDup = 0;
  let skippedBig = 0;
  let truncated = 0;

  for (const file of picked) {
    if (merged.length >= CHAT_MAX_PENDING_IMAGES) {
      truncated++;
      continue;
    }
    const key = chatImageDedupeKey(file);
    if (keys.has(key)) {
      skippedDup++;
      continue;
    }
    if (file.size > CHAT_MAX_IMAGE_BYTES) {
      skippedBig++;
      continue;
    }
    keys.add(key);
    merged.push({
      id: newId(),
      file,
      previewUrl: URL.createObjectURL(file),
    });
  }

  const mb = CHAT_MAX_IMAGE_BYTES / (1024 * 1024);
  const parts: string[] = [];
  if (skippedDup > 0) parts.push(`Đã bỏ qua ${skippedDup} ảnh trùng (cùng tên và dung lượng)`);
  if (skippedBig > 0) parts.push(`${skippedBig} ảnh vượt ${mb}MB`);
  if (truncated > 0) parts.push(`Tối đa ${CHAT_MAX_PENDING_IMAGES} ảnh (${truncated} ảnh chưa thêm)`);

  const added = merged.length - existingRows.length;
  let error: string | null = parts.length > 0 ? parts.join(" · ") : null;
  if (added === 0 && picked.length > 0 && !error) {
    error = "Không thêm được ảnh";
  }

  return { merged, error };
}
