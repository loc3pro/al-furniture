import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { CacheKeys, CacheTTL, redisCached } from "@/lib/redis-cache";

async function fetchProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: { select: { nameVi: true, nameEn: true, slug: true } },
      variants: { orderBy: [{ colorLabelVi: "asc" }, { sizeLabelVi: "asc" }] },
    },
  });
}

/**
 * Redis TTL + dedupe request React `cache()` giữa generateMetadata và ProductPage.
 * Redis miss/thất bại → đọc DB trực tiếp.
 */
export const getProductPageBySlug = cache(async (slug: string) => {
  return redisCached(CacheKeys.productBySlug(slug), CacheTTL.productBySlug, () => fetchProductBySlug(slug));
});
