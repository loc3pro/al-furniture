"use client";

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "default" | "danger" | "link";
type Size = "md" | "sm";

type DbButtonAsAnchor = {
  href: string;
  download?: boolean | string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  className?: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className" | "href" | "download">;

type DbButtonAsButton = {
  href?: undefined;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;

export type DbButtonProps = DbButtonAsAnchor | DbButtonAsButton;

function classes(variant: Variant, size: Size, className?: string) {
  const v =
    variant === "primary"
      ? "db-btn db-btn--primary"
      : variant === "danger"
        ? "db-btn db-btn--danger"
        : variant === "link"
          ? "db-btn db-btn--link"
          : "db-btn db-btn--default";
  const s = size === "sm" ? " db-btn--sm" : "";
  return [v, s, className].filter(Boolean).join(" ");
}

export function DbButton(props: DbButtonProps) {
  const { children, variant = "default", size = "md", loading, className } = props;
  const cn = classes(variant, size, className);
  const busy = Boolean(loading);

  if ("href" in props && props.href) {
    const { href, download, ...a } = props as DbButtonAsAnchor;
    return (
      <a
        href={href}
        download={download}
        className={cn}
        aria-busy={busy || undefined}
        {...a}
        onClick={busy ? (e) => e.preventDefault() : a.onClick}
      >
        {children}
      </a>
    );
  }

  const { disabled, type = "button", ...b } = props as DbButtonAsButton;
  return (
    <button type={type} className={cn} disabled={busy || disabled} aria-busy={busy || undefined} {...b}>
      {children}
    </button>
  );
}
