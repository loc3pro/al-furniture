import Link from "next/link";
import Image from "next/image";
import { ProductEmblaRow, type RowProduct } from "@/components/home/ProductEmblaRow";
import { ShopTheLookListCard } from "@/components/shop-the-look/ShopTheLookListCard";
import type { HomeSectionBlockId } from "@/lib/homepage-section-order";
import type { ShopLookHomeCard } from "@/lib/homepage-data";

type BlogPostCard = {
  slug: string;
  thumbnailUrl: string | null;
  authorName: string;
  publishedAt: Date;
  title: string;
  excerpt: string | null;
};

export type HomePageMainSectionsProps = {
  sectionBlockOrder: HomeSectionBlockId[];
  titles: { featured: string; newProducts: string; living: string; news: string };
  livingCategorySlug: string;
  featuredSectionEnabled: boolean;
  newSectionEnabled: boolean;
  livingSectionEnabled: boolean;
  newsSectionEnabled: boolean;
  featuredRows: RowProduct[];
  newestRows: RowProduct[];
  livingRows: RowProduct[];
  shopLookBlock: { enabled: boolean; title: string; subtitle: string; cards: ShopLookHomeCard[] };
  posts: BlogPostCard[];
};

export function HomePageMainSections({
  sectionBlockOrder,
  titles,
  livingCategorySlug,
  featuredSectionEnabled,
  newSectionEnabled,
  livingSectionEnabled,
  newsSectionEnabled,
  featuredRows,
  newestRows,
  livingRows,
  shopLookBlock,
  posts,
}: HomePageMainSectionsProps) {
  return (
    <>
      {sectionBlockOrder.map((blockId) => {
        if (blockId === "FEATURED" && featuredSectionEnabled && featuredRows.length > 0) {
          return (
            <section key={blockId} className="container sectionBlock">
              <div className="sectionHead">
                <h2 className="sectionTitle">{titles.featured}</h2>
                <Link href="/products" className="muted">
                  Xem tất cả
                </Link>
              </div>
              <ProductEmblaRow products={featuredRows} />
            </section>
          );
        }

        if (blockId === "SHOP_LOOK" && shopLookBlock.enabled) {
          return (
            <section key={blockId} className="sectionMuted">
              <div className="container sectionBlock" style={{ paddingTop: "2rem" }}>
                <div className="shopLook">
                  <div className="shopLookIntro">
                    <h2 className="sectionTitle" style={{ border: "none", padding: 0 }}>
                      {shopLookBlock.title}
                    </h2>
                    <p className="muted" style={{ maxWidth: "28rem", marginTop: "0.75rem", whiteSpace: "pre-wrap" }}>
                      {shopLookBlock.subtitle}
                    </p>
                    <Link href="/shop-the-look" className="btn btn--primary" style={{ marginTop: "1rem" }}>
                      SHOP NOW
                    </Link>
                  </div>
                  <div className="shopLookGrid">
                    {shopLookBlock.cards.length === 0 ? (
                      <div className="muted" style={{ gridColumn: "1 / -1", padding: "1rem 0" }}>
                        Chưa có bài Shop the Look hiển thị. Kiểm tra Admin → Trang chủ (số ảnh, thứ tự) và Admin → Shop
                        the Look (đăng bài, bật hiển thị).
                      </div>
                    ) : (
                      shopLookBlock.cards.map((look) => (
                        <ShopTheLookListCard
                          key={look.slug}
                          variant="imageOnly"
                          slug={look.slug}
                          title={look.title}
                          heroImageUrl={look.heroImageUrl}
                          hotspots={look.hotspots}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        }

        if (blockId === "NEW_PRODUCTS" && newSectionEnabled && newestRows.length > 0) {
          return (
            <section key={blockId} className="container sectionBlock">
              <div className="sectionHead">
                <h2 className="sectionTitle">{titles.newProducts}</h2>
                <Link href="/products" className="muted">
                  Xem tất cả
                </Link>
              </div>
              <ProductEmblaRow products={newestRows} />
            </section>
          );
        }

        if (blockId === "LIVING" && livingSectionEnabled && livingRows.length > 0) {
          return (
            <section key={blockId} className="container sectionBlock">
              <div className="sectionHead">
                <h2 className="sectionTitle">{titles.living}</h2>
                <Link href={`/products?category=${encodeURIComponent(livingCategorySlug)}`} className="muted">
                  Xem tất cả
                </Link>
              </div>
              <ProductEmblaRow products={livingRows} />
            </section>
          );
        }

        if (blockId === "NEWS" && newsSectionEnabled && posts.length > 0) {
          return (
            <section key={blockId} className="container sectionBlock" style={{ paddingBottom: "3rem" }}>
              <div className="sectionHead">
                <h2 className="sectionTitle">{titles.news}</h2>
                <Link href="/blog" className="muted">
                  Xem thêm
                </Link>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: "1.5rem",
                }}
              >
                {posts.map((post) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="card" style={{ overflow: "hidden" }}>
                    <div style={{ position: "relative", aspectRatio: "4/5", background: "#ece8e2" }}>
                      {post.thumbnailUrl ? (
                        <Image
                          src={post.thumbnailUrl}
                          alt=""
                          fill
                          sizes="320px"
                          loading="lazy"
                          style={{ objectFit: "cover" }}
                        />
                      ) : null}
                    </div>
                    <div style={{ padding: "1rem 1.1rem 1.25rem" }}>
                      <div className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                        {post.authorName} · {new Date(post.publishedAt).toLocaleDateString("vi-VN")}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "1.02rem", lineHeight: 1.35 }}>{post.title}</div>
                      <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>
                        {post.excerpt}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        }

        return null;
      })}
    </>
  );
}
