import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ count: 0 });
  }
  const count = await prisma.wishlist.count({
    where: { userId: session.sub },
  });
  return NextResponse.json({ count });
}
