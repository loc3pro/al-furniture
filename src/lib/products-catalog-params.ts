import { SHOP_PRODUCTS_PAGE_SIZE } from "@/lib/shop-pagination";

/** Tham số URL catalog `/products` (lọc + tìm + phân trang). */
export type ProductsCatalogFilters = {
  q: string;
  /** Slug danh mục — hỗ trợ đa chọn */
  cats: string[];
  /** Nhãn màu biến thể */
  colors: string[];
  /** Chỉ SP còn tồn (ít nhất một biến thể stock > 0) */
  stockOnly: boolean;
  page: number;
  pageSize: number;
};

function splitCsv(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function firstString(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/** Đọc từ searchParams (record string | string[] | undefined). */
export function parseProductsCatalogParams(sp: Record<string, string | string[] | undefined>): ProductsCatalogFilters {
  const q = (firstString(sp.q) ?? "").trim();
  const page = Math.max(1, parseInt(firstString(sp.page) ?? "1", 10) || 1);
  const pageSizeRaw = firstString(sp.pageSize) ?? "";
  const pageSize = (() => {
    const n = parseInt(pageSizeRaw, 10);
    if (!Number.isFinite(n)) return SHOP_PRODUCTS_PAGE_SIZE;
    return [12, 24, 48].includes(n) ? n : SHOP_PRODUCTS_PAGE_SIZE;
  })();

  let cats = splitCsv(firstString(sp.cats));
  const legacyCat = (firstString(sp.category) ?? "").trim();
  if (cats.length === 0 && legacyCat) cats = [legacyCat];

  const colors = splitCsv(firstString(sp.colors));

  const stockRaw = firstString(sp.stock) ?? "";
  const stockOnly = stockRaw === "1" || stockRaw === "true";

  return { q, cats, colors, stockOnly, page, pageSize };
}

export type CatalogQueryInput = {
  q?: string;
  cats?: string[];
  colors?: string[];
  stockOnly?: boolean;
  page?: number;
  pageSize?: number;
};

/** Xây query string (không có `?`). */
export function serializeProductsCatalogQuery(base: CatalogQueryInput): string {
  const p = new URLSearchParams();
  const q = base.q?.trim();
  if (q) p.set("q", q);

  const cats = base.cats?.filter(Boolean) ?? [];
  if (cats.length) p.set("cats", cats.join(","));

  const colors = base.colors?.filter(Boolean) ?? [];
  if (colors.length) p.set("colors", colors.join(","));

  if (base.stockOnly) p.set("stock", "1");

  const page = base.page ?? 1;
  if (page > 1) p.set("page", String(page));

  const ps = base.pageSize ?? SHOP_PRODUCTS_PAGE_SIZE;
  if (ps !== SHOP_PRODUCTS_PAGE_SIZE) p.set("pageSize", String(ps));

  return p.toString();
}

export function productsCatalogPath(query: CatalogQueryInput): string {
  const s = serializeProductsCatalogQuery(query);
  return s ? `/products?${s}` : "/products";
}

/** Bật/tắt một slug trong mảng (cats hoặc colors). */
export function toggleInList(current: string[], value: string): string[] {
  const set = new Set(current);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return [...set].sort();
}
