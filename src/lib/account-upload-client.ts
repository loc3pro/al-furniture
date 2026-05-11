/** Upload avatar — chỉ gọi khi user bấm Lưu hồ sơ (rollback qua /api/account/cloudinary/delete). */

export async function uploadAccountImageFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/account/upload", {
    method: "POST",
    body: fd,
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Upload thất bại");
  }
  if (!data.url) throw new Error("Thiếu URL sau upload");
  return data.url;
}
