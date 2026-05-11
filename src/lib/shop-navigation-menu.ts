/** Giới hạn cứng — không cho admin vượt (tránh tràn mega menu). */
export const SHOP_NAV_MENU_ABS_MAX_CATEGORIES = 8;
export const SHOP_NAV_MENU_ABS_MAX_PRODUCTS = 8;

export const SHOP_NAV_MENU_DEFAULT_MAX_CATEGORIES = 6;
export const SHOP_NAV_MENU_DEFAULT_MAX_PRODUCTS = 5;

export type ShopNavigationMenuResolved = {
  maxCategoriesShown: number;
  maxProductsPerCategory: number;
  categorySlugsOrdered: string[];
  productSlugsByCategory: Record<string, string[]>;
};

export function clampNavMenuMaxCategories(n: number): number {
  return Math.min(SHOP_NAV_MENU_ABS_MAX_CATEGORIES, Math.max(1, Math.round(n)));
}

export function clampNavMenuMaxProducts(n: number): number {
  return Math.min(SHOP_NAV_MENU_ABS_MAX_PRODUCTS, Math.max(1, Math.round(n)));
}

export function parseCategorySlugsOrdered(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
}

export function parseProductSlugsByCategory(raw: unknown): Record<string, string[]> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const slug = k.trim();
    if (!slug) continue;
    if (!Array.isArray(v)) continue;
    out[slug] = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
  }
  return out;
}
