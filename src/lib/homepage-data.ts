import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ContentLocale } from "@/lib/content-locale";
import { DEFAULT_HOME_PAGE_CONFIG, type HomePageConfigMerged } from "@/lib/home-defaults";
import { normalizeHomeSectionBlockOrder } from "@/lib/homepage-section-order";
import { buildProductCardForLook } from "@/lib/shop-the-look-product-meta";
import { CacheKeys, CacheTTL, redisCached } from "@/lib/redis-cache";
import { resolveListMode } from "@/lib/homepage-list-mode";

/** Danh mục tự động khi không có `livingProductIds` — không chỉnh từ admin. */
export const LIVING_AUTO_CATEGORY_SLUG = DEFAULT_HOME_PAGE_CONFIG.livingCategorySlug;

const includeCard = {
  category: { select: { slug: true, nameVi: true, nameEn: true } },
  variants: { select: { priceAdjustment: true, imageUrls: true }, take: 24 },
} satisfies Prisma.ProductInclude;

export type HomeProductRow = Prisma.ProductGetPayload<{ include: typeof includeCard }>;

/** Dữ liệu card Shop the Look trên trang chủ — đủ cho `ShopTheLookListCard`. */
export type ShopLookHomeCard = {
  slug: string;
  title: string;
  heroImageUrl: string;
  hotspots: {
    id: string;
    xPercent: number;
    yPercent: number;
    product: {
      name: string;
      slug: string;
      thumbUrl: string | null;
      displayPriceVnd: number;
    };
  }[];
};

function parseIds(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json.filter((x): x is string => typeof x === "string" && x.length > 0);
}

function sortByIds<T extends { id: string }>(items: T[], order: string[]): T[] {
  const map = new Map(items.map((i) => [i.id, i]));
  return order.map((id) => map.get(id)).filter((x): x is T => x != null);
}

function mergeConfig(row: Awaited<ReturnType<typeof prisma.homePageConfig.findUnique>> | null): HomePageConfigMerged {
  if (!row) return DEFAULT_HOME_PAGE_CONFIG;
  const r = row as {
    featuredProductsMode?: string | null;
    featuredSectionEnabled?: boolean | null;
    newSectionEnabled?: boolean | null;
    livingProductsMode?: string | null;
    livingSectionEnabled?: boolean | null;
    newsSectionEnabled?: boolean | null;
    shopLookSectionEnabled?: boolean | null;
    shopLookMode?: string | null;
  };
  const fIds = parseIds(row.featuredProductIds);
  const lIds = parseIds(row.livingProductIds);
  const slIds = parseIds((row as { shopLookOrderIds?: unknown }).shopLookOrderIds);

  return {
    featuredTitle: row.featuredTitle ?? DEFAULT_HOME_PAGE_CONFIG.featuredTitle,
    featuredProductsMode: resolveListMode(r.featuredProductsMode, fIds.length > 0),
    featuredSectionEnabled: r.featuredSectionEnabled ?? true,
    featuredProductIds: fIds,
    newSectionTitle: row.newSectionTitle ?? DEFAULT_HOME_PAGE_CONFIG.newSectionTitle,
    newProductsMode: row.newProductsMode === "CUSTOM" ? ("CUSTOM" as const) : ("AUTO" as const),
    newSectionEnabled: r.newSectionEnabled ?? true,
    newProductIds: parseIds(row.newProductIds),
    newProductsLimit: row.newProductsLimit ?? DEFAULT_HOME_PAGE_CONFIG.newProductsLimit,
    livingSectionTitle: row.livingSectionTitle ?? DEFAULT_HOME_PAGE_CONFIG.livingSectionTitle,
    livingCategorySlug: LIVING_AUTO_CATEGORY_SLUG,
    livingProductsMode: resolveListMode(r.livingProductsMode, lIds.length > 0),
    livingSectionEnabled: r.livingSectionEnabled ?? true,
    livingProductIds: lIds,
    livingLimit: row.livingLimit ?? DEFAULT_HOME_PAGE_CONFIG.livingLimit,
    newsSectionTitle: row.newsSectionTitle ?? DEFAULT_HOME_PAGE_CONFIG.newsSectionTitle,
    newsMode: row.newsMode === "CUSTOM" ? ("CUSTOM" as const) : ("AUTO" as const),
    newsSectionEnabled: r.newsSectionEnabled ?? true,
    newsPostIds: parseIds(row.newsPostIds),
    newsLimit: row.newsLimit ?? DEFAULT_HOME_PAGE_CONFIG.newsLimit,
    shopLookSectionEnabled: r.shopLookSectionEnabled ?? DEFAULT_HOME_PAGE_CONFIG.shopLookSectionEnabled,
    shopLookTitle: (row as { shopLookTitle?: string | null }).shopLookTitle ?? DEFAULT_HOME_PAGE_CONFIG.shopLookTitle,
    shopLookSubtitle:
      (row as { shopLookSubtitle?: string | null }).shopLookSubtitle ??
      DEFAULT_HOME_PAGE_CONFIG.shopLookSubtitle,
    shopLookMode: r.shopLookMode === "CUSTOM" ? ("CUSTOM" as const) : ("AUTO" as const),
    shopLookCardLimit:
      (row as { shopLookCardLimit?: number | null }).shopLookCardLimit ??
      DEFAULT_HOME_PAGE_CONFIG.shopLookCardLimit,
    shopLookOrderIds: slIds,
    sectionBlockOrder: normalizeHomeSectionBlockOrder((row as { sectionBlockOrder?: unknown }).sectionBlockOrder),
  };
}

const shopLookHotspotsArgs = {
  orderBy: { sortOrder: "asc" as const },
  take: 15,
  select: {
    id: true,
    xPercent: true,
    yPercent: true,
    product: {
      select: {
        id: true,
        nameVi: true,
        nameEn: true,
        slug: true,
        basePrice: true,
        salePrice: true,
        discountPercent: true,
        variants: {
          orderBy: { createdAt: "asc" as const },
          take: 4,
          select: { priceAdjustment: true, imageUrls: true },
        },
      },
    },
  },
} as const;

async function loadShopLookHomeCards(
  c: HomePageConfigMerged,
  locale: ContentLocale,
): Promise<ShopLookHomeCard[]> {
  if (!c.shopLookSectionEnabled) return [];
  const limit = Math.min(12, Math.max(1, c.shopLookCardLimit));

  const mapLook = (
    look: {
      slug: string;
      title: string;
      heroImageUrl: string;
      hotspots: Array<{
        id: string;
        xPercent: number;
        yPercent: number;
        product: Parameters<typeof buildProductCardForLook>[0];
      }>;
    },
  ): ShopLookHomeCard => ({
    slug: look.slug,
    title: look.title,
    heroImageUrl: look.heroImageUrl,
    hotspots: look.hotspots.map((h) => {
      const card = buildProductCardForLook(h.product, locale);
      return {
        id: h.id,
        xPercent: h.xPercent,
        yPercent: h.yPercent,
        product: {
          name: card.name,
          slug: card.slug,
          thumbUrl: card.thumbUrl,
          displayPriceVnd: card.displayPriceVnd,
        },
      };
    }),
  });

  try {
    if (c.shopLookMode === "CUSTOM" && c.shopLookOrderIds.length > 0) {
      const raw = await prisma.shopTheLook.findMany({
        where: { id: { in: c.shopLookOrderIds }, published: true },
        select: {
          id: true,
          slug: true,
          title: true,
          heroImageUrl: true,
          hotspots: shopLookHotspotsArgs,
        },
      });
      return sortByIds(raw, c.shopLookOrderIds)
        .slice(0, limit)
        .map(mapLook);
    }

    const raw = await prisma.shopTheLook.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        heroImageUrl: true,
        hotspots: shopLookHotspotsArgs,
      },
    });
    return raw.map(mapLook);
  } catch {
    return [];
  }
}

async function loadFeaturedProducts(c: HomePageConfigMerged): Promise<HomeProductRow[]> {
  if (!c.featuredSectionEnabled) return [];
  if (c.featuredProductsMode === "CUSTOM" && c.featuredProductIds.length > 0) {
    const list = await prisma.product.findMany({
      where: { id: { in: c.featuredProductIds } },
      include: includeCard,
    });
    return sortByIds(list, c.featuredProductIds).slice(0, 24);
  }
  return prisma.product.findMany({
    where: { isFeatured: true },
    take: 12,
    orderBy: [{ soldCount: "desc" }],
    include: includeCard,
  });
}

async function loadNewestProducts(c: HomePageConfigMerged): Promise<HomeProductRow[]> {
  if (!c.newSectionEnabled) return [];
  if (c.newProductsMode === "CUSTOM" && c.newProductIds.length > 0) {
    const list = await prisma.product.findMany({
      where: { id: { in: c.newProductIds } },
      include: includeCard,
    });
    return sortByIds(list, c.newProductIds).slice(0, Math.max(1, c.newProductsLimit));
  }
  return prisma.product.findMany({
    take: c.newProductsLimit,
    orderBy: [{ createdAt: "desc" }],
    include: includeCard,
  });
}

async function loadLivingProducts(c: HomePageConfigMerged): Promise<HomeProductRow[]> {
  if (!c.livingSectionEnabled) return [];
  if (c.livingProductsMode === "CUSTOM" && c.livingProductIds.length > 0) {
    const list = await prisma.product.findMany({
      where: { id: { in: c.livingProductIds } },
      include: includeCard,
    });
    return sortByIds(list, c.livingProductIds).slice(0, Math.max(1, c.livingLimit));
  }
  return prisma.product.findMany({
    where: { category: { slug: LIVING_AUTO_CATEGORY_SLUG } },
    take: c.livingLimit,
    orderBy: [{ isFeatured: "desc" }, { soldCount: "desc" }],
    include: includeCard,
  });
}

async function loadNewsPosts(c: HomePageConfigMerged): Promise<Awaited<ReturnType<typeof prisma.blogPost.findMany>>> {
  if (!c.newsSectionEnabled) return [];
  if (c.newsMode === "CUSTOM" && c.newsPostIds.length > 0) {
    const list = await prisma.blogPost.findMany({
      where: { id: { in: c.newsPostIds } },
    });
    const order = c.newsPostIds;
    const map = new Map(list.map((p) => [p.id, p]));
    let posts = order.map((id) => map.get(id)).filter((x): x is (typeof list)[0] => x != null);
    posts = posts.slice(0, Math.max(1, c.newsLimit));
    return posts;
  }
  return prisma.blogPost.findMany({
    take: c.newsLimit,
    orderBy: { publishedAt: "desc" },
  });
}

async function loadHomePageSectionsUncached(locale: ContentLocale) {
  const cfgRow = await prisma.homePageConfig.findUnique({ where: { id: "default" } }).catch(() => null);
  const c = mergeConfig(cfgRow);

  let featured: HomeProductRow[] = [];
  let newest: HomeProductRow[] = [];
  let living: HomeProductRow[] = [];
  let posts: Awaited<ReturnType<typeof prisma.blogPost.findMany>> = [];
  let shopLookCards: ShopLookHomeCard[] = [];

  try {
    ;[featured, newest, living, posts, shopLookCards] = await Promise.all([
      loadFeaturedProducts(c),
      loadNewestProducts(c),
      loadLivingProducts(c),
      loadNewsPosts(c),
      loadShopLookHomeCards(c, locale),
    ]);
  } catch {
    featured = [];
    newest = [];
    living = [];
    posts = [];
    shopLookCards = [];
  }

  return {
    titles: {
      featured: c.featuredTitle,
      newProducts: c.newSectionTitle,
      living: c.livingSectionTitle,
      news: c.newsSectionTitle,
    },
    livingCategorySlug: LIVING_AUTO_CATEGORY_SLUG,
    livingSectionEnabled: c.livingSectionEnabled,
    featuredSectionEnabled: c.featuredSectionEnabled,
    newSectionEnabled: c.newSectionEnabled,
    newsSectionEnabled: c.newsSectionEnabled,
    shopLook: {
      enabled: c.shopLookSectionEnabled,
      title: c.shopLookTitle,
      subtitle: c.shopLookSubtitle,
      cards: shopLookCards,
    },
    featured,
    newest,
    living,
    posts,
    sectionBlockOrder: c.sectionBlockOrder,
  };
}

export async function loadHomePageSections(locale: ContentLocale) {
  return redisCached(CacheKeys.homeSections(locale), CacheTTL.homeSections, () =>
    loadHomePageSectionsUncached(locale),
  );
}
