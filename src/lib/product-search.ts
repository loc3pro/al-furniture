import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripVietnameseTones } from "@/lib/vi-search";

/**
 * Tìm id sản phẩm khớp từ khóa (có dấu hoặc không), optional lọc category.
 * Ưu tiên PostgreSQL unaccent; nếu extension không có thì lọc bằng JS (phù hợp catalog vừa/nhỏ).
 */
export async function findProductIdsMatchingSearch(
  qRaw: string,
  categorySlug?: string | null
): Promise<string[]> {
  const q = qRaw.trim();
  if (!q) return [];

  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT p.id
      FROM "Product" p
      INNER JOIN "Category" c ON c.id = p."categoryId"
      WHERE (
        position(unaccent(lower(${q})) in unaccent(lower(p."nameVi"))) > 0
        OR position(unaccent(lower(${q})) in unaccent(lower(p."nameEn"))) > 0
        OR position(unaccent(lower(${q})) in unaccent(lower(p."descriptionVi"))) > 0
        OR position(unaccent(lower(${q})) in unaccent(lower(p."descriptionEn"))) > 0
      )
      ${categorySlug ? Prisma.sql`AND c.slug = ${categorySlug}` : Prisma.empty}
      ORDER BY p."isFeatured" DESC, p."soldCount" DESC
    `);
    return rows.map((r) => r.id);
  } catch (e) {
    console.warn("[search] unaccent query failed, using JS fallback:", e);
    return fallbackIdsByStripping(q, categorySlug);
  }
}

/** Giữ thứ tự id (vd. sau ORDER BY trong raw query). */
export function sortByIdOrder<T extends { id: string }>(rows: T[], idOrder: string[]): T[] {
  const order = new Map(idOrder.map((id, i) => [id, i]));
  return [...rows].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function findProductIdsMatchingSearchOrdered(
  qRaw: string,
  categorySlug?: string | null,
  opts?: { limit?: number }
): Promise<string[]> {
  const q = qRaw.trim();
  if (!q) return [];

  const limit = opts?.limit;

  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>(
      limit != null
        ? Prisma.sql`
      SELECT p.id
      FROM "Product" p
      INNER JOIN "Category" c ON c.id = p."categoryId"
      WHERE (
        position(unaccent(lower(${q})) in unaccent(lower(p."nameVi"))) > 0
        OR position(unaccent(lower(${q})) in unaccent(lower(p."nameEn"))) > 0
        OR position(unaccent(lower(${q})) in unaccent(lower(p."descriptionVi"))) > 0
        OR position(unaccent(lower(${q})) in unaccent(lower(p."descriptionEn"))) > 0
      )
      ${categorySlug ? Prisma.sql`AND c.slug = ${categorySlug}` : Prisma.empty}
      ORDER BY p."isFeatured" DESC, p."soldCount" DESC
      LIMIT ${limit}
    `
        : Prisma.sql`
      SELECT p.id
      FROM "Product" p
      INNER JOIN "Category" c ON c.id = p."categoryId"
      WHERE (
        position(unaccent(lower(${q})) in unaccent(lower(p."nameVi"))) > 0
        OR position(unaccent(lower(${q})) in unaccent(lower(p."nameEn"))) > 0
        OR position(unaccent(lower(${q})) in unaccent(lower(p."descriptionVi"))) > 0
        OR position(unaccent(lower(${q})) in unaccent(lower(p."descriptionEn"))) > 0
      )
      ${categorySlug ? Prisma.sql`AND c.slug = ${categorySlug}` : Prisma.empty}
      ORDER BY p."isFeatured" DESC, p."soldCount" DESC
    `
    );
    return rows.map((r) => r.id);
  } catch (e) {
    console.warn("[search] unaccent ordered query failed, using JS fallback:", e);
    return fallbackIdsOrdered(q, categorySlug, limit);
  }
}

const FALLBACK_SEARCH_MAX = 2000;

async function fallbackIdsByStripping(q: string, categorySlug?: string | null): Promise<string[]> {
  const needle = stripVietnameseTones(q).toLowerCase();
  const rows = await prisma.product.findMany({
    where: categorySlug ? { category: { slug: categorySlug } } : {},
    select: {
      id: true,
      nameVi: true,
      nameEn: true,
      isFeatured: true,
      soldCount: true,
    },
    orderBy: [{ isFeatured: "desc" }, { soldCount: "desc" }],
    take: FALLBACK_SEARCH_MAX,
  });
  const matched = rows.filter((r) => {
    const nv = stripVietnameseTones(r.nameVi).toLowerCase();
    const ne = stripVietnameseTones(r.nameEn).toLowerCase();
    return nv.includes(needle) || ne.includes(needle);
  });
  return matched.map((r) => r.id);
}

async function fallbackIdsOrdered(
  q: string,
  categorySlug?: string | null,
  limit?: number
): Promise<string[]> {
  const ids = await fallbackIdsByStripping(q, categorySlug);
  if (limit == null) return ids;
  return ids.slice(0, limit);
}
