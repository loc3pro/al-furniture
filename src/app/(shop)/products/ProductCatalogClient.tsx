"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ProductsCatalogFilters } from "@/lib/products-catalog-params";
import { productsCatalogPath, toggleInList } from "@/lib/products-catalog-params";
import { SEARCH_API_DEBOUNCE_MS } from "@/lib/use-debounced-value";
import { BaseButton } from "@/design-system/components/BaseButton";
import styles from "./products-catalog.module.scss";

const CATEGORY_PREVIEW = 8;

const PRODUCT_CARD_LAYOUT_STORAGE_KEY = "furniture-ecm-products-card-layout";

type ProductCardLayoutMode = "grid" | "list";

export type ProductCatalogClientProps = {
  filters: ProductsCatalogFilters;
  chips: { label: string; href: string }[];
  clearFiltersHref: string;
  categories: { slug: string; name: string; count: number }[];
  colorFacets: { label: string; count: number; hex: string | null }[];
  children: React.ReactNode;
};

export function ProductCatalogClient(props: ProductCatalogClientProps) {
  const { filters, chips, clearFiltersHref, categories, colorFacets, children } = props;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);
  const [cardLayout, setCardLayout] = useState<ProductCardLayoutMode>("grid");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRODUCT_CARD_LAYOUT_STORAGE_KEY);
      if (raw === "list" || raw === "grid") setCardLayout(raw);
    } catch {
      /* ignore */
    }
  }, []);

  const setProductCardLayout = (mode: ProductCardLayoutMode) => {
    setCardLayout(mode);
    try {
      localStorage.setItem(PRODUCT_CARD_LAYOUT_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const layoutToggleButtons = (extraClassName?: string) => (
    <div
      className={[styles.cardLayoutIconGroup, extraClassName].filter(Boolean).join(" ")}
      role="group"
      aria-label="Kiểu hiển thị thẻ sản phẩm"
    >
      <button
        type="button"
        className={styles.layoutIconBtn}
        data-active={cardLayout === "grid" ? "true" : "false"}
        aria-pressed={cardLayout === "grid"}
        aria-label="Thẻ dọc — lưới"
        title="Thẻ dọc"
        onClick={() => setProductCardLayout("grid")}
      >
        <IconLayoutGrid />
      </button>
      <button
        type="button"
        className={styles.layoutIconBtn}
        data-active={cardLayout === "list" ? "true" : "false"}
        aria-pressed={cardLayout === "list"}
        aria-label="Thẻ ngang — danh sách"
        title="Thẻ ngang"
        onClick={() => setProductCardLayout("list")}
      >
        <IconLayoutList />
      </button>
    </div>
  );

  return (
    <>
      <div className={styles.shell}>
        <aside className={styles.sidebar} data-open={drawerOpen ? "true" : "false"} aria-label="Lọc sản phẩm">
          <div className={styles.drawerHeader}>
            <button type="button" className={styles.drawerClose} onClick={closeDrawer} aria-label="Đóng">
              ×
            </button>
          </div>

          <div className={styles.sidebarScroll}>
            <CatalogSidebarSearch filters={filters} />
            <FilterPanel
              filters={filters}
              categories={categories}
              colorFacets={colorFacets}
              onNavigate={closeDrawer}
            />
          </div>
        </aside>

        <div className={styles.main}>
          <div className={styles.mainSticky}>
            <div className={styles.mainHeader}>
              <BaseButton
                htmlType="button"
                variant="default"
                dsSize="md"
                className={styles.filterToggle}
                onClick={() => setDrawerOpen(true)}
                aria-label="Mở bộ lọc"
              >
                Lọc
              </BaseButton>
              {layoutToggleButtons(styles.cardLayoutIconGroupHeader)}
            </div>

            <section className={styles.filterAppliedSection} aria-label="Bộ lọc và hiển thị">
              <div className={styles.filterAppliedInner}>
                {chips.length > 0 ? (
                  <div className={styles.chipsRow}>
                    {chips.map((c) => (
                      <Link key={`${c.href}-${c.label}`} href={c.href} className={styles.chip} onClick={closeDrawer}>
                        {c.label}
                        <span aria-hidden="true"> ×</span>
                      </Link>
                    ))}
                    <Link href={clearFiltersHref} className={`${styles.chip} ${styles.chipClearAll}`} onClick={closeDrawer}>
                      Xóa lọc
                    </Link>
                  </div>
                ) : null}
                {layoutToggleButtons(styles.cardLayoutIconGroupInline)}
              </div>
            </section>
          </div>

          <div className={styles.mainScroll} data-product-cards={cardLayout}>
            {children}
          </div>
        </div>
      </div>

      {drawerOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-hidden={false}
          aria-label="Đóng bộ lọc"
          tabIndex={0}
          onClick={closeDrawer}
        ></button>
      ) : null}
    </>
  );
}

function IconLayoutGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="currentColor"
        d="M1 1h6.5v6.5H1V1zm9.5 0H17v6.5h-6.5V1zM1 10.5h6.5V17H1v-6.5zm9.5 0H17V17h-6.5v-6.5z"
      />
    </svg>
  );
}

function IconLayoutList() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="currentColor"
        d="M1 3.5h16v2H1v-2zm0 4.5h16v2H1V8zm0 4.5h16v2H1v-2z"
      />
    </svg>
  );
}

function CatalogSidebarSearch({ filters }: { filters: ProductsCatalogFilters }) {
  const router = useRouter();
  const [qInput, setQInput] = useState(filters.q);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useLayoutEffect(() => {
    setQInput(filters.q);
  }, [filters.q]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const f = filtersRef.current;
      const qNext = qInput.trim();
      if (qNext === f.q) return;
      router.replace(
        productsCatalogPath({
          q: qNext,
          cats: f.cats,
          colors: f.colors,
          stockOnly: f.stockOnly,
          page: 1,
          pageSize: f.pageSize,
        }),
      );
    }, SEARCH_API_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [qInput, router]);

  return (
    <div className={styles.sidebarSearchSticky}>
      <div className={styles.sidebarSearchForm}>
        <input
          className={styles.sidebarSearchInput}
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Tìm theo tên hoặc mô tả…"
          aria-label="Từ khóa tìm kiếm"
          autoComplete="off"
          type="search"
          enterKeyHint="search"
        />
      </div>
    </div>
  );
}

function FilterPanel({
  filters,
  categories,
  colorFacets,
  onNavigate,
}: {
  filters: ProductsCatalogFilters;
  categories: ProductCatalogClientProps["categories"];
  colorFacets: ProductCatalogClientProps["colorFacets"];
  onNavigate: () => void;
}) {
  const [catExpanded, setCatExpanded] = useState(false);
  const [colorExpanded, setColorExpanded] = useState(false);

  const catShowMore = categories.length > CATEGORY_PREVIEW;
  const visibleCats = catExpanded ? categories : categories.slice(0, CATEGORY_PREVIEW);

  const COLOR_PREVIEW = 10;
  const colorShowMore = colorFacets.length > COLOR_PREVIEW;
  const visibleColors = colorExpanded ? colorFacets : colorFacets.slice(0, COLOR_PREVIEW);

  const clearCatsHref = productsCatalogPath({
    q: filters.q,
    cats: [],
    colors: filters.colors,
    stockOnly: filters.stockOnly,
    page: 1,
    pageSize: filters.pageSize,
  });

  const clearColorsHref = productsCatalogPath({
    q: filters.q,
    cats: filters.cats,
    colors: [],
    stockOnly: filters.stockOnly,
    page: 1,
    pageSize: filters.pageSize,
  });

  const stockHref = productsCatalogPath({
    q: filters.q,
    cats: filters.cats,
    colors: filters.colors,
    stockOnly: !filters.stockOnly,
    page: 1,
    pageSize: filters.pageSize,
  });

  const hasColorSection = colorFacets.length > 0;

  return (
    <>
      {/* Tiêu đề tách khỏi khối list — sticky không bị giới hạn bởi section cao (cuộn hết DM vẫn dính top) */}
      <div className={`${styles.filterBlockSticky} ${styles.filterStickyDanhMuc}`}>
        <div className={styles.filterBlockTitle}>
          <span>Danh mục</span>
          {filters.cats.length > 0 ? (
            <Link href={clearCatsHref} className={styles.filterClear} onClick={onNavigate}>
              Xóa
            </Link>
          ) : null}
        </div>
      </div>
      <div className={styles.filterGroup}>
        <ul className={styles.filterList}>
          {visibleCats.map((c) => {
            const active = filters.cats.includes(c.slug);
            const href = productsCatalogPath({
              q: filters.q,
              cats: toggleInList(filters.cats, c.slug),
              colors: filters.colors,
              stockOnly: filters.stockOnly,
              page: 1,
              pageSize: filters.pageSize,
            });
            return (
              <li key={c.slug} className={styles.filterRow}>
                <Link
                  href={href}
                  className={styles.filterLink}
                  data-active={active ? "true" : "false"}
                  onClick={onNavigate}
                >
                  <span className={styles.checkboxUi} data-on={active ? "true" : "false"}>
                    {active ? "✓" : ""}
                  </span>
                  <span>{c.name}</span>
                  <span className={styles.countBadge}>({c.count})</span>
                </Link>
              </li>
            );
          })}
        </ul>
        {catShowMore ? (
          <button
            type="button"
            className={styles.showMoreBtn}
            onClick={() => setCatExpanded((e) => !e)}
            aria-expanded={catExpanded}
          >
            {catExpanded ? "Thu gọn" : "Xem thêm"}
          </button>
        ) : null}
      </div>

      {hasColorSection ? (
        <>
          <div className={`${styles.filterBlockSticky} ${styles.filterStickyMau}`}>
            <div className={styles.filterBlockTitle}>
              <span>Màu sắc</span>
              {filters.colors.length > 0 ? (
                <Link href={clearColorsHref} className={styles.filterClear} onClick={onNavigate}>
                  Xóa
                </Link>
              ) : null}
            </div>
          </div>
          <div className={styles.filterGroup}>
            <ul className={styles.filterList}>
              {visibleColors.map((cf) => {
                const active = filters.colors.includes(cf.label);
                const href = productsCatalogPath({
                  q: filters.q,
                  cats: filters.cats,
                  colors: toggleInList(filters.colors, cf.label),
                  stockOnly: filters.stockOnly,
                  page: 1,
                  pageSize: filters.pageSize,
                });
                return (
                  <li key={cf.label} className={styles.filterRow}>
                    <Link
                      href={href}
                      className={styles.filterLink}
                      data-active={active ? "true" : "false"}
                      onClick={onNavigate}
                    >
                      <span className={styles.checkboxUi} data-on={active ? "true" : "false"}>
                        {active ? "✓" : ""}
                      </span>
                      <span
                        className={styles.colorSwatch}
                        style={{
                          background: cf.hex && /^#?[0-9a-fA-F]{3,8}$/.test(cf.hex)
                            ? cf.hex.startsWith("#")
                              ? cf.hex
                              : `#${cf.hex}`
                            : "rgba(26,22,18,0.12)",
                        }}
                        aria-hidden
                      />
                      <span>{cf.label}</span>
                      <span className={styles.countBadge}>({cf.count})</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {colorShowMore ? (
              <button
                type="button"
                className={styles.showMoreBtn}
                onClick={() => setColorExpanded((e) => !e)}
                aria-expanded={colorExpanded}
              >
                {colorExpanded ? "Thu gọn" : "Xem thêm"}
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      <div
        className={`${styles.filterBlockSticky} ${hasColorSection ? styles.filterStickyTinhTrang3 : styles.filterStickyTinhTrang2}`}
      >
        <div className={styles.filterBlockTitle}>
          <span>Tình trạng</span>
        </div>
      </div>
      <div className={styles.filterGroup}>
        <ul className={styles.filterList}>
          <li className={styles.filterRow}>
            <Link
              href={stockHref}
              className={styles.filterLink}
              data-active={filters.stockOnly ? "true" : "false"}
              onClick={onNavigate}
            >
              <span className={styles.checkboxUi} data-on={filters.stockOnly ? "true" : "false"}>
                {filters.stockOnly ? "✓" : ""}
              </span>
              <span>Còn hàng</span>
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
}
