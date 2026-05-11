import type { Prisma } from "@prisma/client";

type Db = Prisma.TransactionClient | import("@prisma/client").PrismaClient;

function cleanSegment(s: string | null | undefined): string {
  if (s == null) return "";
  return s.trim().replace(/\s+/g, " ");
}

/**
 * Định dạng SKU hiển thị:
 * [Thương hiệu] - [Loại SP / danh mục] - [Màu/đặc điểm] - [Kích cỡ]
 * brand để trống → "Nội thất".
 */
export function formatVariantSkuBase(parts: {
  brandNameVi: string | null | undefined;
  categoryNameVi: string;
  colorLabelVi: string;
  sizeLabelVi: string;
}): string {
  const brand = cleanSegment(parts.brandNameVi) || "Nội thất";
  const cat = cleanSegment(parts.categoryNameVi) || "—";
  const color = cleanSegment(parts.colorLabelVi) || "—";
  const size = cleanSegment(parts.sizeLabelVi) || "—";
  return `${brand} - ${cat} - ${color} - ${size}`;
}

/** Gán SKU duy nhất (thử base, rồi base + " (1)", " (2)", …). */
export async function allocateUniqueVariantSku(
  db: Db,
  input: {
    productId: string;
    colorLabelVi: string;
    sizeLabelVi: string;
    excludeVariantId?: string;
  },
): Promise<string> {
  const product = await db.product.findUnique({
    where: { id: input.productId },
    select: { brandNameVi: true, category: { select: { nameVi: true } } },
  });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");

  const base = formatVariantSkuBase({
    brandNameVi: product.brandNameVi,
    categoryNameVi: product.category.nameVi,
    colorLabelVi: input.colorLabelVi,
    sizeLabelVi: input.sizeLabelVi,
  });

  let candidate = base;
  let n = 0;
  for (;;) {
    const clash = await db.productVariant.findFirst({
      where: {
        sku: candidate,
        ...(input.excludeVariantId ? { NOT: { id: input.excludeVariantId } } : {}),
      },
      select: { id: true },
    });
    if (!clash) return candidate;
    n += 1;
    candidate = `${base} (${n})`;
  }
}
