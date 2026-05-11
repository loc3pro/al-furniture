"use client";

import { useCallback } from "react";
import type { KeyboardEvent } from "react";

export type DbSearchFieldProps = {
  value: string;
  onChange: (next: string) => void;
  onSearch?: () => void;
  placeholder?: string;
  searchLabel?: string;
  "aria-label"?: string;
  autoComplete?: string;
  className?: string;
};

export function DbSearchField({
  value,
  onChange,
  onSearch,
  placeholder,
  searchLabel = "Tìm",
  "aria-label": ariaLabel,
  autoComplete = "off",
  className,
}: DbSearchFieldProps) {
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onSearch?.();
      }
    },
    [onSearch],
  );

  return (
    <div className={["db-search", className].filter(Boolean).join(" ")}>
      <input
        className="db-search__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete={autoComplete}
      />
      {onSearch ? (
        <button type="button" className="db-search__btn" onClick={() => onSearch()}>
          {searchLabel}
        </button>
      ) : null}
    </div>
  );
}
