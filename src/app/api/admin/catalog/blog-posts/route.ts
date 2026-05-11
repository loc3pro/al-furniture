import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrSeller } from "@/lib/admin-auth";

export async function GET(req: Request) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  const posts = await prisma.blogPost.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    take: 30,
    orderBy: { publishedAt: "desc" },
    select: { id: true, title: true, slug: true, publishedAt: true },
  });

  return NextResponse.json({ posts });
}
