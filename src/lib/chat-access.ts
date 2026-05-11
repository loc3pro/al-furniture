import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const COOKIE = "furniture_guest_chat";

export async function canAccessChatSession(sessionId: string) {
  const s = await getSession();
  const jar = await cookies();
  const guestKey = jar.get(COOKIE)?.value;
  const row = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!row) return { ok: false as const, row: null, session: s, guestKey: guestKey ?? null };
  if (s?.sub && row.userId === s.sub) return { ok: true as const, row, session: s, guestKey: guestKey ?? null };
  if (!row.userId && guestKey && row.guestKey === guestKey) return { ok: true as const, row, session: s, guestKey: guestKey ?? null };
  if (s?.role === "ADMIN" || s?.role === "SUPPORT" || s?.role === "SELLER") return { ok: true as const, row, session: s, guestKey: guestKey ?? null };
  return { ok: false as const, row, session: s, guestKey: guestKey ?? null };
}
