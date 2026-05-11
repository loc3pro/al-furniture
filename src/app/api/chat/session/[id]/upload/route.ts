import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { canAccessChatSession } from "@/lib/chat-access";
import { isChatRasterUpload, sniffLikelyRasterImageMagic } from "@/lib/chat-upload-image-detect";
import { CHAT_MAX_FILE_BYTES, CHAT_MAX_IMAGE_BYTES } from "@/lib/chat-upload-constants";
import { isCloudinaryConfigured, uploadImageBufferFull } from "@/lib/cloudinary-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const LOCAL_ALLOWED = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id: sessionId } = await ctx.params;
  const access = await canAccessChatSession(sessionId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file" }, { status: 400 });
  }

  let isImage = isChatRasterUpload(file);
  const mime = (file.type || "").toLowerCase().trim();
  if (!isImage && (!mime || mime === "application/octet-stream")) {
    isImage = await sniffLikelyRasterImageMagic(file);
  }

  if (isImage) {
    if (file.size > CHAT_MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: `Ảnh tối đa ${CHAT_MAX_IMAGE_BYTES / (1024 * 1024)}MB` }, { status: 400 });
    }
    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        { error: "Chưa cấu hình Cloudinary — không thể gửi ảnh chat" },
        { status: 503 },
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    try {
      const { secureUrl, publicId } = await uploadImageBufferFull(buf, "chat");
      await prisma.chatUploadAsset.create({
        data: {
          sessionId,
          storage: "CLOUD",
          publicUrl: secureUrl,
          cloudPublicId: publicId,
        },
      });
      return NextResponse.json({ url: secureUrl, name: file.name || "image" });
    } catch (e) {
      console.error("[chat upload cloudinary image]", e);
      return NextResponse.json({ error: "Upload ảnh thất bại" }, { status: 500 });
    }
  }

  if (file.size > CHAT_MAX_FILE_BYTES) {
    return NextResponse.json({ error: `Tệp đính kèm tối đa ${CHAT_MAX_FILE_BYTES / (1024 * 1024)}MB` }, { status: 400 });
  }
  if (!LOCAL_ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Định dạng tệp không hỗ trợ (PDF, Word, ZIP, TXT)" }, { status: 400 });
  }

  const ext =
    path.extname(file.name || "").slice(0, 12).replace(/[^.\w]/g, "") ||
    (file.type.includes("pdf") ? ".pdf" : ".bin");
  const name = `${crypto.randomUUID()}${ext}`;
  const rel = path.join("public", "uploads", "chat", name);
  const dir = path.join(process.cwd(), "public", "uploads", "chat");
  await mkdir(dir, { recursive: true });
  const abs = path.join(process.cwd(), rel);
  await writeFile(abs, Buffer.from(await file.arrayBuffer()));

  const publicUrl = `/uploads/chat/${name}`;
  await prisma.chatUploadAsset.create({
    data: {
      sessionId,
      storage: "LOCAL",
      publicUrl,
      localPath: rel.split(path.sep).join("/"),
    },
  });

  return NextResponse.json({
    url: publicUrl,
    name: file.name || name,
  });
}
