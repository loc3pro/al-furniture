"use client";

import { useRouter } from "next/navigation";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Select } from "antd";
import { ChevronDown } from "lucide-react";
import { SELECT_MENU_CHECK } from "@/design-system/select-icons";
import { CreateCategoryModal, fetchAdminCategoryOptions } from "@/components/admin/CreateCategoryModal";
import { VariantImagesField } from "@/components/admin/VariantImagesField";
import { QuantityStepper, QUANTITY_STEPPER_ADMIN_MAX } from "@/components/ui/QuantityStepper";
import { Spinner } from "@/components/ui/Spinner";
import { deleteAdminCloudinaryUrls, uploadAdminImageFile } from "@/lib/admin-upload-client";
import { computeSalePrice, formatVnd, variantListPrice, variantUnitPrice } from "@/lib/money";
import {
  MIN_PRODUCT_BASE_PRICE,
  parseDiscountDigits,
  parseMoneyDigits,
} from "@/lib/admin-product-price-input";
import { showAdminToast } from "@/lib/admin-toast";
import { stableValueJson } from "@/lib/form-dirty-snapshot";
import { parseProductTagsFromFormInput, tagsToFormInput } from "@/lib/product-tags";
import { formatSizeLabelCm, parseSizeLabelCm } from "@/lib/variant-dimensions";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { AdminPanelStickyToolbar, AdminPanelToolbarActions } from "@/components/admin/AdminPanelStickyToolbar";
import { useAdminRightPanelOptional } from "@/components/admin/AdminRightPanel";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { AdminTranslateField } from "@/components/admin/AdminTranslateField";
import variantStyles from "../new/ProductForm.module.scss";
import styles from "./product-edit.module.scss";

const MAX_NAME_LEN = 200;
const MAX_DESC_LEN = 20000;
const MAX_META = 500;
const MAX_DIM_CM = 50000;
const MAX_PRICE_ADJUSTMENT = 500_000_000;

type Cat = { id: string; nameVi: string; nameEn: string };

export type ProductPayload = {
  id: string;
  nameVi: string;
  nameEn: string;
  /** Mã hiển thị SP-… — null với SP cũ chưa có mã. */
  productCode: string | null;
  slug: string;
  descriptionVi: string;
  descriptionEn: string;
  basePrice: number;
  discountPercent: number;
  salePrice: number | null;
  depositAmount: number | null;
  categoryId: string;
  isFeatured: boolean;
  brandNameVi: string | null;
  brandNameEn: string | null;
  metaTitleVi: string | null;
  metaTitleEn: string | null;
  metaDescriptionVi: string | null;
  metaDescriptionEn: string | null;
  /** Nhãn hiển thị shop (phân tách bằng dấu phẩy khi nhập). */
  tags: string[];
};

export type VariantPayload = {
  id: string;
  colorLabelVi: string;
  colorLabelEn: string;
  colorHex: string | null;
  sizeLabelVi: string;
  sizeLabelEn: string;
  priceAdjustment: number;
  stockQuantity: number;
  imageUrls: string[];
};

type VariantEdit = {
  id: string;
  colorLabelVi: string;
  colorLabelEn: string;
  colorHex: string;
  heightCm: number;
  lengthCm: number;
  widthCm: number;
  priceAdjustment: number;
  stockQuantity: number;
  imageUrls: string[];
  imageFiles: File[];
};

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

/**
 * DB `priceAdjustment`: hiện tại là giá niêm yết biến thể (≥0); 0 = dùng giá gốc SP.
 * Dữ liệu cũ / seed có thể lưu **delta âm** (base + delta) — chuẩn hóa thành giá niêm yết tuyệt đối để form & API hợp lệ.
 */
function mapVariantPayload(v: VariantPayload, productBasePrice: number): VariantEdit {
  const parsed = parseSizeLabelCm(v.sizeLabelVi);
  let pa = v.priceAdjustment;
  if (pa < 0) {
    pa = Math.max(0, Math.min(MAX_PRICE_ADJUSTMENT, productBasePrice + pa));
  }
  return {
    id: v.id,
    colorLabelVi: v.colorLabelVi,
    colorLabelEn: v.colorLabelEn,
    colorHex: v.colorHex ?? "#6b6560",
    heightCm: parsed?.heightCm ?? 80,
    lengthCm: parsed?.lengthCm ?? 200,
    widthCm: parsed?.widthCm ?? 90,
    priceAdjustment: pa,
    stockQuantity: v.stockQuantity,
    imageUrls: [...v.imageUrls],
    imageFiles: [],
  };
}

function snapshotVariantRowForDirty(r: VariantEdit): Record<string, unknown> {
  const hex = normalizeHexFromText(r.colorHex);
  const colorHex = /^#[0-9A-Fa-f]{6}$/i.test(hex) ? hex.toLowerCase() : r.colorHex.trim().toLowerCase();
  return {
    id: r.id,
    colorLabelVi: r.colorLabelVi.trim(),
    colorLabelEn: r.colorLabelEn.trim(),
    colorHex,
    heightCm: Math.round(r.heightCm),
    lengthCm: Math.round(r.lengthCm),
    widthCm: Math.round(r.widthCm),
    priceAdjustment: Math.round(r.priceAdjustment),
    stockQuantity: Math.round(r.stockQuantity),
    imageUrls: [...r.imageUrls],
    pendingUploads: r.imageFiles.length,
  };
}

function snapshotServerProductEdit(product: ProductPayload, variantList: VariantPayload[]): string {
  const dep =
    product.depositAmount == null ? null : Math.round(Number(product.depositAmount));
  return stableValueJson({
    nameVi: product.nameVi.trim(),
    nameEn: product.nameEn.trim(),
    descriptionVi: product.descriptionVi.trim(),
    descriptionEn: product.descriptionEn.trim(),
    basePrice: Math.round(product.basePrice),
    discountPercent: Math.round(product.discountPercent),
    depositAmount: dep,
    categoryId: product.categoryId,
    isFeatured: product.isFeatured,
    brandNameVi: (product.brandNameVi ?? "").trim(),
    brandNameEn: (product.brandNameEn ?? "").trim(),
    metaTitleVi: (product.metaTitleVi ?? "").trim(),
    metaTitleEn: (product.metaTitleEn ?? "").trim(),
    metaDescriptionVi: (product.metaDescriptionVi ?? "").trim(),
    metaDescriptionEn: (product.metaDescriptionEn ?? "").trim(),
    tags: [...(product.tags ?? [])].map((t) => String(t).trim()).filter(Boolean).sort(),
    variants: variantList.map((v) =>
      snapshotVariantRowForDirty(mapVariantPayload(v, product.basePrice)),
    ),
  });
}

function snapshotClientProductEdit(
  nameVi: string,
  nameEn: string,
  descriptionVi: string,
  descriptionEn: string,
  basePrice: number,
  discountPercent: number,
  depositAmount: number | "",
  categoryId: string,
  isFeatured: boolean,
  brandNameVi: string,
  brandNameEn: string,
  metaTitleVi: string,
  metaTitleEn: string,
  metaDescriptionVi: string,
  metaDescriptionEn: string,
  tagsInput: string,
  rows: VariantEdit[],
): string {
  const dep = depositAmount === "" ? null : Math.round(Number(depositAmount));
  return stableValueJson({
    nameVi: nameVi.trim(),
    nameEn: nameEn.trim(),
    descriptionVi: descriptionVi.trim(),
    descriptionEn: descriptionEn.trim(),
    basePrice: Math.round(basePrice),
    discountPercent: Math.round(discountPercent),
    depositAmount: dep,
    categoryId,
    isFeatured,
    brandNameVi: brandNameVi.trim(),
    brandNameEn: brandNameEn.trim(),
    metaTitleVi: metaTitleVi.trim(),
    metaTitleEn: metaTitleEn.trim(),
    metaDescriptionVi: metaDescriptionVi.trim(),
    metaDescriptionEn: metaDescriptionEn.trim(),
    tags: parseProductTagsFromFormInput(tagsInput)
      .map((t) => t.trim())
      .filter(Boolean)
      .sort(),
    variants: rows.map(snapshotVariantRowForDirty),
  });
}

function isCloudinaryDeliveryUrl(url: string): boolean {
  try {
    return new URL(url).hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

export type ProductEditFormPanelHandle = {
  requestDelete: () => void;
};

type ProductEditFormProps = {
  product: ProductPayload;
  categories: Cat[];
  variants: VariantPayload[];
  embeddedInPanel?: boolean;
  /** Có thì ẩn toolbar trong body; nút Lưu/Xóa đặt ở footer panel (`form` + ref). */
  panelFormId?: string;
};

export const ProductEditForm = forwardRef<ProductEditFormPanelHandle, ProductEditFormProps>(
  function ProductEditForm({ product, categories, variants, embeddedInPanel, panelFormId }, ref) {
  const router = useRouter();
  const askConfirm = useConfirm();
  const rightPanel = useAdminRightPanelOptional();
  const initialImagesRef = useRef<Map<string, string[]> | null>(null);
  if (initialImagesRef.current === null) {
    initialImagesRef.current = new Map(variants.map((v) => [v.id, [...v.imageUrls]]));
  }

  const [nameVi, setNameVi] = useState(product.nameVi);
  const [nameEn, setNameEn] = useState(product.nameEn);
  const [descriptionVi, setDescriptionVi] = useState(product.descriptionVi);
  const [descriptionEn, setDescriptionEn] = useState(product.descriptionEn);
  const [basePrice, setBasePrice] = useState(product.basePrice);
  const [discountPercent, setDiscountPercent] = useState(product.discountPercent);
  const [depositAmount, setDepositAmount] = useState<number | "">(product.depositAmount ?? "");
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [categoryList, setCategoryList] = useState<Cat[]>(() =>
    [...categories].sort((a, b) => a.nameVi.localeCompare(b.nameVi, "vi")),
  );
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [isFeatured, setIsFeatured] = useState(product.isFeatured);
  const [brandNameVi, setBrandNameVi] = useState(product.brandNameVi ?? "");
  const [brandNameEn, setBrandNameEn] = useState(product.brandNameEn ?? "");
  const [metaTitleVi, setMetaTitleVi] = useState(product.metaTitleVi ?? "");
  const [metaTitleEn, setMetaTitleEn] = useState(product.metaTitleEn ?? "");
  const [metaDescriptionVi, setMetaDescriptionVi] = useState(product.metaDescriptionVi ?? "");
  const [metaDescriptionEn, setMetaDescriptionEn] = useState(product.metaDescriptionEn ?? "");
  const [tagsInput, setTagsInput] = useState(() => tagsToFormInput(product.tags));
  const [variantRows, setVariantRows] = useState<VariantEdit[]>(() =>
    variants.map((v) => mapVariantPayload(v, product.basePrice)),
  );
  const [activeVariantTab, setActiveVariantTab] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const prevVariantLenRef = useRef(variants.length);

  const categorySelectOptions = useMemo(
    () =>
      categoryList.length === 0
        ? [{ value: "", label: "— Chưa có danh mục —", disabled: true }]
        : categoryList.map((c) => ({ value: c.id, label: c.nameVi })),
    [categoryList],
  );

  useEffect(() => {
    setVariantRows((prev) => {
      if (prev.some((r) => r.imageFiles.length > 0)) return prev;
      initialImagesRef.current = new Map(variants.map((v) => [v.id, [...v.imageUrls]]));
      return variants.map((v) => mapVariantPayload(v, product.basePrice));
    });
    const grew = variants.length > prevVariantLenRef.current;
    prevVariantLenRef.current = variants.length;
    if (grew && variants.length > 0) {
      setActiveVariantTab(variants.length - 1);
    } else {
      setActiveVariantTab((i) => Math.min(i, Math.max(0, variants.length - 1)));
    }
  }, [variants, product.basePrice]);

  useEffect(() => {
    setActiveVariantTab((i) => Math.min(i, Math.max(0, variantRows.length - 1)));
  }, [variantRows.length]);

  useEffect(() => {
    const next = [...categories].sort((a, b) => a.nameVi.localeCompare(b.nameVi, "vi"));
    setCategoryList(next);
    setCategoryId((id) => (next.some((c) => c.id === id) ? id : next[0]?.id ?? ""));
  }, [categories]);

  const serverTagsKey = useMemo(
    () => [...(product.tags ?? [])].map((t) => String(t).trim()).filter(Boolean).sort().join("\u0001"),
    [product.tags],
  );
  useEffect(() => {
    setTagsInput(tagsToFormInput(product.tags));
  }, [product.id, serverTagsKey, product.tags]);

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

  const previewSale = useMemo(
    () => computeSalePrice(basePrice, discountPercent),
    [basePrice, discountPercent],
  );

  const serverSnap = useMemo(
    () => snapshotServerProductEdit(product, variants),
    [product, variants],
  );
  const clientSnap = useMemo(
    () =>
      snapshotClientProductEdit(
        nameVi,
        nameEn,
        descriptionVi,
        descriptionEn,
        basePrice,
        discountPercent,
        depositAmount,
        categoryId,
        isFeatured,
        brandNameVi,
        brandNameEn,
        metaTitleVi,
        metaTitleEn,
        metaDescriptionVi,
        metaDescriptionEn,
        tagsInput,
        variantRows,
      ),
    [
      nameVi,
      nameEn,
      descriptionVi,
      descriptionEn,
      basePrice,
      discountPercent,
      depositAmount,
      categoryId,
      isFeatured,
      brandNameVi,
      brandNameEn,
      metaTitleVi,
      metaTitleEn,
      metaDescriptionVi,
      metaDescriptionEn,
      tagsInput,
      variantRows,
    ],
  );
  const isDirty = serverSnap !== clientSnap;

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const n = { ...prev };
      delete n[key];
      return n;
    });
  }

  function setVariant(i: number, patch: Partial<VariantEdit>) {
    setVariantRows((rows) => {
      const n = [...rows];
      n[i] = { ...n[i]!, ...patch };
      return n;
    });
  }

  function updateVariantNewFiles(i: number, next: File[] | ((prev: File[]) => File[])) {
    setVariantRows((rows) => {
      const n = [...rows];
      const row = n[i]!;
      n[i] = {
        ...row,
        imageFiles: typeof next === "function" ? next(row.imageFiles) : next,
      };
      return n;
    });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    const ntv = nameVi.trim();
    if (!ntv) e.nameVi = "Nhập tên (Tiếng Việt)";
    else if (ntv.length > MAX_NAME_LEN) e.nameVi = `Tối đa ${MAX_NAME_LEN} ký tự`;
    const nte = nameEn.trim();
    if (!nte) e.nameEn = "Nhập tên (English)";
    else if (nte.length > MAX_NAME_LEN) e.nameEn = `Tối đa ${MAX_NAME_LEN} ký tự`;

    const dtv = descriptionVi.trim();
    if (!dtv) e.descriptionVi = "Nhập mô tả (Tiếng Việt)";
    else if (dtv.length > MAX_DESC_LEN) e.descriptionVi = `Tối đa ${MAX_DESC_LEN} ký tự`;
    const dte = descriptionEn.trim();
    if (!dte) e.descriptionEn = "Nhập mô tả (English)";
    else if (dte.length > MAX_DESC_LEN) e.descriptionEn = `Tối đa ${MAX_DESC_LEN} ký tự`;

    if (!Number.isFinite(basePrice) || !Number.isInteger(basePrice)) {
      e.basePrice = "Giá gốc là số nguyên (₫)";
    } else if (basePrice < MIN_PRODUCT_BASE_PRICE) {
      e.basePrice = `Giá gốc phải lớn hơn 1.000 ₫ (tối thiểu ${MIN_PRODUCT_BASE_PRICE.toLocaleString("vi-VN")} ₫)`;
    }

    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      e.discountPercent = "Giảm giá từ 0–100%";
    } else if (!Number.isInteger(discountPercent)) e.discountPercent = "Nhập % là số nguyên";

    if (depositAmount !== "" && (!Number.isFinite(Number(depositAmount)) || Number(depositAmount) < 0)) {
      e.depositAmount = "Tiền cọc ≥ 0";
    } else if (depositAmount !== "" && !Number.isInteger(Number(depositAmount))) {
      e.depositAmount = "Tiền cọc là số nguyên";
    }

    if (!categoryId.trim()) e.categoryId = "Chọn danh mục";

    if (metaTitleVi.trim().length > MAX_META) e.metaTitleVi = `Tối đa ${MAX_META} ký tự`;
    if (metaTitleEn.trim().length > MAX_META) e.metaTitleEn = `Tối đa ${MAX_META} ký tự`;
    if (metaDescriptionVi.trim().length > MAX_META) e.metaDescriptionVi = `Tối đa ${MAX_META} ký tự`;
    if (metaDescriptionEn.trim().length > MAX_META) e.metaDescriptionEn = `Tối đa ${MAX_META} ký tự`;

    if (variantRows.length === 0) e.variants = "Sản phẩm cần ít nhất một biến thể";

    variantRows.forEach((v, i) => {
      const p = `v${i}`;
      if (!v.colorLabelVi.trim()) e[`${p}-colorLabelVi`] = "Nhập tên màu (VI)";
      if (!v.colorLabelEn.trim()) e[`${p}-colorLabelEn`] = "Nhập tên màu (EN)";
      if (!isValidHexInput(v.colorHex)) e[`${p}-hex`] = "Mã màu #rrggbb hoặc #rgb";

      const dims: [keyof VariantEdit, string][] = [
        ["heightCm", "Cao"],
        ["lengthCm", "Dài"],
        ["widthCm", "Rộng"],
      ];
      for (const [key, label] of dims) {
        const n = v[key] as number;
        if (!Number.isFinite(n) || n < 1 || n > MAX_DIM_CM) {
          e[`${p}-dim-${String(key)}`] = `${label}: cm từ 1 đến ${MAX_DIM_CM.toLocaleString("vi-VN")}`;
        } else if (!Number.isInteger(n)) {
          e[`${p}-dim-${String(key)}`] = `${label}: số nguyên (cm)`;
        }
      }

      const sq = v.stockQuantity;
      if (!Number.isFinite(sq) || sq < 0 || sq > QUANTITY_STEPPER_ADMIN_MAX) {
        e[`${p}-stock`] = `Tồn kho 0–${QUANTITY_STEPPER_ADMIN_MAX.toLocaleString("vi-VN")}`;
      } else if (!Number.isInteger(sq)) e[`${p}-stock`] = "Tồn kho là số nguyên";

      const pa = v.priceAdjustment;
      if (!Number.isFinite(pa) || !Number.isInteger(pa)) {
        e[`${p}-priceAdj`] = "Giá gốc biến thể là số nguyên (₫)";
      } else if (pa < 0 || pa > MAX_PRICE_ADJUSTMENT) {
        e[`${p}-priceAdj`] = `Từ 0 đến ${MAX_PRICE_ADJUSTMENT.toLocaleString("vi-VN")} ₫ (0 = dùng giá gốc SP)`;
      }
    });

    setFieldErrors(e);
    if (Object.keys(e).length > 0) {
      setErr("Vui lòng sửa các trường được đánh dấu.");
      const variantIdx = Object.keys(e)
        .map((k) => /^v(\d+)-/.exec(k))
        .filter((m): m is RegExpExecArray => m != null)
        .map((m) => Number(m[1]));
      if (variantIdx.length > 0) setActiveVariantTab(Math.min(...variantIdx));
      return false;
    }
    return true;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!isDirty) return;
    setErr(null);
    if (!validate()) return;
    setBusy(true);

    const stagedUploads: string[] = [];

    try {
      const productRes = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameVi: nameVi.trim(),
          nameEn: nameEn.trim(),
          descriptionVi: descriptionVi.trim(),
          descriptionEn: descriptionEn.trim(),
          basePrice: Math.round(basePrice),
          discountPercent: Math.min(100, Math.max(0, Math.round(discountPercent))),
          depositAmount:
            depositAmount === "" ? null : Math.max(0, Math.round(Number(depositAmount))),
          categoryId,
          isFeatured,
          brandNameVi: brandNameVi.trim() || null,
          brandNameEn: brandNameEn.trim() || null,
          metaTitleVi: metaTitleVi.trim() || null,
          metaTitleEn: metaTitleEn.trim() || null,
          metaDescriptionVi: metaDescriptionVi.trim() || null,
          metaDescriptionEn: metaDescriptionEn.trim() || null,
          tags: parseProductTagsFromFormInput(tagsInput),
        }),
      });
      const productData = await productRes.json().catch(() => ({}));
      if (!productRes.ok) {
        const msg = (productData as { error?: string }).error ?? "Không lưu được sản phẩm";
        setErr(msg);
        showAdminToast(msg, "error");
        setBusy(false);
        return;
      }

      for (const row of variantRows) {
        const staged: string[] = [];
        for (const file of row.imageFiles) {
          const url = await uploadAdminImageFile(file, "products");
          staged.push(url);
          stagedUploads.push(url);
        }
        const merged = [...row.imageUrls, ...staged];
        const prev = initialImagesRef.current?.get(row.id) ?? [];
        const removed = prev.filter((u) => !merged.includes(u));
        await deleteAdminCloudinaryUrls(removed.filter(isCloudinaryDeliveryUrl));

        const hex = normalizeHexFromText(row.colorHex);
        const colorHex = /^#[0-9A-Fa-f]{6}$/i.test(hex) ? hex : null;

        const vr = await fetch(`/api/admin/variants/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            colorLabelVi: row.colorLabelVi.trim(),
            colorLabelEn: row.colorLabelEn.trim(),
            colorHex,
            priceAdjustment: Math.round(row.priceAdjustment),
            stockQuantity: Math.round(row.stockQuantity),
            heightCm: Math.round(row.heightCm),
            lengthCm: Math.round(row.lengthCm),
            widthCm: Math.round(row.widthCm),
            imageUrls: merged,
          }),
        });
        if (!vr.ok) {
          const vd = await vr.json().catch(() => ({}));
          throw new Error((vd as { error?: string }).error ?? "Lưu biến thể thất bại");
        }
        initialImagesRef.current?.set(row.id, [...merged]);
      }

      setVariantRows((rows) => rows.map((r) => ({ ...r, imageFiles: [] })));
      setFieldErrors({});
      showAdminToast("Đã lưu sản phẩm");
      router.refresh();
    } catch (ex) {
      await deleteAdminCloudinaryUrls(stagedUploads);
      const msg = ex instanceof Error ? ex.message : "Không lưu được";
      setErr(msg);
      showAdminToast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  async function addVariant() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/variants`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? "Không thêm được biến thể";
        setErr(msg);
        showAdminToast(msg, "error");
        return;
      }
      const vid = (data as { variant?: { id: string } }).variant?.id;
      if (!vid) {
        showAdminToast("Phản hồi thiếu id biến thể", "error");
        return;
      }
      const sizeLabelCm = formatSizeLabelCm(80, 200, 160);
      const dims = parseSizeLabelCm(sizeLabelCm);
      const newRow: VariantEdit = {
        id: vid,
        colorLabelVi: "Màu mới",
        colorLabelEn: "New color",
        colorHex: "#6b6560",
        heightCm: dims?.heightCm ?? 80,
        lengthCm: dims?.lengthCm ?? 200,
        widthCm: dims?.widthCm ?? 160,
        priceAdjustment: 0,
        stockQuantity: 0,
        imageUrls: [],
        imageFiles: [],
      };
      initialImagesRef.current?.set(vid, []);
      setVariantRows((prev) => {
        const next = [...prev, newRow];
        setActiveVariantTab(next.length - 1);
        return next;
      });
      showAdminToast("Đã thêm biến thể");
    } finally {
      setBusy(false);
    }
  }

  async function deleteActiveVariant() {
    if (variantRows.length <= 1) {
      showAdminToast("Cần ít nhất một biến thể", "error");
      return;
    }
    const row = variantRows[vi];
    if (!row) return;
    const label = row.colorLabelVi.trim() || `Biến thể ${vi + 1}`;
    if (!(await askConfirm({ message: `Xóa biến thể «${label}»? Không hoàn tác.`, danger: true }))) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/variants/${row.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? "Không xóa được biến thể";
        setErr(msg);
        showAdminToast(msg, "error");
        return;
      }
      initialImagesRef.current?.delete(row.id);
      setFieldErrors({});
      setVariantRows((prev) => {
        const di = prev.findIndex((r) => r.id === row.id);
        const next = prev.filter((r) => r.id !== row.id);
        setActiveVariantTab((cur) => {
          if (di < 0) return cur;
          if (di < cur) return cur - 1;
          if (di === cur) return Math.min(cur, Math.max(0, next.length - 1));
          return cur;
        });
        return next;
      });
      showAdminToast("Đã xóa biến thể");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !(await askConfirm({
        message: "Xóa sản phẩm này? Không hoàn tác nếu còn đơn tham chiếu.",
        danger: true,
      }))
    )
      return;
    setBusy(true);
    const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = (data as { error?: string }).error ?? "Không xóa được";
      setErr(msg);
      showAdminToast(msg, "error");
      return;
    }
    showAdminToast("Đã xóa sản phẩm");
    rightPanel?.closePanel();
    router.push("/admin/products");
    router.refresh();
  }

  const removeLatest = useRef(remove);
  removeLatest.current = remove;
  useImperativeHandle(ref, () => ({
    requestDelete: () => {
      void removeLatest.current();
    },
  }));

  const vi = activeVariantTab;
  const v = variantRows[vi];

  const useDockedPanelFooter = Boolean(embeddedInPanel && panelFormId);

  const footerButtons = (
    <>
      <button type="submit" className="btn btn--primary" disabled={busy || !isDirty} title="Lưu thay đổi (upload ảnh & cập nhật DB)">
        {busy ? <Spinner size="sm" inheritColor label="Đang lưu" /> : "Lưu"}
      </button>
      <button
        type="button"
        className="btn btn--ghost adminPanelGhostDanger"
        title="Xóa sản phẩm khỏi catalog"
        onClick={() => void remove()}
        disabled={busy}
      >
        Xóa
      </button>
      {embeddedInPanel && !panelFormId ? (
        <button
          type="button"
          className="btn btn--ghost adminCancelGhost"
          disabled={busy}
          onClick={() => rightPanel?.closePanel()}
        >
          Hủy
        </button>
      ) : null}
    </>
  );

  const topActions = useDockedPanelFooter
    ? null
    : embeddedInPanel
      ? (
        <AdminPanelStickyToolbar>
          <AdminPanelToolbarActions>{footerButtons}</AdminPanelToolbarActions>
        </AdminPanelStickyToolbar>
      )
      : null;

  const bottomActions = useDockedPanelFooter
    ? null
    : !embeddedInPanel
      ? (
        <AdminStickyPageHeader pin="scroll">
          <div className={styles.editFormFooter}>{footerButtons}</div>
        </AdminStickyPageHeader>
      )
      : null;

  return (
    <form
      id={panelFormId}
      className={variantStyles.wrap}
      onSubmit={(e) => void save(e)}
      noValidate
    >
      {topActions}
      <div className="field">
        <AdminTranslateField
          viLabel="Tên (Tiếng Việt)"
          enLabel="Tên (English)"
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
          disabled={busy}
          rows={1}
          viMaxLength={MAX_NAME_LEN + 20}
          enMaxLength={MAX_NAME_LEN + 20}
        />
        {fieldErrors.nameVi ? <p className={variantStyles.fieldError}>{fieldErrors.nameVi}</p> : null}
        {fieldErrors.nameEn ? <p className={variantStyles.fieldError}>{fieldErrors.nameEn}</p> : null}
      </div>

      <div className="field">
        <label>Mã sản phẩm — cố định sau khi tạo</label>
        <div className={styles.slugReadonly} title="Định dạng SP-00000000001">
          <code>{product.productCode ?? "—"}</code>
        </div>
      </div>

      <div className="field">
        <label>Slug (URL) — cố định sau khi tạo</label>
        <div className={styles.slugReadonly} title="Slug cố định sau khi tạo">
          <code>/{product.slug}</code>
        </div>
      </div>

      <div className="field">
        <span className={variantStyles.descFieldTitle}>Mô tả sản phẩm</span>
        <AdminTranslateField
          viLabel="Mô tả (Tiếng Việt)"
          enLabel="Mô tả (English)"
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
          disabled={busy}
          rows={6}
          viMaxLength={MAX_DESC_LEN}
          enMaxLength={MAX_DESC_LEN}
        />
        {fieldErrors.descriptionVi ? <p className={variantStyles.fieldError}>{fieldErrors.descriptionVi}</p> : null}
        {fieldErrors.descriptionEn ? <p className={variantStyles.fieldError}>{fieldErrors.descriptionEn}</p> : null}
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
          aria-invalid={!!fieldErrors.basePrice}
          disabled={busy}
        />
        {fieldErrors.basePrice ? <p className={variantStyles.fieldError}>{fieldErrors.basePrice}</p> : null}
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
          aria-invalid={!!fieldErrors.discountPercent}
          disabled={busy}
        />
        {fieldErrors.discountPercent ? <p className={variantStyles.fieldError}>{fieldErrors.discountPercent}</p> : null}
      </div>

      <div className="field">
        <label>Giá sau giảm (lưu DB)</label>
        <input type="text" readOnly value={formatVnd(previewSale)} tabIndex={-1} aria-readonly className={styles.readonlyHint} />
      </div>

      <div className="field">
        <label>Tiền cọc / đơn vị (₫)</label>
        <input
          type="number"
          min={0}
          step={1}
          value={depositAmount === "" ? "" : depositAmount}
          onChange={(e) => {
            const val = e.target.value;
            setDepositAmount(val === "" ? "" : Number(val));
            clearFieldError("depositAmount");
          }}
          placeholder="Để trống nếu không cho đặt cọc"
          aria-invalid={!!fieldErrors.depositAmount}
          disabled={busy}
        />
        {fieldErrors.depositAmount ? <p className={variantStyles.fieldError}>{fieldErrors.depositAmount}</p> : null}
      </div>

      <div className="field">
        <label>Danh mục</label>
        <div className={variantStyles.categorySelectWrap}>
          <Select<string>
            className={variantStyles.categorySelect}
            value={categoryId}
            onChange={(id) => {
              setCategoryId(id);
              clearFieldError("categoryId");
            }}
            status={fieldErrors.categoryId ? "error" : undefined}
            disabled={busy}
            options={categorySelectOptions}
            variant="outlined"
            suffixIcon={<ChevronDown size={18} strokeWidth={2} aria-hidden />}
            menuItemSelectedIcon={SELECT_MENU_CHECK}
            popupMatchSelectWidth={false}
            listHeight={320}
          />
          <button
            type="button"
            className={`btn btn--ghost adminPanelGhostAccent ${variantStyles.categoryCreateBtn}`}
            disabled={busy}
            onClick={() => setCreateCategoryOpen(true)}
          >
            Tạo danh mục
          </button>
        </div>
        {fieldErrors.categoryId ? <p className={variantStyles.fieldError}>{fieldErrors.categoryId}</p> : null}
      </div>

      <CreateCategoryModal
        open={createCategoryOpen}
        onClose={() => setCreateCategoryOpen(false)}
        onCreated={(c) => void onCategoryCreated(c)}
      />

      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: "1rem" }}>
        <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} disabled={busy} />
        Nổi bật
      </label>

      <div className="field">
        <label>Tag hiển thị shop (tuỳ chọn)</label>
        <input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="VD: Mới, Combo, Hàng order — phân tách bằng dấu phẩy"
          maxLength={400}
          disabled={busy}
          autoComplete="off"
        />
        <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
          Tối đa 8 nhãn, mỗi nhãn tối đa 40 ký tự. Nếu bật «Nổi bật», thẻ shop sẽ thêm nhãn tương ứng (trùng tên thì gộp).
        </p>
      </div>

      <div className="field">
        <label>Thương hiệu — Tiếng Việt (tuỳ chọn, SKU)</label>
        <input
          value={brandNameVi}
          onChange={(e) => setBrandNameVi(e.target.value)}
          maxLength={120}
          disabled={busy}
        />
      </div>
      <div className="field">
        <label>Thương hiệu — English (tuỳ chọn)</label>
        <input
          value={brandNameEn}
          onChange={(e) => setBrandNameEn(e.target.value)}
          maxLength={120}
          disabled={busy}
        />
      </div>

      <div className="field">
        <label>Meta title — Tiếng Việt (tuỳ chọn)</label>
        <input
          value={metaTitleVi}
          onChange={(e) => {
            setMetaTitleVi(e.target.value);
            clearFieldError("metaTitleVi");
          }}
          maxLength={MAX_META + 20}
          aria-invalid={!!fieldErrors.metaTitleVi}
          disabled={busy}
        />
        {fieldErrors.metaTitleVi ? <p className={variantStyles.fieldError}>{fieldErrors.metaTitleVi}</p> : null}
      </div>
      <div className="field">
        <label>Meta title — English (tuỳ chọn)</label>
        <input
          value={metaTitleEn}
          onChange={(e) => {
            setMetaTitleEn(e.target.value);
            clearFieldError("metaTitleEn");
          }}
          maxLength={MAX_META + 20}
          aria-invalid={!!fieldErrors.metaTitleEn}
          disabled={busy}
        />
        {fieldErrors.metaTitleEn ? <p className={variantStyles.fieldError}>{fieldErrors.metaTitleEn}</p> : null}
      </div>

      <div className="field">
        <label>Meta description — Tiếng Việt (tuỳ chọn)</label>
        <input
          value={metaDescriptionVi}
          onChange={(e) => {
            setMetaDescriptionVi(e.target.value);
            clearFieldError("metaDescriptionVi");
          }}
          maxLength={MAX_META + 20}
          aria-invalid={!!fieldErrors.metaDescriptionVi}
          disabled={busy}
        />
        {fieldErrors.metaDescriptionVi ? (
          <p className={variantStyles.fieldError}>{fieldErrors.metaDescriptionVi}</p>
        ) : null}
      </div>
      <div className="field">
        <label>Meta description — English (tuỳ chọn)</label>
        <input
          value={metaDescriptionEn}
          onChange={(e) => {
            setMetaDescriptionEn(e.target.value);
            clearFieldError("metaDescriptionEn");
          }}
          maxLength={MAX_META + 20}
          aria-invalid={!!fieldErrors.metaDescriptionEn}
          disabled={busy}
        />
        {fieldErrors.metaDescriptionEn ? (
          <p className={variantStyles.fieldError}>{fieldErrors.metaDescriptionEn}</p>
        ) : null}
      </div>

      <h2 className={variantStyles.sectionTitle}>Biến thể (màu × kích thước)</h2>
      <p className="muted" style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>
        Mỗi tab là một biến thể: chỉnh kích thước, điều chỉnh giá, tồn kho, ảnh. Crop ảnh 3:4 rồi thêm; chỉ khi bấm{" "}
        <strong>Lưu thay đổi</strong> mới upload và ghi DB.
      </p>
      {fieldErrors.variants ? <p className={variantStyles.fieldError}>{fieldErrors.variants}</p> : null}

      <div className={variantStyles.tabStrip} role="tablist" aria-label="Chọn biến thể">
        {variantRows.map((row, i) => (
          <button
            key={row.id}
            type="button"
            role="tab"
            aria-selected={i === activeVariantTab}
            className={i === activeVariantTab ? `${variantStyles.tab} ${variantStyles.tabActive}` : variantStyles.tab}
            disabled={busy}
            onClick={() => setActiveVariantTab(i)}
          >
            {row.colorLabelVi.trim() || `Biến thể ${i + 1}`}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: "0.65rem" }}>
        <button
          type="button"
          className={`btn btn--ghost adminPanelGhostAccent ${variantStyles.categoryCreateBtn}`}
          disabled={busy}
          onClick={() => void addVariant()}
        >
          + Thêm biến thể
        </button>
      </div>

      {v ? (
        <div className={`card ${variantStyles.variantCard}`} role="tabpanel">
          <div className={variantStyles.variantCardToolbar}>
            <button
              type="button"
              className={`btn btn--ghost adminPanelGhostDanger ${variantStyles.variantRemoveBtn}`}
              disabled={busy || variantRows.length <= 1}
              onClick={() => void deleteActiveVariant()}
            >
              Xóa biến thể này
            </button>
          </div>
          <div className={variantStyles.colorTableWrap}>
            <div className={variantStyles.colorGridHead} aria-hidden>
              <span>Tên màu (VI / EN)</span>
              <span>Mã màu (hex)</span>
              <span>Chọn màu</span>
            </div>
            <div className={variantStyles.colorGridRow}>
              <div className={variantStyles.colorGridCell}>
                <input
                  className={styles.colorLabelInput}
                  value={v.colorLabelVi}
                  onChange={(e) => {
                    setVariant(vi, { colorLabelVi: e.target.value });
                    clearFieldError(`v${vi}-colorLabelVi`);
                  }}
                  placeholder="VD: Xám chì (VI)"
                  disabled={busy}
                  aria-invalid={!!fieldErrors[`v${vi}-colorLabelVi`]}
                />
                {fieldErrors[`v${vi}-colorLabelVi`] ? (
                  <p className={variantStyles.fieldError}>{fieldErrors[`v${vi}-colorLabelVi`]}</p>
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
                  disabled={busy}
                  aria-invalid={!!fieldErrors[`v${vi}-colorLabelEn`]}
                />
                {fieldErrors[`v${vi}-colorLabelEn`] ? (
                  <p className={variantStyles.fieldError}>{fieldErrors[`v${vi}-colorLabelEn`]}</p>
                ) : null}
              </div>
              <div className={variantStyles.colorGridCell}>
                <input
                  className={variantStyles.hexInput}
                  value={v.colorHex}
                  onChange={(e) => {
                    setVariant(vi, { colorHex: e.target.value });
                    clearFieldError(`v${vi}-hex`);
                  }}
                  placeholder="#6b6560"
                  spellCheck={false}
                  disabled={busy}
                  aria-invalid={!!fieldErrors[`v${vi}-hex`]}
                />
                {fieldErrors[`v${vi}-hex`] ? (
                  <p className={variantStyles.fieldError}>{fieldErrors[`v${vi}-hex`]}</p>
                ) : null}
              </div>
              <div className={`${variantStyles.colorGridCell} ${variantStyles.colorSwatchCell}`}>
                <input
                  type="color"
                  className={variantStyles.swatchInput}
                  value={hexForNativeColorInput(v.colorHex)}
                  onChange={(e) => {
                    setVariant(vi, { colorHex: e.target.value.toLowerCase() });
                    clearFieldError(`v${vi}-hex`);
                  }}
                  disabled={busy}
                  aria-label="Bảng chọn màu hệ thống"
                />
              </div>
            </div>
            <p className={variantStyles.hexHint}>Nhập hex hoặc dùng ô chọn màu (#rrggbb).</p>
          </div>

          <div className={variantStyles.dimsGrid}>
            <label className={variantStyles.dimField}>
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
                disabled={busy}
                aria-invalid={!!fieldErrors[`v${vi}-dim-heightCm`]}
              />
              {fieldErrors[`v${vi}-dim-heightCm`] ? (
                <span className={variantStyles.fieldError}>{fieldErrors[`v${vi}-dim-heightCm`]}</span>
              ) : null}
            </label>
            <label className={variantStyles.dimField}>
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
                disabled={busy}
                aria-invalid={!!fieldErrors[`v${vi}-dim-lengthCm`]}
              />
              {fieldErrors[`v${vi}-dim-lengthCm`] ? (
                <span className={variantStyles.fieldError}>{fieldErrors[`v${vi}-dim-lengthCm`]}</span>
              ) : null}
            </label>
            <label className={variantStyles.dimField}>
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
                disabled={busy}
                aria-invalid={!!fieldErrors[`v${vi}-dim-widthCm`]}
              />
              {fieldErrors[`v${vi}-dim-widthCm`] ? (
                <span className={variantStyles.fieldError}>{fieldErrors[`v${vi}-dim-widthCm`]}</span>
              ) : null}
            </label>
          </div>

          <div className={variantStyles.priceAdjustmentBlock}>
            <label htmlFor={`admin-v-${vi}-price-adj`}>Giá gốc biến thể (₫)</label>
            <input
              id={`admin-v-${vi}-price-adj`}
              className={variantStyles.priceAdjustmentInput}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0 — dùng giá gốc sản phẩm"
              value={String(v.priceAdjustment)}
              onChange={(e) => {
                setVariant(vi, { priceAdjustment: parseMoneyDigits(e.target.value) });
                clearFieldError(`v${vi}-priceAdj`);
              }}
              disabled={busy}
              aria-invalid={!!fieldErrors[`v${vi}-priceAdj`]}
            />
            <p className={variantStyles.priceAdjustHint}>
              Niêm yết để áp % giảm: {formatVnd(variantListPrice(basePrice, v.priceAdjustment))} (giá gốc biến thể hoặc
              giá gốc SP {formatVnd(basePrice)}). Giảm giá SP hiện tại: {discountPercent}%.
            </p>
            <p className={variantStyles.priceAdjustPreview}>
              Giá hiển thị khách:{" "}
              {formatVnd(
                variantUnitPrice(
                  { basePrice, salePrice: product.salePrice ?? null, discountPercent },
                  v.priceAdjustment,
                ),
              )}
            </p>
            {fieldErrors[`v${vi}-priceAdj`] ? (
              <p className={variantStyles.fieldError}>{fieldErrors[`v${vi}-priceAdj`]}</p>
            ) : null}
          </div>

          <div className={variantStyles.stockBlock}>
            <span className={variantStyles.stockLabel}>Tồn kho</span>
            <QuantityStepper
              value={Number.isFinite(v.stockQuantity) ? Math.max(0, Math.round(v.stockQuantity)) : 0}
              min={0}
              max={QUANTITY_STEPPER_ADMIN_MAX}
              disabled={busy}
              onChange={(q) => {
                setVariant(vi, { stockQuantity: q });
                clearFieldError(`v${vi}-stock`);
              }}
            />
            {fieldErrors[`v${vi}-stock`] ? (
              <p className={variantStyles.fieldError}>{fieldErrors[`v${vi}-stock`]}</p>
            ) : null}
          </div>

          <div className={variantStyles.imagesField}>
            <VariantImagesField
              existingUrls={v.imageUrls}
              newFiles={v.imageFiles}
              onExistingUrlsChange={(urls) => setVariant(vi, { imageUrls: urls })}
              onNewFilesChange={(next) => updateVariantNewFiles(vi, next)}
              disabled={busy}
            />
          </div>
        </div>
      ) : null}

      {err ? (
        <p style={{ color: "crimson", textAlign: "left", marginTop: "0.5rem", marginBottom: 0 }}>{err}</p>
      ) : null}
      {bottomActions}
    </form>
  );
  },
);

ProductEditForm.displayName = "ProductEditForm";
