"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ProductCardDiscountBadge } from "@/components/product/ProductCardPrice";
import styles from "./ProductCardVariantGallery.module.scss";

const ROTATE_MS = 2000;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

type Props = {
  galleryUrls: string[];
  discountBadgePercent: number;
  /** class cho khối ảnh (vd. ProductEmblaRow `.media` hoặc `product-card__media`) */
  mediaClassName: string;
  sizes: string;
  priority?: boolean;
  /** Hover vào vùng ảnh: hiện tên trên lớp gradient (thiết bị có hover) */
  productName?: string;
};

/**
 * Hover: luân phiên ảnh (crossfade). Một ảnh: không đổi; không ảnh: nền trống.
 */
export function ProductCardVariantGallery({
  galleryUrls,
  discountBadgePercent,
  mediaClassName,
  sizes,
  priority = false,
  productName,
}: Props) {
  const urls = galleryUrls.filter(Boolean);
  const [hover, setHover] = useState(false);
  const [idx, setIdx] = useState(0);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    setIdx(0);
  }, [urls.join("|")]);

  useEffect(() => {
    if (!hover || urls.length <= 1 || reduceMotion) return;
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % urls.length);
    }, ROTATE_MS);
    return () => window.clearInterval(t);
  }, [hover, urls.length, reduceMotion]);

  useEffect(() => {
    if (!hover) setIdx(0);
  }, [hover]);

  return (
    <div
      className={`${styles.root} ${mediaClassName}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <ProductCardDiscountBadge percent={discountBadgePercent} />
      {urls.length > 0 ? (
        <div className={styles.imageStack} aria-hidden={urls.length <= 1}>
          {urls.map((url, i) => (
            <div
              key={url}
              className={styles.imageLayer}
              style={{ opacity: i === idx ? 1 : 0 }}
            >
              <Image
                src={url}
                alt=""
                fill
                sizes={sizes}
                priority={priority && i === 0}
                loading={priority && i === 0 ? undefined : "lazy"}
                decoding="async"
                unoptimized
                style={{ objectFit: "cover" }}
              />
            </div>
          ))}
        </div>
      ) : null}
      {productName ? (
        <div className={styles.nameOverlay} aria-hidden>
          <span className={styles.nameOverlayText}>{productName}</span>
        </div>
      ) : null}
    </div>
  );
}
