"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import en from "@/locales/shop/en.json";
import vi from "@/locales/shop/vi.json";
import { SHOP_LOCALE_STORAGE_KEY, type ContentLocale } from "@/lib/content-locale";

export type ShopLocale = ContentLocale;

const STORAGE_KEY = SHOP_LOCALE_STORAGE_KEY;

const bundles: Record<ShopLocale, Record<string, unknown>> = {
  vi: vi as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

function walk(obj: Record<string, unknown>, parts: string[]): unknown {
  let cur: unknown = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function interpolate(template: string, vars?: Record<string, string>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
}

type ShopLocaleContextValue = {
  locale: ShopLocale;
  setLocale: (next: ShopLocale) => void;
  t: (key: string, vars?: Record<string, string>) => string;
};

const ShopLocaleContext = createContext<ShopLocaleContextValue | null>(null);

export function ShopLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<ShopLocale>("vi");
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "vi" || raw === "en") setLocaleState(raw);
    } catch {
      /* ignore */
    }
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    document.cookie = `${STORAGE_KEY}=${locale};path=/;max-age=31536000;SameSite=Lax`;
  }, [locale, storageReady]);

  const setLocale = useCallback((next: ShopLocale) => {
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string>) => {
      const parts = key.split(".");
      const raw = walk(bundles[locale], parts);
      const template = typeof raw === "string" ? raw : key;
      return interpolate(template, vars);
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <ShopLocaleContext.Provider value={value}>{children}</ShopLocaleContext.Provider>;
}

export function useShopLocale(): ShopLocaleContextValue {
  const ctx = useContext(ShopLocaleContext);
  if (!ctx) {
    throw new Error("useShopLocale must be used within ShopLocaleProvider");
  }
  return ctx;
}
