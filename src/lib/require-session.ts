import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/session";

export type SessionResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse };

export async function requireSession(): Promise<SessionResult> {
  const session = await getSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 }) };
  }
  return { ok: true, session };
}
