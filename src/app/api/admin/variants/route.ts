import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrSeller } from "@/lib/admin-auth";
import { variantUnitPrice } from "@/lib/money";

/** Gợi ý biến thể theo tên SP, màu, kích thước, mã biến thể — tạo đơn thủ công */
export async function GET(req: Request) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ variants: [] });
  }

  const variants = await prisma.productVariant.findMany({
    where: {
      OR: [
        { product: { nameVi: { contains: q, mode: "insensitive" } } },
        { product: { nameEn: { contains: q, mode: "insensitive" } } },
        { sku: { contains: q, mode: "insensitive" } },
        { colorLabelVi: { contains: q, mode: "insensitive" } },
        { colorLabelEn: { contains: q, mode: "insensitive" } },
        { sizeLabelVi: { contains: q, mode: "insensitive" } },
        { sizeLabelEn: { contains: q, mode: "insensitive" } },
        { id: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 25,
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: { nameVi: true, nameEn: true, basePrice: true, salePrice: true, discountPercent: true },
      },
    },
  });

  return NextResponse.json({
    variants: variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      productName: v.product.nameVi,
      colorLabel: v.colorLabelVi,
      sizeLabel: v.sizeLabelVi,
      stockQuantity: v.stockQuantity,
      basePrice: v.product.basePrice,
      salePrice: v.product.salePrice,
      discountPercent: v.product.discountPercent,
      unitPrice: variantUnitPrice(
        {
          basePrice: v.product.basePrice,
          salePrice: v.product.salePrice,
          discountPercent: v.product.discountPercent,
        },
        v.priceAdjustment,
      ),
      priceAdjustment: v.priceAdjustment,
    })),
  });
}
