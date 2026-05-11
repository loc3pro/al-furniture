import type { CSSProperties } from "react";
import styles from "./ShopRouteSkeleton.module.scss";

function Sk({ className, style }: { className: string; style?: CSSProperties }) {
  return <div className={`${styles.shimmer} ${className}`} style={style} aria-hidden />;
}

function ProductCardSkeleton() {
  return (
    <div className={styles.card}>
      <Sk className={styles.cardImg} />
      <div className={styles.cardBody}>
        <Sk className={styles.lineSm} />
        <Sk className={styles.lineMd} />
        <Sk className={styles.linePrice} />
      </div>
    </div>
  );
}

function SectionSkeleton({ cards = 5 }: { cards?: number }) {
  return (
    <section className={`container ${styles.sectionBlock}`}>
      <div className={styles.sectionHead}>
        <Sk className={styles.titleBar} />
        <Sk className={styles.linkBar} />
      </div>
      <div className={styles.row}>
        {Array.from({ length: cards }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

/** Skeleton trang chủ / chuyển route shop — giữ khung layout, giảm nhảy UI. */
export function ShopHomeSkeleton() {
  return (
    <div className={styles.root}>
      <div className={styles.hero}>
        <Sk className={styles.heroInner} />
      </div>

      <SectionSkeleton cards={5} />

      <div className={styles.shopLookBand}>
        <div className="container sectionBlock">
          <div className={styles.sectionHead}>
            <Sk className={styles.titleBar} />
            <Sk className={styles.linkBar} />
          </div>
          <div style={{ maxWidth: "22rem", marginBottom: "1rem" }}>
            <Sk className={styles.lineMd} />
            <Sk className={styles.lineMd} style={{ marginTop: 8, width: "90%" }} />
          </div>
          <Sk className={styles.titleBar} style={{ width: "8rem", height: "2.5rem", borderRadius: 999 }} />
          <div className={styles.shopLookGrid} style={{ marginTop: "1.25rem" }}>
            <Sk className={styles.tile} />
            <Sk className={styles.tile} />
            <Sk className={styles.tile} />
          </div>
        </div>
      </div>

      <SectionSkeleton cards={5} />
      <SectionSkeleton cards={4} />

      <section className={`container ${styles.sectionBlock}`} style={{ paddingBottom: "3rem" }}>
        <div className={styles.sectionHead}>
          <Sk className={styles.titleBar} />
          <Sk className={styles.linkBar} />
        </div>
        <div className={styles.blogGrid}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.blogCard}>
              <Sk className={styles.blogImg} />
              <div className={styles.blogBody}>
                <Sk className={styles.lineSm} />
                <Sk className={styles.lineMd} />
                <Sk className={styles.lineMd} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className={`container ${styles.footerBand}`}>
        <Sk className={styles.footerBar} />
      </div>
    </div>
  );
}

/** Skeleton danh sách blog */
export function ShopBlogListSkeleton() {
  return (
    <div className={styles.root} style={{ padding: "1.5rem 0 3rem" }}>
      <div className="container">
        <div style={{ marginBottom: "1.5rem" }}>
          <Sk className={styles.titleBar} style={{ height: "1.75rem", width: "min(220px,55%)" }} />
          <Sk className={styles.lineMd} style={{ marginTop: "0.75rem", maxWidth: "36rem" }} />
        </div>
        <div className={styles.blogGrid}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={styles.blogCard}>
              <Sk className={styles.blogImg} />
              <div className={styles.blogBody}>
                <Sk className={styles.lineSm} />
                <Sk className={styles.lineMd} />
                <Sk className={styles.lineMd} style={{ width: "92%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Skeleton trang danh sách Shop the Look */
export function ShopTheLookListSkeleton() {
  return (
    <div className={`container ${styles.root}`} style={{ padding: "1.75rem 0 3rem" }}>
      <Sk
        className={styles.titleBar}
        style={{ height: "1.65rem", width: "min(280px,75%)", marginBottom: "1rem" }}
      />
      <div className={styles.shopLookGrid}>
        {Array.from({ length: 6 }, (_, i) => (
          <Sk key={i} className={styles.tile} style={{ aspectRatio: "3 / 4" }} />
        ))}
      </div>
    </div>
  );
}

/** Skeleton trang chi tiết Shop the Look — hero + nội dung + hàng SP liên quan */
export function ShopTheLookDetailSkeleton() {
  return (
    <div className={`container ${styles.root}`} style={{ padding: "1.5rem 0 3rem" }}>
      <Sk className={styles.heroInner} style={{ marginBottom: "1.5rem" }} />
      <div style={{ marginBottom: "1.75rem" }}>
        <Sk className={styles.titleBar} style={{ height: "2rem", width: "min(420px, 90%)", marginBottom: "0.75rem" }} />
        <Sk className={styles.lineMd} style={{ maxWidth: "40rem" }} />
        <Sk className={styles.lineMd} style={{ marginTop: 8, maxWidth: "34rem" }} />
      </div>
      <div style={{ marginBottom: "0.5rem" }}>
        <Sk className={styles.titleBar} style={{ height: "1.25rem", width: "12rem" }} />
      </div>
      <div className={styles.row}>
        {Array.from({ length: 4 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Skeleton trang chi tiết SP (ảnh + thông tin) */
export function ShopProductDetailSkeleton() {
  return (
    <div className={`container ${styles.root}`} style={{ padding: "1.5rem 0 3rem" }}>
      <div
        style={{
          display: "grid",
          gap: "2rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          alignItems: "start",
        }}
      >
        <Sk className={styles.tile} style={{ aspectRatio: "1", borderRadius: "var(--radius, 12px)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <Sk className={styles.lineMd} style={{ width: "40%", height: "0.75rem" }} />
          <Sk className={styles.titleBar} style={{ height: "2rem", width: "95%" }} />
          <Sk className={styles.linePrice} style={{ height: "1.75rem", width: "45%" }} />
          <Sk className={styles.lineMd} style={{ width: "100%" }} />
          <Sk className={styles.lineMd} style={{ width: "92%" }} />
          <Sk className={styles.titleBar} style={{ height: "2.75rem", width: "100%", borderRadius: "10px", marginTop: "0.5rem" }} />
        </div>
      </div>
    </div>
  );
}

/** Skeleton danh mục / filters + lưới SP */
export function ShopCatalogSkeleton() {
  return (
    <div className={`container ${styles.catalogPage}`}>
      <div style={{ marginBottom: "1.25rem" }}>
        <Sk className={styles.titleBar} style={{ width: "min(280px, 70%)", height: "1.5rem" }} />
      </div>
      <div className={styles.catalogGrid}>
        <aside className={styles.filtersPanel}>
          <Sk className={styles.filterTitle} />
          <Sk className={styles.filterLine} />
          <Sk className={styles.filterLineShort} />
          <Sk className={styles.filterLine} />
          <Sk className={styles.filterLineShort} />
          <Sk className={styles.filterTitle} style={{ marginTop: "0.5rem" }} />
          <Sk className={styles.filterLine} />
          <Sk className={styles.filterLine} />
        </aside>
        <div className={styles.productGrid}>
          {Array.from({ length: 8 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
