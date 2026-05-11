import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { looksLikeEmail, looksLikePhone, normalizeVnPhone } from "@/lib/identifiers";

const bodySchema = z.object({
  identifier: z.string().min(3).max(200),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const { identifier, password } = parsed.data;
  const idTrim = identifier.trim();

  let user = null;
  if (looksLikeEmail(idTrim)) {
    user = await prisma.user.findUnique({ where: { email: idTrim.toLowerCase() } });
  } else if (looksLikePhone(idTrim)) {
    user = await prisma.user.findUnique({ where: { phone: normalizeVnPhone(idTrim) } });
  } else {
    return NextResponse.json({ error: "Email hoặc SĐT không hợp lệ" }, { status: 400 });
  }

  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Sai thông tin đăng nhập" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Sai thông tin đăng nhập" }, { status: 401 });
  }

  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  await setSessionCookie(token);

  return NextResponse.json({
    user: { id: user.id, email: user.email, phone: user.phone, name: user.name, role: user.role },
  });
}
