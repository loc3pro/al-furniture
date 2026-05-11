import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrSeller } from "@/lib/admin-auth";
import { isCloudinaryConfigured, uploadImageBuffer, type CloudinaryFolder } from "@/lib/cloudinary-server";

const MAX_IMAGE = 12 * 1024 * 1024;

const folderSchema = z.enum(["banners", "products", "blog", "chat", "theme", "account", "banks"]);

export async function POST(req: Request) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary chưa cấu hình (.env: CLOUDINARY_URL hoặc CLOUD_NAME + API_KEY + API_SECRET)" },
      { status: 503 },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const folderRaw = form?.get("folder");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
  }
  const parsedFolder = folderSchema.safeParse(typeof folderRaw === "string" ? folderRaw : "products");
  const folder = (parsedFolder.success ? parsedFolder.data : "products") as CloudinaryFolder;

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Chỉ chấp nhận ảnh" }, { status: 400 });
  }
  if (file.size > MAX_IMAGE) {
    return NextResponse.json({ error: "Ảnh tối đa 12MB" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const url = await uploadImageBuffer(buf, folder);
    return NextResponse.json({ url, path: url });
  } catch (e) {
    console.error("[admin/upload]", e);
    return NextResponse.json({ error: "Upload Cloudinary thất bại" }, { status: 500 });
  }
}
