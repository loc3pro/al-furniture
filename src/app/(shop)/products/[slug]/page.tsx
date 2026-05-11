import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ProductCardMediaImage } from "@/components/product/ProductCardMediaImage";
import { ProductCardDiscountBadge, ProductCardPrices } from "@/components/product/ProductCardPrice";
import { ProductViewRecorder } from "@/components/product/ProductViewRecorder";
import { productCardMinPricing } from "@/lib/product-card-pricing";
import {
  pickCategoryName,
  pickMetaDescription,
  pickMetaTitle,
  pickProductDescription,
  pickProductName,
  pickVariantColor,
  pickVariantSize,
  parseContentLocale,
  type ContentLocale,
} from "@/lib/content-locale";
import { getProductPageBySlug } from "@/lib/product-detail-cache";
import { prisma } from "@/lib/prisma";
import { ProductBuyPanel, type VariantDTO } from "@/components/product/ProductBuyPanel";
import styles from "./product-detail.module.scss";

type PageProps = { params: Promise<{ slug: string }> };

async function metadataLocale(): Promise<ContentLocale> {
  const jar = await cookies();
  return parseContentLocale(jar.get("furniture_shop_locale")?.value);
}

export async function generateMetadata(props: PageProps) {
  const { slug } = await props.params;
  const locale = await metadataLocale();
  try {
    const p = await getProductPageBySlug(slug);
    if (!p) return { title: "Sản phẩm" };
    const title = pickMetaTitle(p, locale) ?? pickProductName(p, locale);
    const descRaw = pickMetaDescription(p, locale) ?? pickProductDescription(p, locale);
    return {
      title,
      description: descRaw.trim() ? descRaw.slice(0, 320) : undefined,
    };
  } catch {
    return { title: "Sản phẩm" };
  }
}

export default async function ProductPage(props: PageProps) {
  const { slug } = await props.params;
  const locale = await metadataLocale();
  let product;
  try {
    product = await getProductPageBySlug(slug);
  } catch {
    product = null;
  }

  if (!product) notFound();

  const variants: VariantDTO[] = product.variants.map((v) => ({
    id: v.id,
    colorLabel: pickVariantColor(v, locale),
    colorHex: v.colorHex,
    sizeLabel: pickVariantSize(v, locale),
    priceAdjustment: v.priceAdjustment,
    stockQuantity: v.stockQuantity,
    sku: v.sku,
    imageUrls: v.imageUrls,
  }));

  let relatedProducts: Awaited<ReturnType<typeof fetchRelatedProducts>> = [];
  try {
    relatedProducts = await fetchRelatedProducts(product.id, product.categoryId);
  } catch {
    relatedProducts = [];
  }

  const displayName = pickProductName(product, locale);
  const displayDesc = pickProductDescription(product, locale);
  const descTrimmed = displayDesc.trim();
  const catName = pickCategoryName(product.category, locale);

  return (
    <div className={styles.page}>
      <ProductViewRecorder productId={product.id} locale={locale} />
      <p className={`muted ${styles.breadcrumb}`}>
        <Link href={`/products?category=${product.category.slug}`}>{catName}</Link>
        <span aria-hidden> · </span>
        <span>{displayName}</span>
      </p>
      <ProductBuyPanel
        key={product.id}
        productId={product.id}
        slug={product.slug}
        name={displayName}
        basePrice={product.basePrice}
        salePrice={product.salePrice}
        discountPercent={product.discountPercent}
        variants={variants}
      />

      {descTrimmed ? (
        <section className={styles.descriptionSection} aria-labelledby="product-desc-heading">
          <h2 id="product-desc-heading" className={styles.sectionTitle}>
            Mô tả sản phẩm
          </h2>
          <div className={styles.descriptionBody}>{displayDesc}</div>
        </section>
      ) : null}

      {relatedProducts.length > 0 ? (
        <section className={styles.relatedSection} aria-labelledby="related-heading">
          <h2 id="related-heading" className={styles.sectionTitle}>
            Sản phẩm liên quan
          </h2>
          <p className={styles.relatedHint}>Cùng danh mục · {catName}</p>
          <div className="grid-products">
            {relatedProducts.map((p, idx) => {
              const pricing = productCardMinPricing(p);
              const thumb =
                p.variants
                  .map((v) => {
                    const u = v.imageUrls as unknown;
                    return Array.isArray(u) && typeof u[0] === "string" ? u[0] : null;
                  })
                  .find(Boolean) ?? null;
              return (
                <Link key={p.id} href={`/products/${p.slug}`} className="card product-card">
                  <div className="product-card__media">
                    <ProductCardDiscountBadge percent={pricing.discountBadgePercent} />
                    {thumb ? (
                      <ProductCardMediaImage src={thumb} sizes="240px" priority={idx === 0} />
                    ) : null}
                  </div>
                  <div className="product-card__body">
                    <div className="muted" style={{ fontSize: "0.8rem" }}>
                      {pickCategoryName(p.category, locale)}
                    </div>
                    <div style={{ fontWeight: 700 }}>{pickProductName(p, locale)}</div>
                    <ProductCardPrices salePrice={pricing.salePrice} originalPrice={pricing.originalPrice} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

async function fetchRelatedProducts(currentProductId: string, categoryId: string) {
  return prisma.product.findMany({
    where: {
      categoryId,
      id: { not: currentProductId },
    },
    take: 8,
    orderBy: [{ isFeatured: "desc" }, { soldCount: "desc" }],
    include: {
      category: { select: { nameVi: true, nameEn: true, slug: true } },
      variants: {
        select: { imageUrls: true, priceAdjustment: true },
      },
    },
  });
}
