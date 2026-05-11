import { normalizeProductTagList } from "@/lib/product-tags";

/** Tag tùy chỉnh trên thẻ (không gồm «Nổi bật» — badge nổi bật render riêng góc card). */
export function buildShopProductCustomTags(p: { tags?: string[] | null }): string[] {
  return normalizeProductTagList(p.tags ?? []);
}
