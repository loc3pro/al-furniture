"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "./HeroCarousel.module.scss";

export type HeroSlide = {
  id: string;
  imageUrl: string;
  link: string | null;
  title?: string | null;
  subtitle?: string | null;
};

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" });
  const [selected, setSelected] = useState(0);
  const [imageReady, setImageReady] = useState<Record<string, boolean>>({});

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || slides.length <= 1) return;
    const t = setInterval(() => emblaApi.scrollNext(), 6000);
    return () => clearInterval(t);
  }, [emblaApi, slides.length]);

  if (slides.length === 0) {
    return (
      <div className={styles.placeholder}>
        <div className={styles.phInner} />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.viewport} ref={emblaRef}>
        <div className={styles.container}>
          {slides.map((s, i) => (
            <div className={styles.slide} key={s.id}>
              <Link
                href={s.link ?? "/products"}
                className={styles.slideLink}
                aria-label={`Banner ${i + 1} — mở liên kết`}
              >
                <div
                  className={`${styles.slideBg} ${imageReady[s.id] ? "" : styles.slideBgPending}`}
                >
                  <Image
                    src={s.imageUrl}
                    alt=""
                    fill
                    className={styles.img}
                    sizes="100vw"
                    unoptimized
                    priority={i === 0}
                    loading={i === 0 ? undefined : "lazy"}
                    onLoad={() =>
                      setImageReady((prev) => (prev[s.id] ? prev : { ...prev, [s.id]: true }))
                    }
                    onError={() =>
                      setImageReady((prev) => (prev[s.id] ? prev : { ...prev, [s.id]: true }))
                    }
                  />
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
      {slides.length > 1 ? (
        <div className={styles.dots} role="tablist" aria-label="Chọn slide">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={i === selected ? styles.dotActive : styles.dot}
              aria-label={`Slide ${i + 1}`}
              aria-selected={i === selected}
              onClick={() => emblaApi?.scrollTo(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
