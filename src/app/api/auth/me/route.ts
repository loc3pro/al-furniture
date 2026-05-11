import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  const row = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      googleSub: true,
      passwordHash: true,
    },
  });
  if (!row) {
    return NextResponse.json({ user: null });
  }
  const user = {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    avatarUrl: row.avatarUrl,
    linkedGoogle: row.googleSub != null,
    hasPassword: row.passwordHash != null,
  };
  return NextResponse.json({ user });
}
