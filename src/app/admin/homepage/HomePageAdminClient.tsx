"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { showAdminToast } from "@/lib/admin-toast";
import { SectionLoading } from "@/components/ui/SectionLoading";
import { Spinner } from "@/components/ui/Spinner";
import { stableValueJson } from "@/lib/form-dirty-snapshot";
import { useDebouncedValue, SEARCH_API_DEBOUNCE_MS } from "@/lib/use-debounced-value";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import type { HomeSectionBlockId } from "@/lib/homepage-section-order";
import { homeSectionBlockLabelVi, normalizeHomeSectionBlockOrder } from "@/lib/homepage-section-order";
import styles from "./homepage-admin.module.scss";

type ProductMini = { id: string; nameVi: string; slug: string };
type PostMini = { id: string; title: string; slug: string };
type ShopLookMini = { id: string; title: string; slug: string };

type ConfigState = {
  featuredTitle: string;
  featuredProductsMode: "AUTO" | "CUSTOM";
  featuredSectionEnabled: boolean;
  featuredProductIds: string[];
  newSectionTitle: string;
  newProductsMode: "AUTO" | "CUSTOM";
  newSectionEnabled: boolean;
  newProductIds: string[];
  newProductsLimit: number;
  livingSectionTitle: string;
  livingProductsMode: "AUTO" | "CUSTOM";
  livingSectionEnabled: boolean;
  livingProductIds: string[];
  livingLimit: number;
  newsSectionTitle: string;
  newsMode: "AUTO" | "CUSTOM";
  newsSectionEnabled: boolean;
  newsPostIds: string[];
  newsLimit: number;
  shopLookSectionEnabled: boolean;
  shopLookTitle: string;
  shopLookSubtitle: string;
  shopLookMode: "AUTO" | "CUSTOM";
  shopLookCardLimit: number;
  shopLookOrderIds: string[];
  sectionBlockOrder: HomeSectionBlockId[];
};

type Resolved = {
  featuredProducts: ProductMini[];
  newProducts: ProductMini[];
  livingProducts: ProductMini[];
  newsPosts: PostMini[];
  shopLookLooks: ShopLookMini[];
};

type Picker = "featured" | "new" | "living" | "blog" | "shopLook" | null;

export function HomePageAdminClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [c, setC] = useState<ConfigState | null>(null);
  const [r, setR] = useState<Resolved | null>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const [shopLookCatalog, setShopLookCatalog] = useState<ShopLookMini[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, SEARCH_API_DEBOUNCE_MS);
  const [searchHit, setSearchHit] = useState<(ProductMini & { category?: { nameVi: string; nameEn: string } })[]>(
    [],
  );
  const [blogHit, setBlogHit] = useState<PostMini[]>([]);
  const savedConfigJsonRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch("/api/admin/homepage", { credentials: "same-origin" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr("Không tải được cấu hình");
      setWarn(null);
      setLoading(false);
      return;
    }
    setWarn(typeof data.warning === "string" ? data.warning : null);
    const cfg = data.config as ConfigState;
    cfg.sectionBlockOrder = normalizeHomeSectionBlockOrder(cfg.sectionBlockOrder);
    setC(cfg);
    setR(data.resolved);
    savedConfigJsonRef.current = stableValueJson(cfg);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (picker) {
      setSearch("");
      setSearchHit([]);
      setBlogHit([]);
    }
  }, [picker]);

  useEffect(() => {
    if (picker !== "shopLook") return;
    let cancelled = false;
    void fetch("/api/admin/shop-the-look", { credentials: "same-origin" })
      .then((x) => x.json())
      .then((d) => {
        if (cancelled) return;
        if (Array.isArray(d.looks)) {
          setShopLookCatalog(
            (d.looks as { id: string; title: string; slug: string }[]).map((l) => ({
              id: l.id,
              title: l.title,
              slug: l.slug,
            })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setShopLookCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, [picker]);

  useEffect(() => {
    if (picker !== "featured" && picker !== "new" && picker !== "living") return;
    let cancelled = false;
    void fetch(`/api/admin/catalog/products?q=${encodeURIComponent(debouncedSearch)}`, {
      credentials: "same-origin",
    })
      .then((x) => x.json())
      .then((d) => {
        if (cancelled) return;
        if (Array.isArray(d.products)) setSearchHit(d.products);
      })
      .catch(() => {
        if (!cancelled) setSearchHit([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, picker]);

  useEffect(() => {
    if (picker !== "blog") return;
    let cancelled = false;
    void fetch(`/api/admin/catalog/blog-posts?q=${encodeURIComponent(debouncedSearch)}`, {
      credentials: "same-origin",
    })
      .then((x) => x.json())
      .then((d) => {
        if (cancelled) return;
        if (Array.isArray(d.posts)) setBlogHit(d.posts);
      })
      .catch(() => {
        if (!cancelled) setBlogHit([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, picker]);

  async function save() {
    if (!c) return;
    setSaving(true);
    setErr(null);
    const res = await fetch("/api/admin/homepage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(c),
    });
    if (!res.ok) {
      setErr("Lưu thất bại");
      showAdminToast("Lưu thất bại", "error");
      setSaving(false);
      return;
    }
    showAdminToast("Đã lưu trang chủ");
    await load();
    setSaving(false);
  }

  function move(
    key: "featuredProductIds" | "newProductIds" | "livingProductIds" | "newsPostIds",
    resKey: keyof Resolved,
    index: number,
    dir: -1 | 1,
  ) {
    if (!c || !r) return;
    const ids = [...c[key]];
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    if (resKey === "newsPosts") {
      const n = [...r.newsPosts];
      [n[index], n[j]] = [n[j], n[index]];
      setR({ ...r, newsPosts: n });
    } else {
      const p = [...(r[resKey] as ProductMini[])];
      [p[index], p[j]] = [p[j], p[index]];
      setR({ ...r, [resKey]: p } as Resolved);
    }
    setC({ ...c, [key]: ids });
  }

  function remove(
    key: "featuredProductIds" | "newProductIds" | "livingProductIds" | "newsPostIds",
    resKey: keyof Resolved,
    index: number,
  ) {
    if (!c || !r) return;
    const ids = c[key].filter((_, i) => i !== index);
    setC({ ...c, [key]: ids });
    if (resKey === "newsPosts") {
      setR({ ...r, newsPosts: r.newsPosts.filter((_, i) => i !== index) });
    } else {
      setR({ ...r, [resKey]: (r[resKey] as ProductMini[]).filter((_, i) => i !== index) } as Resolved);
    }
  }

  function addProduct(target: "featured" | "new" | "living", p: ProductMini) {
    if (!c || !r) return;
    if (target === "featured") {
      if (c.featuredProductIds.includes(p.id)) return;
      setC({ ...c, featuredProductIds: [...c.featuredProductIds, p.id] });
      setR({ ...r, featuredProducts: [...r.featuredProducts, p] });
    } else if (target === "new") {
      if (c.newProductIds.includes(p.id)) return;
      setC({ ...c, newProductIds: [...c.newProductIds, p.id] });
      setR({ ...r, newProducts: [...r.newProducts, p] });
    } else {
      if (c.livingProductIds.includes(p.id)) return;
      setC({ ...c, livingProductIds: [...c.livingProductIds, p.id] });
      setR({ ...r, livingProducts: [...r.livingProducts, p] });
    }
    setPicker(null);
    setSearch("");
  }

  function addBlog(po: PostMini) {
    if (!c || !r) return;
    if (c.newsPostIds.includes(po.id)) return;
    setC({ ...c, newsPostIds: [...c.newsPostIds, po.id] });
    setR({ ...r, newsPosts: [...r.newsPosts, po] });
    setPicker(null);
    setSearch("");
  }

  function addShopLookLook(look: ShopLookMini) {
    if (!c || !r) return;
    if (c.shopLookOrderIds.includes(look.id)) return;
    setC({ ...c, shopLookOrderIds: [...c.shopLookOrderIds, look.id] });
    setR({ ...r, shopLookLooks: [...r.shopLookLooks, look] });
    setPicker(null);
    setSearch("");
  }

  function moveShopLook(index: number, dir: -1 | 1) {
    if (!c || !r) return;
    const ids = [...c.shopLookOrderIds];
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    const items = [...r.shopLookLooks];
    [items[index], items[j]] = [items[j], items[index]];
    setC({ ...c, shopLookOrderIds: ids });
    setR({ ...r, shopLookLooks: items });
  }

  function removeShopLook(index: number) {
    if (!c || !r) return;
    setC({ ...c, shopLookOrderIds: c.shopLookOrderIds.filter((_, i) => i !== index) });
    setR({ ...r, shopLookLooks: r.shopLookLooks.filter((_, i) => i !== index) });
  }

  function moveSectionBlockOrder(index: number, dir: -1 | 1) {
    if (!c) return;
    const order = [...c.sectionBlockOrder];
    const j = index + dir;
    if (j < 0 || j >= order.length) return;
    [order[index], order[j]] = [order[j], order[index]];
    setC({ ...c, sectionBlockOrder: order });
  }

  if (loading || !c || !r) {
    return <SectionLoading fill label="Đang tải" />;
  }

  function ChipListProduct({
    items,
    idsKey,
    resKey,
    label,
  }: {
    items: ProductMini[];
    idsKey: "featuredProductIds" | "newProductIds" | "livingProductIds";
    resKey: keyof Resolved;
    label: string;
  }) {
    return (
      <div className={styles.chips}>
        {items.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Chưa chọn — {label}
          </p>
        ) : (
          items.map((p, i) => (
            <div key={p.id} className={styles.chip}>
              <span title={p.nameVi}>
                {i + 1}. {p.nameVi}
              </span>
              <div className={styles.chipActions}>
                {i > 0 ? (
                  <button type="button" className={styles.iconBtn} onClick={() => move(idsKey, resKey, i, -1)} aria-label="Lên">
                    ↑
                  </button>
                ) : null}
                {i < items.length - 1 ? (
                  <button type="button" className={styles.iconBtn} onClick={() => move(idsKey, resKey, i, 1)} aria-label="Xuống">
                    ↓
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.danger}`}
                  onClick={() => remove(idsKey, resKey, i)}
                  aria-label="Xóa"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  function ChipListBlog({ items }: { items: PostMini[] }) {
    return (
      <div className={styles.chips}>
        {items.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Chưa chọn bài viết
          </p>
        ) : (
          items.map((p, i) => (
            <div key={p.id} className={styles.chip}>
              <span title={p.title}>
                {i + 1}. {p.title}
              </span>
              <div className={styles.chipActions}>
                {i > 0 ? (
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => move("newsPostIds", "newsPosts", i, -1)}
                    aria-label="Lên"
                  >
                    ↑
                  </button>
                ) : null}
                {i < items.length - 1 ? (
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => move("newsPostIds", "newsPosts", i, 1)}
                    aria-label="Xuống"
                  >
                    ↓
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.danger}`}
                  onClick={() => remove("newsPostIds", "newsPosts", i)}
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  function ChipListShopLook({ items }: { items: ShopLookMini[] }) {
    return (
      <div className={styles.chips}>
        {items.length === 0 ? (
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Chưa chọn bài Shop the Look
          </p>
        ) : (
          items.map((p, i) => (
            <div key={p.id} className={styles.chip}>
              <span title={p.title}>
                {i + 1}. {p.title}
              </span>
              <div className={styles.chipActions}>
                {i > 0 ? (
                  <button type="button" className={styles.iconBtn} onClick={() => moveShopLook(i, -1)} aria-label="Lên">
                    ↑
                  </button>
                ) : null}
                {i < items.length - 1 ? (
                  <button type="button" className={styles.iconBtn} onClick={() => moveShopLook(i, 1)} aria-label="Xuống">
                    ↓
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.danger}`}
                  onClick={() => removeShopLook(i)}
                  aria-label="Xóa"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  const homepageConfigDirty =
    !loading &&
    c != null &&
    savedConfigJsonRef.current != null &&
    stableValueJson(c) !== savedConfigJsonRef.current;

  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader>
          <div className={`adminPageHeaderRow ${styles.topBar}`}>
            <div className="adminPageHeaderMain">
              <h1 className={styles.pageTitle}>Trang chủ</h1>
            </div>
            <div className={`adminToolbar adminToolbar--end ${styles.topBarRight}`}>
              {err ? <p className={styles.err}>{err}</p> : null}
              <button
                type="button"
                className="btn btn--primary adminToolbarBtn"
                disabled={saving || loading || !c || !homepageConfigDirty}
                title="Lưu toàn bộ cấu hình trang chủ"
                onClick={() => void save()}
              >
                {saving ? <Spinner size="sm" inheritColor label="Đang lưu" /> : "Lưu"}
              </button>
            </div>
          </div>
        </AdminStickyPageHeader>
      }
    >
      {warn ? <p className={styles.warn}>{warn}</p> : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Thứ tự khối trên cửa hàng</h2>
        </div>
        <p className={styles.sectionOrderHint}>
          Các section hiển thị dưới banner (carousel). Bấm Lưu phía trên để áp dụng lên website.
        </p>
        <ol className={styles.sectionOrderList}>
          {c.sectionBlockOrder.map((id, i) => (
            <li key={id} className={styles.sectionOrderRow}>
              <span className={styles.sectionOrderLabel}>{homeSectionBlockLabelVi(id)}</span>
              <span className={styles.sectionOrderCode}>{id}</span>
              <div className={styles.sectionOrderBtns}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  disabled={i === 0}
                  onClick={() => moveSectionBlockOrder(i, -1)}
                  aria-label="Đưa lên"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  disabled={i >= c.sectionBlockOrder.length - 1}
                  onClick={() => moveSectionBlockOrder(i, 1)}
                  aria-label="Đưa xuống"
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Bộ sưu tập nổi bật</h2>
          <div className={styles.sectionHeadActions}>
            <label className={styles.sectionHeadSwitch}>
              <span className={styles.switchHint}>Tùy chọn</span>
              <span className={styles.toggleTrack}>
                <input
                  type="checkbox"
                  role="switch"
                  className={styles.toggleInput}
                  checked={c.featuredProductsMode === "CUSTOM"}
                  onChange={(e) =>
                    setC({ ...c, featuredProductsMode: e.target.checked ? "CUSTOM" : "AUTO" })
                  }
                  aria-checked={c.featuredProductsMode === "CUSTOM"}
                />
                <span className={styles.toggleKnob} aria-hidden />
              </span>
            </label>
            <label className={styles.sectionHeadSwitch}>
              <span className={styles.switchHint}>Hiển thị</span>
              <span className={styles.toggleTrack}>
                <input
                  type="checkbox"
                  role="switch"
                  className={styles.toggleInput}
                  checked={c.featuredSectionEnabled}
                  onChange={(e) => setC({ ...c, featuredSectionEnabled: e.target.checked })}
                  aria-checked={c.featuredSectionEnabled}
                />
                <span className={styles.toggleKnob} aria-hidden />
              </span>
            </label>
          </div>
        </div>
        <label className={styles.field}>
          <span>Tiêu đề section</span>
          <input
            type="text"
            value={c.featuredTitle}
            onChange={(e) => setC({ ...c, featuredTitle: e.target.value })}
          />
        </label>
        {c.featuredProductsMode === "CUSTOM" ? (
          <>
            <ChipListProduct
              items={r.featuredProducts}
              idsKey="featuredProductIds"
              resKey="featuredProducts"
              label="bật Tự động để dùng cờ nổi bật"
            />
            <div className={styles.toolbar}>
              <button type="button" className="btn btn--primary" onClick={() => setPicker("featured")}>
                + Chọn sản phẩm
              </button>
            </div>
          </>
        ) : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Sản phẩm mới</h2>
          <div className={styles.sectionHeadActions}>
            <label className={styles.sectionHeadSwitch}>
              <span className={styles.switchHint}>Tùy chọn</span>
              <span className={styles.toggleTrack}>
                <input
                  type="checkbox"
                  role="switch"
                  className={styles.toggleInput}
                  checked={c.newProductsMode === "CUSTOM"}
                  onChange={(e) =>
                    setC({ ...c, newProductsMode: e.target.checked ? "CUSTOM" : "AUTO" })
                  }
                  aria-checked={c.newProductsMode === "CUSTOM"}
                />
                <span className={styles.toggleKnob} aria-hidden />
              </span>
            </label>
            <label className={styles.sectionHeadSwitch}>
              <span className={styles.switchHint}>Hiển thị</span>
              <span className={styles.toggleTrack}>
                <input
                  type="checkbox"
                  role="switch"
                  className={styles.toggleInput}
                  checked={c.newSectionEnabled}
                  onChange={(e) => setC({ ...c, newSectionEnabled: e.target.checked })}
                  aria-checked={c.newSectionEnabled}
                />
                <span className={styles.toggleKnob} aria-hidden />
              </span>
            </label>
          </div>
        </div>
        <label className={styles.field}>
          <span>Tiêu đề section</span>
          <input
            type="text"
            value={c.newSectionTitle}
            onChange={(e) => setC({ ...c, newSectionTitle: e.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span>Số sản phẩm hiển thị</span>
          <input
            type="number"
            min={1}
            max={48}
            value={c.newProductsLimit}
            onChange={(e) => setC({ ...c, newProductsLimit: Number(e.target.value) || 12 })}
          />
        </label>
        {c.newProductsMode === "CUSTOM" ? (
          <>
            <ChipListProduct
              items={r.newProducts}
              idsKey="newProductIds"
              resKey="newProducts"
              label="bật AUTO để lấy theo ngày"
            />
            <div className={styles.toolbar}>
              <button type="button" className="btn btn--primary" onClick={() => setPicker("new")}>
                + Chọn sản phẩm
              </button>
            </div>
          </>
        ) : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Sản phẩm nổi bật</h2>
          <div className={styles.sectionHeadActions}>
            <label className={styles.sectionHeadSwitch}>
              <span className={styles.switchHint}>Tùy chọn</span>
              <span className={styles.toggleTrack}>
                <input
                  type="checkbox"
                  role="switch"
                  className={styles.toggleInput}
                  checked={c.livingProductsMode === "CUSTOM"}
                  onChange={(e) =>
                    setC({ ...c, livingProductsMode: e.target.checked ? "CUSTOM" : "AUTO" })
                  }
                  aria-checked={c.livingProductsMode === "CUSTOM"}
                />
                <span className={styles.toggleKnob} aria-hidden />
              </span>
            </label>
            <label className={styles.sectionHeadSwitch}>
              <span className={styles.switchHint}>Hiển thị</span>
              <span className={styles.toggleTrack}>
                <input
                  type="checkbox"
                  role="switch"
                  className={styles.toggleInput}
                  checked={c.livingSectionEnabled}
                  onChange={(e) => setC({ ...c, livingSectionEnabled: e.target.checked })}
                  aria-checked={c.livingSectionEnabled}
                />
                <span className={styles.toggleKnob} aria-hidden />
              </span>
            </label>
          </div>
        </div>
        <label className={styles.field}>
          <span>Tiêu đề section</span>
          <input
            type="text"
            value={c.livingSectionTitle}
            onChange={(e) => setC({ ...c, livingSectionTitle: e.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span>Số sản phẩm</span>
          <input
            type="number"
            min={1}
            max={48}
            value={c.livingLimit}
            onChange={(e) => setC({ ...c, livingLimit: Number(e.target.value) || 8 })}
          />
        </label>
        {c.livingProductsMode === "CUSTOM" ? (
          <>
            <p className={styles.hint}>
              Danh sách tay: đúng thứ tự. Để trống danh sách khi đang Tùy chọn thì trang chủ vẫn fallback danh mục như khi
              Tự động.
            </p>
            <ChipListProduct
              items={r.livingProducts}
              idsKey="livingProductIds"
              resKey="livingProducts"
              label="thêm SP hoặc tắt Tùy chọn để chỉ dùng danh mục"
            />
            <div className={styles.toolbar}>
              <button type="button" className="btn btn--primary" onClick={() => setPicker("living")}>
                + Chọn sản phẩm
              </button>
            </div>
          </>
        ) : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Shop the look (trang chủ)</h2>
          <div className={styles.sectionHeadActions}>
            <label className={styles.sectionHeadSwitch}>
              <span className={styles.switchHint}>Tùy chọn</span>
              <span className={styles.toggleTrack}>
                <input
                  type="checkbox"
                  role="switch"
                  className={styles.toggleInput}
                  checked={c.shopLookMode === "CUSTOM"}
                  onChange={(e) =>
                    setC({ ...c, shopLookMode: e.target.checked ? "CUSTOM" : "AUTO" })
                  }
                  aria-checked={c.shopLookMode === "CUSTOM"}
                />
                <span className={styles.toggleKnob} aria-hidden />
              </span>
            </label>
            <label className={styles.sectionHeadSwitch}>
              <span className={styles.switchHint}>Hiển thị</span>
              <span className={styles.toggleTrack}>
                <input
                  type="checkbox"
                  role="switch"
                  className={styles.toggleInput}
                  checked={c.shopLookSectionEnabled}
                  onChange={(e) => setC({ ...c, shopLookSectionEnabled: e.target.checked })}
                  aria-checked={c.shopLookSectionEnabled}
                />
                <span className={styles.toggleKnob} aria-hidden />
              </span>
            </label>
          </div>
        </div>
        <label className={styles.field}>
          <span>Tiêu đề khối</span>
          <input
            type="text"
            value={c.shopLookTitle}
            onChange={(e) => setC({ ...c, shopLookTitle: e.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span>Mô tả ngắn</span>
          <textarea
            className={styles.textarea}
            rows={3}
            value={c.shopLookSubtitle}
            onChange={(e) => setC({ ...c, shopLookSubtitle: e.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span>Số ảnh (card) hiển thị</span>
          <input
            type="number"
            min={1}
            max={12}
            value={c.shopLookCardLimit}
            onChange={(e) =>
              setC({
                ...c,
                shopLookCardLimit: Math.min(12, Math.max(1, Number(e.target.value) || 3)),
              })
            }
          />
        </label>
        {c.shopLookMode === "CUSTOM" ? (
          <>
            <ChipListShopLook items={r.shopLookLooks} />
            <div className={styles.toolbar}>
              <button type="button" className="btn btn--primary" onClick={() => setPicker("shopLook")}>
                + Chọn bài Shop the Look
              </button>
            </div>
          </>
        ) : null}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Tin tức</h2>
          <div className={styles.sectionHeadActions}>
            <label className={styles.sectionHeadSwitch}>
              <span className={styles.switchHint}>Tùy chọn</span>
              <span className={styles.toggleTrack}>
                <input
                  type="checkbox"
                  role="switch"
                  className={styles.toggleInput}
                  checked={c.newsMode === "CUSTOM"}
                  onChange={(e) => setC({ ...c, newsMode: e.target.checked ? "CUSTOM" : "AUTO" })}
                  aria-checked={c.newsMode === "CUSTOM"}
                />
                <span className={styles.toggleKnob} aria-hidden />
              </span>
            </label>
            <label className={styles.sectionHeadSwitch}>
              <span className={styles.switchHint}>Hiển thị</span>
              <span className={styles.toggleTrack}>
                <input
                  type="checkbox"
                  role="switch"
                  className={styles.toggleInput}
                  checked={c.newsSectionEnabled}
                  onChange={(e) => setC({ ...c, newsSectionEnabled: e.target.checked })}
                  aria-checked={c.newsSectionEnabled}
                />
                <span className={styles.toggleKnob} aria-hidden />
              </span>
            </label>
          </div>
        </div>
        <label className={styles.field}>
          <span>Tiêu đề section</span>
          <input
            type="text"
            value={c.newsSectionTitle}
            onChange={(e) => setC({ ...c, newsSectionTitle: e.target.value })}
          />
        </label>
        <label className={styles.field}>
          <span>Số bài hiển thị</span>
          <input
            type="number"
            min={1}
            max={24}
            value={c.newsLimit}
            onChange={(e) => setC({ ...c, newsLimit: Number(e.target.value) || 3 })}
          />
        </label>
        {c.newsMode === "CUSTOM" ? (
          <>
            <ChipListBlog items={r.newsPosts} />
            <div className={styles.toolbar}>
              <button type="button" className="btn btn--primary" onClick={() => setPicker("blog")}>
                + Chọn bài viết
              </button>
            </div>
          </>
        ) : null}
      </section>

      {picker && picker !== "blog" && picker !== "shopLook" ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setPicker(null)}>
          <div className={styles.modal} role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3>Chọn sản phẩm</h3>
              <button type="button" className="btn btn--ghost" onClick={() => setPicker(null)}>
                Đóng
              </button>
            </div>
            <div className={styles.modalBody}>
              <input
                className={styles.search}
                placeholder="Tìm theo tên hoặc slug…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {searchHit.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={styles.resultBtn}
                  onClick={() =>
                    addProduct(picker === "featured" ? "featured" : picker === "new" ? "new" : "living", p)
                  }
                >
                  {p.nameVi}
                  <small>
                    {p.category?.nameVi} · {p.slug}
                  </small>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {picker === "shopLook" ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setPicker(null)}>
          <div className={styles.modal} role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3>Chọn Shop the Look</h3>
              <button type="button" className="btn btn--ghost" onClick={() => setPicker(null)}>
                Đóng
              </button>
            </div>
            <div className={styles.modalBody}>
              <input
                className={styles.search}
                placeholder="Lọc theo tiêu đề hoặc slug…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {shopLookCatalog
                .filter(
                  (l) =>
                    !search.trim() ||
                    l.title.toLowerCase().includes(search.toLowerCase()) ||
                    l.slug.toLowerCase().includes(search.toLowerCase()),
                )
                .map((l) => (
                  <button key={l.id} type="button" className={styles.resultBtn} onClick={() => addShopLookLook(l)}>
                    {l.title}
                    <small>{l.slug}</small>
                  </button>
                ))}
            </div>
          </div>
        </div>
      ) : null}

      {picker === "blog" ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setPicker(null)}>
          <div className={styles.modal} role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3>Chọn bài viết</h3>
              <button type="button" className="btn btn--ghost" onClick={() => setPicker(null)}>
                Đóng
              </button>
            </div>
            <div className={styles.modalBody}>
              <input
                className={styles.search}
                placeholder="Tìm theo tiêu đề…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {blogHit.map((p) => (
                <button key={p.id} type="button" className={styles.resultBtn} onClick={() => addBlog(p)}>
                  {p.title}
                  <small>{p.slug}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </AdminPageLayout>
  );
}
