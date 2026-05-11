import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrSeller } from "@/lib/admin-auth";
import { getStaffUnreadCounts } from "@/lib/chat-unread";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 500;

/** Thứ tự phiên: tin USER (khách) gần nhất trước — không phụ thuộc staff click hay tin STAFF. */
export async function GET(req: NextRequest) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  /** Một lần tải nhiều phiên (UI admin không còn phân trang danh sách). */
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(20, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
  );

  const unreadMap = await getStaffUnreadCounts();

  let total = 0;
  try {
    total = await prisma.chatSession.count();
  } catch {
    total = 0;
  }

  const ordered = await prisma.$queryRaw<Array<{ id: string; lastUserAt: Date | null }>>`
    SELECT s.id,
      (
        SELECT MAX(m."createdAt")
        FROM "ChatMessage" m
        WHERE m."sessionId" = s.id
          AND m.sender = 'USER'
          AND m."deletedAt" IS NULL
      ) AS "lastUserAt"
    FROM "ChatSession" s
    ORDER BY COALESCE(
      (
        SELECT MAX(m."createdAt")
        FROM "ChatMessage" m
        WHERE m."sessionId" = s.id
          AND m.sender = 'USER'
          AND m."deletedAt" IS NULL
      ),
      s."createdAt"
    ) DESC
    LIMIT ${limit}
  `;

  const ids = ordered.map((r) => r.id);
  if (ids.length === 0) {
    return NextResponse.json({
      sessions: [],
      total,
      limit,
      totalUnread: [...unreadMap.values()].reduce((a, b) => a + b, 0),
    });
  }

  const rank = new Map(ids.map((sessionId, i) => [sessionId, i]));
  const lastUserMap = new Map(ordered.map((r) => [r.id, r.lastUserAt]));

  const sessions = await prisma.chatSession.findMany({
    where: { id: { in: ids } },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      user: { select: { email: true, phone: true, name: true, avatarUrl: true } },
    },
  });
  sessions.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));

  return NextResponse.json({
    sessions: sessions.map((s) => {
      const lastUserAt = lastUserMap.get(s.id) ?? null;
      const sortAt = lastUserAt ?? s.createdAt;
      return {
        id: s.id,
        status: s.status,
        guestKey: s.guestKey,
        user: s.user,
        lastMessage: s.messages[0]?.message ?? null,
        updatedAt: s.updatedAt.toISOString(),
        sortAt: sortAt.toISOString(),
        unreadCount: unreadMap.get(s.id) ?? 0,
      };
    }),
    total,
    limit,
    totalUnread: [...unreadMap.values()].reduce((a, b) => a + b, 0),
  });
}
