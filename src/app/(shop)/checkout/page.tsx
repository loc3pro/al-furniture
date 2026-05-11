"use client";

import Link from "next/link";
import { Select } from "antd";
import { ChevronDown, Gift, Trash2, X } from "lucide-react";
import { SELECT_MENU_CHECK } from "@/design-system/select-icons";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { cartLineUnitPrice, clear, removeLine, selectCartTotal, setQuantity } from "@/features/cart/cartSlice";
import { VnAddressCascader } from "@/components/address/VnAddressCascader";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { SectionLoading } from "@/components/ui/SectionLoading";
import { Spinner } from "@/components/ui/Spinner";
import { useShopSession } from "@/components/session/ShopSessionProvider";
import { externalMapsHref, previewMapIframeSrc } from "@/lib/map-embed";
import { formatVnd } from "@/lib/money";
import {
  cartPieceCount,
  formatCartLinesAndPieces,
} from "@/lib/cart-summary-label";
import { showAppToast } from "@/lib/app-toast";
import styles from "./CheckoutPage.module.scss";

type Me = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

type AddrRow = {
  id: string;
  line: string;
  ward: string | null;
  district: string | null;
  city: string;
  isDefault: boolean;
};

type RetailStoreRow = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  openingHours: string | null;
  mapUrl: string | null;
};

type SpinCouponInventoryRow = {
  id: string;
  code: string;
  label: string;
  expiresAt: string;
  usedAt: string | null;
};

function isSpinCouponUsable(c: SpinCouponInventoryRow): boolean {
  if (c.usedAt != null) return false;
  return new Date(c.expiresAt).getTime() > Date.now();
}

function emptyForm() {
  return {
    name: "",
    phone: "",
    email: "",
    line: "",
    ward: "",
    district: "",
    city: "",
  };
}

/** Chuẩn hoá số VN: bỏ ký tự không phải số, 84... → 0... */
function normalizeVnPhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("84") && d.length >= 10) d = "0" + d.slice(2);
  return d;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormFields = ReturnType<typeof emptyForm>;

type FieldKey = keyof FormFields;

/**
 * Validate toàn bộ thông tin giao hàng trước khi gửi đơn.
 * Trả về map lỗi theo tên field (rỗng nếu hợp lệ).
 */
function validateShippingForm(
  f: FormFields,
  opts?: { emailFromAccount?: boolean; accountEmail?: string; pickupOnly?: boolean }
): Partial<Record<FieldKey, string>> {
  const e: Partial<Record<FieldKey, string>> = {};
  const name = f.name.trim();
  if (!name) e.name = "Vui lòng nhập họ tên.";
  else if (name.length > 200) e.name = "Họ tên quá dài.";

  const phoneNorm = normalizeVnPhone(f.phone);
  if (!f.phone.trim()) e.phone = "Vui lòng nhập số điện thoại.";
  else if (phoneNorm.length < 9 || phoneNorm.length > 11) {
    e.phone = "Số điện thoại không hợp lệ (khoảng 9–11 số, ví dụ 09xx xxx xxx).";
  } else if (!/^0\d{8,10}$/.test(phoneNorm)) {
    e.phone = "Số điện thoại phải bắt đầu bằng 0 và đủ chữ số.";
  }

  const em = opts?.emailFromAccount && opts.accountEmail
    ? opts.accountEmail.trim()
    : f.email.trim();
  if (em && !EMAIL_RE.test(em)) e.email = "Email không đúng định dạng.";

  if (opts?.pickupOnly) {
    return e;
  }

  if (!f.line.trim()) e.line = "Vui lòng nhập địa chỉ (số nhà, đường).";
  else if (f.line.trim().length > 500) e.line = "Địa chỉ quá dài.";

  if (!f.ward.trim()) e.ward = "Vui lòng nhập phường/xã.";
  else if (f.ward.trim().length > 200) e.ward = "Phường/xã quá dài.";

  if (!f.district.trim()) e.district = "Vui lòng nhập quận/huyện.";
  else if (f.district.trim().length > 200) e.district = "Quận/huyện quá dài.";

  if (!f.city.trim()) e.city = "Vui lòng nhập tỉnh/thành phố.";
  else if (f.city.trim().length > 200) e.city = "Tỉnh/thành quá dài.";

  return e;
}

/** Áp mã vòng quay từ URL ?spinCoupon= hoặc ?coupon= (ví dụ từ trang tài khoản). */
function SpinCouponQuerySync({ onCode }: { onCode: (code: string) => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processed = useRef<string | null>(null);

  useEffect(() => {
    const raw = searchParams.get("spinCoupon") ?? searchParams.get("coupon");
    if (!raw?.trim()) {
      processed.current = null;
      return;
    }
    const code = raw.trim().toUpperCase();
    if (processed.current === code) return;
    processed.current = code;
    onCode(code);
    router.replace("/checkout", { scroll: false });
  }, [searchParams, router, onCode]);

  return null;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user: sessionUser, status: sessionStatus } = useShopSession();
  const lines = useAppSelector((s) => s.cart.lines);
  const dispatch = useAppDispatch();
  const total = selectCartTotal(lines);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pay, setPay] = useState<"COD" | "MOMO" | "BANK_TRANSFER">("MOMO");
  const [bankAccounts, setBankAccounts] = useState<
    {
      id: string;
      bankName: string;
      accountHolder: string;
      accountNumber: string;
      branch: string | null;
      note: string | null;
      qrCodeUrl: string | null;
    }[]
  >([]);
  const [qrLightboxUrl, setQrLightboxUrl] = useState<string | null>(null);

  /** Chỉ sau mount mới tin `lines` (Redux persist) — tránh SSR «giỏ trống» vs client có hàng → hydrate lỗi. */
  const [clientCartReady, setClientCartReady] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [addresses, setAddresses] = useState<AddrRow[]>([]);
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  /** Chỉ khi đã đăng nhập và có ít nhất một địa chỉ đã lưu */
  const [addrMode, setAddrMode] = useState<"saved" | "manual">("saved");
  const [shipTab, setShipTab] = useState<"door" | "store">("door");
  const [retailStores, setRetailStores] = useState<RetailStoreRow[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [orderNote, setOrderNote] = useState("");
  /** FULL | DEPOSIT_AUTO (theo SP admin) | DEPOSIT_MANUAL (nhập tay, chỉ CK + thương lượng) */
  const [splitChoice, setSplitChoice] = useState<"FULL" | "DEPOSIT_AUTO" | "DEPOSIT_MANUAL">("FULL");
  const [manualDepositStr, setManualDepositStr] = useState("");
  const [totalsPreview, setTotalsPreview] = useState<{
    total: number;
    subtotalBeforeCoupon?: number;
    couponDiscount?: number;
    spinCouponApplied?: string | null;
    depositEligible: boolean;
    depositDue: number;
    balanceDue: number;
  } | null>(null);
  const [spinCouponInput, setSpinCouponInput] = useState("");
  const [spinCouponApplied, setSpinCouponApplied] = useState<string | null>(null);
  const [couponErr, setCouponErr] = useState<string | null>(null);
  const [spinCouponInventory, setSpinCouponInventory] = useState<SpinCouponInventoryRow[]>([]);
  const [spinPickerOpen, setSpinPickerOpen] = useState(false);
  const [domReady, setDomReady] = useState(false);

  const displayTotal = totalsPreview?.total ?? total;
  const subtotalBeforeCoupon = totalsPreview?.subtotalBeforeCoupon ?? total;
  const couponDiscount = totalsPreview?.couponDiscount ?? 0;
  const cartPieces = useMemo(() => cartPieceCount(lines), [lines]);
  const spinPickerSorted = useMemo(() => {
    return [...spinCouponInventory].sort((a, b) => {
      const ua = isSpinCouponUsable(a) ? 0 : 1;
      const ub = isSpinCouponUsable(b) ? 0 : 1;
      if (ua !== ub) return ua - ub;
      return new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime();
    });
  }, [spinCouponInventory]);

  const parsedManualDeposit = useMemo(() => {
    const raw = manualDepositStr.replace(/\D/g, "");
    if (!raw) return null as number | null;
    const n = Math.round(Number(raw));
    if (n < 1) return null;
    return n;
  }, [manualDepositStr]);

  const effectiveDepositDue =
    splitChoice === "DEPOSIT_MANUAL" && parsedManualDeposit != null
      ? Math.min(parsedManualDeposit, displayTotal)
      : splitChoice === "DEPOSIT_AUTO" && totalsPreview
        ? totalsPreview.depositDue
        : null;
  const effectiveBalanceDue =
    effectiveDepositDue != null ? Math.max(0, displayTotal - effectiveDepositDue) : null;

  const applyAddressToForm = useCallback((a: AddrRow | undefined, u: Me | null) => {
    setForm({
      name: u?.name?.trim() ?? "",
      phone: u?.phone ?? "",
      email: u?.email?.trim() ?? "",
      line: a?.line ?? "",
      ward: a?.ward ?? "",
      district: a?.district ?? "",
      city: a?.city ?? "",
    });
  }, []);

  const handleAddrMode = useCallback(
    (mode: "saved" | "manual") => {
      setAddrMode(mode);
      if (!me) return;
      if (mode === "saved") {
        const id = selectedAddrId ?? addresses[0]?.id ?? null;
        const a = id ? addresses.find((x) => x.id === id) : addresses[0];
        if (a) {
          setSelectedAddrId(a.id);
          applyAddressToForm(a, me);
        }
      } else {
        setForm((f) => ({
          ...f,
          name: me.name?.trim() ?? f.name,
          phone: me.phone ?? f.phone,
          email: me.email?.trim() ?? f.email,
          line: "",
          ward: "",
          district: "",
          city: "",
        }));
      }
    },
    [me, addresses, selectedAddrId, applyAddressToForm],
  );

  useEffect(() => {
    setClientCartReady(true);
  }, []);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    let cancelled = false;
    void (async () => {
      try {
        if (!sessionUser?.id) {
          setMe(null);
          setAddresses([]);
          if (!cancelled) setBootLoading(false);
          return;
        }
        const user: Me = {
          id: sessionUser.id,
          name: sessionUser.name,
          email: sessionUser.email,
          phone: sessionUser.phone,
        };
        setMe(user);
        const ra = await fetch("/api/user/addresses", { credentials: "same-origin" });
        const ad = await ra.json().catch(() => ({}));
        const list: AddrRow[] = Array.isArray(ad.addresses) ? ad.addresses : [];
        if (cancelled) return;
        setAddresses(list);
        if (list.length > 0) {
          setAddrMode("saved");
          const def = list.find((x) => x.isDefault) ?? list[0];
          const selId = def?.id ?? null;
          setSelectedAddrId(selId);
          applyAddressToForm(def, user);
        } else {
          setAddrMode("manual");
          setSelectedAddrId(null);
          applyAddressToForm(undefined, user);
        }
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionStatus, sessionUser, applyAddressToForm]);

  const refreshSpinCouponInventory = useCallback(async () => {
    if (!sessionUser?.id) {
      setSpinCouponInventory([]);
      return;
    }
    try {
      const r = await fetch("/api/account/spin-coupons", { credentials: "same-origin" });
      if (!r.ok) {
        setSpinCouponInventory([]);
        return;
      }
      const d = (await r.json()) as {
        coupons?: Array<{
          id: string;
          code: string;
          label: string;
          expiresAt: string;
          usedAt: string | null;
        }>;
      };
      const rows = (d.coupons ?? []).map((c) => ({
        id: c.id,
        code: c.code,
        label: c.label,
        expiresAt: c.expiresAt,
        usedAt: c.usedAt,
      }));
      setSpinCouponInventory(rows);
    } catch {
      setSpinCouponInventory([]);
    }
  }, [sessionUser?.id]);

  useEffect(() => {
    void refreshSpinCouponInventory();
  }, [refreshSpinCouponInventory]);

  useEffect(() => {
    setDomReady(true);
  }, []);

  useEffect(() => {
    if (!spinPickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSpinPickerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spinPickerOpen]);

  useEffect(() => {
    if (!me || addresses.length === 0 || !selectedAddrId || addrMode !== "saved") return;
    const a = addresses.find((x) => x.id === selectedAddrId);
    if (a) applyAddressToForm(a, me);
  }, [selectedAddrId, me, addresses, applyAddressToForm, addrMode]);

  async function persistProfileAndAddress(
    shipping: {
      name: string;
      phone: string;
      email: string;
      line: string;
      ward: string;
      district: string;
      city: string;
    },
    opts: {
      skipEmailPatch: boolean;
      addrMode: "saved" | "manual";
      activeAddrId: string | null;
      skipAddress?: boolean;
    }
  ) {
    if (!me) return;
    try {
      const patchBody: Record<string, string> = {};
      if (shipping.name.trim()) patchBody.name = shipping.name.trim();
      if (shipping.phone.trim()) patchBody.phone = shipping.phone.trim();
      if (!opts.skipEmailPatch && shipping.email.trim()) patchBody.email = shipping.email.trim();
      if (Object.keys(patchBody).length > 0) {
        await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(patchBody),
        });
      }
    } catch {
      /* không chặn luồng đơn */
    }

    const addrPayload = {
      line: shipping.line.trim(),
      ward: shipping.ward.trim() || undefined,
      district: shipping.district.trim() || undefined,
      city: shipping.city.trim(),
      isDefault: true,
    };

    if (!opts.skipAddress) {
      try {
        if (opts.addrMode === "saved" && opts.activeAddrId) {
          await fetch(`/api/user/addresses/${opts.activeAddrId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(addrPayload),
          });
        } else {
          await fetch("/api/user/addresses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(addrPayload),
          });
        }
      } catch {
        /* ignore */
      }
    }
  }

  const clearFieldError = useCallback((k: FieldKey) => {
    setFieldErrors((p) => {
      if (!p[k]) return p;
      const n = { ...p };
      delete n[k];
      return n;
    });
  }, []);

  const applyCouponFromUrl = useCallback((code: string) => {
    setSpinCouponInput(code);
    setSpinCouponApplied(code);
    setCouponErr(null);
  }, []);

  useEffect(() => {
    if (lines.length === 0) {
      setTotalsPreview(null);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        const res = await fetch("/api/checkout/totals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
            ...(spinCouponApplied ? { spinCouponCode: spinCouponApplied } : {}),
          }),
        });
        const d = (await res.json().catch(() => null)) as {
          error?: string;
          total?: number;
          subtotalBeforeCoupon?: number;
          couponDiscount?: number;
          spinCouponApplied?: string | null;
          depositEligible?: boolean;
          depositDue?: number;
          balanceDue?: number;
        } | null;
        if (cancelled || !d) return;
        if (res.status === 401 && spinCouponApplied) {
          setCouponErr("Đăng nhập để áp dụng mã vòng quay.");
          setSpinCouponApplied(null);
          setTotalsPreview(null);
          return;
        }
        if (typeof d.error === "string" && spinCouponApplied) {
          setCouponErr(d.error);
          setSpinCouponApplied(null);
          setTotalsPreview(null);
          return;
        }
        if (typeof d.total !== "number") return;
        setCouponErr(null);
        setTotalsPreview({
          total: d.total,
          subtotalBeforeCoupon: d.subtotalBeforeCoupon,
          couponDiscount: d.couponDiscount,
          spinCouponApplied: d.spinCouponApplied ?? null,
          depositEligible: Boolean(d.depositEligible),
          depositDue: d.depositDue ?? 0,
          balanceDue: d.balanceDue ?? 0,
        });
      })();
    }, 320);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [lines, spinCouponApplied]);

  const checkoutPayMode = splitChoice === "FULL" ? "FULL" : "DEPOSIT";

  useEffect(() => {
    if (totalsPreview && !totalsPreview.depositEligible && splitChoice === "DEPOSIT_AUTO") {
      setSplitChoice("FULL");
    }
  }, [totalsPreview, splitChoice]);

  useEffect(() => {
    if (splitChoice === "DEPOSIT_MANUAL") {
      setPay("BANK_TRANSFER");
    }
  }, [splitChoice]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/public/bank-accounts");
        const d = await r.json().catch(() => ({}));
        if (cancelled || !Array.isArray(d.accounts)) return;
        setBankAccounts(d.accounts);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!qrLightboxUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQrLightboxUrl(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [qrLightboxUrl]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setStoresLoading(true);
      try {
        const r = await fetch("/api/public/retail-stores");
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        const list = Array.isArray(d.stores) ? (d.stores as RetailStoreRow[]) : [];
        setRetailStores(list);
        setSelectedStoreId((prev) => {
          if (list.length === 0) return null;
          if (prev && list.some((x) => x.id === prev)) return prev;
          return list[0].id;
        });
      } catch {
        if (!cancelled) setRetailStores([]);
      } finally {
        if (!cancelled) setStoresLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedStore = useMemo(
    () => retailStores.find((s) => s.id === selectedStoreId) ?? null,
    [retailStores, selectedStoreId],
  );
  const selectedStoreMapPreviewSrc = useMemo(
    () =>
      selectedStore
        ? previewMapIframeSrc({
            mapUrl: selectedStore.mapUrl,
            fallbackAddress: selectedStore.address,
          })
        : null,
    [selectedStore],
  );

  const selectedStoreExternalMapHref = useMemo(
    () => (selectedStore ? externalMapsHref(selectedStore.mapUrl, selectedStore.address) : null),
    [selectedStore],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const pickupOnly = shipTab === "store";
    if (pickupOnly && storesLoading) {
      setErr("Đang tải danh sách cửa hàng.");
      return;
    }
    if (pickupOnly && retailStores.length === 0) {
      setErr("Hiện không có cửa hàng để nhận hàng. Vui lòng chọn Giao tận nơi.");
      return;
    }
    if (pickupOnly && retailStores.length > 0 && !selectedStoreId) {
      setErr("Vui lòng chọn cửa hàng nhận hàng.");
      return;
    }
    if (pay === "BANK_TRANSFER" && bankAccounts.length === 0) {
      setErr("Chưa có tài khoản chuyển khoản trên hệ thống. Chọn MoMo/COD hoặc liên hệ cửa hàng.");
      return;
    }
    if (splitChoice === "DEPOSIT_MANUAL") {
      if (pay !== "BANK_TRANSFER") {
        setErr("Cọc thỏa thuận chỉ áp dụng khi chuyển khoản ngân hàng.");
        return;
      }
      if (parsedManualDeposit == null || parsedManualDeposit > displayTotal) {
        setErr("Nhập số tiền cọc hợp lệ (từ 1000 ₫ đến tổng đơn).");
        return;
      }
    }
    if (checkoutPayMode === "DEPOSIT" && splitChoice !== "DEPOSIT_MANUAL" && pay !== "MOMO" && pay !== "BANK_TRANSFER") {
      setErr("Đặt cọc cần thanh toán trước qua MoMo hoặc chuyển khoản.");
      return;
    }
    const accountEmail = me?.email?.trim() ?? "";
    const emailFromAccount = accountEmail.length > 0;
    const nextErrs = validateShippingForm(form, {
      emailFromAccount,
      accountEmail,
      pickupOnly,
    });
    if (Object.keys(nextErrs).length > 0) {
      setFieldErrors(nextErrs);
      setErr(
        pickupOnly
          ? "Vui lòng điền đủ họ tên và số điện thoại (và sửa lỗi email nếu có)."
          : "Vui lòng điền đủ thông tin: họ tên, số điện thoại, địa chỉ, phường/xã, quận/huyện, tỉnh/thành (và sửa lỗi nếu có).",
      );
      const first = (["name", "phone", "email", "line", "ward", "district", "city"] as const).find(
        (k) => nextErrs[k]
      );
      if (first) {
        requestAnimationFrame(() => document.getElementById(first)?.focus());
      }
      return;
    }
    setFieldErrors({});
    setLoading(true);
    const phoneNorm = normalizeVnPhone(form.phone);
    const shippingEmail = emailFromAccount ? accountEmail : form.email.trim();
    const shipping = pickupOnly
      ? {
          name: form.name.trim(),
          phone: phoneNorm,
          email: shippingEmail,
          line: "—",
          ward: "—",
          district: "—",
          city: "—",
        }
      : {
          name: form.name.trim(),
          phone: phoneNorm,
          email: shippingEmail,
          line: form.line.trim(),
          ward: form.ward.trim(),
          district: form.district.trim(),
          city: form.city.trim(),
        };
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
          shipping,
          ...(pickupOnly && selectedStoreId ? { pickupStoreId: selectedStoreId } : {}),
          paymentMethod: pay,
          customerNote: orderNote.trim() || undefined,
          payMode: checkoutPayMode,
          ...(spinCouponApplied ? { spinCouponCode: spinCouponApplied } : {}),
          ...(splitChoice === "DEPOSIT_MANUAL"
            ? {
              depositNegotiated: true,
              manualDepositAmount:
                parsedManualDeposit != null ? Math.min(parsedManualDeposit, displayTotal) : undefined,
            }
            : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const failMsg = typeof data.error === "string" ? data.error : "Không tạo được đơn";
        setErr(failMsg);
        showAppToast(failMsg, "error");
        setLoading(false);
        return;
      }

      showAppToast("Đã tạo đơn hàng");

      if (me && data.orderId) {
        const activeAddrId = addrMode === "saved" ? selectedAddrId : null;
        await persistProfileAndAddress(shipping, {
          skipEmailPatch: emailFromAccount,
          addrMode,
          activeAddrId,
          skipAddress: pickupOnly,
        });
      }

      dispatch(clear());
      const orderNo =
        typeof data.orderNumber === "string" && data.orderNumber.trim()
          ? `&orderNo=${encodeURIComponent(data.orderNumber.trim())}`
          : "";
      if (data.requiresMomoPayment && data.orderId) {
        router.replace(`/checkout/momo?orderId=${encodeURIComponent(data.orderId)}`);
        return;
      }
      if (data.requiresBankTransfer && data.orderId) {
        const payAmt =
          checkoutPayMode === "DEPOSIT" && effectiveDepositDue != null
            ? effectiveDepositDue
            : displayTotal;
        const neg = splitChoice === "DEPOSIT_MANUAL" ? "&negotiated=1" : "";
        router.replace(
          `/checkout/done?id=${encodeURIComponent(data.orderId)}&pay=bank&amt=${encodeURIComponent(String(payAmt))}${neg}${orderNo}`,
        );
        return;
      }
      router.replace(`/checkout/done?id=${encodeURIComponent(data.orderId)}${orderNo}`);
    } catch {
      setErr("Lỗi mạng");
      showAppToast("Lỗi mạng", "error");
    }
    setLoading(false);
  }

  const savedAddressOptions = useMemo(
    () =>
      addresses.map((a) => ({
        value: a.id,
        label:
          (a.isDefault ? "[Mặc định] " : "") + [a.line, a.ward, a.district, a.city].filter(Boolean).join(", "),
      })),
    [addresses],
  );

  const hasSavedAddresses = me != null && addresses.length > 0;
  const needNewAddress = me != null && addresses.length === 0;
  const accountHasEmail = Boolean(me?.email?.trim());
  const addrLocked = shipTab === "door" && hasSavedAddresses && addrMode === "saved";
  const submitIdleLabel =
    splitChoice === "DEPOSIT_MANUAL" && pay === "BANK_TRANSFER"
      ? "Tạo đơn & chuyển khoản cọc (thỏa thuận)"
      : checkoutPayMode === "DEPOSIT" && pay === "MOMO"
        ? "Tạo đơn & thanh toán cọc (MoMo)"
        : checkoutPayMode === "DEPOSIT" && pay === "BANK_TRANSFER"
          ? "Tạo đơn & chuyển khoản cọc"
          : pay === "MOMO"
            ? "Tạo đơn & thanh toán MoMo"
            : pay === "BANK_TRANSFER"
              ? "Tạo đơn & chuyển khoản"
              : "Đặt hàng";

  return (
    <>
      <Suspense fallback={null}>
        <SpinCouponQuerySync onCode={applyCouponFromUrl} />
      </Suspense>
      {!clientCartReady ? (
        <div className={`container ${styles.page}`}>
          <h1 className={styles.pageHeading}>Thanh toán</h1>
          <div className={styles.bootLine}>
            <SectionLoading label="Đang tải giỏ hàng" />
          </div>
        </div>
      ) : lines.length === 0 ? (
        <div className={`container ${styles.page}`}>
          <h1 className={styles.pageHeading}>Thanh toán</h1>
          <p className="muted">Giỏ hàng trống.</p>
          <Link href="/products">Tiếp tục mua</Link>
        </div>
      ) : (
        <>
    <div className={`container ${styles.page}`}>
      {qrLightboxUrl ? (
        <div className={styles.qrLightbox} role="presentation" onClick={() => setQrLightboxUrl(null)}>
          <div
            className={styles.qrLightboxInner}
            role="dialog"
            aria-modal
            aria-label="Mã QR chuyển khoản"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrLightboxUrl}
              alt="Mã QR chuyển khoản"
              className={styles.qrLightboxImg}
              decoding="async"
              fetchPriority="high"
            />
            <button type="button" className={`btn btn--ghost ${styles.qrLightboxClose}`} onClick={() => setQrLightboxUrl(null)}>
              Đóng
            </button>
          </div>
        </div>
      ) : null}
      <h1 className={styles.pageHeading}>Thanh toán</h1>
      {bootLoading ? (
        <div className={styles.bootLine}>
          <SectionLoading label="Đang tải thông tin tài khoản" />
        </div>
      ) : null}

      <form onSubmit={onSubmit} noValidate className={styles.grid}>
        <div className={styles.main}>
          {!bootLoading && !me ? (
            <div className={styles.loginCard}>
              <p>Đăng nhập để mua hàng tiện lợi và dùng địa chỉ đã lưu.</p>
              <Link href={`/auth/login?next=${encodeURIComponent("/checkout")}`} className="btn btn--primary" style={{ alignSelf: "flex-start" }}>
                Đăng nhập
              </Link>
            </div>
          ) : null}

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Thông tin giao hàng</h2>
            <div className={styles.tabs}>
              <button
                type="button"
                className={shipTab === "door" ? styles.tabOn : styles.tab}
                onClick={() => setShipTab("door")}
              >
                Giao tận nơi
              </button>
              <button
                type="button"
                className={shipTab === "store" ? styles.tabOn : styles.tab}
                onClick={() => setShipTab("store")}
              >
                Nhận tại cửa hàng
              </button>
            </div>

            {shipTab === "store" ? (
              <div className={styles.storePickup}>
                {storesLoading ? (
                  <p className={styles.storePickupMuted}>Đang tải danh sách cửa hàng…</p>
                ) : retailStores.length === 0 ? (
                  <p className={styles.storePickupMuted}>
                    Hiện chưa có cửa hàng trên hệ thống. Vui lòng chọn <strong>Giao tận nơi</strong> hoặc liên hệ hỗ trợ.
                  </p>
                ) : (
                  <>
                    <p className={styles.storePickupHint}>Chọn cửa hàng nhận hàng</p>
                    <div className={styles.storePickupGrid}>
                      <ul className={styles.storeList} role="listbox" aria-label="Danh sách cửa hàng">
                        {retailStores.map((s) => (
                          <li key={s.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={selectedStoreId === s.id}
                              className={selectedStoreId === s.id ? styles.storeCardOn : styles.storeCard}
                              onClick={() => setSelectedStoreId(s.id)}
                            >
                              <span className={styles.storeCardName}>{s.name}</span>
                              <span className={styles.storeCardAddr}>{s.address}</span>
                              {s.phone ? <span className={styles.storeCardMeta}>{s.phone}</span> : null}
                              {s.openingHours ? (
                                <span className={styles.storeCardMeta}>{s.openingHours}</span>
                              ) : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                      <div className={styles.storeMapWrap}>
                        {selectedStore ? (
                          selectedStoreMapPreviewSrc ? (
                            <div className={styles.storeMapShell}>
                              <iframe
                                title={`Bản đồ ${selectedStore.name}`}
                                className={styles.storeMapIframe}
                                src={selectedStoreMapPreviewSrc}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                allowFullScreen
                              />
                              {selectedStoreExternalMapHref ? (
                                <a
                                  href={selectedStoreExternalMapHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.storeMapOpenLink}
                                >
                                  Mở bản đồ
                                </a>
                              ) : null}
                            </div>
                          ) : selectedStoreExternalMapHref ? (
                            <div className={styles.storeMapFallback}>
                              <a
                                href={selectedStoreExternalMapHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn--ghost"
                              >
                                Mở bản đồ
                              </a>
                            </div>
                          ) : (
                            <p className={styles.storePickupMuted}>Chưa có bản đồ cho cửa hàng này.</p>
                          )
                        ) : null}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {shipTab === "door" && hasSavedAddresses ? (
              <div className={styles.addrRadioRow}>
                <label className={styles.addrRadio}>
                  <input
                    type="radio"
                    name="checkoutAddrMode"
                    checked={addrMode === "saved"}
                    onChange={() => handleAddrMode("saved")}
                  />
                  <span>Chọn từ địa chỉ đã lưu ({addresses.length})</span>
                </label>
                {addrMode === "saved" ? (
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label htmlFor="savedAddr">Địa chỉ trong tài khoản</label>
                    <div className={styles.selectShell}>
                      <Select<string>
                        id="savedAddr"
                        className={styles.checkoutAddrSelect}
                        value={selectedAddrId ?? undefined}
                        onChange={(id) => {
                          setSelectedAddrId(id ?? null);
                          setAddrMode("saved");
                        }}
                        options={savedAddressOptions}
                        variant="outlined"
                        suffixIcon={<ChevronDown size={18} strokeWidth={2} aria-hidden />}
                        menuItemSelectedIcon={SELECT_MENU_CHECK}
                        popupMatchSelectWidth
                        listHeight={280}
                      />
                    </div>
                  </div>
                ) : null}
                <label className={styles.addrRadio}>
                  <input
                    type="radio"
                    name="checkoutAddrMode"
                    checked={addrMode === "manual"}
                    onChange={() => handleAddrMode("manual")}
                  />
                  <span>Nhập địa chỉ mới (lưu sau khi đặt hàng)</span>
                </label>
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="name">Họ tên</label>
              <input
                id="name"
                autoComplete="name"
                aria-invalid={fieldErrors.name ? true : undefined}
                aria-describedby={fieldErrors.name ? "name-err" : undefined}
                value={form.name}
                onChange={(e) => {
                  clearFieldError("name");
                  setForm((f) => ({ ...f, name: e.target.value }));
                }}
              />
              {fieldErrors.name ? (
                <p id="name-err" className={styles.fieldErr}>
                  {fieldErrors.name}
                </p>
              ) : null}
            </div>
            <div className="field">
              <label htmlFor="phone">Số điện thoại</label>
              <input
                id="phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="Ví dụ: 0912345678"
                aria-invalid={fieldErrors.phone ? true : undefined}
                aria-describedby={fieldErrors.phone ? "phone-err" : undefined}
                value={form.phone}
                onChange={(e) => {
                  clearFieldError("phone");
                  setForm((f) => ({ ...f, phone: e.target.value }));
                }}
              />
              {fieldErrors.phone ? (
                <p id="phone-err" className={styles.fieldErr}>
                  {fieldErrors.phone}
                </p>
              ) : null}
            </div>
            <div className="field">
              <label htmlFor="email">
                Email {accountHasEmail ? "(theo tài khoản)" : "(tuỳ chọn)"}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                readOnly={accountHasEmail}
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={fieldErrors.email ? "email-err" : undefined}
                value={accountHasEmail ? (me?.email ?? "") : form.email}
                onChange={
                  accountHasEmail
                    ? undefined
                    : (e) => {
                      clearFieldError("email");
                      setForm((f) => ({ ...f, email: e.target.value }));
                    }
                }
                style={
                  accountHasEmail
                    ? { background: "rgba(26, 22, 18, 0.05)", cursor: "not-allowed" }
                    : undefined
                }
              />
              {fieldErrors.email ? (
                <p id="email-err" className={styles.fieldErr}>
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            {shipTab === "door" ? (
              <>
                <div className="field">
                  <label htmlFor="line">Địa chỉ (số nhà, đường)</label>
                  <input
                    id="line"
                    autoComplete="street-address"
                    readOnly={addrLocked}
                    aria-invalid={fieldErrors.line ? true : undefined}
                    aria-describedby={fieldErrors.line ? "line-err" : undefined}
                    value={form.line}
                    onChange={
                      addrLocked
                        ? undefined
                        : (e) => {
                          clearFieldError("line");
                          setForm((f) => ({ ...f, line: e.target.value }));
                        }
                    }
                    style={addrLocked ? { background: "rgba(26, 22, 18, 0.05)", cursor: "not-allowed" } : undefined}
                  />
                  {fieldErrors.line ? (
                    <p id="line-err" className={styles.fieldErr}>
                      {fieldErrors.line}
                    </p>
                  ) : null}
                </div>
                <div className="field">
                  <span className={styles.cascadeLabel}>Tỉnh / Quận / Phường (theo dữ liệu Việt Nam)</span>
                  <VnAddressCascader
                    disabled={addrLocked}
                    value={{
                      city: form.city,
                      district: form.district,
                      ward: form.ward,
                    }}
                    onChange={(v) => {
                      clearFieldError("city");
                      clearFieldError("district");
                      clearFieldError("ward");
                      setForm((f) => ({
                        ...f,
                        city: v.city,
                        district: v.district,
                        ward: v.ward,
                      }));
                    }}
                  />
                  {fieldErrors.city ? (
                    <p className={styles.fieldErr}>{fieldErrors.city}</p>
                  ) : null}
                  {fieldErrors.district ? (
                    <p className={styles.fieldErr}>{fieldErrors.district}</p>
                  ) : null}
                  {fieldErrors.ward ? (
                    <p className={styles.fieldErr}>{fieldErrors.ward}</p>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Phương thức giao hàng</h2>
            <p className={styles.shippingMethodPlaceholder}>
              Nhập địa chỉ để xem các phương thức giao hàng (đang cập nhật theo khu vực).
            </p>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Lựa chọn thanh toán</h2>
            <div className={styles.paySplitOptions}>
              <label className={styles.paySplitLabel}>
                <input
                  type="radio"
                  name="paySplit"
                  checked={splitChoice === "FULL"}
                  onChange={() => setSplitChoice("FULL")}
                />
                <span>
                  <strong>Trả đủ</strong>
                  <span className={styles.paySplitSub}>Thanh toán toàn bộ giá trị đơn.</span>
                </span>
              </label>
              {totalsPreview?.depositEligible ? (
                <label className={styles.paySplitLabel}>
                  <input
                    type="radio"
                    name="paySplit"
                    checked={splitChoice === "DEPOSIT_AUTO"}
                    onChange={() => {
                      setSplitChoice("DEPOSIT_AUTO");
                      setPay("MOMO");
                    }}
                  />
                  <span>
                    <strong>Đặt cọc {formatVnd(totalsPreview.depositDue)}</strong>
                    <span className={styles.paySplitSub}>
                      Theo cấu hình sản phẩm — còn lại {formatVnd(totalsPreview.balanceDue)} (MoMo / CK).
                    </span>
                  </span>
                </label>
              ) : null}
              <label className={styles.paySplitLabel}>
                <input
                  type="radio"
                  name="paySplit"
                  checked={splitChoice === "DEPOSIT_MANUAL"}
                  onChange={() => {
                    setSplitChoice("DEPOSIT_MANUAL");
                    setPay("BANK_TRANSFER");
                  }}
                />
                <span>
                  <strong>Cọc thỏa thuận (chuyển khoản)</strong>
                  <span className={styles.paySplitSub}>
                    Chat với cửa hàng để thống nhất  — Nhập số tiền cọc — Tạo đơn và chuyển khoản.
                  </span>
                </span>
              </label>
            </div>
            {splitChoice === "DEPOSIT_MANUAL" ? (
              <div className={styles.manualDeposit}>
                <label className={styles.manualDepositLabel} htmlFor="manualDeposit">
                  Số tiền cọc (VNĐ) *
                </label>
                <input
                  id="manualDeposit"
                  className={styles.manualDepositInput}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="VD: 5.000.000"
                  value={manualDepositStr}
                  onChange={(e) => setManualDepositStr(e.target.value)}
                />
                <p className={styles.manualDepositHint}>
                  Sau khi đặt hàng, mở <strong>Chat Hỗ trợ</strong> (góc màn hình) để gửi biên lai / thương lượng với
                  admin.
                </p>
              </div>
            ) : null}
          </div>

          <div className={styles.card}>
            <div className={styles.paySectionTitle}>Phương thức thanh toán</div>
            <div className={styles.paymentOptions}>
              <label className={styles.paymentLabel}>
                <input
                  type="radio"
                  name="pm"
                  checked={pay === "COD"}
                  onChange={() => setPay("COD")}
                  disabled={checkoutPayMode === "DEPOSIT"}
                />
                <span>Thanh toán khi nhận hàng (COD)</span>
              </label>
              <label className={styles.paymentLabel}>
                <input
                  type="radio"
                  name="pm"
                  checked={pay === "MOMO"}
                  onChange={() => setPay("MOMO")}
                  disabled={splitChoice === "DEPOSIT_MANUAL"}
                />
                <span>MoMo (môi trường giả lập)</span>
              </label>
              <label className={styles.paymentLabel}>
                <input
                  type="radio"
                  name="pm"
                  checked={pay === "BANK_TRANSFER"}
                  onChange={() => setPay("BANK_TRANSFER")}
                />
                <span>Chuyển khoản ngân hàng</span>
              </label>
            </div>
            {pay === "BANK_TRANSFER" ? (
              <p className={styles.bankChatLead}>
                Luồng chuyển khoản: sau khi đặt hàng, vui lòng dùng <strong>Chat Hỗ trợ</strong> để gửi biên lai và
                liên hệ admin đối soát.
              </p>
            ) : null}
            {pay === "BANK_TRANSFER" && bankAccounts.length > 0 ? (
              <div className={styles.bankHint}>
                <p className={styles.bankHintTitle}>Thông tin nhận tiền (sau khi đặt hàng sẽ hiển thị lại kèm mã đơn)</p>
                <ul className={styles.bankList}>
                  {bankAccounts.map((b) => (
                    <li key={b.id} className={styles.bankListItem}>
                      <div className={styles.bankLineTop}>
                        <strong>{b.bankName}</strong>
                        {b.branch ? ` · ${b.branch}` : ""}
                      </div>
                      <div className={styles.bankAcct}>
                        chủ tk: {b.accountHolder} - STK: {b.accountNumber}
                      </div>
                      {b.note ? <span className={styles.bankNote}>{b.note}</span> : null}
                      {b.qrCodeUrl ? (
                        <button
                          type="button"
                          className={`btn btn--primary ${styles.bankQrBtn}`}
                          onClick={() => setQrLightboxUrl(b.qrCodeUrl)}
                        >
                          Lấy mã QR
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : pay === "BANK_TRANSFER" && bankAccounts.length === 0 ? (
              <p className={styles.payHint}>
                Chưa có tài khoản ngân hàng trên hệ thống — vui lòng chọn MoMo/COD hoặc liên hệ shop. Admin cấu hình tại{" "}
                <Link href="/admin/stores-banking">Cửa hàng &amp; NH</Link>.
              </p>
            ) : null}
            {checkoutPayMode === "DEPOSIT" && splitChoice !== "DEPOSIT_MANUAL" ? (
              <p className={styles.payHint}>Đặt cọc: thanh toán phần cọc qua MoMo hoặc chuyển khoản đúng số tiền cọc.</p>
            ) : null}
          </div>

          <div className={styles.card}>
            <label htmlFor="orderNote" className={styles.cardTitle} style={{ display: "block" }}>
              Ghi chú đơn hàng
            </label>
            <textarea
              id="orderNote"
              className={styles.noteTextarea}
              placeholder="Ghi chú cho người giao hàng hoặc cửa hàng…"
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              maxLength={2000}
            />
          </div>
        </div>

        <aside className={styles.sidebar}>

          <div className={styles.card}>
            <h2 className={styles.sideTitle}>Giỏ hàng</h2>
            {lines.length > 0 ? (
              <p className={styles.cartRollup}>
                <span>{formatCartLinesAndPieces(lines)}</span>
                <span className={styles.cartRollupSep}> · </span>
                <span className={styles.cartRollupMoney}>{formatVnd(displayTotal)}</span>
              </p>
            ) : null}
            {lines.map((l) => {
              const unit = cartLineUnitPrice(l);
              const variantDetail = `${l.colorLabel} · ${l.sizeLabel}`;
              return (
                <div key={l.variantId} className={styles.cartLine}>
                  <div className={styles.cartThumb}>
                    {l.imageUrl ? (
                      // Không dùng next/image: URL ảnh SP/biến thể có thể từ mọi host (Cloudinary, v.v.) —
                      // thiếu remotePatterns sẽ làm vỡ trang checkout.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={l.imageUrl}
                        alt=""
                        className={styles.cartThumbImg}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </div>
                  <div className={styles.cartBody}>
                    <Link
                      href={`/products/${l.productSlug}`}
                      className={styles.cartProductLink}
                      title={l.productName}
                    >
                      {l.productName}
                    </Link>
                    <span className={styles.variantPill} title={variantDetail}>
                      {l.colorLabel} · {l.sizeLabel}
                    </span>
                    <p className={styles.cartUnitPrice} title={`Đơn giá: ${formatVnd(unit)}`}>
                      {formatVnd(unit)}
                    </p>
                  </div>
                  <div className={styles.cartActions}>
                    <button
                      type="button"
                      className={styles.cartRemoveBtn}
                      aria-label={`Xóa ${l.productName} khỏi giỏ`}
                      onClick={() => dispatch(removeLine(l.variantId))}
                    >
                      <Trash2 size={18} strokeWidth={2} aria-hidden />
                    </button>
                    <div className={styles.cartStepperOuter}>
                      <QuantityStepper
                        size="sm"
                        value={l.quantity}
                        max={l.maxStock}
                        onChange={(quantity) =>
                          dispatch(setQuantity({ variantId: l.variantId, quantity }))
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <p className={styles.shippingDisclaimer}>
              Giá sản phẩm <strong>chưa bao gồm phí vận chuyển</strong> (mọi hình thức thanh toán). Phí giao tính theo
              khu vực / thỏa thuận.
            </p>

            <div style={{ marginTop: "1rem" }}>
              <div className={styles.promoHeaderRow}>
                <span className={`muted ${styles.promoLabel}`}>Mã vòng quay</span>
                {sessionUser ? (
                  <button
                    type="button"
                    className={styles.spinPickOpenBtn}
                    onClick={() => {
                      void refreshSpinCouponInventory();
                      setSpinPickerOpen(true);
                    }}
                  >
                    <Gift size={15} strokeWidth={2} aria-hidden />
                    Lấy mã
                  </button>
                ) : null}
              </div>
              <div className={styles.promoRow}>
                <input
                  className={styles.promoInput}
                  placeholder="VD: FW-ABC12345"
                  value={spinCouponInput}
                  onChange={(e) => setSpinCouponInput(e.target.value.toUpperCase())}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className={styles.promoApply}
                  onClick={() => {
                    const v = spinCouponInput.trim();
                    setCouponErr(null);
                    if (!v) {
                      setSpinCouponApplied(null);
                      return;
                    }
                    setSpinCouponApplied(v);
                  }}
                >
                  Áp dụng
                </button>
              </div>
              {spinCouponApplied ? (
                <p className="muted" style={{ fontSize: "0.82rem", marginTop: "0.35rem" }}>
                  Đang dùng mã <strong>{spinCouponApplied}</strong>{" "}
                  <button
                    type="button"
                    className={styles.spinCouponRemove}
                    style={{ marginLeft: "0.35rem" }}
                    onClick={() => {
                      setSpinCouponApplied(null);
                      setCouponErr(null);
                    }}
                  >
                    Gỡ
                  </button>
                </p>
              ) : null}
              {couponErr ? (
                <p style={{ color: "#b91c1c", fontSize: "0.82rem", marginTop: "0.35rem" }}>{couponErr}</p>
              ) : null}
              {sessionStatus === "ready" && !sessionUser ? (
                <p className="muted" style={{ fontSize: "0.78rem", marginTop: "0.35rem" }}>
                  Đăng nhập để áp dụng mã từ vòng quay.
                </p>
              ) : null}
            </div>

            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryMuted}>Tạm tính ({cartPieces} cái)</span>
                <span>{formatVnd(subtotalBeforeCoupon)}</span>
              </div>
              {couponDiscount > 0 ? (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryMuted}>Giảm giá (vòng quay)</span>
                  <span style={{ color: "#15803d", fontWeight: 700 }}>-{formatVnd(couponDiscount)}</span>
                </div>
              ) : null}
              <div className={styles.summaryRow}>
                <span className={styles.summaryMuted}>Phí vận chuyển</span>
                <span className={styles.summaryMuted}>Chưa tính</span>
              </div>
              {checkoutPayMode === "DEPOSIT" && effectiveDepositDue != null && effectiveBalanceDue != null ? (
                <>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryMuted}>Thanh toán ngay (cọc)</span>
                    <span>{formatVnd(effectiveDepositDue)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryMuted}>Còn lại sau cọc</span>
                    <span>{formatVnd(effectiveBalanceDue)}</span>
                  </div>
                </>
              ) : null}
              <div className={`${styles.summaryRow} ${styles.summaryTotalLabel}`} style={{ marginTop: "0.65rem" }}>
                <span>{checkoutPayMode === "DEPOSIT" ? "Thanh toán lúc đặt" : "Tổng thanh toán"}</span>
                <span className={styles.summaryTotalValue}>
                  {formatVnd(
                    checkoutPayMode === "DEPOSIT" && effectiveDepositDue != null
                      ? effectiveDepositDue
                      : displayTotal,
                  )}
                </span>
              </div>
            </div>

            {err ? <p className={styles.errBanner}>{err}</p> : null}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={
                loading ||
                bootLoading ||
                (shipTab === "store" && (storesLoading || retailStores.length === 0))
              }
            >
              {loading ? <Spinner size="sm" inheritColor label="Đang xử lý" /> : submitIdleLabel}
            </button>
          </div>
        </aside>
      </form>
    </div>

          {domReady && spinPickerOpen
        ? createPortal(
            <div
              className={styles.spinPickerOverlay}
              role="presentation"
              onClick={() => setSpinPickerOpen(false)}
            >
              <div
                className={styles.spinPickerCard}
                role="dialog"
                aria-modal="true"
                aria-labelledby="spin-picker-title"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className={styles.spinPickerClose}
                  onClick={() => setSpinPickerOpen(false)}
                  aria-label="Đóng"
                >
                  <X size={22} strokeWidth={2} />
                </button>
                <div className={styles.spinPickerHead}>
                  <Gift size={26} strokeWidth={1.75} aria-hidden />
                  <h2 id="spin-picker-title" className={styles.spinPickerTitle}>
                    Mã vòng quay của bạn
                  </h2>
                  <p className={styles.spinPickerSubtitle}>Chọn một mã còn hiệu lực để áp dụng đơn hàng.</p>
                </div>
                {spinPickerSorted.length === 0 ? (
                  <p className={styles.spinPickerEmpty}>Chưa có mã — tham gia vòng quay may mắn để nhận voucher.</p>
                ) : (
                  <ul className={styles.spinPickerList}>
                    {spinPickerSorted.map((c) => {
                      const usable = isSpinCouponUsable(c);
                      const expired = c.usedAt == null && new Date(c.expiresAt).getTime() <= Date.now();
                      const statusLabel = c.usedAt
                        ? "Đã dùng"
                        : expired
                          ? "Hết hạn"
                          : `HSD ${new Date(c.expiresAt).toLocaleDateString("vi-VN")}`;
                      const active = spinCouponApplied === c.code;
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            className={`${styles.spinPickerRow} ${usable ? styles.spinPickerRowUsable : styles.spinPickerRowDisabled} ${active ? styles.spinPickerRowActive : ""}`}
                            disabled={!usable}
                            onClick={() => {
                              if (!usable) return;
                              setCouponErr(null);
                              setSpinCouponInput(c.code);
                              setSpinCouponApplied(c.code);
                              setSpinPickerOpen(false);
                            }}
                          >
                            <span className={styles.spinPickerCode}>{c.code}</span>
                            <span className={styles.spinPickerGiftLabel}>{c.label}</span>
                            <span className={styles.spinPickerStatus}>{statusLabel}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
        </>
      )}
    </>
  );
}
