import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { slugify } from "@/lib/slug";
import { invalidateRetailStoresPublicCache } from "@/lib/redis-cache";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const list = await prisma.retailStore.findMany({
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ stores: list });
}

const postSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().min(1).max(500),
  phone: z.string().max(40).optional().nullable(),
  openingHours: z.string().max(120).optional().nullable(),
  mapUrl: z.union([z.string().url(), z.literal("")]).optional().nullable(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
  /** Đặt làm cửa hàng mặc định (Showroom) — bỏ cờ ở các bản ghi khác. */
  isDefault: z.boolean().optional(),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
  const d = parsed.data;
  let slug = slugify(d.name);
  if (!slug) slug = `store-${Date.now().toString(36)}`;
  const exists = await prisma.retailStore.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString(36)}`;

  const row = await prisma.$transaction(async (tx) => {
    if (d.isDefault === true) {
      await tx.retailStore.updateMany({ data: { isDefault: false } });
    }
    return tx.retailStore.create({
      data: {
        slug,
        name: d.name.trim(),
        address: d.address.trim(),
        phone: d.phone?.trim() || null,
        openingHours: d.openingHours?.trim() || null,
        mapUrl: d.mapUrl && d.mapUrl !== "" ? d.mapUrl : null,
        sortOrder: d.sortOrder ?? 0,
        active: d.active ?? true,
        isDefault: d.isDefault === true,
      },
    });
  });
  await invalidateRetailStoresPublicCache();
  return NextResponse.json({ store: row });
}
