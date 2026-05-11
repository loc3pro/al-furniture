"use client";

import { forwardRef, useMemo } from "react";
import type { ChangeEvent } from "react";
import { Select, type SelectProps } from "antd";
import type { RefSelectProps } from "antd/es/select";
import { ChevronDown } from "lucide-react";
import { SELECT_MENU_CHECK } from "@/design-system/select-icons";

export type DbSelectOption = { value: string; label: string; disabled?: boolean };

type InheritedSelect = Pick<
  SelectProps<string>,
  | "id"
  | "disabled"
  | "autoFocus"
  | "title"
  | "className"
  | "style"
  | "value"
  | "defaultValue"
  | "aria-label"
  | "aria-labelledby"
  | "aria-describedby"
  | "status"
  | "placeholder"
>;

export type DbSelectProps = InheritedSelect & {
  options: readonly DbSelectOption[];
  pill?: boolean;
  /** Giống `<select onChange>` — `e.target.value` là chuỗi đã chọn. */
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
};

function emitNativeChange(
  handler: DbSelectProps["onChange"],
  value: string,
) {
  if (!handler) return;
  handler({
    target: { value },
    currentTarget: { value },
  } as ChangeEvent<HTMLSelectElement>);
}

export const DbSelect = forwardRef<RefSelectProps, DbSelectProps>(function DbSelect(
  { options, className, pill, style, onChange, ...rest },
  ref,
) {
  const antdOptions = useMemo(
    () => options.map((o) => ({ value: o.value, label: o.label, disabled: o.disabled })),
    [options],
  );

  const rootClass = ["db-select", pill ? "db-select--pill" : "", className].filter(Boolean).join(" ");

  return (
    <Select<string>
      ref={ref}
      className={rootClass}
      style={style}
      variant="outlined"
      optionFilterProp="label"
      options={antdOptions}
      suffixIcon={<ChevronDown size={18} strokeWidth={2} aria-hidden />}
      menuItemSelectedIcon={SELECT_MENU_CHECK}
      popupMatchSelectWidth={false}
      listHeight={320}
      {...rest}
      onChange={(v) => emitNativeChange(onChange, v)}
    />
  );
});

DbSelect.displayName = "DbSelect";
