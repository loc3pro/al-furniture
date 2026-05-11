/** Key đồng bộ với `shop-locale.tsx` (localStorage) và cookie trên client. */
export const SHOP_LOCALE_STORAGE_KEY = "furniture_shop_locale";

export type ContentLocale = "vi" | "en";

export function isContentLocale(s: string | null | undefined): s is ContentLocale {
  return s === "vi" || s === "en";
}

export function parseContentLocale(s: string | null | undefined, fallback: ContentLocale = "vi"): ContentLocale {
  return isContentLocale(s) ? s : fallback;
}

/** Trả về null nếu segment không hợp lệ — dùng cho dynamic API `[locale]`. */
export function parseContentLocaleParam(s: string | null | undefined): ContentLocale | null {
  return isContentLocale(s) ? s : null;
}

export function pickProductName(p: { nameVi: string; nameEn: string }, locale: ContentLocale): string {
  return locale === "en" ? p.nameEn : p.nameVi;
}

export function pickProductDescription(
  p: { descriptionVi: string; descriptionEn: string },
  locale: ContentLocale,
): string {
  return locale === "en" ? p.descriptionEn : p.descriptionVi;
}

export function pickCategoryName(c: { nameVi: string; nameEn: string }, locale: ContentLocale): string {
  return locale === "en" ? c.nameEn : c.nameVi;
}

export function pickMetaTitle(
  p: { metaTitleVi: string | null; metaTitleEn: string | null },
  locale: ContentLocale,
): string | null {
  const v = locale === "en" ? p.metaTitleEn : p.metaTitleVi;
  return v?.trim() ? v : null;
}

export function pickMetaDescription(
  p: { metaDescriptionVi: string | null; metaDescriptionEn: string | null },
  locale: ContentLocale,
): string | null {
  const v = locale === "en" ? p.metaDescriptionEn : p.metaDescriptionVi;
  return v?.trim() ? v : null;
}

export function pickVariantColor(v: { colorLabelVi: string; colorLabelEn: string }, locale: ContentLocale): string {
  return locale === "en" ? v.colorLabelEn : v.colorLabelVi;
}

export function pickVariantSize(v: { sizeLabelVi: string; sizeLabelEn: string }, locale: ContentLocale): string {
  return locale === "en" ? v.sizeLabelEn : v.sizeLabelVi;
}
