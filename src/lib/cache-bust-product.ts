import { prisma } from "@/lib/prisma";
import { invalidateProductAndHomeBySlug } from "@/lib/redis-cache";

/** Gỡ cache PDP + section trang chủ theo id SP (sau PATCH variant / SP). */
export async function bustShopCachesForProductId(productId: string): Promise<void> {
  const p = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  if (!p?.slug) return;
  await invalidateProductAndHomeBySlug(p.slug);
}
