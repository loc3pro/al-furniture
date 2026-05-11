import type { Prisma } from "@prisma/client";
import { pickCategoryName, pickProductName, type ContentLocale } from "@/lib/content-locale";
import { getShopContentLocale } from "@/lib/shop-content-locale-server";
import { loadActiveBannersForHome } from "@/lib/public-catalog-db";
import { productCardMinPricing } from "@/lib/product-card-pricing";
import { HeroCarousel, type HeroSlide } from "@/components/home/HeroCarousel";
import type { RowProduct } from "@/components/home/ProductEmblaRow";
import { HomePageMainSections } from "@/components/home/HomePageMainSections";
import { loadHomePageSections, type HomeProductRow } from "@/lib/homepage-data";
import { DEFAULT_HOME_PAGE_CONFIG } from "@/lib/home-defaults";
import { DEFAULT_HOME_SECTION_BLOCK_ORDER } from "@/lib/homepage-section-order";
import { collectVariantGalleryUrls } from "@/lib/variant-gallery-urls";
import { LuckyWheelBanner } from "@/components/spin-wheel/LuckyWheelBanner";

const includeCard = {
  category: { select: { slug: true, nameVi: true, nameEn: true } },
  variants: { select: { priceAdjustment: true, imageUrls: true }, take: 24 },
} satisfies Prisma.ProductInclude;

type PRow = Prisma.ProductGetPayload<{ include: typeof includeCard }>;

function toRowProduct(p: PRow | HomeProductRow, locale: ContentLocale): RowProduct {
  const pricing = productCardMinPricing(p);
  const galleryUrls = collectVariantGalleryUrls(p.variants);
  const thumb = galleryUrls[0] ?? null;
  return {
    id: p.id,
    slug: p.slug,
    name: pickProductName(p, locale),
    categoryName: pickCategoryName(p.category, locale),
    minPrice: pricing.salePrice,
    minOriginalPrice: pricing.originalPrice,
    discountBadgePercent: pricing.discountBadgePercent,
    thumbUrl: thumb,
    galleryUrls,
  };
}

export default async function HomePage() {
  const locale = await getShopContentLocale();
  let banners: Awaited<ReturnType<typeof loadActiveBannersForHome>> = [];
  let featured: PRow[] = [];
  let newest: PRow[] = [];
  let living: PRow[] = [];
  let posts: Awaited<ReturnType<typeof loadHomePageSections>>["posts"] = [];
  let titles = {
    featured: "Bộ sưu tập nổi bật",
    newProducts: "Sản phẩm mới",
    living: "Sản phẩm nổi bật",
    news: "Tin tức",
  };
  let livingCategorySlug = "phong-khach";
  let featuredSectionEnabled = true;
  let newSectionEnabled = true;
  let livingSectionEnabled = true;
  let newsSectionEnabled = true;
  let sectionBlockOrder = DEFAULT_HOME_SECTION_BLOCK_ORDER;

  try {
    banners = await loadActiveBannersForHome();
  } catch {
    banners = [];
  }

  let shopLookBlock: Awaited<ReturnType<typeof loadHomePageSections>>["shopLook"] = {
    enabled: false,
    title: DEFAULT_HOME_PAGE_CONFIG.shopLookTitle,
    subtitle: DEFAULT_HOME_PAGE_CONFIG.shopLookSubtitle,
    cards: [],
  };

  try {
    const home = await loadHomePageSections(locale);
    featured = home.featured as PRow[];
    newest = home.newest as PRow[];
    living = home.living as PRow[];
    posts = home.posts;
    titles = home.titles;
    livingCategorySlug = home.livingCategorySlug;
    featuredSectionEnabled = home.featuredSectionEnabled;
    newSectionEnabled = home.newSectionEnabled;
    livingSectionEnabled = home.livingSectionEnabled;
    newsSectionEnabled = home.newsSectionEnabled;
    shopLookBlock = home.shopLook;
    sectionBlockOrder = home.sectionBlockOrder;
  } catch {
    featured = [];
    newest = [];
    living = [];
    posts = [];
  }

  const slides: HeroSlide[] = banners.map((b) => ({
    id: b.id,
    imageUrl: b.imageUrl,
    link: b.link,
    title: b.title,
    subtitle: b.subtitle,
  }));

  const featuredRows = featured.map((p) => toRowProduct(p, locale));
  const newestRows = newest.map((p) => toRowProduct(p, locale));
  const livingRows = living.map((p) => toRowProduct(p, locale));

  return (
    <div>
      <HeroCarousel slides={slides} />

      <HomePageMainSections
        sectionBlockOrder={sectionBlockOrder}
        titles={titles}
        livingCategorySlug={livingCategorySlug}
        featuredSectionEnabled={featuredSectionEnabled}
        newSectionEnabled={newSectionEnabled}
        livingSectionEnabled={livingSectionEnabled}
        newsSectionEnabled={newsSectionEnabled}
        featuredRows={featuredRows}
        newestRows={newestRows}
        livingRows={livingRows}
        shopLookBlock={shopLookBlock}
        posts={posts}
      />

      <LuckyWheelBanner />
    </div>
  );
}
