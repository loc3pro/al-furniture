import { prisma } from "@/lib/prisma";
import { productCardMinPricing } from "@/lib/product-card-pricing";
import { collectVariantGalleryUrls } from "@/lib/variant-gallery-urls";
import {
  clampNavMenuMaxCategories,
  clampNavMenuMaxProducts,
  parseCategorySlugsOrdered,
  parseProductSlugsByCategory,
  SHOP_NAV_MENU_DEFAULT_MAX_CATEGORIES,
  SHOP_NAV_MENU_DEFAULT_MAX_PRODUCTS,
} from "@/lib/shop-navigation-menu";
import type { ContentLocale } from "@/lib/content-locale";
import { pickCategoryName, pickProductName } from "@/lib/content-locale";

/** Không hiển thị trong mega menu. */
const EXCLUDED_CATEGORY_SLUGS = ["phong-khach"] as const;

export type NavMegaProduct = {
  slug: string;
  name: string;
  imageUrl: string | null;
  /** Ảnh biến thể — hover mega menu xem luân phiên */
  galleryUrls: string[];
  salePrice: number;
  originalPrice: number | null;
  discountBadgePercent: number;
};

export type NavMegaCategory = {
  slug: string;
  name: string;
  products: NavMegaProduct[];
};

function productSelect() {
  return {
    slug: true,
    nameVi: true,
    nameEn: true,
    basePrice: true,
    salePrice: true,
    discountPercent: true,
    variants: { select: { priceAdjustment: true, imageUrls: true } },
  } as const;
}

function toNavProduct(
  p: {
    slug: string;
    nameVi: string;
    nameEn: string;
    basePrice: number;
    salePrice: number | null;
    discountPercent: number | null;
    variants: { priceAdjustment: number; imageUrls: unknown }[];
  },
  locale: ContentLocale,
): NavMegaProduct {
  const pricing = productCardMinPricing({
    basePrice: p.basePrice,
    salePrice: p.salePrice,
    discountPercent: p.discountPercent,
    variants: p.variants,
  });
  const urls = collectVariantGalleryUrls(p.variants);
  return {
    slug: p.slug,
    name: pickProductName(p, locale),
    imageUrl: urls[0] ?? null,
    galleryUrls: urls,
    salePrice: pricing.salePrice,
    originalPrice: pricing.originalPrice,
    discountBadgePercent: pricing.discountBadgePercent,
  };
}

async function resolveMenuConfig() {
  let row: {
    maxCategoriesShown: number;
    maxProductsPerCategory: number;
    categorySlugsOrdered: unknown;
    productSlugsByCategory: unknown;
  } | null = null;
  try {
    row = await prisma.shopNavigationMenuConfig.findUnique({
      where: { id: "default" },
      select: {
        maxCategoriesShown: true,
        maxProductsPerCategory: true,
        categorySlugsOrdered: true,
        productSlugsByCategory: true,
      },
    });
  } catch {
    row = null;
  }

  const maxCategories = clampNavMenuMaxCategories(
    row?.maxCategoriesShown ?? SHOP_NAV_MENU_DEFAULT_MAX_CATEGORIES,
  );
  const maxProducts = clampNavMenuMaxProducts(
    row?.maxProductsPerCategory ?? SHOP_NAV_MENU_DEFAULT_MAX_PRODUCTS,
  );
  const ordered = parseCategorySlugsOrdered(row?.categorySlugsOrdered);
  const pins = parseProductSlugsByCategory(row?.productSlugsByCategory);

  return { maxCategories, maxProducts, orderedSlugs: ordered, pins };
}

/**
 * Danh mục gốc + SP preview — thứ tự / số lượng theo ShopNavigationMenuConfig.
 */
export async function loadNavMegaCategories(locale: ContentLocale): Promise<NavMegaCategory[]> {
  const { maxCategories, maxProducts, orderedSlugs, pins } = await resolveMenuConfig();

  const eligible = await prisma.category.findMany({
    where: {
      parentId: null,
      slug: { notIn: [...EXCLUDED_CATEGORY_SLUGS] },
    },
    select: { id: true, slug: true, nameVi: true, nameEn: true },
  });

  const bySlug = new Map(eligible.map((c) => [c.slug, c]));
  const orderedSet = new Set(orderedSlugs.filter((s) => bySlug.has(s)));

  let slugOrder: string[] = [...orderedSlugs.filter((s) => bySlug.has(s))];
  const rest = eligible
    .filter((c) => !orderedSet.has(c.slug))
    .sort((a, b) => a.nameVi.localeCompare(b.nameVi, "vi"))
    .map((c) => c.slug);
  slugOrder = [...slugOrder, ...rest];
  slugOrder = slugOrder.slice(0, maxCategories);

  const out: NavMegaCategory[] = [];

  for (const slug of slugOrder) {
    const c = bySlug.get(slug);
    if (!c) continue;

    const pinList = (pins[c.slug] ?? []).slice(0, maxProducts);
    const pinSet = new Set(pinList);

    let rows;

    if (pinList.length > 0) {
      const pinned = await prisma.product.findMany({
        where: { categoryId: c.id, slug: { in: pinList } },
        select: productSelect(),
      });
      const pmap = new Map(pinned.map((p) => [p.slug, p]));
      const orderedPinned = pinList.map((s) => pmap.get(s)).filter((x): x is NonNullable<typeof x> => x != null);
      rows = orderedPinned;

      if (rows.length < maxProducts) {
        const more = await prisma.product.findMany({
          where: {
            categoryId: c.id,
            slug: { notIn: [...pinSet] },
          },
          orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
          take: maxProducts - rows.length,
          select: productSelect(),
        });
        rows = [...rows, ...more];
      }
    } else {
      rows = await prisma.product.findMany({
        where: { categoryId: c.id },
        orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
        take: maxProducts,
        select: productSelect(),
      });
    }

    out.push({
      slug: c.slug,
      name: pickCategoryName(c, locale),
      products: rows.map((r) => toNavProduct(r, locale)),
    });
  }

  return out;
}
