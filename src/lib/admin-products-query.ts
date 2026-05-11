import type { Prisma } from "@prisma/client";

export type AdminProductSortKey = "updated" | "name" | "price" | "category" | "stock";

export function parseAdminProductSort(
  raw: string | undefined,
  rawDir: string | undefined,
): { key: AdminProductSortKey; dir: "asc" | "desc" } {
  const key: AdminProductSortKey =
    raw === "name" || raw === "price" || raw === "category" || raw === "stock" ? raw : "updated";
  const dir = rawDir === "asc" ? "asc" : "desc";
  return { key, dir };
}

export function adminProductsOrderBy(
  key: AdminProductSortKey,
  dir: "asc" | "desc",
): Prisma.ProductOrderByWithRelationInput {
  if (key === "name") return { nameVi: dir };
  if (key === "price") return { salePrice: dir };
  if (key === "category") return { category: { nameVi: dir } };
  if (key === "stock") return { variants: { _count: dir } };
  return { updatedAt: dir };
}

export function adminProductsWhere(
  q: string,
  categoryId: string,
  validCategoryIds: Set<string>,
): Prisma.ProductWhereInput {
  const categoryFilter = categoryId && validCategoryIds.has(categoryId) ? categoryId : "";
  const parts: Prisma.ProductWhereInput[] = [];
  if (q.trim()) {
    const needle = q.trim();
    parts.push({
      OR: [
        { nameVi: { contains: needle, mode: "insensitive" } },
        { nameEn: { contains: needle, mode: "insensitive" } },
        { slug: { contains: needle, mode: "insensitive" } },
        { productCode: { contains: needle, mode: "insensitive" } },
        { variants: { some: { sku: { contains: needle, mode: "insensitive" } } } },
      ],
    });
  }
  if (categoryFilter) {
    parts.push({ categoryId: categoryFilter });
  }
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0]!;
  return { AND: parts };
}
