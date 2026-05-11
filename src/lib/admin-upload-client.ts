/** Upload ảnh admin (chỉ gọi khi user bấm Lưu / Tạo — rollback bằng deleteAdminCloudinaryUrls). */

export type AdminUploadFolder = "banners" | "products" | "blog" | "theme" | "banks";

export async function uploadAdminImageFile(file: File, folder: AdminUploadFolder): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  const res = await fetch("/api/admin/upload", {
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

export async function deleteAdminCloudinaryUrls(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  const res = await fetch("/api/admin/cloudinary/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ urls }),
  });
  if (!res.ok) {
    console.warn("[deleteAdminCloudinaryUrls]", await res.text().catch(() => ""));
  }
}
