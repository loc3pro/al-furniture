"use client";

import { useMemo, useState } from "react";
import { stableValueJson } from "@/lib/form-dirty-snapshot";
import { Select } from "antd";
import { ChevronDown } from "lucide-react";
import { showAdminToast } from "@/lib/admin-toast";
import { SELECT_MENU_CHECK } from "@/design-system/select-icons";
import { spinDiscountLabelVi } from "@/lib/spin-discount-label";
import styles from "./spin-wheel-admin.module.scss";

/** Chỉ giữ chữ số; bỏ chuỗi số 0 đầu (010 → 10, không để số 0 thừa phía trước). */
function digitsStripLeadingZeros(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d === "") return "";
  const rest = d.replace(/^0+/, "");
  return rest === "" ? "0" : rest;
}

function parseNonNegInt(raw: string, fallback: number): number {
  const s = digitsStripLeadingZeros(raw);
  if (s === "") return fallback;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? fallback : Math.max(0, n);
}

function parsePositiveInt(raw: string, fallback: number): number {
  const s = digitsStripLeadingZeros(raw);
  if (s === "") return fallback;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? fallback : Math.max(1, n);
}

/** Tỷ lệ ưu tiên khi quay: 0 = không tham gia; 1 = hiếm … 100 = dễ trúng. Xác suất thực = giá trị / tổng các ô đang đủ điều kiện. */
const CHANCE_MAX = 100;

function parseChancePercent(raw: string, fallback: number): number {
  const s = digitsStripLeadingZeros(raw.replace(/\D/g, ""));
  if (s === "") return fallback;
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(CHANCE_MAX, Math.max(0, n));
}

function formatChancePercent(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return String(Math.min(CHANCE_MAX, Math.max(0, Math.round(n))));
}

export type SpinWheelAdminConfig = {
  eventActive: boolean;
  bannerTitle: string;
  startsAt: string | null;
  endsAt: string | null;
  maxSpinsPerUserDay: number;
};

type Config = SpinWheelAdminConfig;

function normalizeCfgForSnap(c: Config) {
  return {
    eventActive: c.eventActive,
    bannerTitle: c.bannerTitle.trim(),
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    maxSpinsPerUserDay: c.maxSpinsPerUserDay,
  };
}

export type SpinWheelAdminSegment = {
  id: string;
  sortOrder: number;
  label: string;
  weight: number;
  quantityCap: number;
  quantityWon: number;
  discountType: string;
  discountValue: number;
  discountMaxVnd: number;
  validityDays: number;
  minOrderAmount: number;
  active: boolean;
};

type Segment = SpinWheelAdminSegment;

/** Xác suất ~% mỗi lượt quay (ô trong pool: bật, còn quota, tỷ lệ &gt; 0). */
function effectiveWinPercentBySegmentId(segments: Segment[]): Map<string, number | null> {
  const eligible = segments.filter(
    (s) => s.active && s.quantityWon < s.quantityCap && s.weight > 0,
  );
  const sum = eligible.reduce((a, s) => a + s.weight, 0);
  const map = new Map<string, number | null>();
  for (const s of segments) {
    if (!s.active || s.quantityWon >= s.quantityCap || s.weight <= 0) {
      map.set(s.id, null);
    } else {
      map.set(s.id, sum > 0 ? (100 * s.weight) / sum : null);
    }
  }
  return map;
}

type NewSegForm = {
  label: string;
  weight: number;
  weightInput: string;
  quantityCap: number;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  discountMaxVnd: number;
  validityDays: number;
  minOrderAmount: number;
};

export function SpinWheelAdminClient({
  initialConfig,
  initialSegments,
}: {
  initialConfig: SpinWheelAdminConfig;
  initialSegments: SpinWheelAdminSegment[];
}) {
  const [cfg, setCfg] = useState<Config>(initialConfig);
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [savingCfg, setSavingCfg] = useState(false);
  const [cfgBaseline, setCfgBaseline] = useState(() => stableValueJson(normalizeCfgForSnap(initialConfig)));

  const cfgSnap = useMemo(() => stableValueJson(normalizeCfgForSnap(cfg)), [cfg]);
  const isCfgDirty = cfgSnap !== cfgBaseline;

  const winPctById = useMemo(() => effectiveWinPercentBySegmentId(segments), [segments]);

  const [newSeg, setNewSeg] = useState<NewSegForm>({
    label: "",
    weight: 10,
    weightInput: "10",
    quantityCap: 500,
    discountType: "PERCENT",
    discountValue: 10,
    discountMaxVnd: 0,
    validityDays: 14,
    minOrderAmount: 0,
  });

  async function saveCfg(partial: Partial<Config>) {
    setSavingCfg(true);
    try {
      const res = await fetch("/api/admin/spin-wheel/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...partial,
          startsAt: partial.startsAt === undefined ? undefined : partial.startsAt,
          endsAt: partial.endsAt === undefined ? undefined : partial.endsAt,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        showAdminToast((d as { error?: string }).error ?? "Không lưu được", "error");
        return;
      }
      const next = d as Config;
      setCfg(next);
      setCfgBaseline(stableValueJson(normalizeCfgForSnap(next)));
      showAdminToast("Đã lưu cấu hình vòng quay");
    } finally {
      setSavingCfg(false);
    }
  }

  async function addSegment(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/spin-wheel/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newSeg.label.trim(),
        weight: parseChancePercent(newSeg.weightInput, newSeg.weight),
        quantityCap: newSeg.quantityCap,
        discountType: newSeg.discountType,
        discountValue: newSeg.discountValue,
        discountMaxVnd: newSeg.discountType === "PERCENT" ? newSeg.discountMaxVnd : 0,
        validityDays: newSeg.validityDays,
        minOrderAmount: newSeg.minOrderAmount,
      }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      showAdminToast((d as { error?: string }).error ?? "Không thêm được", "error");
      return;
    }
    setSegments((prev) => [...prev, d as Segment].sort((a, b) => a.sortOrder - b.sortOrder));
    setNewSeg((n) => ({ ...n, label: "", weight: 10, weightInput: "10" }));
    showAdminToast("Đã thêm ô quà");
  }

  async function patchSegment(id: string, partial: Partial<Segment>) {
    const res = await fetch(`/api/admin/spin-wheel/segments/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      showAdminToast((d as { error?: string }).error ?? "Không cập nhật được", "error");
      return;
    }
    setSegments((prev) => prev.map((x) => (x.id === id ? { ...x, ...(d as Segment) } : x)));
    showAdminToast("Đã cập nhật");
  }

  async function removeSegment(id: string) {
    if (!confirm("Xóa ô quà này?")) return;
    const res = await fetch(`/api/admin/spin-wheel/segments/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      showAdminToast((d as { error?: string }).error ?? "Không xóa được — thử tắt active.", "error");
      return;
    }
    setSegments((prev) => prev.filter((x) => x.id !== id));
    showAdminToast("Đã xóa");
  }

  return (
    <div className={styles.shell}>
      <section className={styles.card}>
        <h2 className={styles.h2}>Sự kiện & banner</h2>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={cfg.eventActive}
            onChange={(e) => setCfg({ ...cfg, eventActive: e.target.checked })}
          />
          <span>Kích hoạt vòng quay (banner trái dưới + trang /lucky-wheel)</span>
        </label>
        <label className={styles.field}>
          <span>Tiêu đề banner</span>
          <input
            value={cfg.bannerTitle}
            onChange={(e) => setCfg({ ...cfg, bannerTitle: e.target.value })}
            maxLength={200}
          />
        </label>
        <div className={styles.row2}>
          <label className={styles.field}>
            <span>Bắt đầu (ISO, để trống = không giới hạn)</span>
            <input
              type="datetime-local"
              value={cfg.startsAt ? cfg.startsAt.slice(0, 16) : ""}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  startsAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
            />
          </label>
          <label className={styles.field}>
            <span>Kết thúc</span>
            <input
              type="datetime-local"
              value={cfg.endsAt ? cfg.endsAt.slice(0, 16) : ""}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  endsAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
            />
          </label>
        </div>
        <label className={styles.field}>
          <span>Lượt quay / người / ngày (VN)</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Lượt quay mỗi ngày"
            value={String(cfg.maxSpinsPerUserDay)}
            onChange={(e) =>
              setCfg({
                ...cfg,
                maxSpinsPerUserDay: Math.min(50, Math.max(1, parsePositiveInt(e.target.value, 1))),
              })
            }
          />
        </label>
        <button
          type="button"
          className="btn btn--primary"
          disabled={savingCfg || !isCfgDirty}
          title="Lưu cấu hình vòng quay (thời gian, banner, giới hạn lượt)"
          onClick={() =>
            void saveCfg({
              eventActive: cfg.eventActive,
              bannerTitle: cfg.bannerTitle.trim(),
              startsAt: cfg.startsAt,
              endsAt: cfg.endsAt,
              maxSpinsPerUserDay: cfg.maxSpinsPerUserDay,
            })
          }
        >
          {savingCfg ? "Đang lưu…" : "Lưu"}
        </button>
      </section>

      <section className={styles.card}>
        <h2 className={styles.h2}>Thêm ô quà (coupon)</h2>
        <form className={styles.formGrid} onSubmit={addSegment}>
          <label className={styles.field}>
            <span>Nhãn hiển thị</span>
            <input required value={newSeg.label} onChange={(e) => setNewSeg({ ...newSeg, label: e.target.value })} />
          </label>
          <label className={styles.field}>
            <span>Tỷ lệ trúng (0–100): 1 = hiếm, 100 = dễ trúng; 0 = không tham gia quay</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              required
              aria-label="Tỷ lệ trúng phần trăm"
              value={newSeg.weightInput}
              onChange={(e) => {
                const t = e.target.value.replace(/\D/g, "");
                const num = parseChancePercent(t, newSeg.weight);
                setNewSeg({ ...newSeg, weightInput: t, weight: num });
              }}
              onBlur={() => {
                const n = parseChancePercent(newSeg.weightInput, newSeg.weight);
                setNewSeg((p) => ({ ...p, weight: n, weightInput: formatChancePercent(n) }));
              }}
            />
          </label>
          <label className={styles.field}>
            <span>Số lượng phần quà (cap)</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              required
              aria-label="Số lượng phần quà"
              value={String(newSeg.quantityCap)}
              onChange={(e) => setNewSeg({ ...newSeg, quantityCap: parsePositiveInt(e.target.value, 1) })}
            />
          </label>
          <label className={styles.field}>
            <span>Loại giảm</span>
            <Select<"PERCENT" | "FIXED">
              className={styles.discountTypeSelect}
              value={newSeg.discountType}
              onChange={(discountType) => {
                setNewSeg({
                  ...newSeg,
                  discountType,
                  ...(discountType === "FIXED" ? { discountMaxVnd: 0 } : {}),
                });
              }}
              options={[
                { value: "PERCENT", label: "Phần trăm %" },
                { value: "FIXED", label: "Số tiền VNĐ" },
              ]}
              variant="outlined"
              suffixIcon={<ChevronDown size={16} strokeWidth={2} aria-hidden />}
              menuItemSelectedIcon={SELECT_MENU_CHECK}
              popupMatchSelectWidth={false}
            />
          </label>
          <label className={styles.field}>
            <span>{newSeg.discountType === "PERCENT" ? "Giảm %" : "Giảm (VNĐ)"}</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              required
              aria-label={newSeg.discountType === "PERCENT" ? "Phần trăm giảm" : "Số tiền giảm"}
              value={String(newSeg.discountValue)}
              onChange={(e) => setNewSeg({ ...newSeg, discountValue: parseNonNegInt(e.target.value, 0) })}
            />
          </label>
          {newSeg.discountType === "PERCENT" ? (
            <label className={styles.field}>
              <span>Tối đa giảm (VNĐ) — % áp trên tổng đơn nhưng không vượt quá mức này (0 = không trần)</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label="Trần giảm VNĐ"
                value={String(newSeg.discountMaxVnd)}
                onChange={(e) => setNewSeg({ ...newSeg, discountMaxVnd: parseNonNegInt(e.target.value, 0) })}
              />
            </label>
          ) : null}
          <label className={styles.field}>
            <span>Hạn mã sau khi trúng (ngày)</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Số ngày hiệu lực"
              value={String(newSeg.validityDays)}
              onChange={(e) => setNewSeg({ ...newSeg, validityDays: parsePositiveInt(e.target.value, 1) })}
            />
          </label>
          <label className={styles.field}>
            <span>Đơn tối thiểu (VNĐ)</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label="Đơn tối thiểu"
              value={String(newSeg.minOrderAmount)}
              onChange={(e) => setNewSeg({ ...newSeg, minOrderAmount: parseNonNegInt(e.target.value, 0) })}
            />
          </label>
          <div className={styles.submitWrap}>
            <span className={styles.submitPlaceholder} aria-hidden="true">
              {"\u00a0"}
            </span>
            <button type="submit" className={`btn btn--secondary ${styles.submitBtn}`}>
              Thêm ô
            </button>
          </div>
        </form>
      </section>

      <section className={styles.card}>
        <h2 className={styles.h2}>Danh sách ô ({segments.length})</h2>
        <p className={styles.help}>
          Mỗi ô nhập <strong>tỷ lệ 0–100</strong>: số càng cao thì càng dễ trúng khi quay (vẫn ngẫu nhiên theo tỷ lệ). Xác suất thực
          của một ô = tỷ lệ ô đó / <strong>tổng tỷ lệ</strong> các ô đang bật, còn phần thưởng và có tỷ lệ dương. Ô 0 không vào vòng
          quay. Cột «≈ %» ước tính xác suất mỗi lượt. Đã phát / cap giới hạn tổng mã.
        </p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nhãn</th>
                <th>Tỷ lệ (0–100)</th>
                <th>≈ % / lượt</th>
                <th>Đã phát / Cap</th>
                <th>Giảm</th>
                <th>Trần max (₫)</th>
                <th>Hạn (ngày)</th>
                <th>Đơn min</th>
                <th>Bật</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {segments.length === 0 ? (
                <tr>
                  <td colSpan={10} className={styles.emptyRow}>
                    Chưa có ô quà — khách không nhận được segment nào khi quay. Điền form «Thêm ô quà» phía trên rồi bấm{" "}
                    <strong>Thêm ô</strong>. Menu admin: sidebar <strong>Vòng quay</strong> → đường dẫn{" "}
                    <code>/admin/spin-wheel</code>.
                  </td>
                </tr>
              ) : null}
              {segments.map((s) => {
                const approxPct = winPctById.get(s.id);
                return (
                  <tr key={s.id}>
                    <td>{s.label}</td>
                    <td>
                      <input
                      key={`w-${s.id}-${String(s.weight)}`}
                      className={styles.tinyNum}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label={`Tỷ lệ trúng ${s.label}`}
                      defaultValue={formatChancePercent(s.weight)}
                      onBlur={(e) => {
                        const v = parseChancePercent(e.target.value, s.weight);
                        const prev = Math.round(Number(s.weight));
                        if (v !== prev) void patchSegment(s.id, { weight: v });
                        e.target.value = formatChancePercent(v);
                      }}
                    />
                  </td>
                  <td className={styles.pctCell}>
                    {approxPct != null ? (
                      <span title="Ước tính xác suất mỗi lượt quay (ô đang tham gia pool)">
                        {approxPct.toFixed(1)}%
                      </span>
                    ) : (
                      <span className={styles.pctDash}>—</span>
                    )}
                  </td>
                  <td>
                    {s.quantityWon} /{" "}
                    <input
                      className={styles.tinyNum}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label={`Cap ${s.label}`}
                      defaultValue={String(s.quantityCap)}
                      onBlur={(e) => {
                        const v = Math.max(s.quantityWon, parsePositiveInt(e.target.value, s.quantityCap));
                        if (v !== s.quantityCap) void patchSegment(s.id, { quantityCap: v });
                        e.target.value = String(v);
                      }}
                    />
                  </td>
                  <td>{spinDiscountLabelVi(s)}</td>
                  <td>
                    {s.discountType === "PERCENT" ? (
                      <input
                        key={`cap-${s.id}-${String(s.discountMaxVnd)}`}
                        className={styles.tinyNumWide}
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        aria-label={`Trần giảm ${s.label}`}
                        defaultValue={String(Math.floor(Number(s.discountMaxVnd ?? 0)))}
                        onBlur={(e) => {
                          const v = parseNonNegInt(e.target.value, Math.floor(Number(s.discountMaxVnd ?? 0)));
                          const prev = Math.floor(Number(s.discountMaxVnd ?? 0));
                          if (v !== prev) void patchSegment(s.id, { discountMaxVnd: v });
                          e.target.value = String(v);
                        }}
                      />
                    ) : (
                      <span className={styles.pctDash}>—</span>
                    )}
                  </td>
                  <td>
                    <input
                      className={styles.tinyNum}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label={`Hạn ngày ${s.label}`}
                      defaultValue={String(s.validityDays)}
                      onBlur={(e) => {
                        const v = parsePositiveInt(e.target.value, s.validityDays);
                        if (v !== s.validityDays) void patchSegment(s.id, { validityDays: v });
                        e.target.value = String(v);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      className={styles.tinyNum}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label={`Đơn min ${s.label}`}
                      defaultValue={String(s.minOrderAmount)}
                      onBlur={(e) => {
                        const v = parseNonNegInt(e.target.value, s.minOrderAmount);
                        if (v !== s.minOrderAmount) void patchSegment(s.id, { minOrderAmount: v });
                        e.target.value = String(v);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      defaultChecked={s.active}
                      onChange={(e) => void patchSegment(s.id, { active: e.target.checked })}
                    />
                  </td>
                  <td>
                    <button type="button" className={styles.linkBtn} onClick={() => void removeSegment(s.id)}>
                      Xóa
                    </button>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
