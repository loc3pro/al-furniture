import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { isSellerAllowedAdminPath } from "./lib/seller-admin-paths";

function getSecretKey() {
  const s =
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "development" ? "dev-only-secret-min-16chars!!" : null);
  if (!s || s.length < 16) return null;
  return new TextEncoder().encode(s);
}

type JwtPayload = { role?: string };

async function verifySession(token: string, secret: Uint8Array): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as JwtPayload;
  } catch {
    return null;
  }
}

/** Trang shop / tài khoản — ADMIN chỉ dùng /admin; SELLER vẫn dùng storefront */
function isStorefrontDocumentPath(pathname: string) {
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/api")) return false;
  if (pathname.startsWith("/_next")) return false;
  // file tĩnh public (favicon, robots, ảnh, font…)
  if (/\.[a-zA-Z0-9]{2,8}$/.test(pathname)) return false;
  return true;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const secret = getSecretKey();

  // Không cấu hình secret: không chặn (dev lỗi cấu hình)
  if (!secret) {
    return NextResponse.next();
  }

  // --- Khu vực admin: ADMIN hoặc SELLER (seller chỉ một số trang)
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("furniture_session")?.value;
    if (!token) {
      const next = encodeURIComponent(pathname + req.nextUrl.search);
      return NextResponse.redirect(new URL(`/auth/login?next=${next}`, req.url));
    }
    const payload = await verifySession(token, secret);
    const role = payload?.role;
    if (!payload || (role !== "ADMIN" && role !== "SELLER")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (role === "SELLER" && !isSellerAllowedAdminPath(pathname)) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  // --- Storefront: ADMIN luôn vào /admin; SELLER dùng cả shop và admin
  if (isStorefrontDocumentPath(pathname)) {
    const token = req.cookies.get("furniture_session")?.value;
    if (token) {
      const payload = await verifySession(token, secret);
      if (payload?.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Khớp mọi route trừ _next/static, _next/image, file có đuôi (ảnh, favicon…).
     */
    "/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|txt|xml)$).*)",
  ],
};
