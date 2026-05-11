import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canAccessChatSession } from "@/lib/chat-access";
import { getSession } from "@/lib/session";
import { notifyAdminChatBadge } from "@/lib/chat-badge-notify";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const access = await canAccessChatSession(id);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return NextResponse.json({ messages });
}

const safeAttachmentUrl = z
  .string()
  .max(2000)
  .refine(
    (s) => {
      if (s.includes("..")) return false;
      if (s.startsWith("/")) return s.startsWith("/uploads/chat/");
      try {
        new URL(s);
        return true;
      } catch {
        return false;
      }
    },
    { message: "URL đính kèm không hợp lệ" },
  );

const postBody = z
  .object({
    message: z.string().max(2000).default(""),
    sender: z.enum(["USER", "STAFF"]).default("USER"),
    attachmentUrl: safeAttachmentUrl.optional(),
    attachmentName: z.string().max(200).optional(),
  })
  .refine((d) => d.message.trim().length > 0 || !!d.attachmentUrl, {
    message: "Cần nội dung hoặc tệp đính kèm",
  });

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const access = await canAccessChatSession(id);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = postBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Tin nhắn không hợp lệ" }, { status: 400 });
  }

  const session = await getSession();
  if (
    parsed.data.sender === "STAFF" &&
    session?.role !== "ADMIN" &&
    session?.role !== "SUPPORT" &&
    session?.role !== "SELLER"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const text = parsed.data.message.trim() || (parsed.data.attachmentUrl ? "📎" : "");
  const hasFile = Boolean(parsed.data.attachmentUrl);
  const msg = await prisma.chatMessage.create({
    data: {
      sessionId: id,
      sender: parsed.data.sender,
      message: text,
      ...(hasFile
        ? {
            attachmentUrl: parsed.data.attachmentUrl,
            attachmentName: parsed.data.attachmentName ?? null,
          }
        : {}),
    },
  });

  await prisma.chatSession.update({
    where: { id },
    data: {
      updatedAt: new Date(),
      ...(parsed.data.sender === "STAFF" ? { staffLastReadAt: new Date() } : {}),
    },
  });

  notifyAdminChatBadge();

  return NextResponse.json({ message: msg });
}
