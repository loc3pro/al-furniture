import type { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/session";

export async function requireAdmin(): Promise<
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, session };
}

const ADMIN_OR_SELLER: Role[] = ["ADMIN", "SELLER"];

/** Cho API / trang mà cả quản trị và seller được dùng. */
export async function requireAdminOrSeller(): Promise<
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session || !ADMIN_OR_SELLER.includes(session.role)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, session };
}
