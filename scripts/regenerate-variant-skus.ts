/**
 * Gán lại SKU toàn bộ biến thể theo định dạng
 * [Thương hiệu] - [Danh mục] - [Màu] - [Kích cỡ] (+ hậu tố khi trùng).
 * Chạy sau migrate: npx tsx scripts/regenerate-variant-skus.ts
 */
import { prisma } from "@/lib/prisma";
import { allocateUniqueVariantSku } from "@/lib/variant-sku";

async function main() {
  const variants = await prisma.productVariant.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      productId: true,
      colorLabelVi: true,
      sizeLabelVi: true,
    },
  });

  for (const v of variants) {
    const sku = await allocateUniqueVariantSku(prisma, {
      productId: v.productId,
      colorLabelVi: v.colorLabelVi,
      sizeLabelVi: v.sizeLabelVi,
      excludeVariantId: v.id,
    });
    await prisma.productVariant.update({
      where: { id: v.id },
      data: { sku },
    });
    console.log(v.id.slice(-8), "→", sku);
  }

  console.log("Done:", variants.length, "variants.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
