/** Khối nội dung trang chủ (dưới banner) — thứ tự do admin cấu hình. */
export const HOME_SECTION_BLOCK_IDS = ["FEATURED", "SHOP_LOOK", "NEW_PRODUCTS", "LIVING", "NEWS"] as const;

export type HomeSectionBlockId = (typeof HOME_SECTION_BLOCK_IDS)[number];

export const DEFAULT_HOME_SECTION_BLOCK_ORDER: HomeSectionBlockId[] = [...HOME_SECTION_BLOCK_IDS];

const ALLOWED = new Set<string>(HOME_SECTION_BLOCK_IDS);

/** Chuẩn hoá mảng từ DB / API: bỏ lặp, bỏ lạ, bổ sung thiếu theo thứ tự mặc định. */
export function normalizeHomeSectionBlockOrder(input: unknown): HomeSectionBlockId[] {
  const raw = Array.isArray(input) ? input : [];
  const seen = new Set<string>();
  const out: HomeSectionBlockId[] = [];
  for (const x of raw) {
    if (typeof x !== "string" || !ALLOWED.has(x) || seen.has(x)) continue;
    seen.add(x);
    out.push(x as HomeSectionBlockId);
  }
  for (const id of HOME_SECTION_BLOCK_IDS) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

const LABELS_VI: Record<HomeSectionBlockId, string> = {
  FEATURED: "Bộ sưu tập nổi bật",
  SHOP_LOOK: "Shop the Look",
  NEW_PRODUCTS: "Sản phẩm mới",
  LIVING: "Sản phẩm theo danh mục",
  NEWS: "Tin tức (blog)",
};

export function homeSectionBlockLabelVi(id: HomeSectionBlockId): string {
  return LABELS_VI[id];
}
