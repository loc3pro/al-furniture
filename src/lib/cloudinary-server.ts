import { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}
/** CLOUDINARY_URL trong .env được SDK đọc tự động khi không set cloud_name riêng */

/** Thư mục trên Cloudinary (prefix furniture-ecm/) */
export type CloudinaryFolder =
  | "banners"
  | "products"
  | "blog"
  | "chat"
  | "theme"
  | "account"
  | "banks";

export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_URL?.trim() ||
    (process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim())
  );
}

function ensureConfigured(): void {
  if (!isCloudinaryConfigured()) {
    throw new Error("CLOUDINARY_URL hoặc CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET chưa cấu hình");
  }
}

function baseFolder(sub: CloudinaryFolder): string {
  return `furniture-ecm/${sub}`;
}

export type CloudinaryImageUpload = { secureUrl: string; publicId: string };

/** Upload ảnh (buffer) → URL + public_id (để xóa sau). */
export async function uploadImageBufferFull(buffer: Buffer, folder: CloudinaryFolder): Promise<CloudinaryImageUpload> {
  ensureConfigured();
  return await new Promise<CloudinaryImageUpload>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: baseFolder(folder), resource_type: "image" },
      (err, result) => {
        if (err || !result?.secure_url || !result.public_id)
          reject(err ?? new Error("Cloudinary upload failed"));
        else resolve({ secureUrl: result.secure_url, publicId: result.public_id });
      },
    );
    Readable.from(buffer).pipe(stream);
  });
}

/** Upload ảnh (buffer) → secure URL lưu DB */
export async function uploadImageBuffer(buffer: Buffer, folder: CloudinaryFolder): Promise<string> {
  const r = await uploadImageBufferFull(buffer, folder);
  return r.secureUrl;
}

/** Upload file thô (PDF…) → secure URL */
export async function uploadRawBuffer(buffer: Buffer, folder: CloudinaryFolder, filename: string): Promise<string> {
  ensureConfigured();
  const safeName = filename.replace(/[^\w.\-]/g, "_").slice(0, 120) || "file";
  const url = await new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: baseFolder(folder),
        resource_type: "raw",
        public_id: `${Date.now().toString(36)}_${safeName.replace(/\.[^.]+$/, "")}`,
      },
      (err, result) => {
        if (err || !result?.secure_url) reject(err ?? new Error("Cloudinary raw upload failed"));
        else resolve(result.secure_url);
      },
    );
    Readable.from(buffer).pipe(stream);
  });
  return url;
}

/** Tên cloud từ env (đối chiếu URL khi xóa an toàn). */
export function getCloudinaryCloudName(): string | null {
  const explicit = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (explicit) return explicit;
  const raw = process.env.CLOUDINARY_URL?.trim();
  if (raw?.startsWith("cloudinary://")) {
    const m = raw.match(/^cloudinary:\/\/[^:]+:[^@]+@([^/?\s]+)/);
    if (m?.[1]) return m[1];
  }
  return null;
}

/**
 * public_id từ URL delivery kiểu upload API (…/image/upload/v123/folder/file).
 * Không hỗ trợ mọi URL có transform dài ở giữa.
 */
/** public_id từ URL raw upload (PDF…) — delivery kiểu …/raw/upload/v123/… */
export function publicIdFromCloudinaryRawUrl(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    if (u.hostname !== "res.cloudinary.com") return null;
    const marker = "/raw/upload/";
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;
    let tail = u.pathname.slice(i + marker.length);
    tail = tail.replace(/^v\d+\//, "");
    if (!tail || tail.includes("..")) return null;
    return decodeURIComponent(tail);
  } catch {
    return null;
  }
}

export function publicIdFromCloudinaryImageUrl(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    if (u.hostname !== "res.cloudinary.com") return null;
    const marker = "/image/upload/";
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;
    let tail = u.pathname.slice(i + marker.length);
    tail = tail.replace(/^v\d+\//, "");
    if (!tail || tail.includes("..")) return null;
    return decodeURIComponent(tail);
  } catch {
    return null;
  }
}

const ACCOUNT_IMAGE_PREFIX = `${baseFolder("account")}/`;

export function isAccountAvatarPublicId(publicId: string): boolean {
  return publicId.startsWith(ACCOUNT_IMAGE_PREFIX);
}

/** Ảnh do admin upload (rollback sau khi lưu DB lỗi) — không gồm account/chat. */
export function isDeletableAdminImagePublicId(publicId: string): boolean {
  const prefixes = ["furniture-ecm/products/", "furniture-ecm/banners/", "furniture-ecm/blog/", "furniture-ecm/theme/"];
  return prefixes.some((p) => publicId.startsWith(p));
}

export async function deleteCloudinaryImageByPublicId(publicId: string): Promise<{ ok: boolean; notFound?: boolean }> {
  ensureConfigured();
  const result = (await cloudinary.uploader.destroy(publicId, { resource_type: "image" })) as { result?: string };
  if (result.result === "not found") return { ok: true, notFound: true };
  return { ok: result.result === "ok" };
}

const CHAT_PREFIX = `${baseFolder("chat")}/`;

export function isDeletableChatCloudinaryPublicId(publicId: string): boolean {
  return publicId.startsWith(CHAT_PREFIX);
}

export async function deleteCloudinaryRawByPublicId(publicId: string): Promise<{ ok: boolean; notFound?: boolean }> {
  ensureConfigured();
  const result = (await cloudinary.uploader.destroy(publicId, { resource_type: "raw" })) as { result?: string };
  if (result.result === "not found") return { ok: true, notFound: true };
  return { ok: result.result === "ok" };
}
