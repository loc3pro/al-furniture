import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatVnd, productSaleBase } from "@/lib/money";
import {
  adminProductsOrderBy,
  adminProductsWhere,
  parseAdminProductSort,
  type AdminProductSortKey,
} from "@/lib/admin-products-query";
import { ADMIN_PAGE_SIZE_DEFAULT } from "@/lib/admin-pagination";
import { staffDisplayName } from "@/lib/admin-staff-label";
import { AdminProductsView, type AdminProductRowVm } from "./AdminProductsView";

const PAGE_SIZE = ADMIN_PAGE_SIZE_DEFAULT;

const productInclude = {
  category: true,
  variants: { select: { id: true, stockQuantity: true, sku: true } },
  createdBy: { select: { name: true, email: true } },
} satisfies Prisma.ProductInclude;

function displayProductCode(p: { productCode: string | null; slug: string }): string {
  return p.productCode?.trim() || p.slug;
}

type AdminProduct = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function skuCellSummary(variants: { sku: string }[]): { text: string; title: string } {
  if (variants.length === 0) return { text: "—", title: "" };
  const title = variants.map((v) => v.sku).join(", ");
  if (variants.length === 1) return { text: variants[0]!.sku, title };
  const first = variants[0]!.sku;
  const rest = variants.length - 1;
  return { text: `${first} (+${rest})`, title };
}

function productsQuery(
  q: string,
  key: AdminProductSortKey,
  dir: "asc" | "desc",
  categoryId: string,
  page?: number,
): string {
  const p = new URLSearchParams();
  if (q.trim()) p.set("q", q.trim());
  if (categoryId) p.set("categoryId", categoryId);
  const defaultSort = key === "updated" && dir === "desc";
  if (!defaultSort) {
    p.set("sort", key);
    p.set("dir", dir);
  }
  if (page != null && page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

type PageProps = {
  searchParams: Promise<{ q?: string; sort?: string; dir?: string; categoryId?: string; page?: string }>;
};

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const skip = (pageNum - 1) * PAGE_SIZE;
  const { key: sortKey, dir: sortDir } = parseAdminProductSort(sp.sort, sp.dir);
  const categoryIdParam = (sp.categoryId ?? "").trim();

  let categories: { id: string; nameVi: string; nameEn: string }[] = [];
  try {
    categories = await prisma.category.findMany({
      orderBy: { nameVi: "asc" },
      select: { id: true, nameVi: true, nameEn: true },
    });
  } catch {
    categories = [];
  }

  const categoryIds = new Set(categories.map((c) => c.id));
  const categoryFilter =
    categoryIdParam && categories.some((c) => c.id === categoryIdParam) ? categoryIdParam : "";

  const where = adminProductsWhere(q, categoryFilter, categoryIds);
  const orderBy = adminProductsOrderBy(sortKey, sortDir);

  let products: AdminProduct[] = [];
  let total = 0;
  try {
    ;[products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: PAGE_SIZE,
        include: productInclude,
      }),
      prisma.product.count({ where }),
    ]);
  } catch {
    products = [];
    total = 0;
  }

  const exportQuery = productsQuery(q, sortKey, sortDir, categoryFilter);

  const productsPaginationQuery: Record<string, string | undefined> = {};
  if (q.trim()) productsPaginationQuery.q = q.trim();
  if (categoryFilter) productsPaginationQuery.categoryId = categoryFilter;
  const defaultProductSort = sortKey === "updated" && sortDir === "desc";
  if (!defaultProductSort) {
    productsPaginationQuery.sort = sortKey;
    productsPaginationQuery.dir = sortDir;
  }

  const rows: AdminProductRowVm[] = products.map((p) => {
    const skuInfo = skuCellSummary(p.variants);
    return {
      id: p.id,
      nameVi: p.nameVi,
      code: displayProductCode(p),
      skuSummary: skuInfo.text,
      skuTitle: skuInfo.title,
      categoryNameVi: p.category.nameVi,
      creatorLabel: staffDisplayName(p.createdBy),
      priceMain: formatVnd(productSaleBase(p)),
      priceOrig: p.discountPercent > 0 ? formatVnd(p.basePrice) : "—",
      discountPct: p.discountPercent > 0 ? `${p.discountPercent}%` : "—",
      variantsCount: p.variants.length,
      stockTotal: p.variants.reduce((s, v) => s + v.stockQuantity, 0),
    };
  });

  return (
    <AdminProductsView
      q={q}
      categoryFilter={categoryFilter}
      sortKey={sortKey}
      sortDir={sortDir}
      categories={categories}
      rows={rows}
      pageNum={pageNum}
      total={total}
      pageSize={PAGE_SIZE}
      productsPaginationQuery={productsPaginationQuery}
      exportQuery={exportQuery}
    />
  );
}
