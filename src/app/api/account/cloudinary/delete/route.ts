import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import {
  deleteCloudinaryImageByPublicId,
  getCloudinaryCloudName,
  isAccountAvatarPublicId,
  isCloudinaryConfigured,
  publicIdFromCloudinaryImageUrl,
} from "@/lib/cloudinary-server";

const bodySchema = z.object({
  url: z.string().url().max(3000),
});

/** Xóa ảnh trong folder account (rollback khi lưu DB thất bại). Chỉ URL đúng cloud + prefix. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Cloudinary chưa cấu hình" }, { status: 503 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const { url } = parsed.data;
  const cloud = getCloudinaryCloudName();
  if (!cloud) {
    return NextResponse.json({ error: "Thiếu cloud name" }, { status: 500 });
  }

  let host: string;
  let path0: string;
  try {
    const u = new URL(url);
    host = u.hostname;
    path0 = u.pathname.split("/")[1] ?? "";
  } catch {
    return NextResponse.json({ error: "URL không hợp lệ" }, { status: 400 });
  }

  if (host !== "res.cloudinary.com" || path0 !== cloud) {
    return NextResponse.json({ error: "Không được phép xóa URL này" }, { status: 403 });
  }

  const publicId = publicIdFromCloudinaryImageUrl(url);
  if (!publicId || !isAccountAvatarPublicId(publicId)) {
    return NextResponse.json({ error: "Không được phép xóa URL này" }, { status: 403 });
  }

  try {
    await deleteCloudinaryImageByPublicId(publicId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[account/cloudinary/delete]", e);
    return NextResponse.json({ error: "Xóa trên Cloudinary thất bại" }, { status: 500 });
  }
}
