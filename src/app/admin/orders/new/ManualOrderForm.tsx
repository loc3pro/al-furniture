"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { VnAddressCascader } from "@/components/address/VnAddressCascader";
import { AdminPanelStickyToolbar, AdminPanelToolbarActions } from "@/components/admin/AdminPanelStickyToolbar";
import { useAdminRightPanelOptional } from "@/components/admin/AdminRightPanel";
import { QuantityStepper, QUANTITY_STEPPER_ADMIN_MAX } from "@/components/ui/QuantityStepper";
import { Spinner } from "@/components/ui/Spinner";
import { showAdminToast } from "@/lib/admin-toast";
import { formatVnd } from "@/lib/money";
import { stableValueJson } from "@/lib/form-dirty-snapshot";
import { useDebouncedValue, SEARCH_API_DEBOUNCE_MS } from "@/lib/use-debounced-value";
import { looksLikeEmail, looksLikePhone } from "@/lib/identifiers";
import styles from "./manual-order.module.scss";

type Line = {
  variantId: string;
  /** Hiển thị: tên SP · màu / size */
  productLabel: string;
  unitPrice: number | null;
  quantity: number;
};

type VariantHit = {
  id: string;
  sku: string;
  productName: string;
  colorLabel: string;
  sizeLabel: string;
  stockQuantity: number;
  unitPrice: number;
};

type FieldErrors = Partial<{
  name: string;
  phone: string;
  email: string;
  userId: string;
  line: string;
  city: string;
  district: string;
  ward: string;
  items: string;
}>;

const MAX_NAME = 200;
const MAX_LINE = 500;
const MAX_EMAIL = 254;

function emptyLine(): Line {
  return { variantId: "", productLabel: "", unitPrice: null, quantity: 1 };
}

function mergeLinesForSubmit(lines: Line[]): { variantId: string; quantity: number }[] {
  const map = new Map<string, number>();
  for (const l of lines) {
    const id = l.variantId.trim();
    if (!id) continue;
    const q = Math.min(QUANTITY_STEPPER_ADMIN_MAX, Math.max(1, Math.round(l.quantity)));
    map.set(id, (map.get(id) ?? 0) + q);
  }
  return [...map.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
}

/** CUID Prisma-style */
function looksLikeCuid(s: string): boolean {
  const t = s.trim();
  return /^c[a-z0-9]{20,40}$/i.test(t);
}

const MANUAL_ORDER_EMPTY_SNAP = stableValueJson({
  lines: [{ variantId: "", productLabel: "", unitPrice: null, quantity: 1 }],
  name: "",
  phone: "",
  email: "",
  line1: "",
  ward: "",
  district: "",
  city: "",
  userId: "",
});

export function ManualOrderForm({
  onSuccess,
  embeddedInPanel,
  panelFormId,
}: { onSuccess?: () => void; embeddedInPanel?: boolean; panelFormId?: string } = {}) {
  const router = useRouter();
  const rightPanel = useAdminRightPanelOptional();
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [line1, setLine1] = useState("");
  const [ward, setWard] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [userId, setUserId] = useState("");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<VariantHit[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const orderDirtySnap = useMemo(
    () =>
      stableValueJson({
        lines: lines.map((l) => ({
          variantId: l.variantId.trim(),
          productLabel: l.productLabel.trim(),
          unitPrice: l.unitPrice,
          quantity: Math.min(QUANTITY_STEPPER_ADMIN_MAX, Math.max(1, Math.round(l.quantity))),
        })),
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        line1: line1.trim(),
        ward: ward.trim(),
        district: district.trim(),
        city: city.trim(),
        userId: userId.trim(),
      }),
    [lines, name, phone, email, line1, ward, district, city, userId],
  );
  const isDirty = orderDirtySnap !== MANUAL_ORDER_EMPTY_SNAP;

  const debouncedQ = useDebouncedValue(q, SEARCH_API_DEBOUNCE_MS);

  useEffect(() => {
    if (debouncedQ.trim().length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    void fetch(`/api/admin/variants?q=${encodeURIComponent(debouncedQ.trim())}`, {
      credentials: "same-origin",
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (Array.isArray(d.variants)) setHits(d.variants as VariantHit[]);
      })
      .catch(() => {
        if (!cancelled) setHits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  function addLine() {
    setLines([...lines, emptyLine()]);
  }

  function pickHit(hit: VariantHit) {
    const idx = lines.findIndex((l) => !l.variantId.trim());
    const i = idx >= 0 ? idx : Math.max(0, lines.length - 1);
    const next = [...lines];
    next[i] = {
      ...next[i]!,
      variantId: hit.id,
      productLabel: `${hit.productName} · ${hit.colorLabel} / ${hit.sizeLabel}`,
      unitPrice: hit.unitPrice,
    };
    setLines(next);
    setFieldErrors((fe) => ({ ...fe, items: undefined }));
    setQ("");
    setHits([]);
  }

  function removeLineAt(i: number) {
    setLines((rows) => {
      if (rows.length <= 1) return rows;
      return rows.filter((_, idx) => idx !== i);
    });
  }

  function validate(): FieldErrors | null {
    const e: FieldErrors = {};
    const nt = name.trim();
    if (!nt) e.name = "Nhập họ tên.";
    else if (nt.length > MAX_NAME) e.name = `Tối đa ${MAX_NAME} ký tự.`;

    const pt = phone.trim();
    if (!pt) e.phone = "Nhập số điện thoại.";
    else if (!looksLikePhone(pt)) e.phone = "Số điện thoại không hợp lệ.";

    const em = email.trim();
    if (em.length > MAX_EMAIL) e.email = "Email quá dài.";
    else if (em && !looksLikeEmail(em)) e.email = "Email không đúng định dạng.";

    const uid = userId.trim();
    if (uid && !looksLikeCuid(uid)) e.userId = "User ID phải là mã CUID hợp lệ (để trống nếu không gán).";

    const ad = line1.trim();
    if (!ad) e.line = "Nhập địa chỉ.";
    else if (ad.length > MAX_LINE) e.line = `Tối đa ${MAX_LINE} ký tự.`;

    const ct = city.trim();
    const dt = district.trim();
    const wt = ward.trim();
    if (!ct) e.city = "Chọn tỉnh/thành.";
    if (!dt) e.district = "Chọn quận/huyện.";
    if (!wt) e.ward = "Chọn phường/xã.";

    const items = mergeLinesForSubmit(lines);
    if (items.length === 0) e.items = "Chọn ít nhất một sản phẩm từ ô gợi ý.";

    return Object.keys(e).length > 0 ? e : null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!isDirty) return;
    setErr(null);
    const ve = validate();
    if (ve) {
      setFieldErrors(ve);
      setErr("Vui lòng sửa các trường được đánh dấu.");
      return;
    }
    setFieldErrors({});

    const items = mergeLinesForSubmit(lines);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          userId: userId.trim() && looksLikeCuid(userId.trim()) ? userId.trim() : null,
          items,
          shipping: {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
            line: line1.trim(),
            ward: ward.trim(),
            district: district.trim(),
            city: city.trim(),
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (data as { error?: string }).error ?? "Tạo đơn thất bại";
        setErr(msg);
        showAdminToast(msg, "error");
        return;
      }
      showAdminToast("Đã tạo đơn hàng");
      onSuccess?.();
      if (!embeddedInPanel) {
        router.push(`/admin/orders`);
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const useDockedPanelFooter = Boolean(embeddedInPanel && panelFormId);

  const submitToolbar = (
    <AdminPanelToolbarActions>
      <button
        type="submit"
        className={`btn btn--primary ${styles.submitBtn}`}
        disabled={submitting || !isDirty}
        title="Tạo đơn COD và trừ tồn kho"
      >
        {submitting ? <Spinner size="sm" inheritColor label="Đang tạo đơn" /> : "Tạo đơn"}
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
  );

  /** Chỉ cho phép xóa dòng khi có ≥ 2 dòng — luôn giữ ít nhất một dòng trong form. */
  const canRemoveProductLine = lines.length > 1;

  return (
    <form
      id={panelFormId || undefined}
      className={[styles.form, embeddedInPanel ? styles.formEmbeddedPanel : ""].filter(Boolean).join(" ")}
      onSubmit={(e) => void submit(e)}
      noValidate
    >
      {embeddedInPanel && !useDockedPanelFooter ? <AdminPanelStickyToolbar>{submitToolbar}</AdminPanelStickyToolbar> : null}
      <section className={styles.section}>
        <h2 className={styles.h2}>Khách / giao hàng</h2>
        <div className={styles.grid}>
          <label className={styles.field}>
            Họ tên *
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors((fe) => ({ ...fe, name: undefined }));
              }}
              autoComplete="name"
              aria-invalid={fieldErrors.name ? true : undefined}
              maxLength={MAX_NAME}
            />
            {fieldErrors.name ? <p className={styles.fieldError}>{fieldErrors.name}</p> : null}
          </label>
          <label className={styles.field}>
            SĐT *
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setFieldErrors((fe) => ({ ...fe, phone: undefined }));
              }}
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={fieldErrors.phone ? true : undefined}
            />
            {fieldErrors.phone ? <p className={styles.fieldError}>{fieldErrors.phone}</p> : null}
          </label>
          <label className={styles.field}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErrors((fe) => ({ ...fe, email: undefined }));
              }}
              autoComplete="email"
              aria-invalid={fieldErrors.email ? true : undefined}
              maxLength={MAX_EMAIL}
            />
            {fieldErrors.email ? <p className={styles.fieldError}>{fieldErrors.email}</p> : null}
          </label>
          <label className={styles.field}>
            User ID (tuỳ chọn)
            <input
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setFieldErrors((fe) => ({ ...fe, userId: undefined }));
              }}
              placeholder="cuid người dùng"
              aria-invalid={fieldErrors.userId ? true : undefined}
              spellCheck={false}
            />
            {fieldErrors.userId ? <p className={styles.fieldError}>{fieldErrors.userId}</p> : null}
          </label>
          <label className={`${styles.field} ${styles.wide}`}>
            Địa chỉ *
            <input
              value={line1}
              onChange={(e) => {
                setLine1(e.target.value);
                setFieldErrors((fe) => ({ ...fe, line: undefined }));
              }}
              autoComplete="street-address"
              aria-invalid={fieldErrors.line ? true : undefined}
              maxLength={MAX_LINE}
            />
            {fieldErrors.line ? <p className={styles.fieldError}>{fieldErrors.line}</p> : null}
          </label>
          <label className={`${styles.field} ${styles.wide}`}>
            Tỉnh / Quận / Phường *
            <VnAddressCascader
              value={{ city, district, ward }}
              onChange={(v) => {
                setCity(v.city);
                setDistrict(v.district);
                setWard(v.ward);
                setFieldErrors((fe) => ({
                  ...fe,
                  city: undefined,
                  district: undefined,
                  ward: undefined,
                }));
              }}
            />
            {fieldErrors.city ? <p className={styles.fieldError}>{fieldErrors.city}</p> : null}
            {fieldErrors.district ? <p className={styles.fieldError}>{fieldErrors.district}</p> : null}
            {fieldErrors.ward ? <p className={styles.fieldError}>{fieldErrors.ward}</p> : null}
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <div className={embeddedInPanel ? styles.productSearchStickyPanel : undefined}>
          <h2 className={styles.h2}>Sản phẩm</h2>
          <p className={styles.hint}>
            Tìm theo tên SP, SKU, màu hoặc kích thước — chọn một dòng để gán vào ô sản phẩm (không cần dán mã biến
            thể).
          </p>
          <label className={styles.field}>
            Gợi ý biến thể
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="gõ ít nhất 2 ký tự…" />
          </label>
          {hits.length > 0 ? (
            <ul className={styles.hitList}>
              {hits.map((h) => (
                <li key={h.id}>
                  <button type="button" className={styles.hitBtn} onClick={() => pickHit(h)}>
                    <strong>{h.productName}</strong> · {h.colorLabel} / {h.sizeLabel} · SKU {h.sku} · tồn{" "}
                    {h.stockQuantity} · {formatVnd(h.unitPrice)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {fieldErrors.items ? <p className={styles.fieldError}>{fieldErrors.items}</p> : null}

        <div className={styles.linesBlock}>
          <div className={styles.linesColHead}>
            <span>Sản phẩm *</span>
            <div className={styles.linesColHeadMeta}>
              <span className={styles.linesColHeadCenter}>SL *</span>
              <span className={styles.linesColHeadActions} aria-hidden />
            </div>
          </div>
          {lines.map((ln, i) => (
            <div key={i} className={styles.lineRow}>
              <label className={styles.productPick}>
                <span className="visually-hidden">
                  Sản phẩm (dòng {i + 1}) — chọn từ ô gợi ý phía trên
                </span>
                {ln.variantId.trim() ? (
                  <div className={styles.productPickCard}>
                    <span className={styles.productPickDisplay}>{ln.productLabel}</span>
                    {ln.unitPrice != null ? (
                      <span className={styles.productPickMeta}>Đơn giá: {formatVnd(ln.unitPrice)}</span>
                    ) : null}
                  </div>
                ) : (
                  <span className={styles.productPickEmpty}>Chọn từ ô gợi ý phía trên…</span>
                )}
              </label>
              <div className={styles.lineMetaRow}>
                <div className={styles.lineQty}>
                  <QuantityStepper
                    className={styles.lineQtyStepper}
                    size="sm"
                    ariaLabel={`Số lượng dòng ${i + 1}`}
                    value={Math.max(1, Math.round(ln.quantity)) || 1}
                    min={1}
                    max={QUANTITY_STEPPER_ADMIN_MAX}
                    onChange={(quantity) => {
                      const n = [...lines];
                      n[i] = { ...n[i]!, quantity };
                      setLines(n);
                    }}
                  />
                </div>
                <div className={styles.lineDeleteCell}>
                  <button
                    type="button"
                    className={styles.rowClear}
                    disabled={!canRemoveProductLine}
                    onClick={() => removeLineAt(i)}
                    aria-label={
                      canRemoveProductLine ? `Xóa dòng sản phẩm thứ ${i + 1}` : "Giữ ít nhất một dòng — không thể xóa"
                    }
                    title={
                      canRemoveProductLine
                        ? "Xóa dòng này"
                        : "Thêm dòng thứ hai (\"+ Dòng sản phẩm\") để có thể xóa dòng"
                    }
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn--ghost" onClick={addLine}>
          + Dòng sản phẩm
        </button>
      </section>

      {err ? <p className={styles.err}>{err}</p> : null}

      {!embeddedInPanel ? (
        <div className={styles.submitStickyBar}>
          <button
            type="submit"
            className={`btn btn--primary ${styles.submitBtn} ${styles.submitBtnBlock}`}
            disabled={submitting || !isDirty}
            title="Tạo đơn COD và trừ tồn kho"
          >
            {submitting ? <Spinner size="sm" inheritColor label="Đang tạo đơn" /> : "Tạo đơn"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
