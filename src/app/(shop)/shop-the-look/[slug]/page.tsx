import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  pickCategoryName,
  pickProductName,
  type ContentLocale,
} from "@/lib/content-locale";
import { getShopContentLocale } from "@/lib/shop-content-locale-server";
import { buildProductCardForLook } from "@/lib/shop-the-look-product-meta";
import { productCardMinPricing } from "@/lib/product-card-pricing";
import { collectVariantGalleryUrls } from "@/lib/variant-gallery-urls";
import {
  ShopTheLookDetailClient,
  type LookHotspotClient,
} from "@/components/shop-the-look/ShopTheLookDetailClient";
import type { RowProduct } from "@/components/home/ProductEmblaRow";

type PageProps = { params: Promise<{ slug: string }> };

const includeRelated = {
  category: { select: { slug: true, nameVi: true, nameEn: true } },
  variants: { select: { priceAdjustment: true, imageUrls: true }, take: 24 },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof includeRelated }>;

function toRowProduct(p: ProductRow, locale: ContentLocale): RowProduct {
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

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug).trim();
  let title = "Shop the Look";
  try {
    const look = await prisma.shopTheLook.findFirst({
      where: { slug: decoded, published: true },
      select: { title: true },
    });
    if (look) title = `${look.title} — Shop the Look`;
  } catch {
    /* ignore */
  }
  return { title };
}

export default async function ShopTheLookDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug).trim();
  const locale = await getShopContentLocale();

  const look = await prisma.shopTheLook.findFirst({
    where: { slug: decoded, published: true },
    include: {
      hotspots: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            include: {
              variants: {
                orderBy: { createdAt: "asc" },
                take: 4,
                select: { priceAdjustment: true, imageUrls: true },
              },
            },
          },
        },
      },
    },
  });

  if (!look) notFound();

  const hotspots: LookHotspotClient[] = look.hotspots.map((h, idx) => {
    const card = buildProductCardForLook(h.product, locale);
    return {
      id: h.id,
      sortOrder: h.sortOrder ?? idx,
      xPercent: h.xPercent,
      yPercent: h.yPercent,
      product: {
        id: card.id,
        name: card.name,
        slug: card.slug,
        thumbUrl: card.thumbUrl,
        displayPriceVnd: card.displayPriceVnd,
      },
    };
  });

  const inLookIds = look.hotspots.map((h) => h.productId);
  const catIds = [...new Set(look.hotspots.map((h) => h.product.categoryId))];

  let relatedRaw: ProductRow[] = [];
  try {
    if (catIds.length > 0) {
      relatedRaw = await prisma.product.findMany({
        where: {
          id: { notIn: inLookIds },
          categoryId: { in: catIds },
        },
        take: 12,
        orderBy: { updatedAt: "desc" },
        include: includeRelated,
      });
    }
    if (relatedRaw.length < 4 && inLookIds.length > 0) {
      const more = await prisma.product.findMany({
        where: { id: { notIn: inLookIds } },
        take: 12,
        orderBy: { updatedAt: "desc" },
        include: includeRelated,
      });
      const seen = new Set(relatedRaw.map((p) => p.id));
      for (const p of more) {
        if (!seen.has(p.id)) {
          relatedRaw.push(p);
          seen.add(p.id);
        }
      }
    }
  } catch {
    relatedRaw = [];
  }

  const relatedProducts = relatedRaw.slice(0, 8).map((p) => toRowProduct(p, locale));

  return (
    <ShopTheLookDetailClient
      title={look.title}
      subtitle={look.subtitle}
      description={look.description}
      heroImageUrl={look.heroImageUrl}
      hotspots={hotspots}
      relatedProducts={relatedProducts}
    />
  );
}
