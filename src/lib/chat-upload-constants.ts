/**
 * Giới hạn upload chat — đồng bộ API và UI.
 * Ảnh máy ảnh/điện thoại thường >5MB nên hàng chờ và API dùng cùng ngưỡng.
 */
export const CHAT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const CHAT_MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Số ảnh tối đa trong hàng chờ trước khi gửi (một lần bấm Gửi). */
export const CHAT_MAX_PENDING_IMAGES = 5;

/** Thời gian giữ file trên disk/cloud trước khi job xóa (ms). Mặc định 1 giờ. */
export function chatUploadRetentionMs(): number {
  const raw = process.env.CHAT_UPLOAD_RETENTION_MS;
  if (raw && /^\d+$/.test(raw.trim())) return Math.max(60_000, parseInt(raw.trim(), 10));
  const hours = process.env.CHAT_UPLOAD_RETENTION_HOURS;
  if (hours && /^\d+(\.\d+)?$/.test(hours.trim())) return Math.max(60_000, parseFloat(hours.trim()) * 3600_000);
  return 3600_000;
}
