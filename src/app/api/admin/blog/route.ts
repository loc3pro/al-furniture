import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { slugify } from "@/lib/slug";
import { invalidateHomeSectionsCache } from "@/lib/redis-cache";
import {
  buildBlogListOrderBy,
  buildBlogListWhere,
  parseBlogListSearchParams,
} from "@/lib/admin-blog-list";

const createBody = z.object({
  title: z.string().min(1).max(400),
  slug: z.string().max(200).optional(),
  excerpt: z.string().max(4000).optional(),
  authorName: z.string().max(200).optional(),
});

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const { searchParams } = new URL(req.url);
  const sp = Object.fromEntries(searchParams.entries());
  const parsed = parseBlogListSearchParams(sp);
  const where = buildBlogListWhere(parsed);
  const orderBy = buildBlogListOrderBy(parsed.sort, parsed.dir);
  const skip = (parsed.page - 1) * parsed.pageSize;

  try {
    const [posts, total, authorRows] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy,
        skip,
        take: parsed.pageSize,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          authorName: true,
          publishedAt: true,
          thumbnailUrl: true,
        },
      }),
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        select: { authorName: true },
        distinct: ["authorName"],
        orderBy: { authorName: "asc" },
      }),
    ]);

    return NextResponse.json({
      posts,
      total,
      page: parsed.page,
      pageSize: parsed.pageSize,
      authors: authorRows.map((r) => r.authorName),
      filters: {
        q: parsed.q,
        author: parsed.author,
        from: parsed.from,
        to: parsed.to,
        sort: parsed.sort,
        dir: parsed.dir,
      },
    });
  } catch {
    return NextResponse.json({ error: "Không tải được danh sách" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = createBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const { title, slug: slugInput, excerpt, authorName } = parsed.data;
  const titleTrim = title.trim();

  let slug = slugInput?.trim() ? slugify(slugInput.trim()) : slugify(titleTrim);
  if (!slug) slug = `bai-${Date.now().toString(36)}`;

  const base = slug;
  let n = 0;
  while (await prisma.blogPost.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const excerptTrim = excerpt?.trim();
  const excerptFinal =
    excerptTrim && excerptTrim.length > 0 ? excerptTrim : titleTrim.slice(0, 280) || "Bài viết";

  try {
    const post = await prisma.blogPost.create({
      data: {
        title: titleTrim,
        slug,
        excerpt: excerptFinal,
        content: "<p></p>",
        authorName: authorName?.trim() || "Furniture ECM",
      },
    });
    await invalidateHomeSectionsCache();
    return NextResponse.json({ post });
  } catch {
    return NextResponse.json({ error: "Không tạo được bài" }, { status: 400 });
  }
}
