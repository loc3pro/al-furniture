import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { pickCategoryName, pickProductName } from "@/lib/content-locale";
import { getShopContentLocale } from "@/lib/shop-content-locale-server";
import { ProductCardMediaImage } from "@/components/product/ProductCardMediaImage";
import { ProductCardDiscountBadge, ProductCardPrices } from "@/components/product/ProductCardPrice";
import { productCardMinPricing } from "@/lib/product-card-pricing";

export default async function WishlistPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/login?next=/wishlist");
  }

  const locale = await getShopContentLocale();
  const rows = await prisma.wishlist.findMany({
    where: { userId: session.sub },
    include: {
      product: {
        include: {
          category: { select: { nameVi: true, nameEn: true } },
          variants: {
            take: 4,
            select: { priceAdjustment: true, imageUrls: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container" style={{ padding: "2rem 0 3rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: rows.length > 0 ? "0.35rem" : "1rem" }}>Yêu thích</h1>
      {rows.length > 0 ? (
        <p className="muted" style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>
          Tổng <strong>{rows.length}</strong> sản phẩm
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="muted">Chưa có sản phẩm — duyệt <Link href="/products">cửa hàng</Link>.</p>
      ) : (
        <div className="grid-products">
          {rows.map((row) => {
            const p = row.product;
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
                  {thumb ? <ProductCardMediaImage src={thumb} sizes="240px" /> : null}
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
      )}
    </div>
  );
}
