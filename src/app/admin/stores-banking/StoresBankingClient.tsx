"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { stableValueJson } from "@/lib/form-dirty-snapshot";
import { deleteAdminCloudinaryUrls, uploadAdminImageFile } from "@/lib/admin-upload-client";
import { showAdminToast } from "@/lib/admin-toast";
import { NoDataEmpty } from "@/components/ui/NoDataEmpty";
import { Spinner } from "@/components/ui/Spinner";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { AdminBackButton } from "@/components/admin/AdminBackNav";
import { AdminToolbarStrip } from "@/components/admin/AdminToolbarStrip";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import styles from "./stores-banking-admin.module.scss";

type RetailStore = {
  id: string;
  slug: string;
  name: string;
  address: string;
  phone: string | null;
  openingHours: string | null;
  mapUrl: string | null;
  active: boolean;
  sortOrder: number;
  isDefault: boolean;
};

type BankAccount = {
  id: string;
  slug: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  branch: string | null;
  note: string | null;
  qrCodeUrl: string | null;
  active: boolean;
  sortOrder: number;
};

type Tab = "stores" | "banks";

type StorePanel = { kind: "list" } | { kind: "new" } | { kind: "edit"; id: string };
type BankPanel = { kind: "list" } | { kind: "new" } | { kind: "edit"; id: string };

const emptyStoreForm = {
  name: "",
  address: "",
  phone: "",
  openingHours: "",
  mapUrl: "",
  sortOrder: 0,
  active: true,
  isDefault: false,
};

const emptyBankForm = {
  bankName: "",
  accountHolder: "",
  accountNumber: "",
  branch: "",
  note: "",
  qrCodeUrl: null as string | null,
  active: true,
};

function normStoreForm(f: typeof emptyStoreForm) {
  return {
    name: f.name.trim(),
    address: f.address.trim(),
    phone: f.phone.trim(),
    openingHours: f.openingHours.trim(),
    mapUrl: f.mapUrl.trim(),
    sortOrder: Number.isFinite(f.sortOrder) ? Math.round(f.sortOrder) : 0,
    active: f.active,
    isDefault: f.isDefault,
  };
}

function normStoreFromRetail(s: RetailStore) {
  return {
    name: s.name.trim(),
    address: s.address.trim(),
    phone: (s.phone ?? "").trim(),
    openingHours: (s.openingHours ?? "").trim(),
    mapUrl: (s.mapUrl ?? "").trim(),
    sortOrder: Math.round(s.sortOrder),
    active: s.active,
    isDefault: s.isDefault,
  };
}

function normBankForm(f: typeof emptyBankForm, pendingQr: boolean) {
  return stableValueJson({
    bankName: f.bankName.trim(),
    accountHolder: f.accountHolder.trim(),
    accountNumber: f.accountNumber.trim(),
    branch: f.branch.trim(),
    note: f.note.trim(),
    qrCodeUrl: f.qrCodeUrl,
    active: f.active,
    pendingQr,
  });
}

export function StoresBankingClient() {
  const askConfirm = useConfirm();
  const [tab, setTab] = useState<Tab>("stores");
  const [stores, setStores] = useState<RetailStore[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [storePanel, setStorePanel] = useState<StorePanel>({ kind: "list" });
  const [bankPanel, setBankPanel] = useState<BankPanel>({ kind: "list" });

  const [storeForm, setStoreForm] = useState(emptyStoreForm);
  const [bankForm, setBankForm] = useState(emptyBankForm);
  const [pendingQrFile, setPendingQrFile] = useState<File | null>(null);
  const [pendingQrPreviewUrl, setPendingQrPreviewUrl] = useState<string | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement>(null);
  /** false cho tới khi lần load đầu (cửa hàng + ngân hàng) hoàn tất — tránh flash No data khi mảng còn rỗng. */
  const [listsReady, setListsReady] = useState(false);

  const loadStores = useCallback(async () => {
    const res = await fetch("/api/admin/retail-stores", { credentials: "same-origin" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.stores)) setStores(data.stores);
  }, []);

  const loadAccounts = useCallback(async () => {
    const res = await fetch("/api/admin/bank-accounts", { credentials: "same-origin" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.accounts)) setAccounts(data.accounts);
  }, []);

  const load = useCallback(async () => {
    await Promise.all([loadStores(), loadAccounts()]);
  }, [loadStores, loadAccounts]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } finally {
        if (!cancelled) setListsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const selectedStore = useMemo(() => {
    if (storePanel.kind !== "edit") return null;
    return stores.find((s) => s.id === storePanel.id) ?? null;
  }, [storePanel, stores]);

  const selectedBank = useMemo(() => {
    if (bankPanel.kind !== "edit") return null;
    return accounts.find((b) => b.id === bankPanel.id) ?? null;
  }, [bankPanel, accounts]);

  /** Đồng bộ form cửa hàng khi mở chi tiết / tạo mới hoặc sau khi reload danh sách */
  useEffect(() => {
    if (storePanel.kind === "new") {
      setStoreForm(emptyStoreForm);
      return;
    }
    if (storePanel.kind !== "edit") return;
    const s = stores.find((x) => x.id === storePanel.id);
    if (!s) return;
    setStoreForm({
      name: s.name,
      address: s.address,
      phone: s.phone ?? "",
      openingHours: s.openingHours ?? "",
      mapUrl: s.mapUrl ?? "",
      sortOrder: s.sortOrder,
      active: s.active,
      isDefault: s.isDefault,
    });
  }, [storePanel, stores]);

  useEffect(() => {
    if (bankPanel.kind === "new") {
      setBankForm(emptyBankForm);
      return;
    }
    if (bankPanel.kind !== "edit") return;
    const b = accounts.find((x) => x.id === bankPanel.id);
    if (!b) return;
    setBankForm({
      bankName: b.bankName,
      accountHolder: b.accountHolder,
      accountNumber: b.accountNumber,
      branch: b.branch ?? "",
      note: b.note ?? "",
      qrCodeUrl: b.qrCodeUrl ?? null,
      active: b.active,
    });
  }, [bankPanel, accounts]);

  const bankDetailKey =
    bankPanel.kind === "edit" ? bankPanel.id : bankPanel.kind === "new" ? "__new__" : "__list__";
  useEffect(() => {
    setPendingQrFile(null);
    setPendingQrPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [bankDetailKey]);

  /** Đổi tab → về danh sách */
  function switchTab(next: Tab) {
    setTab(next);
    setStorePanel({ kind: "list" });
    setBankPanel({ kind: "list" });
    setErr(null);
  }

  async function saveStore() {
    if (!storeForm.name.trim() || !storeForm.address.trim()) {
      setErr("Tên và địa chỉ cửa hàng là bắt buộc");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (storePanel.kind === "new") {
        const res = await fetch("/api/admin/retail-stores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            name: storeForm.name.trim(),
            address: storeForm.address.trim(),
            phone: storeForm.phone.trim() || null,
            openingHours: storeForm.openingHours.trim() || null,
            mapUrl: storeForm.mapUrl.trim() || null,
            sortOrder: storeForm.sortOrder,
            active: storeForm.active,
            isDefault: storeForm.isDefault,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr("Tạo cửa hàng thất bại");
          showAdminToast("Tạo cửa hàng thất bại", "error");
          return;
        }
        const row = (data as { store?: RetailStore }).store;
        showAdminToast("Đã tạo cửa hàng");
        await loadStores();
        if (row?.id) setStorePanel({ kind: "edit", id: row.id });
        else setStorePanel({ kind: "list" });
        return;
      }
      if (storePanel.kind === "edit") {
        const res = await fetch(`/api/admin/retail-stores/${storePanel.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            name: storeForm.name.trim(),
            address: storeForm.address.trim(),
            phone: storeForm.phone.trim() || null,
            openingHours: storeForm.openingHours.trim() || null,
            mapUrl: storeForm.mapUrl.trim() || null,
            sortOrder: storeForm.sortOrder,
            active: storeForm.active,
            isDefault: storeForm.isDefault,
          }),
        });
        if (!res.ok) {
          setErr("Lưu cửa hàng thất bại");
          showAdminToast("Lưu cửa hàng thất bại", "error");
        } else {
          showAdminToast("Đã lưu cửa hàng");
          await loadStores();
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function reorderBankRow(index: number, delta: -1 | 1) {
    const j = index + delta;
    if (j < 0 || j >= accounts.length) return;
    const orderedIds = [...accounts];
    const [row] = orderedIds.splice(index, 1);
    orderedIds.splice(j, 0, row);
    const ids = orderedIds.map((a) => a.id);
    const res = await fetch("/api/admin/bank-accounts/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ orderedIds: ids }),
    });
    if (!res.ok) {
      setErr("Không đổi được thứ tự");
      showAdminToast("Không đổi được thứ tự", "error");
    } else await loadAccounts();
  }

  async function deleteStore() {
    if (storePanel.kind !== "edit") return;
    if (!(await askConfirm({ message: "Xóa cửa hàng này?", danger: true }))) return;
    setErr(null);
    const res = await fetch(`/api/admin/retail-stores/${storePanel.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!res.ok) {
      setErr("Xóa thất bại");
      showAdminToast("Xóa thất bại", "error");
    } else {
      setStorePanel({ kind: "list" });
      showAdminToast("Đã xóa cửa hàng");
      await loadStores();
    }
  }

  async function saveBank() {
    if (!bankForm.bankName.trim() || !bankForm.accountHolder.trim() || !bankForm.accountNumber.trim()) {
      setErr("Ngân hàng, chủ TK và số TK là bắt buộc");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      let qrCodeUrl: string | null = bankForm.qrCodeUrl;
      if (pendingQrFile) {
        try {
          qrCodeUrl = await uploadAdminImageFile(pendingQrFile, "banks");
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Upload ảnh QR thất bại";
          setErr(msg);
          showAdminToast(msg, "error");
          setSaving(false);
          return;
        }
      }

      const prevQr =
        bankPanel.kind === "edit" && selectedBank?.qrCodeUrl?.includes("res.cloudinary.com")
          ? selectedBank.qrCodeUrl
          : null;
      if (prevQr && prevQr !== qrCodeUrl) {
        await deleteAdminCloudinaryUrls([prevQr]);
      }

      setPendingQrFile(null);
      setPendingQrPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });

      if (bankPanel.kind === "new") {
        const res = await fetch("/api/admin/bank-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            bankName: bankForm.bankName.trim(),
            accountHolder: bankForm.accountHolder.trim(),
            accountNumber: bankForm.accountNumber.trim(),
            branch: bankForm.branch.trim() || null,
            note: bankForm.note.trim() || null,
            qrCodeUrl,
            active: bankForm.active,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr("Tạo tài khoản thất bại");
          return;
        }
        const row = (data as { account?: BankAccount }).account;
        await loadAccounts();
        if (row?.id) setBankPanel({ kind: "edit", id: row.id });
        else setBankPanel({ kind: "list" });
        return;
      }
      if (bankPanel.kind === "edit") {
        const res = await fetch(`/api/admin/bank-accounts/${bankPanel.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            bankName: bankForm.bankName.trim(),
            accountHolder: bankForm.accountHolder.trim(),
            accountNumber: bankForm.accountNumber.trim(),
            branch: bankForm.branch.trim() || null,
            note: bankForm.note.trim() || null,
            qrCodeUrl,
            active: bankForm.active,
          }),
        });
        if (!res.ok) {
          setErr("Lưu tài khoản thất bại");
          showAdminToast("Lưu tài khoản thất bại", "error");
        } else {
          showAdminToast("Đã lưu tài khoản ngân hàng");
          await loadAccounts();
          setBankForm((f) => ({ ...f, qrCodeUrl }));
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteBank() {
    if (bankPanel.kind !== "edit") return;
    if (!(await askConfirm({ message: "Xóa tài khoản ngân hàng này?", danger: true }))) return;
    setErr(null);
    const res = await fetch(`/api/admin/bank-accounts/${bankPanel.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!res.ok) {
      setErr("Xóa thất bại");
      showAdminToast("Xóa thất bại", "error");
    } else {
      setBankPanel({ kind: "list" });
      showAdminToast("Đã xóa tài khoản ngân hàng");
      await loadAccounts();
    }
  }

  const showStoreDetail = storePanel.kind !== "list";
  const showBankDetail = bankPanel.kind !== "list";

  const storeSaveDirty = useMemo(() => {
    if (!showStoreDetail) return false;
    if (storePanel.kind === "new") {
      return stableValueJson(normStoreForm(storeForm)) !== stableValueJson(normStoreForm(emptyStoreForm));
    }
    if (storePanel.kind === "edit" && selectedStore) {
      return stableValueJson(normStoreForm(storeForm)) !== stableValueJson(normStoreFromRetail(selectedStore));
    }
    return false;
  }, [showStoreDetail, storePanel, selectedStore, storeForm]);

  const bankSaveDirty = useMemo(() => {
    if (!showBankDetail) return false;
    if (bankPanel.kind === "new") {
      return normBankForm(bankForm, !!pendingQrFile) !== normBankForm(emptyBankForm, false);
    }
    if (bankPanel.kind === "edit" && selectedBank) {
      return (
        normBankForm(bankForm, !!pendingQrFile) !==
        normBankForm(
          {
            bankName: selectedBank.bankName,
            accountHolder: selectedBank.accountHolder,
            accountNumber: selectedBank.accountNumber,
            branch: selectedBank.branch ?? "",
            note: selectedBank.note ?? "",
            qrCodeUrl: selectedBank.qrCodeUrl ?? null,
            active: selectedBank.active,
          },
          false,
        )
      );
    }
    return false;
  }, [showBankDetail, bankPanel, selectedBank, bankForm, pendingQrFile]);

  return (
    <AdminPageLayout
      header={
        <AdminStickyPageHeader joinToolbarBelow>
          <div className="adminPageHeaderRow">
            <div className="adminPageHeaderMain">
              <h1 className={styles.title}>Cửa hàng & tài khoản ngân hàng</h1>
            </div>
            <div className="adminToolbar adminToolbar--end">
              {tab === "stores" ? (
                <button
                  type="button"
                  className="btn btn--primary adminToolbarBtn"
                  title="Thêm cửa hàng / showroom"
                  onClick={() => setStorePanel({ kind: "new" })}
                >
                  + Cửa hàng
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--primary adminToolbarBtn"
                  title="Thêm tài khoản ngân hàng"
                  onClick={() => setBankPanel({ kind: "new" })}
                >
                  + Ngân hàng
                </button>
              )}
            </div>
          </div>
        </AdminStickyPageHeader>
      }
      toolbar={
        <AdminToolbarStrip joinHeaderAbove className={styles.tabsStripFull}>
          <div className={styles.tabs} role="tablist" aria-label="Loại nội dung">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "stores"}
              className={`${styles.tab} ${tab === "stores" ? styles.tabActive : ""}`}
              onClick={() => switchTab("stores")}
            >
              Cửa hàng
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "banks"}
              className={`${styles.tab} ${tab === "banks" ? styles.tabActive : ""}`}
              onClick={() => switchTab("banks")}
            >
              Ngân hàng
            </button>
          </div>
        </AdminToolbarStrip>
      }
    >
      <div className={styles.mainBelowSticky}>
        {err ? <p className={styles.err}>{err}</p> : null}

        {tab === "stores" ? (
          <section className={styles.shell} aria-labelledby="stores-panel-title">
            <div className={`${styles.split} ${showStoreDetail ? styles.splitHasDetail : ""}`}>
              <div className={styles.listColumn}>
                <div className={styles.sectionHead}>
                  <h2 id="stores-panel-title" className={styles.h2}>
                    Danh sách cửa hàng
                  </h2>
                </div>
                <ul className={styles.rowList}>
                  {stores.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className={`${styles.rowBtn} ${storePanel.kind === "edit" && storePanel.id === s.id ? styles.rowBtnActive : ""}`}
                        onClick={() => setStorePanel({ kind: "edit", id: s.id })}
                      >
                        <span className={styles.rowMain}>
                          <span className={styles.rowTitle}>{s.name}</span>
                          <code className={styles.slug}>{s.slug}</code>
                        </span>
                        <span className={styles.rowMeta}>
                          {s.isDefault ? <span className={styles.pillDefault}>Mặc định</span> : null}
                          {s.active ? <span className={styles.pillOn}>Hiển thị</span> : <span className={styles.pillOff}>Ẩn</span>}
                          {s.phone ? <span className={styles.rowSub}>{s.phone}</span> : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {!listsReady ? (
                  <div className={styles.listLoading} role="status" aria-live="polite">
                    <Spinner size="md" label="Đang tải danh sách cửa hàng" />
                  </div>
                ) : stores.length === 0 ? (
                  <NoDataEmpty dense className={styles.listEmpty} description="Bấm «+ Cửa hàng» trên tiêu đề trang." />
                ) : null}
              </div>

              <div className={styles.detailColumn}>
                {!showStoreDetail ? (
                  <div className={styles.detailEmpty}>
                    <p>Chọn một cửa hàng để xem và chỉnh sửa, hoặc bấm «+ Cửa hàng» trên tiêu đề trang.</p>
                  </div>
                ) : storePanel.kind === "edit" && !selectedStore ? (
                  <div className={styles.detailEmpty}>
                    <p>Không tìm thấy bản ghi.</p>
                    <AdminBackButton onClick={() => setStorePanel({ kind: "list" })}>Danh sách cửa hàng</AdminBackButton>
                  </div>
                ) : (
                  <div className={styles.detailCard}>
                    <div className={styles.detailHead}>
                      <AdminBackButton onClick={() => setStorePanel({ kind: "list" })}>
                        {storePanel.kind === "new" ? "Thêm cửa hàng" : "Chi tiết cửa hàng"}
                      </AdminBackButton>
                    </div>
                    {storePanel.kind === "edit" && selectedStore ? (
                      <p className={styles.detailSlug}>
                        Slug: <code>{selectedStore.slug}</code>
                      </p>
                    ) : null}

                    <div className={styles.cardForm}>
                      <label className={styles.label}>
                        Tên *
                        <input
                          value={storeForm.name}
                          onChange={(e) => setStoreForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="VD: Showroom Gò Vấp"
                        />
                      </label>
                      <label className={styles.label}>
                        Địa chỉ *
                        <textarea
                          rows={3}
                          value={storeForm.address}
                          onChange={(e) => setStoreForm((f) => ({ ...f, address: e.target.value }))}
                          placeholder="Số nhà, đường, phường…"
                        />
                      </label>
                      <label className={styles.label}>
                        Điện thoại
                        <input
                          value={storeForm.phone}
                          onChange={(e) => setStoreForm((f) => ({ ...f, phone: e.target.value }))}
                          placeholder="028…"
                        />
                      </label>
                      <label className={styles.label}>
                        Giờ mở cửa
                        <input
                          value={storeForm.openingHours}
                          onChange={(e) => setStoreForm((f) => ({ ...f, openingHours: e.target.value }))}
                          placeholder="9:00 – 21:00 (T2–CN)"
                        />
                      </label>
                      <label className={styles.label}>
                        Link bản đồ
                        <input
                          value={storeForm.mapUrl}
                          onChange={(e) => setStoreForm((f) => ({ ...f, mapUrl: e.target.value }))}
                          placeholder="https://maps.google.com/…"
                        />
                      </label>
                      <label className={styles.label}>
                        Thứ tự
                        <input
                          type="number"
                          value={storeForm.sortOrder}
                          onChange={(e) => setStoreForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                        />
                      </label>
                      <label className={styles.inlineCheck}>
                        <input
                          type="checkbox"
                          checked={storeForm.isDefault}
                          onChange={(e) => setStoreForm((f) => ({ ...f, isDefault: e.target.checked }))}
                        />
                        Đặt làm cửa hàng mặc định (Showroom — bản đồ và khối nổi bật)
                      </label>
                      <label className={styles.inlineCheck}>
                        <input
                          type="checkbox"
                          checked={storeForm.active}
                          onChange={(e) => setStoreForm((f) => ({ ...f, active: e.target.checked }))}
                        />
                        Hiển thị trên site
                      </label>
                      <div className={styles.detailActions}>
                        <button
                          type="button"
                          className="btn btn--primary adminToolbarBtn"
                          disabled={saving || !storeSaveDirty}
                          onClick={() => void saveStore()}
                        >
                          {saving ? <Spinner size="sm" inheritColor label="Đang lưu" /> : "Lưu"}
                        </button>
                        {storePanel.kind === "edit" ? (
                          <button type="button" className="btn btn--ghost adminToolbarBtn" onClick={() => void deleteStore()}>
                            Xóa
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className={styles.shell} aria-labelledby="banks-panel-title">
            <div className={`${styles.split} ${showBankDetail ? styles.splitHasDetail : ""}`}>
              <div className={styles.listColumn}>
                <div className={styles.sectionHead}>
                  <h2 id="banks-panel-title" className={styles.h2}>
                    Tài khoản ngân hàng
                  </h2>
                </div>
                <ul className={styles.rowList}>
                  {accounts.map((b, index) => (
                    <li key={b.id} className={styles.bankRowItem}>
                      <div className={styles.bankRowReorder}>
                        <button
                          type="button"
                          className={styles.reorderBtn}
                          disabled={index === 0}
                          aria-label="Lên"
                          onClick={(e) => {
                            e.stopPropagation();
                            void reorderBankRow(index, -1);
                          }}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className={styles.reorderBtn}
                          disabled={index === accounts.length - 1}
                          aria-label="Xuống"
                          onClick={(e) => {
                            e.stopPropagation();
                            void reorderBankRow(index, 1);
                          }}
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        type="button"
                        className={`${styles.rowBtn} ${bankPanel.kind === "edit" && bankPanel.id === b.id ? styles.rowBtnActive : ""}`}
                        onClick={() => setBankPanel({ kind: "edit", id: b.id })}
                      >
                        <span className={styles.rowMain}>
                          <span className={styles.rowTitle}>{b.bankName}</span>
                          <code className={styles.slug}>{b.slug}</code>
                        </span>
                        <span className={styles.rowMeta}>
                          {b.active ? <span className={styles.pillOn}>Hiển thị</span> : <span className={styles.pillOff}>Ẩn</span>}
                          <span className={styles.rowSub}>{b.accountNumber}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {!listsReady ? (
                  <div className={styles.listLoading} role="status" aria-live="polite">
                    <Spinner size="md" label="Đang tải tài khoản ngân hàng" />
                  </div>
                ) : accounts.length === 0 ? (
                  <NoDataEmpty dense className={styles.listEmpty} description="Bấm «+ Ngân hàng» trên tiêu đề trang." />
                ) : null}
              </div>

              <div className={styles.detailColumn}>
                {!showBankDetail ? (
                  <div className={styles.detailEmpty}>
                    <p>Chọn một tài khoản để xem và chỉnh sửa, hoặc bấm «+ Ngân hàng» trên tiêu đề trang.</p>
                  </div>
                ) : bankPanel.kind === "edit" && !selectedBank ? (
                  <div className={styles.detailEmpty}>
                    <p>Không tìm thấy bản ghi.</p>
                    <AdminBackButton onClick={() => setBankPanel({ kind: "list" })}>Danh sách tài khoản</AdminBackButton>
                  </div>
                ) : (
                  <div className={styles.detailCard}>
                    <div className={styles.detailHead}>
                      <AdminBackButton onClick={() => setBankPanel({ kind: "list" })}>
                        {bankPanel.kind === "new" ? "Thêm tài khoản" : "Chi tiết tài khoản"}
                      </AdminBackButton>
                    </div>
                    {bankPanel.kind === "edit" && selectedBank ? (
                      <p className={styles.detailSlug}>
                        Slug: <code>{selectedBank.slug}</code>
                      </p>
                    ) : null}

                    <div className={styles.cardForm}>
                      <label className={styles.label}>
                        Ngân hàng *
                        <input
                          value={bankForm.bankName}
                          onChange={(e) => setBankForm((f) => ({ ...f, bankName: e.target.value }))}
                          placeholder="VD: Vietcombank"
                        />
                      </label>
                      <label className={styles.label}>
                        Chủ tài khoản *
                        <input
                          value={bankForm.accountHolder}
                          onChange={(e) => setBankForm((f) => ({ ...f, accountHolder: e.target.value }))}
                        />
                      </label>
                      <label className={styles.label}>
                        Số tài khoản *
                        <input
                          value={bankForm.accountNumber}
                          onChange={(e) => setBankForm((f) => ({ ...f, accountNumber: e.target.value }))}
                          placeholder="Chỉ số, không dấu cách nếu có thể"
                        />
                      </label>
                      <label className={styles.label}>
                        Chi nhánh
                        <input
                          value={bankForm.branch}
                          onChange={(e) => setBankForm((f) => ({ ...f, branch: e.target.value }))}
                        />
                      </label>
                      <label className={styles.label}>
                        Ghi chú (VD: nội dung CK)
                        <textarea
                          rows={3}
                          value={bankForm.note}
                          onChange={(e) => setBankForm((f) => ({ ...f, note: e.target.value }))}
                        />
                      </label>
                      <div className={styles.label}>
                        <span>Ảnh mã QR chuyển khoản</span>
                        <input
                          ref={qrFileInputRef}
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (!f) return;
                            if (!f.type.startsWith("image/")) {
                              setErr("Chọn file ảnh (PNG/JPG…)");
                              return;
                            }
                            setErr(null);
                            setPendingQrFile(f);
                            setPendingQrPreviewUrl((prev) => {
                              if (prev) URL.revokeObjectURL(prev);
                              return URL.createObjectURL(f);
                            });
                          }}
                        />
                        <div className={styles.qrUploadRow}>
                          {(pendingQrPreviewUrl ?? bankForm.qrCodeUrl) ? (
                            <div className={styles.qrShell}>
                              <button
                                type="button"
                                className={styles.qrPreviewHit}
                                onClick={() => qrFileInputRef.current?.click()}
                                aria-label="Đổi ảnh QR"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={pendingQrPreviewUrl ?? bankForm.qrCodeUrl ?? ""}
                                  alt="QR preview"
                                  className={styles.qrPreviewImg}
                                  loading="lazy"
                                  decoding="async"
                                />
                              </button>
                              <button
                                type="button"
                                className={styles.qrFabClear}
                                aria-label="Xóa ảnh QR (lưu để áp dụng)"
                                onClick={() => {
                                  setPendingQrFile(null);
                                  setPendingQrPreviewUrl((prev) => {
                                    if (prev) URL.revokeObjectURL(prev);
                                    return null;
                                  });
                                  setBankForm((f) => ({ ...f, qrCodeUrl: null }));
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className={styles.qrDropZone}
                              onClick={() => qrFileInputRef.current?.click()}
                              aria-label="Chọn ảnh QR"
                            >
                              <span className={styles.qrDropIcon} aria-hidden>
                                <ImagePlus size={36} strokeWidth={1.35} />
                              </span>
                              <span className={styles.qrDropTitle}>Chọn ảnh QR</span>
                              <span className={styles.qrDropMeta}>
                                PNG, JPG — nếu trống, khách sẽ không thấy nút &quot;Lấy mã QR&quot;.
                              </span>
                            </button>
                          )}
                          <div className={styles.qrActionsColumn}>
                            <button
                              type="button"
                              className="btn btn--primary"
                              onClick={() => qrFileInputRef.current?.click()}
                            >
                              Chọn ảnh
                            </button>
                            {(pendingQrPreviewUrl ?? bankForm.qrCodeUrl) ? (
                              <button
                                type="button"
                                className="btn btn--ghost"
                                onClick={() => {
                                  setPendingQrFile(null);
                                  setPendingQrPreviewUrl((prev) => {
                                    if (prev) URL.revokeObjectURL(prev);
                                    return null;
                                  });
                                  setBankForm((f) => ({ ...f, qrCodeUrl: null }));
                                }}
                              >
                                Xóa ảnh QR (lưu để áp dụng)
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <label className={styles.inlineCheck}>
                        <input
                          type="checkbox"
                          checked={bankForm.active}
                          onChange={(e) => setBankForm((f) => ({ ...f, active: e.target.checked }))}
                        />
                        Hiển thị trên site
                      </label>
                      <div className={styles.detailActions}>
                        <button
                          type="button"
                          className="btn btn--primary adminToolbarBtn"
                          disabled={saving || !bankSaveDirty}
                          onClick={() => void saveBank()}
                        >
                          {saving ? <Spinner size="sm" inheritColor label="Đang lưu" /> : "Lưu"}
                        </button>
                        {bankPanel.kind === "edit" ? (
                          <button type="button" className="btn btn--ghost adminToolbarBtn" onClick={() => void deleteBank()}>
                            Xóa
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </AdminPageLayout>
  );
}
