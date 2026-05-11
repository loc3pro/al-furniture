import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrSeller } from "@/lib/admin-auth";
import {
  deleteCloudinaryImageByPublicId,
  getCloudinaryCloudName,
  isCloudinaryConfigured,
  isDeletableAdminImagePublicId,
  publicIdFromCloudinaryImageUrl,
} from "@/lib/cloudinary-server";

const bodySchema = z.object({
  urls: z.array(z.string().url()).max(80),
});

/** Xóa nhiều ảnh (rollback). Chỉ `furniture-ecm/{products|banners|blog|theme}/…`. */
export async function POST(req: Request) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Cloudinary chưa cấu hình" }, { status: 503 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const cloud = getCloudinaryCloudName();
  if (!cloud) {
    return NextResponse.json({ error: "Thiếu cloud name" }, { status: 500 });
  }

  const { urls } = parsed.data;
  for (const url of urls) {
    let path0: string;
    try {
      const u = new URL(url);
      if (u.hostname !== "res.cloudinary.com") {
        return NextResponse.json({ error: "URL không hợp lệ" }, { status: 400 });
      }
      path0 = u.pathname.split("/")[1] ?? "";
    } catch {
      return NextResponse.json({ error: "URL không hợp lệ" }, { status: 400 });
    }
    if (path0 !== cloud) {
      return NextResponse.json({ error: "Không được phép xóa URL này" }, { status: 403 });
    }
    const publicId = publicIdFromCloudinaryImageUrl(url);
    if (!publicId || !isDeletableAdminImagePublicId(publicId)) {
      return NextResponse.json({ error: "Không được phép xóa URL này" }, { status: 403 });
    }
  }

  try {
    for (const url of urls) {
      const publicId = publicIdFromCloudinaryImageUrl(url);
      if (publicId) await deleteCloudinaryImageByPublicId(publicId);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/cloudinary/delete]", e);
    return NextResponse.json({ error: "Xóa trên Cloudinary thất bại" }, { status: 500 });
  }
}
