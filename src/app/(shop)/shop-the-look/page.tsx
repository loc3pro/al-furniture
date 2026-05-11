import { prisma } from "@/lib/prisma";
import { getShopContentLocale } from "@/lib/shop-content-locale-server";
import { buildProductCardForLook } from "@/lib/shop-the-look-product-meta";
import { ShopTheLookListCard } from "@/components/shop-the-look/ShopTheLookListCard";
import styles from "./shop-the-look-page.module.scss";

export const metadata = {
  title: "Shop the Look",
  description: "Gợi ý phối nội thất — chọn sản phẩm trong từng không gian.",
};

export default async function ShopTheLookListPage() {
  const locale = await getShopContentLocale();
  let looks: {
    slug: string;
    title: string;
    heroImageUrl: string;
    hotspots: {
      id: string;
      xPercent: number;
      yPercent: number;
      product: ReturnType<typeof buildProductCardForLook>;
    }[];
  }[] = [];

  try {
    const raw = await prisma.shopTheLook.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        slug: true,
        title: true,
        heroImageUrl: true,
        hotspots: {
          orderBy: { sortOrder: "asc" },
          take: 15,
          select: {
            id: true,
            xPercent: true,
            yPercent: true,
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

    looks = raw.map((look) => ({
      slug: look.slug,
      title: look.title,
      heroImageUrl: look.heroImageUrl,
      hotspots: look.hotspots.map((h) => ({
        id: h.id,
        xPercent: h.xPercent,
        yPercent: h.yPercent,
        product: buildProductCardForLook(h.product, locale),
      })),
    }));
  } catch {
    looks = [];
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <h1 className={styles.title}>Shop the Look</h1>
      </header>

      {looks.length === 0 ? (
        <p className={styles.empty}>Chưa có bộ sưu tập nào. Quay lại sau nhé.</p>
      ) : (
        <div className={styles.grid}>
          {looks.map((look) => (
            <ShopTheLookListCard
              key={look.slug}
              slug={look.slug}
              title={look.title}
              heroImageUrl={look.heroImageUrl}
              hotspots={look.hotspots.map((h) => ({
                id: h.id,
                xPercent: h.xPercent,
                yPercent: h.yPercent,
                product: {
                  name: h.product.name,
                  slug: h.product.slug,
                  thumbUrl: h.product.thumbUrl,
                  displayPriceVnd: h.product.displayPriceVnd,
                },
              }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
