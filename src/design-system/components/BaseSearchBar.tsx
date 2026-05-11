"use client";

import { memo } from "react";
import { BaseInput, type BaseInputProps } from "@/design-system/components/BaseInput";
import { BaseButton } from "@/design-system/components/BaseButton";

import cls from "./BaseSearchBar.module.scss";

export type BaseSearchBarProps = {
  /** Ô tìm kiếm — luôn cùng style toàn hệ thống */
  search: Pick<BaseInputProps, "placeholder" | "defaultValue" | "value" | "onChange" | "name" | "disabled"> & {
    "aria-label"?: string;
  };
  /** Các filter (BaseSelect, BaseInput, …) — đặt cạnh ô search */
  filters?: React.ReactNode;
  /** Nút phụ (Xuất, Tạo, …) */
  actions?: React.ReactNode;
  showReset?: boolean;
  onReset?: () => void;
  resetLabel?: string;
  className?: string;
  /** Bọc trong thẻ form (vd. method=&quot;get&quot;, action) */
  formProps?: React.ComponentPropsWithoutRef<"form">;
};

/**
 * Thanh tìm kiếm + filter + reset + action — một pattern duy nhất cho admin (và shop khi cần).
 * Không dùng icon; reset là text button.
 */
function BaseSearchBarInner({
  search,
  filters,
  actions,
  showReset,
  onReset,
  resetLabel = "Đặt lại",
  className,
  formProps,
}: BaseSearchBarProps) {
  const inner = (
    <div className={[cls.root, className].filter(Boolean).join(" ")}>
      <div className={cls.search}>
        <BaseInput fullWidth {...search} />
      </div>
      {filters ? <div className={cls.filters}>{filters}</div> : null}
      <div className={cls.actions}>
        {showReset && onReset ? (
          <BaseButton htmlType="button" variant="ghost" dsSize="sm" onClick={onReset}>
            {resetLabel}
          </BaseButton>
        ) : null}
        {actions}
      </div>
    </div>
  );

  if (formProps) {
    return <form {...formProps}>{inner}</form>;
  }

  return inner;
}

export const BaseSearchBar = memo(BaseSearchBarInner);

BaseSearchBar.displayName = "BaseSearchBar";
