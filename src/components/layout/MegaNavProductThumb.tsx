"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./SiteHeader.module.scss";

const ROTATE_MS = 2200;

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

/**
 * Ảnh mega menu: 1 ảnh tĩnh; ≥2 ảnh → khi `cycleActive` (hover cả card) luân phiên,
 * đổi ảnh gọn (một `<img>`, không crossfade opacity).
 */
export function MegaNavProductThumb({
  urls,
  cycleActive,
}: {
  urls: string[];
  cycleActive: boolean;
}) {
  const list = useMemo(() => urls.filter(Boolean), [urls]);
  const listKey = list.join("|");
  const [idx, setIdx] = useState(0);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    setIdx(0);
  }, [listKey]);

  useEffect(() => {
    if (!cycleActive || list.length <= 1 || reduceMotion) return;
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % list.length);
    }, ROTATE_MS);
    return () => window.clearInterval(t);
  }, [cycleActive, list.length, reduceMotion]);

  useEffect(() => {
    if (!cycleActive) setIdx(0);
  }, [cycleActive]);

  if (list.length === 0) {
    return <span className={styles.megaProductPlaceholder} aria-hidden />;
  }

  if (list.length === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- CDN / Cloudinary
      <img
        src={list[0]}
        alt=""
        className={styles.megaProductImg}
        loading="lazy"
        decoding="async"
      />
    );
  }

  const src = list[idx] ?? list[0];

  return (
    <div className={styles.megaProductImgStack}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${idx}-${src}`}
        src={src}
        alt=""
        className={styles.megaProductImg}
        loading={idx === 0 ? "lazy" : "eager"}
        decoding="async"
      />
    </div>
  );
}
