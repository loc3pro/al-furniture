"use client";

import Image from "next/image";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Heart,
  Maximize2,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { addLine } from "@/features/cart/cartSlice";
import { showAppToast } from "@/lib/app-toast";
import { formatVnd, variantListPrice, variantUnitPrice } from "@/lib/money";
import styles from "./ProductBuyPanel.module.scss";

export type VariantDTO = {
  id: string;
  colorLabel: string;
  colorHex: string | null;
  sizeLabel: string;
  priceAdjustment: number;
  stockQuantity: number;
  sku: string;
  imageUrls: unknown;
};

function parseUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const s = item.trim();
    if (!s) continue;
    try {
      const u = new URL(s);
      if (u.protocol !== "https:") continue;
      const href = u.href;
      if (seen.has(href)) continue;
      seen.add(href);
      out.push(href);
    } catch {
      continue;
    }
  }
  return out;
}

function GalleryThumb({
  url,
  active,
  onPick,
}: {
  url: string;
  active: boolean;
  onPick: () => void;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [url]);

  return (
    <button
      type="button"
      className={`${styles.thumb} ${active ? styles.thumbOn : ""}`}
      onClick={onPick}
    >
      {broken ? (
        <span className={styles.thumbBroken} title="Không tải được ảnh" aria-hidden />
      ) : (
        <Image
          src={url}
          alt=""
          width={45}
          height={60}
          className={styles.thumbImg}
          sizes="(max-width: 639px) 33px, (max-width: 1366px) 39px, 45px"
          loading={active ? "eager" : "lazy"}
          decoding="async"
          unoptimized
          onError={() => setBroken(true)}
        />
      )}
    </button>
  );
}

export function ProductBuyPanel({
  productId,
  slug,
  name,
  basePrice,
  salePrice,
  discountPercent = 0,
  variants,
}: {
  productId: string;
  slug: string;
  name: string;
  /** Giá niêm yết (trước giảm) */
  basePrice: number;
  /** Giá sau giảm (null = coi như bằng giá gốc / dữ liệu cũ) */
  salePrice?: number | null;
  discountPercent?: number;
  variants: VariantDTO[];
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const thumbRef = useRef<HTMLDivElement>(null);
  const [thumbShowPrev, setThumbShowPrev] = useState(false);
  const [thumbShowNext, setThumbShowNext] = useState(false);
  const [thumbOverflow, setThumbOverflow] = useState(false);

  const colors = useMemo(() => {
    const m = new Map<string, { label: string; hex: string | null }>();
    for (const v of variants) {
      if (!m.has(v.colorLabel)) {
        m.set(v.colorLabel, { label: v.colorLabel, hex: v.colorHex });
      }
    }
    return [...m.values()];
  }, [variants]);

  const [color, setColor] = useState(colors[0]?.label ?? "");
  const sizesForColor = useMemo(
    () => variants.filter((v) => v.colorLabel === color),
    [variants, color]
  );
  const [size, setSize] = useState(sizesForColor[0]?.sizeLabel ?? "");
  const [quantity, setQuantity] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [heroImgBroken, setHeroImgBroken] = useState(false);
  const [wishOn, setWishOn] = useState(false);
  const [wishBusy, setWishBusy] = useState(false);

  useEffect(() => {
    if (!sizesForColor.find((s) => s.sizeLabel === size)) {
      setSize(sizesForColor[0]?.sizeLabel ?? "");
    }
  }, [sizesForColor, size]);

  const selected = useMemo(() => {
    return variants.find((v) => v.colorLabel === color && v.sizeLabel === size) ?? null;
  }, [variants, color, size]);

  const galleryUrls = useMemo(() => {
    const urls = parseUrls(selected?.imageUrls);
    return urls.length > 0 ? urls : [];
  }, [selected]);

  useEffect(() => {
    setImgIndex(0);
  }, [selected?.id]);

  useEffect(() => {
    setHeroImgBroken(false);
  }, [selected?.id, imgIndex]);

  useEffect(() => {
    if (imgIndex >= galleryUrls.length) setImgIndex(0);
  }, [galleryUrls.length, imgIndex]);

  const syncThumbScrollUi = useCallback(() => {
    const el = thumbRef.current;
    if (!el) {
      setThumbOverflow(false);
      setThumbShowPrev(false);
      setThumbShowNext(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + 2;
    setThumbOverflow(overflow);
    setThumbShowPrev(overflow && scrollLeft > 2);
    setThumbShowNext(overflow && scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = thumbRef.current;
    syncThumbScrollUi();
    if (!el) return;
    const ro = new ResizeObserver(() => syncThumbScrollUi());
    ro.observe(el);
    el.addEventListener("scroll", syncThumbScrollUi, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", syncThumbScrollUi);
    };
  }, [galleryUrls, syncThumbScrollUi]);

  useEffect(() => {
    const row = thumbRef.current;
    if (!row || galleryUrls.length <= 1) return;
    const btn = row.children[imgIndex] as HTMLElement | undefined;
    btn?.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
  }, [imgIndex, galleryUrls.length]);

  useEffect(() => {
    const id = requestAnimationFrame(() => syncThumbScrollUi());
    return () => cancelAnimationFrame(id);
  }, [imgIndex, galleryUrls, syncThumbScrollUi]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(`/api/wishlist?productId=${encodeURIComponent(productId)}`, {
          credentials: "same-origin",
        });
        const d = await r.json().catch(() => ({}));
        if (!cancelled && typeof d.inWishlist === "boolean") setWishOn(d.inWishlist);
      } catch {
        if (!cancelled) setWishOn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    const n = galleryUrls.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightbox) setLightbox(false);
        return;
      }
      if (n <= 1) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable=true]")) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setImgIndex((i) => (i - 1 + n) % n);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setImgIndex((i) => (i + 1) % n);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [galleryUrls.length, lightbox]);

  useEffect(() => {
    if (!selected) return;
    const cap = selected.stockQuantity;
    if (cap < 1) {
      setQuantity(0);
      return;
    }
    setQuantity((q) => Math.min(Math.max(1, q), cap));
  }, [selected]);

  const unitPrice = selected
    ? variantUnitPrice(
        { basePrice, salePrice: salePrice ?? null, discountPercent },
        selected.priceAdjustment,
      )
    : 0;
  const listUnitPrice = selected ? variantListPrice(basePrice, selected.priceAdjustment) : 0;
  /** Gạch giá niêm yết biến thể + badge % khi giá sau giảm thấp hơn */
  const showDiscountUi =
    !!selected && discountPercent > 0 && listUnitPrice > unitPrice && listUnitPrice > 0;
  const stockCap = selected?.stockQuantity ?? 0;
  const lineTotal = unitPrice * (stockCap < 1 ? 0 : quantity);
  const primaryImage = galleryUrls[imgIndex] ?? galleryUrls[0] ?? null;

  const canBuy =
    !!selected &&
    selected.stockQuantity > 0 &&
    colors.length > 0 &&
    !!size &&
    quantity >= 1;

  const addToCart = useCallback(() => {
    if (!selected || !canBuy) return;
    const parsed = parseUrls(selected.imageUrls);
    const img = parsed[0] ?? null;
    const qty = Math.min(quantity, selected.stockQuantity);
    dispatch(
      addLine({
        variantId: selected.id,
        productId,
        productSlug: slug,
        productName: name,
        colorLabel: selected.colorLabel,
        sizeLabel: selected.sizeLabel,
        basePrice,
        discountPercent: discountPercent ?? 0,
        salePrice: salePrice ?? null,
        priceAdjustment: selected.priceAdjustment,
        quantity: qty,
        imageUrl: img,
        maxStock: selected.stockQuantity,
        sku: selected.sku,
      }),
    );
    showAppToast("Đã thêm vào giỏ hàng");
  }, [selected, canBuy, dispatch, productId, slug, name, basePrice, discountPercent, salePrice, quantity]);

  async function toggleWishlist() {
    if (wishBusy) return;
    setWishBusy(true);
    try {
      const r = await fetch("/api/wishlist", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (r.status === 401) {
        const next = pathname ?? `/products/${slug}`;
        router.push(`/auth/login?next=${encodeURIComponent(next)}`);
        return;
      }
      const d = await r.json().catch(() => ({}));
      if (typeof d.inWishlist === "boolean") {
        setWishOn(d.inWishlist);
        showAppToast(d.inWishlist ? "Đã thêm vào yêu thích" : "Đã bỏ khỏi yêu thích");
      }
      if (typeof d.count === "number") {
        window.dispatchEvent(
          new CustomEvent("furniture_wishlist_updated", { detail: { count: d.count } }),
        );
      }
    } finally {
      setWishBusy(false);
    }
  }

  const buyNow = useCallback(() => {
    if (!selected || !canBuy) return;
    addToCart();
    router.push("/checkout");
  }, [selected, canBuy, addToCart, router]);

  const resetConfig = () => {
    const firstColor = colors[0]?.label ?? "";
    setColor(firstColor);
    const next = variants.filter((v) => v.colorLabel === firstColor);
    setSize(next[0]?.sizeLabel ?? "");
    setQuantity(1);
    setImgIndex(0);
  };

  const scrollThumbs = (dir: -1 | 1) => {
    const row = thumbRef.current;
    if (!row) return;
    const first = row.querySelector("button");
    const step =
      first instanceof HTMLElement ? Math.round(first.getBoundingClientRect().width + 8) : 72;
    row.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  };

  const goHero = (dir: -1 | 1) => {
    const n = galleryUrls.length;
    if (n <= 1) return;
    setImgIndex((i) => (i + dir + n) % n);
  };

  return (
    <div className={styles.root}>
      <div className={styles.grid}>
        {/* —— Visual column —— */}
        <div className={styles.visualColumn}>
          <div className={styles.heroWrap}>
            <div className={styles.hero}>
              <div className={styles.heroMedia}>
                <div className={styles.heroMediaInner}>
                  {galleryUrls.length > 0 && !heroImgBroken ? (
                    <div className={styles.heroLayers}>
                      {galleryUrls.map((url, i) => (
                        <div
                          key={url}
                          className={styles.heroLayer}
                          style={{ opacity: i === imgIndex ? 1 : 0 }}
                          aria-hidden={i !== imgIndex}
                        >
                          <Image
                            src={url}
                            alt=""
                            fill
                            sizes="(max-width: 639px) 100vw, (max-width: 899px) 90vw, (max-width: 1366px) 56vw, 50vw"
                            priority={i === 0}
                            fetchPriority={i === 0 ? "high" : "auto"}
                            loading={i === 0 ? undefined : "lazy"}
                            decoding="async"
                            className={styles.heroImg}
                            unoptimized
                            onError={() => {
                              if (i === imgIndex) setHeroImgBroken(true);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.heroPh} />
                  )}
                </div>
              </div>

              <div className={styles.heroOverlayTL}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  title="Xem toàn màn hình"
                  aria-label="Xem toàn màn hình"
                  disabled={!primaryImage}
                  onClick={() => primaryImage && setLightbox(true)}
                >
                  <Maximize2 size={18} strokeWidth={2} />
                </button>
              </div>
              <div className={styles.heroOverlayTR}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  title={wishOn ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
                  aria-label={wishOn ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
                  aria-pressed={wishOn}
                  disabled={wishBusy}
                  onClick={() => void toggleWishlist()}
                >
                  <Heart
                    size={18}
                    strokeWidth={2}
                    fill={wishOn ? "currentColor" : "none"}
                    className={wishOn ? styles.wishHeartOn : undefined}
                  />
                </button>
              </div>
              {galleryUrls.length > 1 ? (
                <>
                  <button
                    type="button"
                    className={`${styles.heroNavBtn} ${styles.heroNavPrev}`}
                    aria-label="Ảnh trước"
                    onClick={() => goHero(-1)}
                  >
                    <ChevronLeft size={22} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.heroNavBtn} ${styles.heroNavNext}`}
                    aria-label="Ảnh sau"
                    onClick={() => goHero(1)}
                  >
                    <ChevronRight size={22} strokeWidth={2} />
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {galleryUrls.length >= 1 ? (
            <div className={styles.thumbStrip}>
              {thumbOverflow && thumbShowPrev ? (
                <button
                  type="button"
                  className={styles.thumbNav}
                  aria-label="Cuộn ảnh nhỏ trái"
                  onClick={() => scrollThumbs(-1)}
                >
                  <ChevronLeft size={20} />
                </button>
              ) : null}
              <div
                ref={thumbRef}
                className={`${styles.thumbRow} ${!thumbOverflow ? styles.thumbRowCenter : ""}`}
              >
                {galleryUrls.map((url, i) => (
                  <GalleryThumb
                    key={`${url}-${i}`}
                    url={url}
                    active={i === imgIndex}
                    onPick={() => setImgIndex(i)}
                  />
                ))}
              </div>
              {thumbOverflow && thumbShowNext ? (
                <button
                  type="button"
                  className={styles.thumbNav}
                  aria-label="Cuộn ảnh nhỏ phải"
                  onClick={() => scrollThumbs(1)}
                >
                  <ChevronRight size={20} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* —— Config sidebar —— */}
        <aside className={styles.configColumn}>
          <div className={styles.configScroll}>
            <div className={styles.sidebarMetaSticky}>
              <div className={styles.visualTop}>
                <div className={styles.visualMeta}>
                  <div className={styles.visualMetaLeft}>
                    <span className={styles.productName}>{name}</span>
                    <div className={styles.productPriceBlock}>
                      <span className={styles.priceLabelMuted}>Giá sản phẩm</span>
                      <div className={styles.priceRowLeft}>
                        {selected && showDiscountUi ? (
                          <span className={styles.priceStrike}>{formatVnd(listUnitPrice)}</span>
                        ) : null}
                        <span className={styles.priceMain}>
                          {selected ? formatVnd(unitPrice) : "—"}
                        </span>
                        {selected && showDiscountUi ? (
                          <span className={styles.discountBadge}>-{discountPercent}%</span>
                        ) : null}
                      </div>
                      <p className={styles.shippingPriceNote}>Giá chưa bao gồm phí vận chuyển.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.variantHead}>
              <SlidersHorizontal size={14} strokeWidth={2} className={styles.variantIcon} />
              <div>
                <span className={styles.variantEyebrow}>Tùy chọn sản phẩm</span>
              </div>
            </div>

            {selected && selected.stockQuantity <= 5 ? (
              <p className={styles.stockWarn}>Chỉ còn {selected.stockQuantity} sản phẩm trong kho.</p>
            ) : null}

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Màu sắc</h2>
              <div className={styles.radioList} role="radiogroup" aria-label="Màu">
                {colors.map((c) => (
                  <label
                    key={c.label}
                    className={`${styles.radioCard} ${color === c.label ? styles.radioCardOn : ""}`}
                  >
                    <input
                      type="radio"
                      name="pd-color"
                      checked={color === c.label}
                      onChange={() => {
                        setColor(c.label);
                        const next = variants.filter((v) => v.colorLabel === c.label);
                        setSize(next[0]?.sizeLabel ?? "");
                      }}
                    />
                    <span className={styles.radioUi} aria-hidden />
                    <span
                      className={styles.colorDot}
                      style={{ background: c.hex ?? "#c4bdb4" }}
                    />
                    <span className={styles.radioLabel}>{c.label}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Kích thước</h2>
              <div className={styles.radioList} role="radiogroup" aria-label="Kích thước">
                {sizesForColor.map((v) => {
                  const disabled = v.stockQuantity <= 0;
                  return (
                    <label
                      key={v.sizeLabel}
                      className={`${styles.radioCard} ${size === v.sizeLabel ? styles.radioCardOn : ""} ${disabled ? styles.radioCardDisabled : ""
                        }`}
                    >
                      <input
                        type="radio"
                        name="pd-size"
                        checked={size === v.sizeLabel}
                        disabled={disabled}
                        onChange={() => setSize(v.sizeLabel)}
                      />
                      <span className={styles.radioUi} aria-hidden />
                      <span className={styles.radioLabel}>
                        {v.sizeLabel}
                        {disabled ? <span className={styles.badgeSold}>Hết hàng</span> : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          </div>

          <div className={styles.configFooter}>
            <div className={styles.sidebarSummary}>
              <div className={styles.sidebarSummaryText}>
                <span className={styles.sidebarSummaryLabel}>Tổng cộng</span>
                <span className={styles.sidebarSummaryTotal}>
                  {selected ? formatVnd(lineTotal) : "—"}
                </span>
                {selected && quantity > 1 ? (
                  <span className={styles.sidebarSummarySub}>
                    {formatVnd(unitPrice)} × {quantity}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                className={styles.sidebarBuyBtn}
                disabled={!canBuy}
                onClick={buyNow}
              >
                Mua ngay
                <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
              </button>
            </div>
            <div className={styles.footerRow}>
              <span className={styles.qtyLabel}>Số lượng</span>
              <QuantityStepper
                value={quantity}
                min={stockCap < 1 ? 0 : 1}
                max={stockCap < 1 ? 0 : stockCap}
                disabled={!selected || stockCap < 1}
                onChange={(q) => setQuantity(q)}
              />
            </div>
            <div className={styles.ctaRow}>
              <button
                type="button"
                className={styles.ctaLink}
                disabled={!canBuy}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addToCart();
                }}
              >
                Thêm vào giỏ hàng
              </button>
              <Link href="/cart" className={styles.cartLink}>
                Xem giỏ hàng
                <ArrowRight size={16} strokeWidth={2.25} aria-hidden />
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {lightbox && primaryImage ? (
        <button
          type="button"
          className={styles.lightbox}
          aria-label="Đóng"
          onClick={() => setLightbox(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={primaryImage} alt="" className={styles.lightboxImg} decoding="async" fetchPriority="high" />
        </button>
      ) : null}
    </div>
  );
}
