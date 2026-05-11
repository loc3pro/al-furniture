import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { bustShopCachesForProductId } from "@/lib/cache-bust-product";
import { allocateUniqueVariantSku } from "@/lib/variant-sku";
import { formatSizeLabelCm } from "@/lib/variant-dimensions";

type Ctx = { params: Promise<{ id: string }> };

/** Thêm một biến thể mới (mặc định — chỉnh sau trong form) */
export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id: productId } = await ctx.params;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 });
  }

  try {
    const colorLabelVi = "Màu mới";
    const colorLabelEn = "New color";
    const sizeLabelVi = formatSizeLabelCm(80, 200, 160);
    const sizeLabelEn = sizeLabelVi;
    const sku = await allocateUniqueVariantSku(prisma, {
      productId,
      colorLabelVi,
      sizeLabelVi,
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId,
        colorLabelVi,
        colorLabelEn,
        colorHex: null,
        sizeLabelVi,
        sizeLabelEn,
        priceAdjustment: 0,
        stockQuantity: 0,
        sku,
        imageUrls: [],
      },
    });
    await bustShopCachesForProductId(productId);
    return NextResponse.json({ variant: { id: variant.id } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Không tạo được biến thể" }, { status: 409 });
  }
}
