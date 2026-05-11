import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { looksLikeEmail, looksLikePhone, normalizeVnPhone } from "@/lib/identifiers";
import { Role } from "@prisma/client";

const bodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  password: z.string().min(6).max(200),
  identifier: z.string().min(3).max(200),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const { password, identifier, name } = parsed.data;
  const idTrim = identifier.trim();

  let email: string | null = null;
  let phone: string | null = null;

  if (looksLikeEmail(idTrim)) {
    email = idTrim.toLowerCase();
  } else if (looksLikePhone(idTrim)) {
    phone = normalizeVnPhone(idTrim);
  } else {
    return NextResponse.json(
      { error: "Nhập email hợp lệ hoặc số điện thoại Việt Nam" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findFirst({
    where: email ? { email } : { phone: phone! },
  });
  if (existing) {
    return NextResponse.json({ error: "Tài khoản đã tồn tại" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: name ?? null,
      email,
      phone,
      passwordHash,
      role: Role.CUSTOMER,
    },
  });

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
