import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { chatUploadRetentionMs } from "@/lib/chat-upload-constants";
import {
  deleteCloudinaryImageByPublicId,
  deleteCloudinaryRawByPublicId,
  isCloudinaryConfigured,
  isDeletableChatCloudinaryPublicId,
  publicIdFromCloudinaryImageUrl,
  publicIdFromCloudinaryRawUrl,
} from "@/lib/cloudinary-server";

function safeLocalPath(stored: string): string | null {
  const rel = stored.replace(/\\/g, "/");
  if (!rel.startsWith("public/uploads/chat/") || rel.includes("..")) return null;
  const abs = path.normalize(path.join(process.cwd(), ...rel.split("/")));
  const root = path.normalize(path.join(process.cwd(), "public", "uploads", "chat"));
  if (!abs.startsWith(root)) return null;
  return abs;
}

async function stripMessageAttachments(url: string) {
  await prisma.chatMessage.updateMany({
    where: { attachmentUrl: url },
    data: { attachmentUrl: null, attachmentName: null },
  });
}

/** Xóa upload chat hết hạn: disk, Cloudinary (nếu có), hàng DB + gỡ đính kèm tin nhắn. */
export async function purgeExpiredChatUploads(): Promise<{ deleted: number; errors: number }> {
  const cutoff = new Date(Date.now() - chatUploadRetentionMs());
  const rows = await prisma.chatUploadAsset.findMany({
    where: { createdAt: { lt: cutoff } },
    take: 500,
  });

  let deleted = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      if (row.storage === "LOCAL" && row.localPath) {
        const abs = safeLocalPath(row.localPath);
        if (abs) {
          try {
            await unlink(abs);
          } catch {
            /* đã xóa tay */
          }
        }
      }

      if (row.storage === "CLOUD" && row.cloudPublicId && isDeletableChatCloudinaryPublicId(row.cloudPublicId)) {
        if (isCloudinaryConfigured()) {
          const img = await deleteCloudinaryImageByPublicId(row.cloudPublicId);
          if (!img.ok) {
            const raw = await deleteCloudinaryRawByPublicId(row.cloudPublicId);
            if (!raw.ok) errors++;
          }
        }
      } else if (row.storage === "CLOUD" && !row.cloudPublicId && row.publicUrl && isCloudinaryConfigured()) {
        const pid =
          publicIdFromCloudinaryImageUrl(row.publicUrl) ?? publicIdFromCloudinaryRawUrl(row.publicUrl);
        if (pid && isDeletableChatCloudinaryPublicId(pid)) {
          const img = await deleteCloudinaryImageByPublicId(pid);
          if (!img.ok) await deleteCloudinaryRawByPublicId(pid);
        }
      }

      await stripMessageAttachments(row.publicUrl);
      await prisma.chatUploadAsset.delete({ where: { id: row.id } });
      deleted++;
    } catch {
      errors++;
    }
  }

  return { deleted, errors };
}
