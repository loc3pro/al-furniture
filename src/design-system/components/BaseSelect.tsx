"use client";

import { memo } from "react";
import { Select, type SelectProps } from "antd";

import cls from "./BaseSelect.module.scss";

export type BaseSelectProps<Value = unknown> = SelectProps<Value> & {
  fullWidth?: boolean;
};

function BaseSelectInner<Value = unknown>({
  fullWidth,
  className,
  suffixIcon,
  ...rest
}: BaseSelectProps<Value>) {
  return (
    <Select<Value>
      className={[fullWidth ? cls.full : "", className].filter(Boolean).join(" ")}
      suffixIcon={suffixIcon ?? null}
      optionFilterProp="label"
      {...rest}
    />
  );
}

export const BaseSelect = memo(BaseSelectInner);
