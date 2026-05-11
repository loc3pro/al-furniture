"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Select } from "antd";
import { ChevronDown } from "lucide-react";
import { SELECT_MENU_CHECK } from "@/design-system/select-icons";
import type { ShopNavigationMenuResolved } from "@/lib/shop-navigation-menu";
import { showAdminToast } from "@/lib/admin-toast";
import { stableValueJson } from "@/lib/form-dirty-snapshot";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import styles from "./navigation-menu.module.scss";

type CatProd = { slug: string; name: string };

export function NavigationMenuEditor({
  header,
  initialConfig,
  categoriesWithProducts,
  limits,
}: {
  header: ReactNode;
  initialConfig: ShopNavigationMenuResolved;
  categoriesWithProducts: { slug: string; name: string; products: CatProd[] }[];
  limits: { maxCategories: number; maxProducts: number };
}) {
  const [maxCategoriesShown, setMaxCategoriesShown] = useState(
    initialConfig.maxCategoriesShown,
  );
  const [maxProductsPerCategory, setMaxProductsPerCategory] = useState(
    initialConfig.maxProductsPerCategory,
  );
  const [categorySlugsOrdered, setCategorySlugsOrdered] = useState<string[]>(
    () => {
      const fromCfg = initialConfig.categorySlugsOrdered.filter((s) =>
        categoriesWithProducts.some((c) => c.slug === s),
      );
      const rest = categoriesWithProducts
        .map((c) => c.slug)
        .filter((s) => !fromCfg.includes(s));
      return [...fromCfg, ...rest.sort((a, b) => a.localeCompare(b, "vi"))];
    },
  );
  const [productSlugsByCategory, setProductSlugsByCategory] = useState<
    Record<string, string[]>
  >(() => ({ ...initialConfig.productSlugsByCategory }));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pinPickerTick, setPinPickerTick] = useState<Record<string, number>>({});
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const [baselineSnap, setBaselineSnap] = useState(() =>
    stableValueJson({
      maxCategoriesShown: initialConfig.maxCategoriesShown,
      maxProductsPerCategory: initialConfig.maxProductsPerCategory,
      categorySlugsOrdered: initialConfig.categorySlugsOrdered,
      productSlugsByCategory: initialConfig.productSlugsByCategory,
    }),
  );

  const currentSnap = useMemo(
    () =>
      stableValueJson({
        maxCategoriesShown,
        maxProductsPerCategory,
        categorySlugsOrdered,
        productSlugsByCategory,
      }),
    [maxCategoriesShown, maxProductsPerCategory, categorySlugsOrdered, productSlugsByCategory],
  );
  const isDirty = currentSnap !== baselineSnap;

  const moveCat = useCallback((slug: string, dir: -1 | 1) => {
    setCategorySlugsOrdered((prev) => {
      const i = prev.indexOf(slug);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }, []);

  const movePin = useCallback(
    (catSlug: string, productSlug: string, dir: -1 | 1) => {
      setProductSlugsByCategory((prev) => {
        const list = [...(prev[catSlug] ?? [])];
        const i = list.indexOf(productSlug);
        if (i < 0) return prev;
        const j = i + dir;
        if (j < 0 || j >= list.length) return prev;
        [list[i], list[j]] = [list[j]!, list[i]!];
        return { ...prev, [catSlug]: list };
      });
    },
    [],
  );

  const removePin = useCallback((catSlug: string, productSlug: string) => {
    setProductSlugsByCategory((prev) => {
      const list = (prev[catSlug] ?? []).filter((s) => s !== productSlug);
      const next = { ...prev };
      if (list.length) next[catSlug] = list;
      else delete next[catSlug];
      return next;
    });
  }, []);

  const addPin = useCallback(
    (catSlug: string, productSlug: string) => {
      if (!productSlug) return;
      setProductSlugsByCategory((prev) => {
        const cur = prev[catSlug] ?? [];
        if (cur.includes(productSlug)) return prev;
        const cap = Math.min(maxProductsPerCategory, limits.maxProducts);
        if (cur.length >= cap) return prev;
        return { ...prev, [catSlug]: [...cur, productSlug] };
      });
    },
    [limits.maxProducts, maxProductsPerCategory],
  );

  async function save() {
    if (!isDirty) return;
    setErr(null);
    setOk(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/shop-navigation-menu", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          maxCategoriesShown,
          maxProductsPerCategory,
          categorySlugsOrdered,
          productSlugsByCategory,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!mountedRef.current) return;
      if (!res.ok) {
        setErr(data.error ?? "Không lưu được");
        showAdminToast(data.error ?? "Không lưu được", "error");
        return;
      }
      setBaselineSnap(
        stableValueJson({
          maxCategoriesShown,
          maxProductsPerCategory,
          categorySlugsOrdered,
          productSlugsByCategory,
        }),
      );
      setOk("Đã lưu cấu hình menu.");
      showAdminToast("Đã lưu menu header");
    } catch {
      if (!mountedRef.current) return;
      setErr("Lỗi mạng");
      showAdminToast("Lỗi mạng", "error");
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }

  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader>
          <div className="adminPageHeaderRow">
            <div className="adminPageHeaderMain">{header}</div>
            <div className="adminToolbar adminToolbar--end">
              <button
                type="button"
                className="btn btn--primary adminToolbarBtn"
                disabled={saving || !isDirty}
                title="Lưu cấu hình menu header"
                onClick={() => void save()}
              >
                {saving ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </div>
        </AdminStickyPageHeader>
      }
    >
      <div className={styles.shell}>
        <div className={styles.headerFeedback}>
          {err ? <p className={styles.err}>{err}</p> : null}
          {ok ? <p className={styles.ok}>{ok}</p> : null}
        </div>
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>Giới hạn hiển thị</h2>
          <p className={styles.help}>
            Số danh mục và số ảnh sản phẩm trong mega menu không được vượt quá{" "}
            <strong>{limits.maxCategories}</strong> danh mục và{" "}
            <strong>{limits.maxProducts}</strong> sản phẩm mỗi danh mục — để
            giao diện không tràn.
          </p>
          <div className={styles.row}>
            <label className={styles.field}>
              <span>Số danh mục trên menu (tối đa {limits.maxCategories})</span>
              <input
                type="number"
                min={1}
                max={limits.maxCategories}
                value={maxCategoriesShown}
                onChange={(e) =>
                  setMaxCategoriesShown(
                    Math.min(
                      limits.maxCategories,
                      Math.max(1, parseInt(e.target.value, 10) || 1),
                    ),
                  )
                }
              />
            </label>
            <label className={styles.field}>
              <span>Số sản phẩm / danh mục (tối đa {limits.maxProducts})</span>
              <input
                type="number"
                min={1}
                max={limits.maxProducts}
                value={maxProductsPerCategory}
                onChange={(e) =>
                  setMaxProductsPerCategory(
                    Math.min(
                      limits.maxProducts,
                      Math.max(1, parseInt(e.target.value, 10) || 1),
                    ),
                  )
                }
              />
            </label>
          </div>
        </section>

        <section className={styles.block}>
          <h2 className={styles.blockTitle}>Thứ tự danh mục trong menu</h2>
          <p className={styles.help}>
            Chỉ <strong>{maxCategoriesShown}</strong> danh mục đầu tiên trong
            danh sách bên dưới được hiển thị trên header. Kéo thứ tự bằng nút
            lên / xuống.
          </p>
          <ul className={styles.catList}>
            {categorySlugsOrdered.map((slug, idx) => {
              const cat = categoriesWithProducts.find((c) => c.slug === slug);
              if (!cat) return null;
              const inMenu = idx < maxCategoriesShown;
              return (
                <li key={slug} className={styles.catRow}>
                  <span className={styles.catName}>{cat.name}</span>
                  <span
                    className={
                      inMenu
                        ? styles.badge
                        : `${styles.badge} ${styles.badgeOff}`
                    }
                  >
                    {inMenu ? "Trên menu" : "Ngoài menu"}
                  </span>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      disabled={idx === 0}
                      aria-label="Lên"
                      onClick={() => moveCat(slug, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      disabled={idx >= categorySlugsOrdered.length - 1}
                      aria-label="Xuống"
                      onClick={() => moveCat(slug, 1)}
                    >
                      ↓
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {categorySlugsOrdered.map((slug) => {
            const cat = categoriesWithProducts.find((c) => c.slug === slug);
            if (!cat) return null;
            const pins = productSlugsByCategory[slug] ?? [];
            const available = cat.products.filter(
              (p) => !pins.includes(p.slug),
            );

            return (
              <div key={`pins-${slug}`} className={styles.subBlock}>
                <h3 className={styles.subTitle}>
                  Thứ tự sản phẩm — {cat.name}
                </h3>
                <p className={styles.help}>
                  Tối đa <strong>{maxProductsPerCategory}</strong> sản phẩm hiển
                  thị trong ô preview. Để trống = hệ thống tự chọn (nổi bật,
                  mới).
                </p>
                {pins.length === 0 ? (
                  <p className={styles.help}>
                    Chưa ghim — dùng thứ tự mặc định.
                  </p>
                ) : (
                  <ul className={styles.pinList}>
                    {pins.map((ps, i) => {
                      const p = cat.products.find((x) => x.slug === ps);
                      return (
                        <li key={ps} className={styles.pinRow}>
                          <span className={styles.pinName}>
                            {p?.name ?? ps}
                          </span>
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              disabled={i === 0}
                              aria-label="Lên"
                              onClick={() => movePin(slug, ps, -1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              disabled={i >= pins.length - 1}
                              aria-label="Xuống"
                              onClick={() => movePin(slug, ps, 1)}
                            >
                              ↓
                            </button>
                          </div>
                          <button
                            type="button"
                            className={styles.removeBtn}
                            onClick={() => removePin(slug, ps)}
                          >
                            Gỡ
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {pins.length <
                  Math.min(maxProductsPerCategory, limits.maxProducts) &&
                available.length > 0 ? (
                  <div className={styles.addRow}>
                    <Select<string>
                      key={`${slug}-pin-${pinPickerTick[slug] ?? 0}`}
                      className={styles.addRowSelect}
                      placeholder="+ Thêm sản phẩm vào preview…"
                      allowClear
                      variant="outlined"
                      suffixIcon={<ChevronDown size={16} strokeWidth={2} aria-hidden />}
                      menuItemSelectedIcon={SELECT_MENU_CHECK}
                      popupMatchSelectWidth={false}
                      options={available.map((p) => ({ value: p.slug, label: p.name }))}
                      onChange={(v) => {
                        if (v) {
                          addPin(slug, v);
                          setPinPickerTick((t) => ({ ...t, [slug]: (t[slug] ?? 0) + 1 }));
                        }
                      }}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>
      </div>
    </AdminPageLayout>
  );
}
