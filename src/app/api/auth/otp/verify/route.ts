import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { looksLikeEmail, looksLikePhone, normalizeVnPhone } from "@/lib/identifiers";

const bodySchema = z.object({
  target: z.string().min(3),
  code: z.string().min(4).max(10),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  const { target, code } = parsed.data;
  const t = target.trim();
  let normalized = t;
  if (looksLikePhone(t)) normalized = normalizeVnPhone(t);
  else if (looksLikeEmail(t)) normalized = t.toLowerCase();
  else {
    return NextResponse.json({ error: "Sai định dạng" }, { status: 400 });
  }

  const row = await prisma.authVerification.findFirst({
    where: {
      target: normalized,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!row || row.code !== code.trim()) {
    return NextResponse.json({ error: "Mã không đúng hoặc đã hết hạn" }, { status: 401 });
  }

  await prisma.authVerification.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });

  const user = await prisma.user.findFirst({
    where: looksLikePhone(t) ? { phone: normalized } : { email: normalized },
  });

  if (!user) {
    return NextResponse.json({ verified: true, needsRegistration: true });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: looksLikePhone(t) ? { phoneVerifiedAt: new Date() } : { emailVerifiedAt: new Date() },
  });

  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  await setSessionCookie(token);

  return NextResponse.json({
    verified: true,
    needsRegistration: false,
    user: { id: user.id, email: user.email, phone: user.phone, role: user.role },
  });
}
