"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import styles from "./VnAddressCascader.module.scss";

type Row = { code: number; name: string };

type Tab = "province" | "district" | "ward";

function norm(s: string) {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function matchRow(rows: Row[], name: string | undefined): Row | undefined {
  if (!name?.trim()) return undefined;
  const n = norm(name);
  return (
    rows.find((r) => norm(r.name) === n) ||
    rows.find((r) => n.includes(norm(r.name)) || norm(r.name).includes(n))
  );
}

/** Một số từ tắt phổ biến → cụm cần khớp trong tên (đã norm). */
const ADDRESS_SEARCH_SHORTCUTS: Record<string, string[]> = {
  hcm: ["hồ chí minh", "ho chi minh"],
  tphcm: ["hồ chí minh"],
  sg: ["sài gòn", "hồ chí minh"],
  hn: ["hà nội"],
  hanoi: ["hà nội"],
  dn: ["đà nẵng"],
  đn: ["đà nẵng"],
  danang: ["đà nẵng"],
  bd: ["bình dương"],
  ct: ["cần thơ"],
  hp: ["hải phòng"],
  vt: ["vũng tàu", "bà rịa"],
};

/** Lọc theo ô tìm: chứa chuỗi + gợi ý tắt (vd. hcm → Thành phố Hồ Chí Minh). */
function matchesAddressSearch(rowName: string, rawQuery: string): boolean {
  const n = norm(rowName);
  const q = norm(rawQuery);
  if (!q) return true;
  if (n.includes(q)) return true;

  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => {
    if (n.includes(t)) return true;
    const shorts = ADDRESS_SEARCH_SHORTCUTS[t];
    if (shorts?.some((frag) => n.includes(norm(frag)))) return true;
    return false;
  });
}

async function fetchRows(url: string): Promise<Row[]> {
  const r = await fetch(url);
  if (!r.ok) throw new Error("fetch");
  const data = (await r.json()) as Row[];
  return Array.isArray(data) ? data : [];
}

export type VnAddressValue = {
  city: string;
  district: string;
  ward: string;
};

type Props = {
  value: VnAddressValue;
  onChange: (v: VnAddressValue) => void;
  disabled?: boolean;
};

export function VnAddressCascader({ value, onChange, disabled }: Props) {
  const searchFieldId = useId();
  const [tab, setTab] = useState<Tab>("province");
  const [listQuery, setListQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [provinces, setProvinces] = useState<Row[]>([]);
  const [districts, setDistricts] = useState<Row[]>([]);
  const [wards, setWards] = useState<Row[]>([]);
  const [pCode, setPCode] = useState<number | null>(null);
  const [dCode, setDCode] = useState<number | null>(null);

  const applySelection = useCallback(
    (next: Partial<VnAddressValue>) => {
      onChange({
        city: next.city ?? value.city,
        district: next.district ?? value.district,
        ward: next.ward ?? value.ward,
      });
    },
    [onChange, value.city, value.district, value.ward],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchRows("/api/vn-address?type=provinces");
        if (!cancelled) setProvinces(list);
      } catch {
        if (!cancelled) setProvinces([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (disabled || !pCode) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchRows(`/api/vn-address?type=districts&provinceCode=${pCode}`);
        if (!cancelled) setDistricts(list);
      } catch {
        if (!cancelled) setDistricts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pCode, disabled]);

  useEffect(() => {
    if (disabled || !dCode) {
      setWards([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchRows(`/api/vn-address?type=wards&districtCode=${dCode}`);
        if (!cancelled) setWards(list);
      } catch {
        if (!cancelled) setWards([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dCode, disabled]);

  useEffect(() => {
    if (disabled) return;
    if (!value.city.trim()) {
      setPCode(null);
      setDCode(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const plist = await fetchRows("/api/vn-address?type=provinces");
        if (cancelled) return;
        setProvinces((prev) => (prev.length ? prev : plist));
        const p = matchRow(plist, value.city);
        if (!p) return;
        setPCode(p.code);
        const dlist = await fetchRows(`/api/vn-address?type=districts&provinceCode=${p.code}`);
        if (cancelled) return;
        const d = matchRow(dlist, value.district);
        if (!d) return;
        setDCode(d.code);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      setLoading(false);
    };
  }, [disabled, value.city, value.district, value.ward]);

  useEffect(() => {
    setListQuery("");
  }, [tab]);

  const filteredProvinces = useMemo(
    () => provinces.filter((p) => matchesAddressSearch(p.name, listQuery)),
    [provinces, listQuery],
  );
  const filteredDistricts = useMemo(
    () => districts.filter((d) => matchesAddressSearch(d.name, listQuery)),
    [districts, listQuery],
  );
  const filteredWards = useMemo(
    () => wards.filter((w) => matchesAddressSearch(w.name, listQuery)),
    [wards, listQuery],
  );

  const currentList: Row[] =
    tab === "province" ? provinces : tab === "district" ? districts : wards;

  const tabDisabledDistrict = !pCode;
  const tabDisabledWard = !dCode;

  const noFilterResults =
    currentList.length > 0 &&
    !loading &&
    Boolean(listQuery.trim()) &&
    ((tab === "province" && filteredProvinces.length === 0) ||
      (tab === "district" && filteredDistricts.length === 0) ||
      (tab === "ward" && filteredWards.length === 0));

  if (disabled) {
    const line = [value.ward, value.district, value.city].filter(Boolean).join(", ");
    return (
      <div className={styles.root}>
        <div className={styles.disabledBox}>{line || "—"}</div>
      </div>
    );
  }

  const selectProvince = (p: Row) => {
    setPCode(p.code);
    setDCode(null);
    setTab("district");
    applySelection({ city: p.name, district: "", ward: "" });
    setDistricts([]);
    setWards([]);
  };

  const selectDistrict = (d: Row) => {
    setDCode(d.code);
    setTab("ward");
    applySelection({ district: d.name, ward: "" });
    setWards([]);
  };

  const selectWard = (w: Row) => {
    applySelection({ ward: w.name });
  };

  return (
    <div className={styles.root}>
      <div className={styles.summaryBar}>
        {[value.ward, value.district, value.city].filter(Boolean).join(" · ") || "Chọn Tỉnh/TP → Quận/Huyện → Phường/Xã"}
      </div>
      <div className={styles.tabs}>
        <button
          type="button"
          className={tab === "province" ? styles.tabActive : styles.tab}
          onClick={() => setTab("province")}
        >
          Tỉnh / TP
        </button>
        <button
          type="button"
          className={tab === "district" ? styles.tabActive : styles.tab}
          disabled={tabDisabledDistrict}
          onClick={() => !tabDisabledDistrict && setTab("district")}
        >
          Quận / Huyện
        </button>
        <button
          type="button"
          className={tab === "ward" ? styles.tabActive : styles.tab}
          disabled={tabDisabledWard}
          onClick={() => !tabDisabledWard && setTab("ward")}
        >
          Phường / Xã
        </button>
      </div>
      <div className={styles.searchRow}>
        <label className={styles.searchLabel} htmlFor={searchFieldId}>
          Tìm nhanh
        </label>
        <input
          id={searchFieldId}
          type="search"
          enterKeyHint="search"
          className={styles.searchInput}
          value={listQuery}
          onChange={(e) => setListQuery(e.target.value)}
          placeholder={
            tab === "province"
              ? "VD: Hà Nội, hcm, Đà Nẵng…"
              : tab === "district"
                ? "Tìm quận / huyện…"
                : "Tìm phường / xã…"
          }
          autoComplete="off"
          spellCheck={false}
          aria-label="Tìm nhanh trong danh sách địa chỉ"
        />
      </div>
      {loading ? (
        <div className={styles.loading}>
          <Spinner size="sm" label="Đang đồng bộ địa chỉ đã lưu" />
        </div>
      ) : null}
      <ul className={styles.list} role="listbox">
        {tab === "province" &&
          filteredProvinces.map((p) => (
            <li key={p.code}>
              <button
                type="button"
                className={norm(p.name) === norm(value.city) ? styles.itemSelected : styles.itemBtn}
                onClick={() => selectProvince(p)}
              >
                {p.name}
              </button>
            </li>
          ))}
        {tab === "district" &&
          filteredDistricts.map((d) => (
            <li key={d.code}>
              <button
                type="button"
                className={norm(d.name) === norm(value.district) ? styles.itemSelected : styles.itemBtn}
                onClick={() => selectDistrict(d)}
              >
                {d.name}
              </button>
            </li>
          ))}
        {tab === "ward" &&
          filteredWards.map((w) => (
            <li key={w.code}>
              <button
                type="button"
                className={norm(w.name) === norm(value.ward) ? styles.itemSelected : styles.itemBtn}
                onClick={() => selectWard(w)}
              >
                {w.name}
              </button>
            </li>
          ))}
      </ul>
      {currentList.length === 0 && !loading ? (
        <p className={styles.emptyHint}>
          {tab === "province"
            ? "Không tải được danh sách tỉnh."
            : tab === "district"
              ? "Chọn tỉnh trước."
              : "Chọn quận/huyện trước."}
        </p>
      ) : null}
      {noFilterResults ? (
        <p className={styles.emptyHint}>Không có kết quả phù hợp “{listQuery.trim()}”.</p>
      ) : null}
    </div>
  );
}
