import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const take = Math.min(Number(searchParams.get("take")) || 12, 50);
  try {
    const posts = await prisma.blogPost.findMany({
      orderBy: { publishedAt: "desc" },
      take,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        thumbnailUrl: true,
        authorName: true,
        publishedAt: true,
      },
    });
    return NextResponse.json({ posts });
  } catch {
    return NextResponse.json({ posts: [] });
  }
}
