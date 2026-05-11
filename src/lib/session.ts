import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "./auth-constants";
import type { Role } from "@prisma/client";

/** Trình duyệt chỉ lưu cookie `Secure` khi trang đang mở bằng HTTPS. HTTP (vd. http://IP:3000) cần secure: false. */
function sessionCookieSecure(): boolean {
  if (process.env.SESSION_COOKIE_SECURE === "1" || process.env.SESSION_COOKIE_SECURE === "true") {
    return true;
  }
  if (process.env.SESSION_COOKIE_SECURE === "0" || process.env.SESSION_COOKIE_SECURE === "false") {
    return false;
  }
  if (process.env.NODE_ENV !== "production") return false;
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  return site.startsWith("https://");
}

export type SessionPayload = {
  sub: string;
  email: string | null;
  role: Role;
};

function getSecret() {
  const s =
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "development" ? "dev-only-secret-min-16chars!!" : null);
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET must be set (min 16 characters)");
  }
  return new TextEncoder().encode(s);
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    if (!sub) return null;
    const role = payload.role as Role | undefined;
    if (!role) return null;
    return {
      sub,
      email: typeof payload.email === "string" ? payload.email : null,
      role,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return verifySessionToken(raw);
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  // Must match setSessionCookie path / sameSite / secure or some clients keep the old cookie
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
