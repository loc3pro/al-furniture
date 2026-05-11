import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { formatSizeLabelCm } from "@/lib/variant-dimensions";
import { bustShopCachesForProductId } from "@/lib/cache-bust-product";
import {
  deleteCloudinaryImageByPublicId,
  isCloudinaryConfigured,
  isDeletableAdminImagePublicId,
  publicIdFromCloudinaryImageUrl,
} from "@/lib/cloudinary-server";

function normalizeColorHex(input?: string | null): string | undefined {
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

const patchBody = z
  .object({
    priceAdjustment: z.number().int().min(0).max(500_000_000).optional(),
    stockQuantity: z.number().int().min(0).optional(),
    imageUrls: z.array(z.string()).optional(),
    colorLabelVi: z.string().min(1).optional(),
    colorLabelEn: z.string().min(1).optional(),
    sizeLabelVi: z.string().min(1).optional(),
    sizeLabelEn: z.string().min(1).optional(),
    colorHex: z.union([z.string(), z.null()]).optional(),
    heightCm: z.number().int().min(1).optional(),
    lengthCm: z.number().int().min(1).optional(),
    widthCm: z.number().int().min(1).optional(),
  })
  .superRefine((d, ctx) => {
    const dims = [d.heightCm, d.lengthCm, d.widthCm].filter((x) => x !== undefined);
    if (dims.length > 0 && dims.length !== 3) {
      ctx.addIssue({ code: "custom", message: "Cần đủ cao, dài, rộng (cm)" });
    }
  });

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  const d = parsed.data;

  try {
    const data: Prisma.ProductVariantUpdateInput = {};
    if (d.priceAdjustment !== undefined) data.priceAdjustment = d.priceAdjustment;
    if (d.stockQuantity !== undefined) data.stockQuantity = d.stockQuantity;
    if (d.imageUrls !== undefined) data.imageUrls = d.imageUrls;
    if (d.colorLabelVi !== undefined) data.colorLabelVi = d.colorLabelVi;
    if (d.colorLabelEn !== undefined) data.colorLabelEn = d.colorLabelEn;
    if (d.sizeLabelVi !== undefined) data.sizeLabelVi = d.sizeLabelVi;
    if (d.sizeLabelEn !== undefined) data.sizeLabelEn = d.sizeLabelEn;

    if (d.colorHex !== undefined) {
      if (d.colorHex === null || d.colorHex === "") {
        data.colorHex = null;
      } else {
        const hex = normalizeColorHex(d.colorHex);
        data.colorHex = hex ?? null;
      }
    }

    if (d.heightCm !== undefined && d.lengthCm !== undefined && d.widthCm !== undefined) {
      const sl = formatSizeLabelCm(d.heightCm, d.lengthCm, d.widthCm);
      data.sizeLabelVi = sl;
      data.sizeLabelEn = sl;
    }

    const v = await prisma.productVariant.update({
      where: { id },
      data,
    });
    await bustShopCachesForProductId(v.productId);
    return NextResponse.json({ ok: true, variant: v });
  } catch {
    return NextResponse.json({ error: "Cập nhật biến thể thất bại" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  const variant = await prisma.productVariant.findUnique({
    where: { id },
    select: {
      productId: true,
      imageUrls: true,
      _count: { select: { orderItems: true } },
    },
  });
  if (!variant) {
    return NextResponse.json({ error: "Không tìm thấy biến thể" }, { status: 404 });
  }

  const siblings = await prisma.productVariant.count({ where: { productId: variant.productId } });
  if (siblings <= 1) {
    return NextResponse.json({ error: "Sản phẩm cần ít nhất một biến thể" }, { status: 400 });
  }

  if (variant._count.orderItems > 0) {
    return NextResponse.json(
      { error: "Không xóa được: biến thể đã có trong đơn hàng" },
      { status: 409 },
    );
  }

  const raw = variant.imageUrls;
  const urls = Array.isArray(raw) ? raw.filter((u): u is string => typeof u === "string") : [];

  if (isCloudinaryConfigured()) {
    for (const url of urls) {
      const pid = publicIdFromCloudinaryImageUrl(url);
      if (pid && isDeletableAdminImagePublicId(pid)) {
        try {
          await deleteCloudinaryImageByPublicId(pid);
        } catch {
          /* best-effort */
        }
      }
    }
  }

  try {
    await prisma.productVariant.delete({ where: { id } });
    await bustShopCachesForProductId(variant.productId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không xóa được biến thể" }, { status: 400 });
  }
}
