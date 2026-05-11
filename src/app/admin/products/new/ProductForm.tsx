"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Select } from "antd";
import { ChevronDown } from "lucide-react";
import { SELECT_MENU_CHECK } from "@/design-system/select-icons";
import { CreateCategoryModal, fetchAdminCategoryOptions } from "@/components/admin/CreateCategoryModal";
import { QuantityStepper, QUANTITY_STEPPER_ADMIN_MAX } from "@/components/ui/QuantityStepper";
import { VariantImagesField } from "@/components/admin/VariantImagesField";
import { Spinner } from "@/components/ui/Spinner";
import { computeSalePrice, formatVnd } from "@/lib/money";
import { MIN_PRODUCT_BASE_PRICE, parseDiscountDigits, parseMoneyDigits } from "@/lib/admin-product-price-input";
import { showAdminToast } from "@/lib/admin-toast";
import { stableValueJson } from "@/lib/form-dirty-snapshot";
import { parseProductTagsFromFormInput } from "@/lib/product-tags";
import { deleteAdminCloudinaryUrls, uploadAdminImageFile } from "@/lib/admin-upload-client";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { AdminPanelStickyToolbar, AdminPanelToolbarActions } from "@/components/admin/AdminPanelStickyToolbar";
import { useAdminRightPanelOptional } from "@/components/admin/AdminRightPanel";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { AdminTranslateField } from "@/components/admin/AdminTranslateField";
import styles from "./ProductForm.module.scss";

type Cat = { id: string; nameVi: string; nameEn: string };

type VariantRow = {
  colorLabelVi: string;
  colorLabelEn: string;
  colorHex: string;
  heightCm: number;
  lengthCm: number;
  widthCm: number;
  stockQuantity: number;
  imageFiles: File[];
};

const defaultVariant = (): VariantRow => ({
  colorLabelVi: "",
  colorLabelEn: "",
  colorHex: "#6b6560",
  heightCm: 80,
  lengthCm: 200,
  widthCm: 90,
  stockQuantity: 1,
  imageFiles: [],
});

const MAX_NAME_LEN = 200;
const MAX_DESC_LEN = 20000;
const MAX_DIM_CM = 50000;

function hexForNativeColorInput(hex: string): string {
  const t = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) return t.toLowerCase();
  return "#6b6560";
}

function normalizeHexFromText(raw: string): string {
  let s = raw.trim();
  if (!s.startsWith("#")) s = `#${s}`;
  if (/^#[0-9A-Fa-f]{6}$/i.test(s)) return s.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/i.test(s)) {
    const r = s[1]!;
    const g = s[2]!;
    const b = s[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return s;
}

function isValidHexInput(raw: string): boolean {
  const n = normalizeHexFromText(raw);
  return /^#[0-9A-Fa-f]{6}$/i.test(n);
}

type FieldErrors = Record<string, string>;

function validateForm(
  nameVi: string,
  nameEn: string,
  descriptionVi: string,
  descriptionEn: string,
  basePrice: number,
  discountPercent: number,
  categoryId: string,
  variants: VariantRow[],
): FieldErrors {
  const e: FieldErrors = {};
  const ntv = nameVi.trim();
  if (!ntv) e.nameVi = "Nhập tên (Tiếng Việt)";
  else if (ntv.length > MAX_NAME_LEN) e.nameVi = `Tên tối đa ${MAX_NAME_LEN} ký tự`;

  const nte = nameEn.trim();
  if (!nte) e.nameEn = "Nhập tên (English)";
  else if (nte.length > MAX_NAME_LEN) e.nameEn = `Tên tối đa ${MAX_NAME_LEN} ký tự`;

  const dvi = descriptionVi.trim();
  if (!dvi) e.descriptionVi = "Nhập mô tả (Tiếng Việt)";
  else if (dvi.length > MAX_DESC_LEN) e.descriptionVi = `Mô tả tối đa ${MAX_DESC_LEN} ký tự`;

  const den = descriptionEn.trim();
  if (!den) e.descriptionEn = "Nhập mô tả (English)";
  else if (den.length > MAX_DESC_LEN) e.descriptionEn = `Mô tả tối đa ${MAX_DESC_LEN} ký tự`;

  if (!Number.isFinite(basePrice) || !Number.isInteger(basePrice)) {
    e.basePrice = "Giá gốc là số nguyên (VNĐ)";
  } else if (basePrice < MIN_PRODUCT_BASE_PRICE) {
    e.basePrice = `Giá gốc phải lớn hơn 1.000 ₫ (tối thiểu ${MIN_PRODUCT_BASE_PRICE.toLocaleString("vi-VN")} ₫)`;
  }

  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    e.discountPercent = "Giảm giá từ 0 đến 100%";
  } else if (!Number.isInteger(discountPercent)) e.discountPercent = "Nhập % là số nguyên";

  if (!categoryId.trim()) e.categoryId = "Chọn danh mục";

  if (variants.length === 0) e.variants = "Cần ít nhất một biến thể";

  variants.forEach((v, i) => {
    const p = `v${i}`;
    if (!v.colorLabelVi.trim()) e[`${p}-colorLabelVi`] = "Nhập tên màu (VI)";
    if (!v.colorLabelEn.trim()) e[`${p}-colorLabelEn`] = "Nhập tên màu (EN)";
    if (!isValidHexInput(v.colorHex)) e[`${p}-hex`] = "Mã màu hợp lệ dạng #rrggbb hoặc #rgb";

    const dims: [keyof VariantRow, string][] = [
      ["heightCm", "Cao"],
      ["lengthCm", "Dài"],
      ["widthCm", "Rộng"],
    ];
    for (const [key, label] of dims) {
      const n = v[key] as number;
      if (!Number.isFinite(n) || n < 1 || n > MAX_DIM_CM) {
        e[`${p}-dim-${String(key)}`] = `${label}: nhập cm từ 1 đến ${MAX_DIM_CM.toLocaleString("vi-VN")}`;
      } else if (!Number.isInteger(n)) {
        e[`${p}-dim-${String(key)}`] = `${label}: dùng số nguyên (cm)`;
      }
    }

    const sq = v.stockQuantity;
    if (!Number.isFinite(sq) || sq < 0 || sq > QUANTITY_STEPPER_ADMIN_MAX) {
      e[`${p}-stock`] = `Tồn kho từ 0 đến ${QUANTITY_STEPPER_ADMIN_MAX.toLocaleString("vi-VN")}`;
    } else if (!Number.isInteger(sq)) e[`${p}-stock`] = "Tồn kho là số nguyên";
  });

  return e;
}

function snapshotProductCreateForm(args: {
  nameVi: string;
  nameEn: string;
  descriptionVi: string;
  descriptionEn: string;
  basePrice: number;
  discountPercent: number;
  categoryId: string;
  isFeatured: boolean;
  tagsInput: string;
  variants: VariantRow[];
}): string {
  return stableValueJson({
    nameVi: args.nameVi.trim(),
    nameEn: args.nameEn.trim(),
    descriptionVi: args.descriptionVi.trim(),
    descriptionEn: args.descriptionEn.trim(),
    basePrice: Math.round(args.basePrice),
    discountPercent: Math.round(args.discountPercent),
    categoryId: args.categoryId,
    isFeatured: args.isFeatured,
    tags: parseProductTagsFromFormInput(args.tagsInput)
      .map((t) => t.trim())
      .filter(Boolean)
      .sort(),
    variants: args.variants.map((v) => {
      const hex = normalizeHexFromText(v.colorHex);
      const colorHex = /^#[0-9A-Fa-f]{6}$/i.test(hex) ? hex.toLowerCase() : v.colorHex.trim().toLowerCase();
      return {
        colorLabelVi: v.colorLabelVi.trim(),
        colorLabelEn: v.colorLabelEn.trim(),
        colorHex,
        heightCm: Math.round(v.heightCm),
        lengthCm: Math.round(v.lengthCm),
        widthCm: Math.round(v.widthCm),
        stockQuantity: Math.round(v.stockQuantity),
        nNewImages: v.imageFiles.length,
      };
    }),
  });
}

export function ProductForm({
  categories,
  embeddedInPanel,
  panelFormId,
  onValidityChange,
}: {
  categories: Cat[];
  embeddedInPanel?: boolean;
  /** Khi mở trong panel + footer cố định — gắn `id` cho nút `type="submit" form="…"`. */
  panelFormId?: string;
  /** Panel phải: đồng bộ nút Tạo với trạng thái dirty của form. */
  onValidityChange?: (canSubmit: boolean) => void;
}) {
  const router = useRouter();
  const askConfirm = useConfirm();
  const rightPanel = useAdminRightPanelOptional();
  const [nameVi, setNameVi] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descriptionVi, setDescriptionVi] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [basePrice, setBasePrice] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [categoryList, setCategoryList] = useState<Cat[]>(() =>
    [...categories].sort((a, b) => a.nameVi.localeCompare(b.nameVi, "vi")),
  );
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [variants, setVariants] = useState<VariantRow[]>([defaultVariant()]);
  const [activeVariantTab, setActiveVariantTab] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const previewSale = useMemo(
    () => computeSalePrice(basePrice, discountPercent),
    [basePrice, discountPercent],
  );

  const categorySelectOptions = useMemo(
    () =>
      categoryList.length === 0
        ? [{ value: "", label: "— Chưa có danh mục —", disabled: true }]
        : categoryList.map((c) => ({ value: c.id, label: c.nameVi })),
    [categoryList],
  );

  const emptyCreateSnap = useMemo(
    () =>
      snapshotProductCreateForm({
        nameVi: "",
        nameEn: "",
        descriptionVi: "",
        descriptionEn: "",
        basePrice: 0,
        discountPercent: 0,
        categoryId: categories[0]?.id ?? "",
        isFeatured: false,
        tagsInput: "",
        variants: [defaultVariant()],
      }),
    [categories],
  );
  const currentCreateSnap = useMemo(
    () =>
      snapshotProductCreateForm({
        nameVi,
        nameEn,
        descriptionVi,
        descriptionEn,
        basePrice,
        discountPercent,
        categoryId,
        isFeatured,
        tagsInput,
        variants,
      }),
    [nameVi, nameEn, descriptionVi, descriptionEn, basePrice, discountPercent, categoryId, isFeatured, tagsInput, variants],
  );
  const isDirty = currentCreateSnap !== emptyCreateSnap;

  useEffect(() => {
    if (!embeddedInPanel) return;
    onValidityChange?.(isDirty);
  }, [embeddedInPanel, isDirty, onValidityChange]);

  useEffect(() => {
    setActiveVariantTab((i) => Math.min(i, Math.max(0, variants.length - 1)));
  }, [variants.length]);

  useEffect(() => {
    const next = [...categories].sort((a, b) => a.nameVi.localeCompare(b.nameVi, "vi"));
    setCategoryList(next);
    setCategoryId((id) => (id && next.some((c) => c.id === id) ? id : (next[0]?.id ?? "")));
  }, [categories]);

  async function onCategoryCreated(created: { id: string; nameVi: string; nameEn: string }) {
    try {
      const list = await fetchAdminCategoryOptions();
      setCategoryList(list);
      setCategoryId(created.id);
    } catch {
      setCategoryList((prev) =>
        [...prev.filter((c) => c.id !== created.id), created].sort((a, b) =>
          a.nameVi.localeCompare(b.nameVi, "vi"),
        ),
      );
      setCategoryId(created.id);
    }
    clearFieldError("categoryId");
  }

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const n = { ...prev };
      delete n[key];
      return n;
    });
  }

  function addRow() {
    setVariants((prev) => {
      const next = [...prev, defaultVariant()];
      setActiveVariantTab(next.length - 1);
      return next;
    });
  }

  async function removeVariantRow() {
    if (variants.length <= 1) {
      showAdminToast("Cần ít nhất một biến thể", "error");
      return;
    }
    if (
      !(await askConfirm({
        message: "Xóa biến thể này khỏi form? (Chưa ghi DB cho đến khi bạn bấm Tạo sản phẩm.)",
        danger: true,
      }))
    )
      return;
    const remIdx = activeVariantTab;
    setVariants((prev) => prev.filter((_, j) => j !== remIdx));
  }

  function setVariant(i: number, patch: Partial<VariantRow>) {
    const n = [...variants];
    n[i] = { ...n[i]!, ...patch };
    setVariants(n);
  }

  function updateVariantNewFiles(i: number, next: File[] | ((prev: File[]) => File[])) {
    setVariants((prev) => {
      const n = [...prev];
      const row = n[i]!;
      n[i] = {
        ...row,
        imageFiles: typeof next === "function" ? next(row.imageFiles) : next,
      };
      return n;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!isDirty) return;
    setErr(null);
    const ve = validateForm(
      nameVi,
      nameEn,
      descriptionVi,
      descriptionEn,
      basePrice,
      discountPercent,
      categoryId,
      variants,
    );
    setFieldErrors(ve);
    if (Object.keys(ve).length > 0) {
      setErr("Vui lòng sửa các trường được đánh dấu.");
      const variantIdx = Object.keys(ve)
        .map((k) => /^v(\d+)-/.exec(k))
        .filter((m): m is RegExpExecArray => m != null)
        .map((m) => Number(m[1]));
      if (variantIdx.length > 0) setActiveVariantTab(Math.min(...variantIdx));
      return;
    }

    setSubmitting(true);
    const stagedUrls: string[] = [];
    try {
      const variantPayloads: {
        colorLabelVi: string;
        colorLabelEn: string;
        colorHex?: string;
        heightCm: number;
        lengthCm: number;
        widthCm: number;
        priceAdjustment: number;
        stockQuantity: number;
        imageUrls: string[];
      }[] = [];

      for (const v of variants) {
        const imageUrls: string[] = [];
        for (const file of v.imageFiles) {
          const url = await uploadAdminImageFile(file, "products");
          stagedUrls.push(url);
          imageUrls.push(url);
        }
        const hex = v.colorHex.trim();
        const normalized = normalizeHexFromText(hex);
        const colorHex = /^#[0-9A-Fa-f]{6}$/i.test(normalized) ? normalized : undefined;
        variantPayloads.push({
          colorLabelVi: v.colorLabelVi.trim(),
          colorLabelEn: v.colorLabelEn.trim(),
          colorHex,
          heightCm: Math.round(v.heightCm),
          lengthCm: Math.round(v.lengthCm),
          widthCm: Math.round(v.widthCm),
          priceAdjustment: 0,
          stockQuantity: Math.round(v.stockQuantity),
          imageUrls,
        });
      }

      const payload = {
        nameVi: nameVi.trim(),
        nameEn: nameEn.trim(),
        descriptionVi: descriptionVi.trim(),
        descriptionEn: descriptionEn.trim(),
        basePrice: Math.round(basePrice),
        discountPercent: Math.min(100, Math.max(0, Math.round(discountPercent))),
        categoryId,
        isFeatured,
        tags: parseProductTagsFromFormInput(tagsInput),
        variants: variantPayloads,
      };

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await deleteAdminCloudinaryUrls(stagedUrls);
        const msg = (data as { error?: string }).error ?? "Tạo thất bại";
        setErr(msg);
        showAdminToast(msg, "error");
        return;
      }
      showAdminToast("Đã tạo sản phẩm");
      rightPanel?.closePanel();
      router.push(`/admin/products`);
      router.refresh();
    } catch (ex) {
      await deleteAdminCloudinaryUrls(stagedUrls);
      const msg = ex instanceof Error ? ex.message : "Tạo thất bại";
      setErr(msg);
      showAdminToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  const v = variants[activeVariantTab];
  const vi = activeVariantTab;

  const useDockedPanelFooter = Boolean(embeddedInPanel && panelFormId);
  const actions = useDockedPanelFooter ? null : embeddedInPanel ? (
    <AdminPanelStickyToolbar>
      <AdminPanelToolbarActions>
        <button type="submit" className="btn btn--primary" disabled={submitting || !isDirty} title="Tạo sản phẩm mới">
          {submitting ? <Spinner size="sm" inheritColor label="Đang tạo sản phẩm" /> : "Tạo"}
        </button>
        <button
          type="button"
          className="btn btn--ghost adminCancelGhost"
          disabled={submitting}
          onClick={() => rightPanel?.closePanel()}
        >
          Hủy
        </button>
      </AdminPanelToolbarActions>
    </AdminPanelStickyToolbar>
  ) : (
    <AdminStickyPageHeader pin="scroll">
      <div className={styles.actions}>
        <button type="submit" className="btn btn--primary" disabled={submitting || !isDirty} title="Tạo sản phẩm mới">
          {submitting ? <Spinner size="sm" inheritColor label="Đang tạo sản phẩm" /> : "Tạo"}
        </button>
      </div>
    </AdminStickyPageHeader>
  );

  return (
    <form id={panelFormId || undefined} onSubmit={(e) => void submit(e)} className={styles.wrap} noValidate>
      {actions}
      <div className="field">
        <AdminTranslateField
          viLabel="Tên — Tiếng Việt"
          enLabel="Tên — English"
          viValue={nameVi}
          enValue={nameEn}
          onViChange={(v) => {
            setNameVi(v);
            clearFieldError("nameVi");
          }}
          onEnChange={(v) => {
            setNameEn(v);
            clearFieldError("nameEn");
          }}
          disabled={submitting}
          rows={1}
          viMaxLength={MAX_NAME_LEN + 50}
          enMaxLength={MAX_NAME_LEN + 50}
        />
        {fieldErrors.nameVi ? <p className={styles.fieldError}>{fieldErrors.nameVi}</p> : null}
        {fieldErrors.nameEn ? <p className={styles.fieldError}>{fieldErrors.nameEn}</p> : null}
      </div>
      <div className="field">
        <span className={styles.descFieldTitle}>Mô tả sản phẩm</span>
        <AdminTranslateField
          viLabel="Mô tả — Tiếng Việt"
          enLabel="Mô tả — English"
          viValue={descriptionVi}
          enValue={descriptionEn}
          onViChange={(v) => {
            setDescriptionVi(v);
            clearFieldError("descriptionVi");
          }}
          onEnChange={(v) => {
            setDescriptionEn(v);
            clearFieldError("descriptionEn");
          }}
          disabled={submitting}
          rows={6}
          viMaxLength={MAX_DESC_LEN}
          enMaxLength={MAX_DESC_LEN}
        />
        {fieldErrors.descriptionVi ? <p className={styles.fieldError}>{fieldErrors.descriptionVi}</p> : null}
        {fieldErrors.descriptionEn ? <p className={styles.fieldError}>{fieldErrors.descriptionEn}</p> : null}
      </div>
      <div className="field">
        <label>Giá gốc (VNĐ)</label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Ví dụ: 2330000"
          value={basePrice === 0 ? "" : String(basePrice)}
          onChange={(e) => {
            setBasePrice(parseMoneyDigits(e.target.value));
            clearFieldError("basePrice");
          }}
          disabled={submitting}
          aria-invalid={!!fieldErrors.basePrice}
        />
        {fieldErrors.basePrice ? <p className={styles.fieldError}>{fieldErrors.basePrice}</p> : null}
      </div>
      <div className="field">
        <label>Giảm giá (%)</label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0–100"
          value={String(discountPercent)}
          onChange={(e) => {
            setDiscountPercent(parseDiscountDigits(e.target.value));
            clearFieldError("discountPercent");
          }}
          disabled={submitting}
          aria-invalid={!!fieldErrors.discountPercent}
        />
        {fieldErrors.discountPercent ? <p className={styles.fieldError}>{fieldErrors.discountPercent}</p> : null}
      </div>
      <div className="field">
        <label>Giá sau giảm (lưu DB)</label>
        <input type="text" readOnly value={formatVnd(previewSale)} tabIndex={-1} aria-readonly />
      </div>
      <div className="field">
        <label>Danh mục</label>
        <div className={styles.categorySelectWrap}>
          <Select<string>
            className={styles.categorySelect}
            value={categoryId}
            onChange={(id) => {
              setCategoryId(id);
              clearFieldError("categoryId");
            }}
            disabled={submitting}
            status={fieldErrors.categoryId ? "error" : undefined}
            options={categorySelectOptions}
            variant="outlined"
            suffixIcon={<ChevronDown size={18} strokeWidth={2} aria-hidden />}
            menuItemSelectedIcon={SELECT_MENU_CHECK}
            popupMatchSelectWidth={false}
            listHeight={320}
          />
          <button
            type="button"
            className={`btn btn--ghost adminPanelGhostAccent ${styles.categoryCreateBtn}`}
            disabled={submitting}
            onClick={() => setCreateCategoryOpen(true)}
          >
            Tạo danh mục
          </button>
        </div>
        {fieldErrors.categoryId ? <p className={styles.fieldError}>{fieldErrors.categoryId}</p> : null}
      </div>
      <CreateCategoryModal
        open={createCategoryOpen}
        onClose={() => setCreateCategoryOpen(false)}
        onCreated={(c) => void onCategoryCreated(c)}
      />
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: "1rem" }}>
        <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} disabled={submitting} />
        Nổi bật
      </label>

      <div className="field">
        <label>Tag hiển thị shop (tuỳ chọn)</label>
        <input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="VD: Mới, Combo — phân tách bằng dấu phẩy"
          maxLength={400}
          disabled={submitting}
          autoComplete="off"
        />
        <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
          Tối đa 8 nhãn, mỗi nhãn tối đa 40 ký tự.
        </p>
      </div>

      <h2 className={styles.sectionTitle}>Biến thể (màu × kích thước)</h2>
      <p className="muted" style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>
        Chọn từng tab để chỉnh biến thể. Thêm ảnh: crop khung 3:4 rồi áp dụng; upload khi bấm «Tạo sản phẩm».
      </p>
      {fieldErrors.variants ? <p className={styles.fieldError}>{fieldErrors.variants}</p> : null}

      <div className={styles.tabStrip} role="tablist" aria-label="Chọn biến thể">
        {variants.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === activeVariantTab}
            className={i === activeVariantTab ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            disabled={submitting}
            onClick={() => setActiveVariantTab(i)}
          >
            {variants[i]?.colorLabelVi.trim() || `Biến thể ${i + 1}`}
          </button>
        ))}
        <button type="button" className={`${styles.tab} ${styles.tabAdd}`} onClick={addRow} disabled={submitting}>
          + Thêm biến thể
        </button>
      </div>

      {v ? (
        <div className={`card ${styles.variantCard}`} role="tabpanel">
          <div className={styles.variantCardToolbar}>
            <button
              type="button"
              className={`btn btn--ghost adminPanelGhostDanger ${styles.variantRemoveBtn}`}
              disabled={submitting || variants.length <= 1}
              onClick={() => void removeVariantRow()}
            >
              Xóa biến thể này
            </button>
          </div>
          <div className={styles.colorTableWrap}>
            <div className={styles.colorGridHead} aria-hidden>
              <span>Tên màu (VI / EN)</span>
              <span>Mã màu (hex)</span>
              <span>Chọn màu</span>
            </div>
            <div className={styles.colorGridRow}>
              <div className={styles.colorGridCell}>
                <input
                  className={styles.colorLabelInput}
                  value={v.colorLabelVi}
                  onChange={(e) => {
                    setVariant(vi, { colorLabelVi: e.target.value });
                    clearFieldError(`v${vi}-colorLabelVi`);
                  }}
                  placeholder="VD: Xám chì (VI)"
                  disabled={submitting}
                  aria-label="Tên màu Tiếng Việt"
                  aria-invalid={!!fieldErrors[`v${vi}-colorLabelVi`]}
                />
                {fieldErrors[`v${vi}-colorLabelVi`] ? (
                  <p className={styles.fieldError}>{fieldErrors[`v${vi}-colorLabelVi`]}</p>
                ) : null}
                <input
                  className={styles.colorLabelInput}
                  style={{ marginTop: "0.35rem" }}
                  value={v.colorLabelEn}
                  onChange={(e) => {
                    setVariant(vi, { colorLabelEn: e.target.value });
                    clearFieldError(`v${vi}-colorLabelEn`);
                  }}
                  placeholder="e.g. Charcoal (EN)"
                  disabled={submitting}
                  aria-label="Color name English"
                  aria-invalid={!!fieldErrors[`v${vi}-colorLabelEn`]}
                />
                {fieldErrors[`v${vi}-colorLabelEn`] ? (
                  <p className={styles.fieldError}>{fieldErrors[`v${vi}-colorLabelEn`]}</p>
                ) : null}
              </div>
              <div className={styles.colorGridCell}>
                <input
                  className={styles.hexInput}
                  value={v.colorHex}
                  onChange={(e) => {
                    setVariant(vi, { colorHex: e.target.value });
                    clearFieldError(`v${vi}-hex`);
                  }}
                  placeholder="#6b6560"
                  spellCheck={false}
                  disabled={submitting}
                  aria-label="Mã hex"
                  aria-invalid={!!fieldErrors[`v${vi}-hex`]}
                />
                {fieldErrors[`v${vi}-hex`] ? <p className={styles.fieldError}>{fieldErrors[`v${vi}-hex`]}</p> : null}
              </div>
              <div className={`${styles.colorGridCell} ${styles.colorSwatchCell}`}>
                <input
                  type="color"
                  className={styles.swatchInput}
                  value={hexForNativeColorInput(v.colorHex)}
                  onChange={(e) => {
                    setVariant(vi, { colorHex: e.target.value.toLowerCase() });
                    clearFieldError(`v${vi}-hex`);
                  }}
                  title="Chọn màu — mã hex được lưu tự động"
                  disabled={submitting}
                  aria-label="Bảng chọn màu hệ thống"
                />
              </div>
            </div>
            <p className={styles.hexHint}>Nhập hex hoặc dùng ô chọn màu (#rrggbb).</p>
          </div>

          <div className={styles.dimsGrid}>
            <label className={styles.dimField}>
              <span>Cao (cm)</span>
              <input
                type="number"
                min={1}
                step={1}
                value={v.heightCm}
                onChange={(e) => {
                  setVariant(vi, { heightCm: Number(e.target.value) });
                  clearFieldError(`v${vi}-dim-heightCm`);
                }}
                disabled={submitting}
                aria-invalid={!!fieldErrors[`v${vi}-dim-heightCm`]}
              />
              {fieldErrors[`v${vi}-dim-heightCm`] ? (
                <span className={styles.fieldError}>{fieldErrors[`v${vi}-dim-heightCm`]}</span>
              ) : null}
            </label>
            <label className={styles.dimField}>
              <span>Dài (cm)</span>
              <input
                type="number"
                min={1}
                step={1}
                value={v.lengthCm}
                onChange={(e) => {
                  setVariant(vi, { lengthCm: Number(e.target.value) });
                  clearFieldError(`v${vi}-dim-lengthCm`);
                }}
                disabled={submitting}
                aria-invalid={!!fieldErrors[`v${vi}-dim-lengthCm`]}
              />
              {fieldErrors[`v${vi}-dim-lengthCm`] ? (
                <span className={styles.fieldError}>{fieldErrors[`v${vi}-dim-lengthCm`]}</span>
              ) : null}
            </label>
            <label className={styles.dimField}>
              <span>Rộng (cm)</span>
              <input
                type="number"
                min={1}
                step={1}
                value={v.widthCm}
                onChange={(e) => {
                  setVariant(vi, { widthCm: Number(e.target.value) });
                  clearFieldError(`v${vi}-dim-widthCm`);
                }}
                disabled={submitting}
                aria-invalid={!!fieldErrors[`v${vi}-dim-widthCm`]}
              />
              {fieldErrors[`v${vi}-dim-widthCm`] ? (
                <span className={styles.fieldError}>{fieldErrors[`v${vi}-dim-widthCm`]}</span>
              ) : null}
            </label>
          </div>

          <div className={styles.stockBlock}>
            <span className={styles.stockLabel}>Tồn kho</span>
            <QuantityStepper
              value={Number.isFinite(v.stockQuantity) ? Math.max(0, Math.round(v.stockQuantity)) : 0}
              min={0}
              max={QUANTITY_STEPPER_ADMIN_MAX}
              disabled={submitting}
              onChange={(q) => {
                setVariant(vi, { stockQuantity: q });
                clearFieldError(`v${vi}-stock`);
              }}
            />
            {fieldErrors[`v${vi}-stock`] ? <p className={styles.fieldError}>{fieldErrors[`v${vi}-stock`]}</p> : null}
          </div>

          <div className={styles.imagesField}>
            <VariantImagesField
              existingUrls={[]}
              newFiles={v.imageFiles}
              onExistingUrlsChange={() => {}}
              onNewFilesChange={(next) => updateVariantNewFiles(vi, next)}
              disabled={submitting}
            />
          </div>
        </div>
      ) : null}

      {err ? <p style={{ color: "crimson", textAlign: "left", marginTop: "0.5rem" }}>{err}</p> : null}
    </form>
  );
}
