"use client";

import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

export type DbTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  inputClassName?: string;
};

export const DbTextarea = forwardRef<HTMLTextAreaElement, DbTextareaProps>(function DbTextarea(
  { className, inputClassName, ...props },
  ref,
) {
  const cn = ["db-textarea", inputClassName, className].filter(Boolean).join(" ");
  return <textarea ref={ref} className={cn} {...props} />;
});

DbTextarea.displayName = "DbTextarea";
