import { prisma } from "@/lib/prisma";

/**
 * Số tin USER "chưa đọc" theo góc nhìn staff: sau GREATEST(staffLastReadAt, tin STAFF gần nhất).
 * Khi staff mở phiên (staffLastReadAt) hoặc gửi STAFF, badge giảm tương ứng.
 */
export async function getStaffUnreadCounts(): Promise<Map<string, number>> {
  try {
    const rows = await prisma.$queryRaw<Array<{ id: string; unread: bigint }>>`
      SELECT s.id,
        (
          SELECT COUNT(*)::int
          FROM "ChatMessage" m
          WHERE m."sessionId" = s.id
            AND m.sender = 'USER'
            AND m."deletedAt" IS NULL
            AND m."createdAt" > GREATEST(
              COALESCE(s."staffLastReadAt", TIMESTAMPTZ '1970-01-01'),
              COALESCE(
                (
                  SELECT MAX(m2."createdAt")
                  FROM "ChatMessage" m2
                  WHERE m2."sessionId" = s.id
                    AND m2.sender = 'STAFF'
                    AND m2."deletedAt" IS NULL
                ),
                TIMESTAMPTZ '1970-01-01'
              )
            )
        ) AS unread
      FROM "ChatSession" s
      ORDER BY s."updatedAt" DESC
      LIMIT 120
    `;
    return new Map(rows.map((r) => [r.id, Number(r.unread)]));
  } catch {
    return fallbackUnreadCounts();
  }
}

async function fallbackUnreadCounts(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const sessions = await prisma.chatSession.findMany({
      select: { id: true, staffLastReadAt: true },
      orderBy: { updatedAt: "desc" },
      take: 120,
    });
    for (const { id, staffLastReadAt } of sessions) {
      const lastStaff = await prisma.chatMessage.findFirst({
        where: { sessionId: id, sender: "STAFF", deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
      const boundaryMs = Math.max(
        staffLastReadAt?.getTime() ?? 0,
        lastStaff?.createdAt.getTime() ?? 0,
      );
      const boundary = new Date(boundaryMs || 0);
      const n = await prisma.chatMessage.count({
        where: {
          sessionId: id,
          sender: "USER",
          deletedAt: null,
          createdAt: { gt: boundary },
        },
      });
      map.set(id, n);
    }
  } catch {
    /* ignore */
  }
  return map;
}

export function totalUnread(map: Map<string, number>): number {
  let t = 0;
  for (const v of map.values()) t += v;
  return t;
}
