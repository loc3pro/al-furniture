import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminOrSeller } from "@/lib/admin-auth";
import { invalidateHomeSectionsCache } from "@/lib/redis-cache";

export async function GET() {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const looks = await prisma.shopTheLook.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      heroImageUrl: true,
      published: true,
      sortOrder: true,
      editorZoom: true,
      updatedAt: true,
      _count: { select: { hotspots: true } },
    },
  });

  return NextResponse.json({
    looks: looks.map((l) => ({
      ...l,
      hotspotCount: l._count.hotspots,
    })),
  });
}

const hotspotIn = z.object({
  productId: z.string().min(1),
  xPercent: z.number().min(0).max(100),
  yPercent: z.number().min(0).max(100),
  sortOrder: z.number().int().min(0).optional(),
});

const postSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "Slug chỉ gồm chữ thường, số và dấu -"),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300).optional().nullable(),
  description: z.string().max(50_000).optional().nullable(),
  heroImageUrl: z.string().url(),
  published: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  editorZoom: z.number().min(0.25).max(4).optional(),
  hotspots: z.array(hotspotIn).max(40),
});

export async function POST(req: Request) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ", details: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;
  const exists = await prisma.shopTheLook.findUnique({ where: { slug: body.slug } });
  if (exists) {
    return NextResponse.json({ error: "Slug đã tồn tại" }, { status: 409 });
  }

  const productIds = [...new Set(body.hotspots.map((h) => h.productId))];
  const count = await prisma.product.count({ where: { id: { in: productIds } } });
  if (count !== productIds.length) {
    return NextResponse.json({ error: "Một hoặc nhiều sản phẩm không tồn tại" }, { status: 400 });
  }

  const maxSo = await prisma.shopTheLook.aggregate({ _max: { sortOrder: true } });
  const sortOrder = body.sortOrder ?? (maxSo._max.sortOrder ?? -1) + 1;

  const look = await prisma.shopTheLook.create({
    data: {
      slug: body.slug.toLowerCase(),
      title: body.title.trim(),
      subtitle: body.subtitle?.trim() || null,
      description: body.description?.trim() || null,
      heroImageUrl: body.heroImageUrl,
      published: body.published ?? false,
      sortOrder,
      editorZoom: body.editorZoom ?? 1,
      hotspots: {
        create: body.hotspots.map((h, i) => ({
          productId: h.productId,
          xPercent: h.xPercent,
          yPercent: h.yPercent,
          sortOrder: h.sortOrder ?? i,
        })),
      },
    },
  });

  await invalidateHomeSectionsCache();
  return NextResponse.json({ look });
}
