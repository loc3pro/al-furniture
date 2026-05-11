"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VnAddressCascader } from "@/components/address/VnAddressCascader";
import { AccountAddressesListSkeleton } from "@/components/account/AccountPageSkeletons";
import { useAccount } from "@/components/account/AccountContext";
import { stableValueJson } from "@/lib/form-dirty-snapshot";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { showAppToast } from "@/lib/app-toast";
import styles from "../accountPages.module.scss";

type Addr = {
  id: string;
  line: string;
  ward: string | null;
  district: string | null;
  city: string;
  isDefault: boolean;
};

function snapAddrBody(line: string, ward: string, district: string, city: string, isDefault: boolean) {
  return stableValueJson({
    line: line.trim(),
    ward: ward.trim(),
    district: district.trim(),
    city: city.trim(),
    isDefault,
  });
}

const EMPTY_ADDRESS_SNAP = snapAddrBody("", "", "", "", false);

export default function AccountAddressesPage() {
  const askConfirm = useConfirm();
  const { refresh: refreshUser } = useAccount();

  const [addresses, setAddresses] = useState<Addr[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addrLine, setAddrLine] = useState("");
  const [addrWard, setAddrWard] = useState("");
  const [addrDistrict, setAddrDistrict] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrDefault, setAddrDefault] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editBaselineSnapRef = useRef<string | null>(null);

  const loadAddresses = useCallback(async () => {
    try {
      const rAddr = await fetch("/api/user/addresses");
      const j = rAddr.ok ? await rAddr.json() : { addresses: [] };
      setAddresses(Array.isArray(j.addresses) ? j.addresses : []);
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  function startEdit(a: Addr) {
    setEditingId(a.id);
    setAddrLine(a.line);
    setAddrWard(a.ward ?? "");
    setAddrDistrict(a.district ?? "");
    setAddrCity(a.city);
    setAddrDefault(a.isDefault);
    editBaselineSnapRef.current = snapAddrBody(a.line, a.ward ?? "", a.district ?? "", a.city, a.isDefault);
  }

  function cancelEdit() {
    setEditingId(null);
    setAddrLine("");
    setAddrWard("");
    setAddrDistrict("");
    setAddrCity("");
    setAddrDefault(false);
    editBaselineSnapRef.current = null;
  }

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      line: addrLine.trim(),
      ward: addrWard.trim() || undefined,
      district: addrDistrict.trim() || undefined,
      city: addrCity.trim(),
      isDefault: addrDefault,
    };
    if (!body.line || !body.city || !body.district || !body.ward) {
      showAppToast("Điền đủ địa chỉ đường và chọn Tỉnh / Quận / Phường.", "error");
      return;
    }

    if (editingId) {
      const res = await fetch(`/api/user/addresses/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showAppToast(data.error ?? "Cập nhật địa chỉ thất bại", "error");
        return;
      }
      showAppToast("Đã cập nhật địa chỉ.");
    } else {
      const res = await fetch("/api/user/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showAppToast(data.error ?? "Thêm địa chỉ thất bại", "error");
        return;
      }
      showAppToast("Đã thêm địa chỉ.");
    }
    cancelEdit();
    await loadAddresses();
    await refreshUser();
  }

  const currentAddrSnap = useMemo(
    () => snapAddrBody(addrLine, addrWard, addrDistrict, addrCity, addrDefault),
    [addrLine, addrWard, addrDistrict, addrCity, addrDefault],
  );
  const addressDirty =
    editingId != null
      ? editBaselineSnapRef.current != null && currentAddrSnap !== editBaselineSnapRef.current
      : currentAddrSnap !== EMPTY_ADDRESS_SNAP;

  async function deleteAddress(id: string) {
    if (!(await askConfirm({ message: "Xóa địa chỉ này?", danger: true }))) return;
    const res = await fetch(`/api/user/addresses/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showAppToast(data.error ?? "Xóa thất bại", "error");
      return;
    }
    showAppToast("Đã xóa địa chỉ.");
    if (editingId === id) cancelEdit();
    await loadAddresses();
    await refreshUser();
  }

  return (
    <>
      <p style={{ marginBottom: "1rem" }}>
        <Link href="/" className="muted">
          ← Về trang chủ
        </Link>
      </p>
      <h1 className={styles.title}>Địa chỉ đã lưu</h1>

      {addressesLoading ? (
        <AccountAddressesListSkeleton />
      ) : addresses.length === 0 ? (
        <div className={styles.emptyBig}>
          <p style={{ margin: 0 }}>Không có địa chỉ</p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.25rem" }}>
          {addresses.map((a) => (
            <li
              key={a.id}
              className={styles.orderCard}
              style={{ listStyle: "none" }}
            >
              <div style={{ fontWeight: 600 }}>
                {a.line}
                {a.isDefault ? (
                  <span className={styles.muted} style={{ marginLeft: 8, fontSize: "0.85rem" }}>
                    (mặc định)
                  </span>
                ) : null}
              </div>
              <div className={styles.muted} style={{ fontSize: "0.9rem" }}>
                {[a.ward, a.district, a.city].filter(Boolean).join(", ")}
              </div>
              <div style={{ marginTop: "0.6rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button type="button" className="btn btn--ghost" onClick={() => startEdit(a)}>
                  Sửa
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => void deleteAddress(a.id)}>
                  Xóa
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className={styles.card}>
        <h2 style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>
          {editingId ? "Sửa địa chỉ" : "Thêm địa chỉ"}
        </h2>
        <form onSubmit={saveAddress}>
          <label className={styles.field}>
            Địa chỉ (số nhà, đường)
            <input className={styles.input} value={addrLine} onChange={(e) => setAddrLine(e.target.value)} />
          </label>
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontWeight: 600, marginBottom: 6, fontSize: "0.92rem" }}>Tỉnh / Quận / Phường</div>
            <VnAddressCascader
              value={{ city: addrCity, district: addrDistrict, ward: addrWard }}
              onChange={(v) => {
                setAddrCity(v.city);
                setAddrDistrict(v.district);
                setAddrWard(v.ward);
              }}
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <input type="checkbox" checked={addrDefault} onChange={(e) => setAddrDefault(e.target.checked)} />
            Đặt làm mặc định
          </label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="submit" className="btn btn--primary" disabled={!addressDirty}>
              {editingId ? "Cập nhật" : "Thêm địa chỉ"}
            </button>
            {editingId ? (
              <button type="button" className="btn btn--ghost" onClick={cancelEdit}>
                Hủy
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </>
  );
}
