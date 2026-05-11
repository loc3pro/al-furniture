"use client";

import { Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ShopLocale } from "@/lib/shop-locale";
import { useShopLocale } from "@/lib/shop-locale";
import styles from "./SiteHeader.module.scss";

const LOCALES: ShopLocale[] = ["vi", "en"];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useShopLocale();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={styles.langWrap}>
      <button
        type="button"
        className={`${styles.iconLink} ${styles.langBtn}`}
        title={t("header.languageTitle")}
        aria-label={t("header.languageAria")}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
      >
        <Languages size={20} strokeWidth={2} aria-hidden />
        <span className={styles.langCode} aria-hidden>
          {locale.toUpperCase()}
        </span>
      </button>
      {open ? (
        <ul className={styles.langPanel} role="listbox" aria-label={t("header.languageAria")}>
          {LOCALES.map((code) => (
            <li key={code} role="none">
              <button
                type="button"
                role="option"
                aria-selected={locale === code}
                className={
                  locale === code ? `${styles.langOption} ${styles.langOptionActive}` : styles.langOption
                }
                onClick={() => {
                  setLocale(code);
                  setOpen(false);
                }}
              >
                <span className={styles.langOptionCode}>{code.toUpperCase()}</span>
                <span>{t(`locale.${code}`)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
