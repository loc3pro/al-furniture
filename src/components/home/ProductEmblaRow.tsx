"use client";

import useEmblaCarousel from "embla-carousel-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ProductCardVariantGallery } from "@/components/product/ProductCardVariantGallery";
import { ProductCardPrices } from "@/components/product/ProductCardPrice";
import styles from "./ProductEmblaRow.module.scss";

export type RowProduct = {
  id: string;
  slug: string;
  name: string;
  categoryName: string;
  minPrice: number;
  minOriginalPrice: number | null;
  discountBadgePercent: number;
  thumbUrl: string | null;
  /** Ảnh từ nhiều biến thể — hover xem luân phiên */
  galleryUrls: string[];
};

export function ProductEmblaRow({ products }: { products: RowProduct[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 1,
    containScroll: "trimSnaps",
    dragFree: true,
    duration: 42,
  });

  const [navNeeded, setNavNeeded] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const syncNav = useCallback(() => {
    if (!emblaApi) return;
    const prev = emblaApi.canScrollPrev();
    const next = emblaApi.canScrollNext();
    setCanPrev(prev);
    setCanNext(next);
    setNavNeeded(prev || next);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    syncNav();
    emblaApi.on("select", syncNav);
    emblaApi.on("reInit", syncNav);
    emblaApi.on("resize", syncNav);
    const onWinResize = () => syncNav();
    window.addEventListener("resize", onWinResize);
    const id = window.requestAnimationFrame(() => syncNav());
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("resize", onWinResize);
      emblaApi.off("select", syncNav);
      emblaApi.off("reInit", syncNav);
      emblaApi.off("resize", syncNav);
    };
  }, [emblaApi, syncNav, products]);

  if (products.length === 0) return null;

  return (
    <div className={styles.wrap}>
      {navNeeded ? (
        <>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowLeft}`}
            aria-label="Trước"
            disabled={!canPrev}
            onClick={() => emblaApi?.scrollPrev()}
          >
            ‹
          </button>
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowRight}`}
            aria-label="Sau"
            disabled={!canNext}
            onClick={() => emblaApi?.scrollNext()}
          >
            ›
          </button>
        </>
      ) : null}
      <div className={styles.viewport} ref={emblaRef}>
        <div className={styles.track}>
          {products.map((p, idx) => (
            <div className={styles.slide} key={p.id}>
              <Link href={`/products/${p.slug}`} className={styles.card}>
                <ProductCardVariantGallery
                  galleryUrls={p.galleryUrls.length > 0 ? p.galleryUrls : p.thumbUrl ? [p.thumbUrl] : []}
                  discountBadgePercent={p.discountBadgePercent}
                  mediaClassName={styles.media}
                  sizes="280px"
                  priority={idx === 0}
                  productName={p.name}
                />
                <div className={styles.body}>
                  <div className={styles.cat}>{p.categoryName}</div>
                  <div className={styles.name}>{p.name}</div>
                  <ProductCardPrices salePrice={p.minPrice} originalPrice={p.minOriginalPrice} />
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
