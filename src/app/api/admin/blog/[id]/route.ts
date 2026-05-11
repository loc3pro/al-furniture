import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { invalidateHomeSectionsCache } from "@/lib/redis-cache";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  excerpt: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  thumbnailUrl: z.string().url().optional().nullable().or(z.literal("")),
  authorName: z.string().optional(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  publishedAt: z.string().datetime().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const d = parsed.data;
  const thumb =
    d.thumbnailUrl === undefined ? undefined : d.thumbnailUrl === "" ? null : d.thumbnailUrl;
  try {
    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.slug !== undefined ? { slug: d.slug } : {}),
        ...(d.excerpt !== undefined ? { excerpt: d.excerpt } : {}),
        ...(d.content !== undefined ? { content: d.content } : {}),
        ...(thumb !== undefined ? { thumbnailUrl: thumb } : {}),
        ...(d.authorName !== undefined ? { authorName: d.authorName } : {}),
        ...(d.metaTitle !== undefined ? { metaTitle: d.metaTitle } : {}),
        ...(d.metaDescription !== undefined ? { metaDescription: d.metaDescription } : {}),
        ...(d.publishedAt !== undefined ? { publishedAt: new Date(d.publishedAt) } : {}),
      },
    });
    await invalidateHomeSectionsCache();
    return NextResponse.json({ post });
  } catch {
    return NextResponse.json({ error: "Không cập nhật được (slug trùng?)" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  try {
    await prisma.blogPost.delete({ where: { id } });
    await invalidateHomeSectionsCache();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không xóa được" }, { status: 404 });
  }
}
