"use client";

import { memo } from "react";
import cls from "./BaseFormItem.module.scss";

export type BaseFormItemProps = {
  id?: string;
  label: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

function BaseFormItemInner({ id, label, htmlFor, required, hint, error, children, className }: BaseFormItemProps) {
  return (
    <div className={[cls.item, className].filter(Boolean).join(" ")} id={id}>
      <label className={cls.label} htmlFor={htmlFor}>
        {label}
        {required ? <span aria-hidden> *</span> : null}
      </label>
      {children}
      {hint ? <p className={cls.hint}>{hint}</p> : null}
      {error ? <p className={cls.error}>{error}</p> : null}
    </div>
  );
}

export const BaseFormItem = memo(BaseFormItemInner);

BaseFormItem.displayName = "BaseFormItem";
