import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrSeller } from "@/lib/admin-auth";
import { notifyAdminChatBadge } from "@/lib/chat-badge-notify";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Đánh dấu staff đã xem phiên — reset badge cho phiên này. */
export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const row = await prisma.chatSession.findUnique({ where: { id }, select: { id: true } });
  if (!row) return NextResponse.json({ error: "Không có phiên" }, { status: 404 });

  /** Raw UPDATE — tránh Prisma @updatedAt: chỉ đọc phiên không được đẩy phiên lên đầu danh sách. */
  await prisma.$executeRaw`
    UPDATE "ChatSession"
    SET "staffLastReadAt" = ${new Date()}
    WHERE "id" = ${id}
  `;

  notifyAdminChatBadge();

  return NextResponse.json({ ok: true });
}
