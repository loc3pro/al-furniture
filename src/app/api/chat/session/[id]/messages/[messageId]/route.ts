import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { canAccessChatSession } from "@/lib/chat-access";
import { notifyAdminChatBadge } from "@/lib/chat-badge-notify";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; messageId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id: sessionId, messageId } = await ctx.params;
  const access = await canAccessChatSession(sessionId);
  if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const msg = await prisma.chatMessage.findFirst({
    where: { id: messageId, sessionId },
  });
  if (!msg) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (msg.deletedAt) return NextResponse.json({ ok: true });

  const s = await getSession();
  const isStaff = s?.role === "ADMIN" || s?.role === "SUPPORT" || s?.role === "SELLER";
  const isOwnUserMessage =
    msg.sender === "USER" && access.row?.userId && s?.sub === access.row.userId;
  const isGuestUserMessage =
    msg.sender === "USER" &&
    !access.row?.userId &&
    !!access.guestKey &&
    access.row?.guestKey === access.guestKey;

  if (!isStaff && !isOwnUserMessage && !isGuestUserMessage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.chatMessage.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
  });

  notifyAdminChatBadge();

  return NextResponse.json({ ok: true });
}
