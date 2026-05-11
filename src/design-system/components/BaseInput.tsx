"use client";

import { forwardRef, memo } from "react";
import { Input, type InputRef, type InputProps } from "antd";
import cls from "./BaseInput.module.scss";

export type BaseInputProps = InputProps & {
  fullWidth?: boolean;
};

function BaseInputInner(
  { fullWidth, className, rootClassName, allowClear, ...rest }: BaseInputProps,
  ref: React.Ref<InputRef | null>,
) {
  const clear =
    allowClear === true
      ? { clearIcon: <span className={cls.clearMark}>×</span> }
      : allowClear === false || allowClear == null
        ? false
        : allowClear;

  return (
    <Input
      ref={ref}
      allowClear={clear}
      className={[fullWidth ? cls.full : "", className].filter(Boolean).join(" ")}
      rootClassName={[cls.wrap, rootClassName].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}

/** Input một dòng — clear dùng ký tự text, không dùng icon font. */
export const BaseInput = memo(forwardRef(BaseInputInner));

BaseInput.displayName = "BaseInput";
