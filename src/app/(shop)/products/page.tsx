import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { pickCategoryName, pickProductName } from "@/lib/content-locale";
import { getShopContentLocale } from "@/lib/shop-content-locale-server";
import { prisma } from "@/lib/prisma";
import { ProductCardPrices } from "@/components/product/ProductCardPrice";
import { productCardMinPricing } from "@/lib/product-card-pricing";
import { collectVariantGalleryUrls } from "@/lib/variant-gallery-urls";
import { ProductCardVariantGallery } from "@/components/product/ProductCardVariantGallery";
import { findProductIdsMatchingSearch, sortByIdOrder } from "@/lib/product-search";
import {
  SHOP_PRODUCTS_PAGE_SIZE,
  SHOP_PRODUCTS_PAGE_SIZE_OPTIONS,
} from "@/lib/shop-pagination";
import { ShopPagination } from "@/components/shop/ShopPagination";
import {
  parseProductsCatalogParams,
  productsCatalogPath,
  type ProductsCatalogFilters,
} from "@/lib/products-catalog-params";
import { buildProductsFacetWhere } from "@/lib/products-catalog-where";
import { buildShopProductCustomTags } from "@/lib/shop-product-card-pills";
import { ProductCatalogClient } from "./ProductCatalogClient";
import catalogStyles from "./products-catalog.module.scss";

/** Chỉ quan hệ — scalar (`tags`, `isFeatured`, `discountPercent`, giá…) Prisma trả mặc định, không được ghi trong `include`. */
const listInclude = {
  category: { select: { nameVi: true, nameEn: true, slug: true } },
  variants: { select: { priceAdjustment: true, imageUrls: true } },
} satisfies Prisma.ProductInclude;

type ListProduct = Prisma.ProductGetPayload<{ include: typeof listInclude }>;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function buildCatalogChips(
  filters: ProductsCatalogFilters,
  categoryNames: Map<string, string>
): { label: string; href: string }[] {
  const chips: { label: string; href: string }[] = [];
  for (const slug of filters.cats) {
    chips.push({
      label: categoryNames.get(slug) ?? slug,
      href: productsCatalogPath({
        q: filters.q,
        cats: filters.cats.filter((s) => s !== slug),
        colors: filters.colors,
        stockOnly: filters.stockOnly,
        page: 1,
        pageSize: filters.pageSize,
      }),
    });
  }
  for (const color of filters.colors) {
    chips.push({
      label: color,
      href: productsCatalogPath({
        q: filters.q,
        cats: filters.cats,
        colors: filters.colors.filter((c) => c !== color),
        stockOnly: filters.stockOnly,
        page: 1,
        pageSize: filters.pageSize,
      }),
    });
  }
  if (filters.stockOnly) {
    chips.push({
      label: "Còn hàng",
      href: productsCatalogPath({
        q: filters.q,
        cats: filters.cats,
        colors: filters.colors,
        stockOnly: false,
        page: 1,
        pageSize: filters.pageSize,
      }),
    });
  }
  return chips;
}

export default async function ProductsPage(props: { searchParams: SearchParams }) {
  const locale = await getShopContentLocale();
  const sp = await props.searchParams;
  const filters = parseProductsCatalogParams(sp);
  const facetWhere = buildProductsFacetWhere(filters);
  const pageRequested = filters.page;
  const pageSize = filters.pageSize;

  let categoriesForFilters: { slug: string; name: string; count: number }[] = [];
  let colorFacets: { label: string; count: number; hex: string | null }[] = [];
  let products: ListProduct[] = [];
  let total = 0;
  let pageNum = 1;

  try {
    const [categories, catGroup, colorGroups] = await Promise.all([
      prisma.category.findMany({ orderBy: { nameVi: "asc" } }),
      prisma.product.groupBy({
        by: ["categoryId"],
        _count: true,
      }),
      prisma.productVariant.groupBy({
        by: ["colorLabelVi"],
        _count: true,
        orderBy: { colorLabelVi: "asc" },
      }),
    ]);

    const countByCatId = new Map(catGroup.map((g) => [g.categoryId, g._count]));
    categoriesForFilters = categories.map((c) => ({
      slug: c.slug,
      name: pickCategoryName(c, locale),
      count: countByCatId.get(c.id) ?? 0,
    }));

    const colorLabels = colorGroups.map((g) => g.colorLabelVi);
    const colorSamples =
      colorLabels.length === 0
        ? []
        : await prisma.productVariant.findMany({
            where: { colorLabelVi: { in: colorLabels } },
            select: { colorLabelVi: true, colorHex: true },
          });
    const hexByLabel = new Map<string, string | null>();
    for (const s of colorSamples) {
      if (!hexByLabel.has(s.colorLabelVi)) hexByLabel.set(s.colorLabelVi, s.colorHex);
    }
    colorFacets = colorGroups.map((g) => ({
      label: g.colorLabelVi,
      count: g._count,
      hex: hexByLabel.get(g.colorLabelVi) ?? null,
    }));

    const q = filters.q.trim();

    if (q) {
      const searchIds = await findProductIdsMatchingSearch(q, null);
      if (searchIds.length === 0) {
        products = [];
        total = 0;
        pageNum = 1;
      } else {
        const matching = await prisma.product.findMany({
          where: {
            id: { in: searchIds },
            ...facetWhere,
          },
          select: { id: true },
        });
        const ok = new Set(matching.map((m) => m.id));
        const orderedIds = searchIds.filter((id) => ok.has(id));
        total = orderedIds.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        pageNum = total > 0 ? Math.min(pageRequested, totalPages) : 1;
        const sliceStart = (pageNum - 1) * pageSize;
        const pageIds = orderedIds.slice(sliceStart, sliceStart + pageSize);
        if (pageIds.length === 0) {
          products = [];
        } else {
          const rows = await prisma.product.findMany({
            where: { id: { in: pageIds } },
            orderBy: [{ isFeatured: "desc" }, { soldCount: "desc" }],
            include: listInclude,
          });
          products = sortByIdOrder(rows, pageIds);
        }
      }
    } else {
      const count = await prisma.product.count({ where: facetWhere });
      total = count;
      const tp = Math.max(1, Math.ceil(total / pageSize));
      pageNum = total > 0 ? Math.min(pageRequested, tp) : 1;
      const skip = (pageNum - 1) * pageSize;
      products = await prisma.product.findMany({
        where: facetWhere,
        orderBy: [{ isFeatured: "desc" }, { soldCount: "desc" }],
        skip,
        take: pageSize,
        include: listInclude,
      });
    }
  } catch (err) {
    console.error("[products] catalog query failed:", err);
    categoriesForFilters = [];
    colorFacets = [];
    products = [];
    total = 0;
    pageNum = 1;
  }

  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / pageSize));

  const categoryNames = new Map(categoriesForFilters.map((c) => [c.slug, c.name]));
  const chips = buildCatalogChips(filters, categoryNames);
  const clearFiltersHref = productsCatalogPath({
    q: filters.q,
    page: 1,
    pageSize: filters.pageSize,
  });

  const productsNavQuery: Record<string, string | undefined> = {};
  if (filters.q.trim()) productsNavQuery.q = filters.q.trim();
  if (filters.cats.length) productsNavQuery.cats = filters.cats.join(",");
  if (filters.colors.length) productsNavQuery.colors = filters.colors.join(",");
  if (filters.stockOnly) productsNavQuery.stock = "1";
  if (filters.pageSize !== SHOP_PRODUCTS_PAGE_SIZE) {
    productsNavQuery.pageSize = String(filters.pageSize);
  }

  return (
    <div className={`container ${catalogStyles.catalogPage}`}>
      <ProductCatalogClient
        filters={filters}
        chips={chips}
        clearFiltersHref={clearFiltersHref}
        categories={categoriesForFilters}
        colorFacets={colorFacets}
      >
        <div className={catalogStyles.gridWrap}>
          <div className="grid-products">
            {products.map((p, idx) => {
              const pricing = productCardMinPricing(p);
              const galleryUrls = collectVariantGalleryUrls(p.variants);
              const customTags = buildShopProductCustomTags({ tags: p.tags });
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className={`card product-card ${catalogStyles.productCardLink}`}
                >
                  {p.isFeatured ? (
                    <span className={catalogStyles.cardFeaturedBadge}>Nổi bật</span>
                  ) : null}
                  <ProductCardVariantGallery
                    galleryUrls={galleryUrls}
                    discountBadgePercent={pricing.discountBadgePercent}
                    mediaClassName="product-card__media"
                    sizes="(max-width: 639px) 48vw, (max-width: 959px) 32vw, 22vw"
                    priority={idx === 0}
                  />
                  <div className="product-card__body">
                    {customTags.length > 0 ? (
                      <div className={catalogStyles.productCardPills} aria-label="Nhãn sản phẩm">
                        {customTags.map((label) => (
                          <span key={`${p.id}-${label}`} className={catalogStyles.productCardPill}>
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className={`muted ${catalogStyles.productCardCategory}`}>
                      {pickCategoryName(p.category, locale)}
                    </div>
                    <div className={catalogStyles.productCardTitle}>{pickProductName(p, locale)}</div>
                    <ProductCardPrices salePrice={pricing.salePrice} originalPrice={pricing.originalPrice} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <ShopPagination
          queryNav={{
            pathname: "/products",
            query: productsNavQuery,
            defaultPageSize: SHOP_PRODUCTS_PAGE_SIZE,
          }}
          page={pageNum}
          totalPages={totalPages}
          totalItems={total}
          pageSize={pageSize}
          pageSizeOptions={SHOP_PRODUCTS_PAGE_SIZE_OPTIONS}
          itemLabel="sản phẩm"
        />

        {products.length === 0 ? <p className="muted">Không có sản phẩm phù hợp.</p> : null}
      </ProductCatalogClient>
    </div>
  );
}
