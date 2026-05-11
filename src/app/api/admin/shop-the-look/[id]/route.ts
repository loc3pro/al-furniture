import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminOrSeller } from "@/lib/admin-auth";
import { invalidateHomeSectionsCache } from "@/lib/redis-cache";
import { buildProductCardForLook } from "@/lib/shop-the-look-product-meta";

type Ctx = { params: Promise<{ id: string }> };

const hotspotIn = z.object({
  productId: z.string().min(1),
  xPercent: z.number().min(0).max(100),
  yPercent: z.number().min(0).max(100),
  sortOrder: z.number().int().min(0).optional(),
});

const putSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300).optional().nullable(),
  description: z.string().max(50_000).optional().nullable(),
  heroImageUrl: z.string().url(),
  published: z.boolean(),
  /** Chỉ gửi khi đổi thứ tự trong form; mặc định giữ nguyên (đổi thứ tự qua danh sách admin). */
  sortOrder: z.number().int().optional(),
  editorZoom: z.number().min(0.25).max(4),
  hotspots: z.array(hotspotIn).max(40),
});

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;

  const look = await prisma.shopTheLook.findUnique({
    where: { id },
    include: {
      hotspots: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            include: {
              variants: {
                orderBy: { createdAt: "asc" },
                take: 4,
                select: { priceAdjustment: true, imageUrls: true },
              },
            },
          },
        },
      },
    },
  });

  if (!look) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    look: {
      id: look.id,
      slug: look.slug,
      title: look.title,
      subtitle: look.subtitle,
      description: look.description,
      heroImageUrl: look.heroImageUrl,
      published: look.published,
      sortOrder: look.sortOrder,
      editorZoom: look.editorZoom,
    },
    hotspots: look.hotspots.map((h, idx) => ({
      id: h.id,
      productId: h.productId,
      xPercent: h.xPercent,
      yPercent: h.yPercent,
      sortOrder: h.sortOrder ?? idx,
      product: buildProductCardForLook(h.product, "vi"),
    })),
  });
}

export async function PUT(req: Request, ctx: Ctx) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;

  const json = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ", details: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;
  const current = await prisma.shopTheLook.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const slugLower = body.slug.toLowerCase();
  if (slugLower !== current.slug) {
    const clash = await prisma.shopTheLook.findUnique({ where: { slug: slugLower } });
    if (clash) {
      return NextResponse.json({ error: "Slug đã tồn tại" }, { status: 409 });
    }
  }

  const productIds = [...new Set(body.hotspots.map((h) => h.productId))];
  const pCount = await prisma.product.count({ where: { id: { in: productIds } } });
  if (pCount !== productIds.length) {
    return NextResponse.json({ error: "Một hoặc nhiều sản phẩm không tồn tại" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.shopTheLookHotspot.deleteMany({ where: { lookId: id } }),
    prisma.shopTheLook.update({
      where: { id },
      data: {
        slug: slugLower,
        title: body.title.trim(),
        subtitle: body.subtitle?.trim() || null,
        description: body.description?.trim() || null,
        heroImageUrl: body.heroImageUrl,
        published: body.published,
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        editorZoom: body.editorZoom,
        hotspots: {
          create: body.hotspots.map((h, i) => ({
            productId: h.productId,
            xPercent: h.xPercent,
            yPercent: h.yPercent,
            sortOrder: h.sortOrder ?? i,
          })),
        },
      },
    }),
  ]);

  const look = await prisma.shopTheLook.findUnique({ where: { id } });
  await invalidateHomeSectionsCache();
  return NextResponse.json({ ok: true, look });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;

  try {
    await prisma.shopTheLook.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await invalidateHomeSectionsCache();
  return NextResponse.json({ ok: true });
}
