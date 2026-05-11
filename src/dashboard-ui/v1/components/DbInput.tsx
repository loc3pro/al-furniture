"use client";

import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

export type DbInputProps = InputHTMLAttributes<HTMLInputElement> & {
  inputClassName?: string;
};

export const DbInput = forwardRef<HTMLInputElement, DbInputProps>(function DbInput(
  { className, inputClassName, ...props },
  ref,
) {
  const cn = ["db-input", inputClassName, className].filter(Boolean).join(" ");
  return <input ref={ref} className={cn} {...props} />;
});

DbInput.displayName = "DbInput";
