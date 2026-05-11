"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatVnd } from "@/lib/money";
import { ProductEmblaRow, type RowProduct } from "@/components/home/ProductEmblaRow";
import styles from "./ShopTheLookDetail.module.scss";

export type LookHotspotClient = {
  id: string;
  sortOrder: number;
  xPercent: number;
  yPercent: number;
  product: {
    id: string;
    name: string;
    slug: string;
    thumbUrl: string | null;
    displayPriceVnd: number;
  };
};

type Props = {
  title: string;
  subtitle: string | null;
  description: string | null;
  heroImageUrl: string;
  hotspots: LookHotspotClient[];
  relatedProducts: RowProduct[];
};

export function ShopTheLookDetailClient({
  title,
  subtitle,
  description,
  heroImageUrl,
  hotspots,
  relatedProducts,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHide();
    hideTimer.current = setTimeout(() => setActiveId(null), 2200);
  }, [clearHide]);

  const ordered = [...hotspots].sort((a, b) => a.sortOrder - b.sortOrder);

  useEffect(() => {
    return () => clearHide();
  }, [clearHide]);

  const descTrimmed = description?.trim() ?? "";

  return (
    <article className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Đường dẫn">
        <Link href="/shop-the-look">Shop the Look</Link>
        <span className={styles.breadcrumbSep} aria-hidden>
          /
        </span>
        <span className={styles.breadcrumbCurrent}>{title}</span>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle ? <p className={styles.lead}>{subtitle}</p> : null}
      </header>

      <div className={styles.layout}>
        <aside className={styles.productCol} aria-label="Sản phẩm trong ảnh">
          <ol className={styles.productList}>
            {ordered.map((h, idx) => (
              <li key={h.id} className={styles.productRow}>
                <span className={styles.num}>{idx + 1}</span>
                <div className={styles.rowThumb}>
                  {h.product.thumbUrl ? (
                    <Image
                      src={h.product.thumbUrl}
                      alt=""
                      width={56}
                      height={56}
                      className={styles.thumbImg}
                    />
                  ) : (
                    <span className={styles.thumbPlaceholder} aria-hidden />
                  )}
                </div>
                <div className={styles.rowBody}>
                  <Link
                    href={`/products/${encodeURIComponent(h.product.slug)}`}
                    className={styles.rowName}
                    onMouseEnter={() => {
                      clearHide();
                      setActiveId(h.id);
                    }}
                    onMouseLeave={scheduleHide}
                  >
                    {h.product.name}
                  </Link>
                  <div className={styles.rowPrice}>{formatVnd(h.product.displayPriceVnd)}</div>
                </div>
              </li>
            ))}
          </ol>
        </aside>

        <div className={styles.heroCol}>
          <div
            className={styles.heroFrame}
            onMouseLeave={() => {
              clearHide();
              setActiveId(null);
            }}
          >
            <div className={styles.heroClip}>
              <div className={styles.heroMedia}>
                {/* eslint-disable-next-line @next/next/no-img-element -- dynamic hero URL */}
                <img src={heroImageUrl} alt="" className={styles.heroImg} />
              </div>
              <div className={styles.heroPins}>
                {ordered.map((h) => {
                  const open = activeId === h.id;
                  const productHref = `/products/${encodeURIComponent(h.product.slug)}`;
                  return (
                    <div
                      key={h.id}
                      className={`${styles.pinWrap} ${open ? styles.pinWrapActive : ""}`}
                      style={{ left: `${h.xPercent}%`, top: `${h.yPercent}%` }}
                      onMouseEnter={() => {
                        clearHide();
                        setActiveId(h.id);
                      }}
                    >
                      <Link
                        href={productHref}
                        className={styles.pin}
                        aria-label={`Xem ${h.product.name} — ${formatVnd(h.product.displayPriceVnd)}`}
                        onFocus={() => {
                          clearHide();
                          setActiveId(h.id);
                        }}
                      />
                      {open ? (
                        <div className={styles.popover} role="tooltip">
                          <Link
                            href={productHref}
                            className={styles.popThumb}
                            aria-label={`Xem ${h.product.name}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {h.product.thumbUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={h.product.thumbUrl} alt="" />
                            ) : (
                              <span className={styles.popThumbPlaceholder} aria-hidden />
                            )}
                          </Link>
                          <div className={styles.popText}>
                            <Link href={productHref} className={styles.popName}>
                              {h.product.name}
                            </Link>
                            <span className={styles.popPrice}>{formatVnd(h.product.displayPriceVnd)}</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {descTrimmed.length > 0 ? (
        <section className={styles.descSection} aria-labelledby="stl-desc-heading">
          <h2 id="stl-desc-heading" className={styles.sectionTitle}>
            Giới thiệu
          </h2>
          <div className={styles.descBody}>{descTrimmed}</div>
        </section>
      ) : null}

      {relatedProducts.length > 0 ? (
        <section className={styles.relatedSection} aria-labelledby="stl-related-heading">
          <h2 id="stl-related-heading" className={styles.sectionTitle}>
            Có thể bạn thích
          </h2>
          <ProductEmblaRow products={relatedProducts} />
        </section>
      ) : null}
    </article>
  );
}
