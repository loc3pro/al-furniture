import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { verifyGoogleIdToken } from "@/lib/google";
import { Role } from "@prisma/client";

const bodySchema = z.object({
  credential: z.string().min(10),
});

export async function POST(req: Request) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Chưa cấu hình Google Client ID" }, { status: 503 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Thiếu credential" }, { status: 400 });
  }

  const payload = await verifyGoogleIdToken(parsed.data.credential, clientId);
  if (!payload?.sub || !payload.email_verified || !payload.email) {
    return NextResponse.json({ error: "Không xác minh được Google" }, { status: 401 });
  }

  let user = await prisma.user.findUnique({ where: { googleSub: payload.sub } });
  if (!user) {
    const byEmail = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleSub: payload.sub,
          avatarUrl: payload.picture ?? byEmail.avatarUrl,
          name: byEmail.name ?? payload.name,
          emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: payload.email.toLowerCase(),
          googleSub: payload.sub,
          name: payload.name ?? null,
          avatarUrl: payload.picture ?? null,
          role: Role.CUSTOMER,
          emailVerifiedAt: new Date(),
        },
      });
    }
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
