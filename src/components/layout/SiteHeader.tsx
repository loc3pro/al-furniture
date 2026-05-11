"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { selectCartCount } from "@/features/cart/cartSlice";
import { cartDistinctLineCount, cartPieceCount } from "@/lib/cart-summary-label";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useShopSession } from "@/components/session/ShopSessionProvider";
import { isSafeThemeAssetUrl } from "@/lib/theme-asset-url";
import { formatVnd } from "@/lib/money";
import { useShopLocale } from "@/lib/shop-locale";
import type { NavMegaCategory } from "@/lib/nav-mega-data";
import { MegaNavProductThumb } from "@/components/layout/MegaNavProductThumb";
import { productsCatalogPath } from "@/lib/products-catalog-params";
import styles from "./SiteHeader.module.scss";

function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.8-.4 1.2-.2 1.1.4 2.3.6 3.6.6.7 0 1.2.5 1.2 1.2V21c0 .7-.5 1.2-1.2 1.2C9.9 22.2 1.8 14.1 1.8 3.5 1.8 2.8 2.3 2.3 3 2.3h3.5c.7 0 1.2.5 1.2 1.2 0 1.3.2 2.5.6 3.6.2.4.1.9-.2 1.2L6.6 10.8z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 12c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconHeart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1 4.5 2.04C13.09 5 14.76 4 16.5 4 19 4 21 6 21 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconBag() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2h8V8h2v12z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C8.01 14 6 11.99 6 9.5S8.01 5 10.5 5 15 7.01 15 9.5 12.99 14 10.5 14z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconMenu({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      {open ? (
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor" />
      ) : (
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" />
      )}
    </svg>
  );
}

type SiteHeaderProps = {
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  /** Chữ khi không có logo — đã resolve mặc định từ theme. */
  brandText?: string;
  /** Chữ theme (trim) để vẽ cạnh logo khi bật tùy chọn theme. */
  brandBesideLogo?: string | null;
  headerShowBrandBesideLogo?: boolean;
  /** Tên cửa hàng cạnh logo (theme). */
  headerStoreName?: string | null;
  /** Danh mục + tối đa 5 SP / danh mục cho mega menu (SSR). */
  navMegaCategories?: NavMegaCategory[];
  /** Hotline — từ ThemeSettings (admin). */
  hotlineLabel?: string;
  hotlinePhoneDisplay?: string;
  hotlineTelHref?: string | null;
  shippingLine1?: string;
  shippingLine2?: string;
};

export function SiteHeader({
  logoUrl = null,
  logoDarkUrl = null,
  brandText = "Furniture ECM",
  brandBesideLogo = null,
  headerShowBrandBesideLogo = false,
  headerStoreName = null,
  navMegaCategories = [],
  hotlineLabel = "Hotline",
  hotlinePhoneDisplay = "0931 799 744",
  hotlineTelHref = "tel:0931799744",
  shippingLine1 = "Miễn phí vận chuyển HCM",
  shippingLine2 = "Hóa đơn trên 2.000.000₫",
}: SiteHeaderProps) {
  const pathname = usePathname();
  const { t } = useShopLocale();
  const { user: me } = useShopSession();
  const cartLines = useAppSelector((s) => s.cart.lines);
  const cartCount = useAppSelector((s) => selectCartCount(s.cart.lines));
  const cartSummaryLabel = useMemo(() => {
    if (cartLines.length === 0) return t("header.cartEmpty");
    return t("header.cartSummary", {
      lines: String(cartDistinctLineCount(cartLines)),
      pieces: String(cartPieceCount(cartLines)),
    });
  }, [cartLines, t]);
  const [wishCount, setWishCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [productsMegaOpen, setProductsMegaOpen] = useState(false);
  /** Hover card SP trong mega menu — luân phiên ảnh khi có nhiều URL. */
  const [megaCardHoverSlug, setMegaCardHoverSlug] = useState<string | null>(null);
  const productsMegaLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearProductsMegaTimer = useCallback(() => {
    if (productsMegaLeaveTimer.current) {
      clearTimeout(productsMegaLeaveTimer.current);
      productsMegaLeaveTimer.current = null;
    }
  }, []);

  const closeMegas = useCallback(() => {
    clearProductsMegaTimer();
    setProductsMegaOpen(false);
  }, [clearProductsMegaTimer]);

  const onProductsMegaEnter = useCallback(() => {
    clearProductsMegaTimer();
    setProductsMegaOpen(true);
  }, [clearProductsMegaTimer]);

  const onProductsMegaLeave = useCallback(() => {
    clearProductsMegaTimer();
    productsMegaLeaveTimer.current = setTimeout(() => setProductsMegaOpen(false), 140);
  }, [clearProductsMegaTimer]);

  useEffect(() => {
    return () => {
      clearProductsMegaTimer();
    };
  }, [clearProductsMegaTimer]);

  useEffect(() => {
    if (!productsMegaOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMegas();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [productsMegaOpen, closeMegas]);

  useEffect(() => {
    if (!productsMegaOpen) setMegaCardHoverSlug(null);
  }, [productsMegaOpen]);

  const [activeMegaSlug, setActiveMegaSlug] = useState<string>("");

  const activeMegaCategory = useMemo(
    () =>
      navMegaCategories.find((c) => c.slug === activeMegaSlug) ??
      navMegaCategories[0] ??
      null,
    [navMegaCategories, activeMegaSlug],
  );

  useEffect(() => {
    if (navMegaCategories.length === 0) {
      setActiveMegaSlug("");
      return;
    }
    setActiveMegaSlug((prev) =>
      prev && navMegaCategories.some((c) => c.slug === prev)
        ? prev
        : navMegaCategories[0]!.slug,
    );
  }, [navMegaCategories]);

  useEffect(() => {
    function refreshWishCount(next?: number) {
      if (typeof next === "number") {
        setWishCount(next);
        return;
      }
      if (!me?.id) {
        setWishCount(0);
        return;
      }
      fetch("/api/wishlist/count")
        .then((r) => r.json())
        .then((d) => setWishCount(typeof d.count === "number" ? d.count : 0))
        .catch(() => setWishCount(0));
    }
    refreshWishCount();
    const onWishlistUpdated = (e: Event) => {
      const ce = e as CustomEvent<{ count?: number }>;
      refreshWishCount(ce.detail?.count);
    };
    window.addEventListener("furniture_wishlist_updated", onWishlistUpdated);
    return () => window.removeEventListener("furniture_wishlist_updated", onWishlistUpdated);
  }, [me?.id]);

  useEffect(() => {
    setMenuOpen(false);
    closeMegas();
  }, [pathname, closeMegas]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (pathname?.startsWith("/admin")) return null;

  /** Chỉ logo sáng — nền header cửa hàng thường sáng (`headerBg`). logoDarkUrl giữ cho tương lai / theme tối. */
  const brandLogo = logoUrl && isSafeThemeAssetUrl(logoUrl) ? logoUrl.trim() : null;
  const besideWord = (brandBesideLogo ?? "").trim();
  const logoWithBesideText = Boolean(
    brandLogo && headerShowBrandBesideLogo && besideWord.length > 0,
  );
  const logoImgOnly = Boolean(brandLogo && !logoWithBesideText);

  return (
    <header className={styles.shell}>
      <div className={styles.topBar}>
        <div className={`container ${styles.topInner}`}>
          <div className={styles.brandCluster}>
            <button
              type="button"
              className={styles.menuBtn}
              aria-expanded={menuOpen}
              aria-controls="site-nav-drawer"
              aria-label={menuOpen ? t("header.menuClose") : t("header.menuOpen")}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <IconMenu open={menuOpen} />
            </button>

            <Link
              href="/"
              className={`${styles.logo} ${styles.logoBar} ${logoWithBesideText ? styles.logoWithBeside : ""} ${logoImgOnly ? styles.logoHasImg : ""}`}
              aria-label={t("header.homeAria")}
            >
              {brandLogo ? (
                logoWithBesideText ? (
                  <span className={styles.logoMark}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- theme URL from DB */}
                    <img src={brandLogo} alt="" className={styles.logoImg} />
                    <span className={styles.logoWordmark}>{besideWord}</span>
                  </span>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- theme URL from DB */}
                    <img src={brandLogo} alt="" className={styles.logoImg} />
                  </>
                )
              ) : (
                brandText
              )}
            </Link>
            {headerStoreName ? (
              <span className={styles.headerStoreName}>{headerStoreName}</span>
            ) : null}
          </div>

          <form className={styles.search} action="/products" method="get" role="search">
            <input
              type="search"
              name="q"
              placeholder={t("header.searchPlaceholder")}
              autoComplete="off"
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchBtn} aria-label={t("header.searchSubmitAria")}>
              <IconSearch />
            </button>
          </form>

          <div className={styles.utils}>
            {hotlineTelHref ? (
              <a href={hotlineTelHref} className={styles.hotline}>
                <IconPhone />
                <span className={styles.hotlineText}>
                  <small>{hotlineLabel}</small>
                  <strong>{hotlinePhoneDisplay}</strong>
                </span>
              </a>
            ) : (
              <span className={styles.hotline}>
                <IconPhone />
                <span className={styles.hotlineText}>
                  <small>{hotlineLabel}</small>
                  <strong>{hotlinePhoneDisplay}</strong>
                </span>
              </span>
            )}

            <div className={styles.iconRow}>
              {me ? (
                <Link
                  href="/account"
                  className={styles.iconLink}
                  title={t("header.accountTitle")}
                  aria-label={t("header.accountAria")}
                >
                  <IconUser />
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className={styles.iconLink}
                  title={t("header.loginTitle")}
                  aria-label={t("header.loginAria")}
                >
                  <IconUser />
                </Link>
              )}

              <Link
                href="/wishlist"
                className={styles.iconLink}
                title={
                  wishCount > 0
                    ? t("header.wishlistTitleWithCount", { count: String(wishCount) })
                    : t("header.wishlistTitle")
                }
              >
                <IconHeart />
                <span className={styles.badge}>{wishCount}</span>
              </Link>

              <Link
                href="/cart"
                className={styles.iconLink}
                title={cartSummaryLabel}
                aria-label={cartSummaryLabel}
              >
                <IconBag />
                <span className={styles.badge}>{cartCount}</span>
              </Link>

              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.subBar}>
        <div className={`container ${styles.subInner}`}>
          <nav className={styles.mainNav} aria-label={t("header.navAria")}>
            <Link href="/">{t("header.navHome")}</Link>

            <div
              className={styles.navItemMega}
              onMouseEnter={onProductsMegaEnter}
              onMouseLeave={onProductsMegaLeave}
            >
              <Link
                href="/products"
                className={styles.navMegaTriggerBtn}
                onClick={closeMegas}
                aria-haspopup="true"
                aria-expanded={productsMegaOpen}
              >
                {t("header.navProducts")}
                <ChevronDown className={styles.navChevron} size={15} strokeWidth={2.25} aria-hidden />
              </Link>
              <div
                className={`${styles.megaDropdown} ${productsMegaOpen ? styles.megaDropdownOpen : ""}`}
                role="region"
                aria-label={t("header.megaAria")}
              >
                <div className={`${styles.megaDropdownInner} ${styles.megaDropdownProducts}`}>
                  <div className={styles.megaPanelTop}>
                    <Link href="/products" className={styles.megaTopLink} onClick={closeMegas}>
                      {t("header.navAllProducts")}
                    </Link>
                  </div>
                  {navMegaCategories.length === 0 ? (
                    <p className={styles.megaEmpty}>{t("header.megaEmpty")}</p>
                  ) : (
                    <div className={styles.megaSplit}>
                      <div className={styles.megaCatCol}>
                        {navMegaCategories.map((cat) => (
                          <button
                            key={cat.slug}
                            type="button"
                            className={
                              activeMegaCategory?.slug === cat.slug
                                ? `${styles.megaCatBtn} ${styles.megaCatBtnActive}`
                                : styles.megaCatBtn
                            }
                            aria-current={activeMegaCategory?.slug === cat.slug ? "true" : undefined}
                            onClick={() => setActiveMegaSlug(cat.slug)}
                            onMouseEnter={() => setActiveMegaSlug(cat.slug)}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                      <div className={styles.megaProductCol}>
                        {activeMegaCategory && activeMegaCategory.products.length === 0 ? (
                          <p className={styles.megaEmptyProducts}>{t("header.megaEmptyProducts")}</p>
                        ) : (
                          <div className={styles.megaProductGrid}>
                            {activeMegaCategory?.products.map((p) => (
                              <Link
                                key={p.slug}
                                href={`/products/${p.slug}`}
                                className={styles.megaProductCard}
                                onClick={closeMegas}
                                onMouseEnter={() => setMegaCardHoverSlug(p.slug)}
                                onMouseLeave={() => setMegaCardHoverSlug(null)}
                              >
                                <div className={styles.megaProductImgWrap}>
                                  <MegaNavProductThumb
                                    cycleActive={megaCardHoverSlug === p.slug}
                                    urls={
                                      p.galleryUrls.length > 0
                                        ? p.galleryUrls
                                        : p.imageUrl
                                          ? [p.imageUrl]
                                          : []
                                    }
                                  />
                                  {p.discountBadgePercent > 0 ? (
                                    <span className={styles.megaBadge}>-{p.discountBadgePercent}%</span>
                                  ) : null}
                                </div>
                                <div className={styles.megaProductMeta}>
                                  <span className={styles.megaProductName}>{p.name}</span>
                                  <span className={styles.megaProductPrice}>
                                    {formatVnd(p.salePrice)}
                                    {p.originalPrice != null && p.originalPrice > p.salePrice ? (
                                      <span className={styles.megaProductWas}>{formatVnd(p.originalPrice)}</span>
                                    ) : null}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Link href="/shop-the-look">{t("header.shopTheLook")}</Link>

            <Link href={productsCatalogPath({ q: "combo" })}>{t("header.comboSavings")}</Link>
            <Link href={productsCatalogPath({ q: "khuyến mãi" })}>{t("header.specialPrices")}</Link>
            <Link href="/blog">{t("header.blog")}</Link>
            <Link href="/showroom">{t("header.showroom")}</Link>
          </nav>
          <p className={styles.promo}>
            <span className={styles.promoLine}>{shippingLine1}</span>
            <span className={styles.promoSub}>{shippingLine2}</span>
          </p>
        </div>
      </div>

      {menuOpen ? (
        <div className={styles.drawerBackdrop} role="presentation" onClick={() => setMenuOpen(false)} />
      ) : null}

      <div
        id="site-nav-drawer"
        className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ""}`}
        aria-hidden={!menuOpen}
      >
        <div className={styles.drawerHead}>
          <span className={styles.drawerTitle}>{t("header.drawerTitle")}</span>
          <button
            type="button"
            className={styles.drawerClose}
            aria-label={t("header.drawerCloseAria")}
            onClick={() => setMenuOpen(false)}
          >
            <IconMenu open />
          </button>
        </div>
        <div className={styles.drawerBrand}>
          <Link
            href="/"
            className={`${styles.logo} ${styles.drawerLogoLink} ${logoWithBesideText ? styles.logoWithBeside : ""} ${logoImgOnly ? styles.logoHasImg : ""}`}
            aria-label={t("header.homeAria")}
            onClick={() => setMenuOpen(false)}
          >
            {brandLogo ? (
              logoWithBesideText ? (
                <span className={styles.logoMark}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- theme URL from DB */}
                  <img src={brandLogo} alt="" className={`${styles.logoImg} ${styles.drawerLogoImg}`} />
                  <span className={`${styles.logoWordmark} ${styles.drawerWordmark}`}>{besideWord}</span>
                </span>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- theme URL from DB */}
                  <img src={brandLogo} alt="" className={`${styles.logoImg} ${styles.drawerLogoImg}`} />
                </>
              )
            ) : (
              brandText
            )}
          </Link>
        </div>
        <nav className={styles.drawerNav} aria-label={t("header.drawerNavAria")}>
          <Link href="/" onClick={() => setMenuOpen(false)}>
            {t("header.navHome")}
          </Link>
          <Link href="/products" onClick={() => setMenuOpen(false)}>
            {t("header.navAllProducts")}
          </Link>
          {navMegaCategories.map((cat) => (
            <details key={cat.slug} className={styles.drawerDetails}>
              <summary>{cat.name}</summary>
              <ul className={styles.drawerSubList}>
                {cat.products.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/products/${p.slug}`} onClick={() => setMenuOpen(false)}>
                      {p.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href={productsCatalogPath({ cats: [cat.slug], page: 1 })}
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("header.viewAllCategory", { name: cat.name })}
                  </Link>
                </li>
              </ul>
            </details>
          ))}
          <Link href="/shop-the-look" onClick={() => setMenuOpen(false)}>
            {t("header.shopTheLook")}
          </Link>
          <Link href={productsCatalogPath({ q: "combo" })} onClick={() => setMenuOpen(false)}>
            {t("header.comboSavings")}
          </Link>
          <Link href={productsCatalogPath({ q: "khuyến mãi" })} onClick={() => setMenuOpen(false)}>
            {t("header.specialPrices")}
          </Link>
          <Link href="/blog" onClick={() => setMenuOpen(false)}>
            {t("header.blog")}
          </Link>
          <Link href="/showroom" onClick={() => setMenuOpen(false)}>
            {t("header.showroom")}
          </Link>
        </nav>
        <div className={styles.drawerAccount}>
          {me ? (
            <>
              <Link className={styles.drawerAccountLink} href="/account" onClick={() => setMenuOpen(false)}>
                {t("header.accountLink")}
              </Link>
              <LogoutButton className={styles.drawerLogout} unstyled redirectTo="/">
                {t("header.logout")}
              </LogoutButton>
            </>
          ) : (
            <Link className={styles.drawerLogin} href="/auth/login" onClick={() => setMenuOpen(false)}>
              {t("header.login")}
            </Link>
          )}
        </div>
        <p className={styles.drawerPromo}>
          <span>{shippingLine1}</span>
          <span aria-hidden> · </span>
          <span>{shippingLine2}</span>
        </p>
        {hotlineTelHref ? (
          <a href={hotlineTelHref} className={styles.drawerHotline}>
            <IconPhone />
            <span>
              {hotlineLabel} · {hotlinePhoneDisplay}
            </span>
          </a>
        ) : (
          <span className={styles.drawerHotline}>
            <IconPhone />
            <span>
              {hotlineLabel} · {hotlinePhoneDisplay}
            </span>
          </span>
        )}
      </div>
    </header>
  );
}
