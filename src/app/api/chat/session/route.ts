import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const COOKIE = "furniture_guest_chat";

export async function POST() {
  const session = await getSession();
  const jar = await cookies();
  let guestKey = jar.get(COOKIE)?.value ?? null;

  if (!guestKey) {
    guestKey = crypto.randomUUID();
    jar.set(COOKIE, guestKey, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  let chat = await prisma.chatSession.findFirst({
    where: session?.sub
      ? { userId: session.sub }
      : { guestKey },
    orderBy: { createdAt: "desc" },
  });

  if (!chat) {
    chat = await prisma.chatSession.create({
      data: {
        userId: session?.sub ?? null,
        guestKey: session?.sub ? null : guestKey,
        status: "OPEN",
      },
    });
  }

  return NextResponse.json({ sessionId: chat.id });
}
