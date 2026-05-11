/** Kích thước trang catalog / tìm kiếm sản phẩm (shopfront). */
export const SHOP_PRODUCTS_PAGE_SIZE = 12;

/** Giá trị có trong dropdown phân trang `/products`. */
export const SHOP_PRODUCTS_PAGE_SIZE_OPTIONS = [12, 24, 48] as const;

export function parseShopPage(raw: string | undefined): number {
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function parseShopPageSize(raw: string | undefined): number {
  const n = parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return SHOP_PRODUCTS_PAGE_SIZE;
  return (SHOP_PRODUCTS_PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : SHOP_PRODUCTS_PAGE_SIZE;
}
