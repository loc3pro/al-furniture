"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatVnd } from "@/lib/money";
import styles from "./ShopTheLookListCard.module.scss";

export type ListCardHotspot = {
  id: string;
  xPercent: number;
  yPercent: number;
  product: {
    name: string;
    slug: string;
    thumbUrl: string | null;
    displayPriceVnd: number;
  };
};

type Props = {
  slug: string;
  title: string;
  heroImageUrl: string;
  hotspots: ListCardHotspot[];
  /** Trang chủ: chỉ ảnh + hotspot (không khung card, không tiêu đề / nút). */
  variant?: "card" | "imageOnly";
};

export function ShopTheLookListCard({
  slug,
  title,
  heroImageUrl,
  hotspots,
  variant = "card",
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const detailHref = `/shop-the-look/${encodeURIComponent(slug)}`;
  const imageOnly = variant === "imageOnly";

  return (
    <article className={imageOnly ? styles.imageOnlyRoot : styles.card}>
      <div
        className={imageOnly ? styles.imageOnlyWrap : styles.cardImageWrap}
        onMouseLeave={() => {
          setActiveId(null);
        }}
      >
        <div className={imageOnly ? styles.imageOnlyClip : styles.cardImageClip}>
          <Link href={detailHref} className={styles.cardImageLink} aria-label={`Xem ${title}`}>
            <Image
              src={heroImageUrl}
              alt=""
              fill
              className={styles.cardImage}
              sizes={imageOnly ? "(max-width: 640px) 100vw, 33vw" : "(max-width: 768px) 50vw, 25vw"}
              unoptimized
            />
          </Link>
        </div>
        <div className={styles.pinLayer}>
          {hotspots.map((h) => {
            const open = activeId === h.id;
            const productHref = `/products/${encodeURIComponent(h.product.slug)}`;
            return (
              <div
                key={h.id}
                className={`${styles.pinWrap} ${open ? styles.pinWrapOpen : ""}`}
                style={{ left: `${h.xPercent}%`, top: `${h.yPercent}%` }}
                onMouseEnter={() => {
                  setActiveId(h.id);
                }}
              >
                <button
                  type="button"
                  className={styles.pin}
                  aria-expanded={open}
                  aria-label={`${h.product.name} — ${formatVnd(h.product.displayPriceVnd)}`}
                  onFocus={() => {
                    setActiveId(h.id);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveId((id) => (id === h.id ? null : h.id));
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
                        <img src={h.product.thumbUrl} alt="" loading="lazy" decoding="async" />
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
      {!imageOnly ? (
        <div className={styles.cardBody}>
          <h2 className={styles.cardTitle}>{title}</h2>
          <Link href={detailHref} className={styles.cardBtn}>
            Xem chi tiết
          </Link>
        </div>
      ) : null}
    </article>
  );
}
