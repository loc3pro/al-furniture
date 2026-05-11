"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./QuantityStepper.module.scss";

export type QuantityStepperProps = {
  value: number;
  /** Giới hạn dưới khi bấm −; mặc định 0 (giỏ hàng: về 0 để xóa dòng). PDP / admin nên truyền min={1}. */
  min?: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  /** sm: nút −/+ nhỏ hơn — dùng cạnh giá hẹp (giỏ / checkout). */
  size?: "md" | "sm";
};

/** Giới hạn tăng trên form admin (tránh số quá lớn vô nghĩa). */
export const QUANTITY_STEPPER_ADMIN_MAX = 999_999;

export function QuantityStepper({
  value,
  min = 0,
  max,
  onChange,
  disabled = false,
  className,
  ariaLabel = "Số lượng",
  size = "md",
}: QuantityStepperProps) {
  const floor = Number.isFinite(min) ? min : 0;
  const rawMax = typeof max === "number" && Number.isFinite(max) ? max : value;
  /**
   * Trần hợp lệ = `max` (tồn kho / giới hạn ngoài).
   * Không dùng Math.max(max, value): khi max = 0 (hết hàng) sẽ bị đẩy trần theo value và vẫn bấm + được.
   */
  const ceiling = Math.max(floor, rawMax);

  const [draft, setDraft] = useState(String(value));
  const editingRef = useRef(false);

  useEffect(() => {
    if (!editingRef.current) {
      setDraft(String(value));
    }
  }, [value]);

  /** Số đang hiển thị trong ô (đã clamp); nếu ô trống / lỗi thì dùng `value` từ props. */
  function parseDraftToClamped(): number {
    const t = draft.replace(/\D/g, "").trim();
    if (t === "") return value;
    const n = Number.parseInt(t, 10);
    if (!Number.isFinite(n)) return value;
    return Math.min(ceiling, Math.max(floor, n));
  }

  const resolved = parseDraftToClamped();
  const decDisabled = disabled || resolved <= floor;
  const incDisabled = disabled || resolved >= ceiling;

  function commitDraft() {
    const t = draft.replace(/\D/g, "").trim();
    if (t === "") {
      const next = floor;
      onChange(next);
      setDraft(String(next));
      return;
    }
    const n = Number.parseInt(t, 10);
    if (!Number.isFinite(n)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(ceiling, Math.max(floor, n));
    onChange(clamped);
    setDraft(String(clamped));
  }

  function applyDelta(delta: -1 | 1) {
    const v = parseDraftToClamped();
    const next = delta < 0 ? Math.max(floor, v - 1) : Math.min(ceiling, v + 1);
    editingRef.current = false;
    onChange(next);
    setDraft(String(next));
  }

  return (
    <div
      className={[styles.stepper, size === "sm" ? styles.stepperSm : "", className].filter(Boolean).join(" ")}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className={styles.btn}
        aria-label="Giảm số lượng"
        disabled={decDisabled}
        onClick={() => applyDelta(-1)}
      >
        −
      </button>
      <div className={styles.valWrap}>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={ariaLabel}
          disabled={disabled}
          className={styles.valInput}
          value={draft}
          onFocus={() => {
            editingRef.current = true;
          }}
          onBlur={() => {
            editingRef.current = false;
            commitDraft();
          }}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
            setDraft(digits);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>
      <button
        type="button"
        className={styles.btn}
        aria-label="Tăng số lượng"
        disabled={incDisabled}
        onClick={() => applyDelta(1)}
      >
        +
      </button>
    </div>
  );
}
