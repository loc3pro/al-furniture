import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { computeSalePrice } from "@/lib/money";
import { getAdminProductEditBundle } from "@/lib/admin-product-edit-payload";
import { invalidateProductAndHomeBySlug } from "@/lib/redis-cache";
import { normalizeProductTagList } from "@/lib/product-tags";

const patchBody = z.object({
  nameVi: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  descriptionVi: z.string().min(1).optional(),
  descriptionEn: z.string().min(1).optional(),
  basePrice: z.number().int().min(1001).optional(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  categoryId: z.string().optional(),
  isFeatured: z.boolean().optional(),
  brandNameVi: z.string().nullable().optional(),
  brandNameEn: z.string().nullable().optional(),
  metaTitleVi: z.string().nullable().optional(),
  metaTitleEn: z.string().nullable().optional(),
  metaDescriptionVi: z.string().nullable().optional(),
  metaDescriptionEn: z.string().nullable().optional(),
  depositAmount: z.number().int().min(0).nullable().optional(),
  tags: z.array(z.string()).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const bundle = await getAdminProductEditBundle(id);
  if (!bundle) {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }
  return NextResponse.json(bundle);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  const data = parsed.data;
  const update: Record<string, unknown> = {};
  if (data.nameVi !== undefined) update.nameVi = data.nameVi;
  if (data.nameEn !== undefined) update.nameEn = data.nameEn;
  if (data.descriptionVi !== undefined) update.descriptionVi = data.descriptionVi;
  if (data.descriptionEn !== undefined) update.descriptionEn = data.descriptionEn;
  if (data.basePrice !== undefined) update.basePrice = data.basePrice;
  if (data.discountPercent !== undefined) update.discountPercent = data.discountPercent;
  if (data.categoryId !== undefined) update.categoryId = data.categoryId;
  if (data.isFeatured !== undefined) update.isFeatured = data.isFeatured;
  if (data.brandNameVi !== undefined) update.brandNameVi = data.brandNameVi?.trim() || null;
  if (data.brandNameEn !== undefined) update.brandNameEn = data.brandNameEn?.trim() || null;
  if (data.metaTitleVi !== undefined) update.metaTitleVi = data.metaTitleVi?.trim() || null;
  if (data.metaTitleEn !== undefined) update.metaTitleEn = data.metaTitleEn?.trim() || null;
  if (data.metaDescriptionVi !== undefined) update.metaDescriptionVi = data.metaDescriptionVi?.trim() || null;
  if (data.metaDescriptionEn !== undefined) update.metaDescriptionEn = data.metaDescriptionEn?.trim() || null;
  if (data.depositAmount !== undefined) update.depositAmount = data.depositAmount;
  if (data.tags !== undefined) update.tags = normalizeProductTagList(data.tags);

  try {
    const current = await prisma.product.findUnique({
      where: { id },
      select: { basePrice: true, discountPercent: true, slug: true },
    });
    if (!current) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }
    const nextBase = (data.basePrice ?? current.basePrice) as number;
    const nextDiscount = (data.discountPercent ?? current.discountPercent) as number;
    update.salePrice = computeSalePrice(nextBase, nextDiscount);

    await prisma.product.update({ where: { id }, data: update });
    await recordAdminAudit({
      actorUserId: gate.session.sub,
      action: "product.update",
      entityType: "Product",
      entityId: id,
      summary: "Cập nhật thông tin sản phẩm",
    });
    if (current.slug) await invalidateProductAndHomeBySlug(current.slug);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Cập nhật thất bại" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const existing = await prisma.product.findUnique({ where: { id }, select: { slug: true } });
  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }
  try {
    await prisma.product.delete({ where: { id } });
    await recordAdminAudit({
      actorUserId: gate.session.sub,
      action: "product.delete",
      entityType: "Product",
      entityId: id,
      summary: "Xóa sản phẩm",
    });
    await invalidateProductAndHomeBySlug(existing.slug);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Không xóa được (có đơn hàng / biến thể đang tham chiếu)" },
      { status: 409 },
    );
  }
}
