import type { Prisma } from "@prisma/client";
import type { ProductsCatalogFilters } from "@/lib/products-catalog-params";

/** Điều kiện Prisma cho lọc danh mục / màu / tồn kho (không gồm từ khóa `q`). */
export function buildProductsFacetWhere(
  f: Pick<ProductsCatalogFilters, "cats" | "colors" | "stockOnly">
): Prisma.ProductWhereInput {
  const parts: Prisma.ProductWhereInput[] = [];
  if (f.cats.length) parts.push({ category: { slug: { in: f.cats } } });
  if (f.colors.length) parts.push({ variants: { some: { colorLabelVi: { in: f.colors } } } });
  if (f.stockOnly) parts.push({ variants: { some: { stockQuantity: { gt: 0 } } } });
  if (parts.length === 0) return {};
  return { AND: parts };
}
