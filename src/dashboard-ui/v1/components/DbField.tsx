"use client";

import type { ReactNode } from "react";

export function DbField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="db-field">
      <div className="db-field__label">{label}</div>
      {children}
      {hint != null && hint !== false ? <p className="db-field__hint">{hint}</p> : null}
    </div>
  );
}
