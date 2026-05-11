import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { slugify } from "@/lib/slug";
import { computeSalePrice } from "@/lib/money";
import { formatSizeLabelCm } from "@/lib/variant-dimensions";
import { allocateProductCode } from "@/lib/product-code";
import { allocateUniqueVariantSku } from "@/lib/variant-sku";
import { invalidateProductAndHomeBySlug } from "@/lib/redis-cache";
import { normalizeProductTagList } from "@/lib/product-tags";

function normalizeColorHex(input?: string): string | undefined {
  if (!input?.trim()) return undefined;
  let s = input.trim();
  if (!s.startsWith("#")) s = `#${s}`;
  if (/^#[0-9A-Fa-f]{6}$/i.test(s)) return s.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/i.test(s)) {
    const r = s[1]!;
    const g = s[2]!;
    const b = s[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return undefined;
}

const variantIn = z.object({
  colorLabelVi: z.string().min(1),
  colorLabelEn: z.string().min(1),
  colorHex: z.string().optional(),
  heightCm: z.number().int().min(1),
  lengthCm: z.number().int().min(1),
  widthCm: z.number().int().min(1),
  priceAdjustment: z.number().int().min(0).max(500_000_000),
  stockQuantity: z.number().int().min(0),
  imageUrls: z.array(z.string()).optional(),
});

const createBody = z.object({
  nameVi: z.string().min(1).max(300),
  nameEn: z.string().min(1).max(300),
  slug: z.string().min(1).max(150).optional(),
  descriptionVi: z.string().min(1),
  descriptionEn: z.string().min(1),
  basePrice: z.number().int().min(1001),
  discountPercent: z.number().int().min(0).max(100).optional().default(0),
  categoryId: z.string().min(1),
  isFeatured: z.boolean().optional(),
  brandNameVi: z.string().optional(),
  brandNameEn: z.string().optional(),
  metaTitleVi: z.string().optional(),
  metaTitleEn: z.string().optional(),
  metaDescriptionVi: z.string().optional(),
  metaDescriptionEn: z.string().optional(),
  depositAmount: z.number().int().min(0).nullable().optional(),
  tags: z.array(z.string()).optional(),
  variants: z.array(variantIn).min(1),
});

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = createBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ", issues: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  for (const v of d.variants) {
    if (v.colorHex?.trim() && normalizeColorHex(v.colorHex) == null) {
      return NextResponse.json({ error: "Mã màu hex không hợp lệ (dùng #rrggbb hoặc #rgb)" }, { status: 400 });
    }
  }
  let slug = d.slug ? slugify(d.slug) : slugify(d.nameVi);
  const exists = await prisma.product.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString(36)}`;

  const discountPercent = d.discountPercent ?? 0;
  const salePrice = computeSalePrice(d.basePrice, discountPercent);
  const tags = normalizeProductTagList(d.tags ?? []);

  try {
    const actorId = gate.session.sub;
    const product = await prisma.$transaction(async (tx) => {
      const productCode = await allocateProductCode(tx);
      const p = await tx.product.create({
        data: {
          nameVi: d.nameVi,
          nameEn: d.nameEn,
          productCode,
          slug,
          descriptionVi: d.descriptionVi,
          descriptionEn: d.descriptionEn,
          basePrice: d.basePrice,
          discountPercent,
          salePrice,
          categoryId: d.categoryId,
          createdByUserId: actorId,
          isFeatured: d.isFeatured ?? false,
          brandNameVi: d.brandNameVi?.trim() || null,
          brandNameEn: d.brandNameEn?.trim() || null,
          metaTitleVi: d.metaTitleVi?.trim() || null,
          metaTitleEn: d.metaTitleEn?.trim() || null,
          metaDescriptionVi: d.metaDescriptionVi?.trim() || null,
          metaDescriptionEn: d.metaDescriptionEn?.trim() || null,
          depositAmount: d.depositAmount ?? null,
          tags,
        },
      });
      for (const v of d.variants) {
        const sizeLabelVi = formatSizeLabelCm(v.heightCm, v.lengthCm, v.widthCm);
        const sizeLabelEn = sizeLabelVi;
        const sku = await allocateUniqueVariantSku(tx, {
          productId: p.id,
          colorLabelVi: v.colorLabelVi,
          sizeLabelVi,
        });
        await tx.productVariant.create({
          data: {
            productId: p.id,
            colorLabelVi: v.colorLabelVi,
            colorLabelEn: v.colorLabelEn,
            colorHex: normalizeColorHex(v.colorHex),
            sizeLabelVi,
            sizeLabelEn,
            priceAdjustment: v.priceAdjustment,
            stockQuantity: v.stockQuantity,
            sku,
            imageUrls: v.imageUrls ?? [],
          },
        });
      }
      return p;
    });
    await recordAdminAudit({
      actorUserId: actorId,
      action: "product.create",
      entityType: "Product",
      entityId: product.id,
      summary: product.nameVi,
    });
    await invalidateProductAndHomeBySlug(product.slug);
    return NextResponse.json({ id: product.id, slug: product.slug, productCode: product.productCode });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Không tạo được sản phẩm" }, { status: 409 });
  }
}
