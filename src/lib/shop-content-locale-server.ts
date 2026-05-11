import { cookies } from "next/headers";
import {
  parseContentLocale,
  SHOP_LOCALE_STORAGE_KEY,
  type ContentLocale,
} from "@/lib/content-locale";

/** Locale nội dung shop (sản phẩm, danh mục) — cookie đồng bộ với `ShopLocaleProvider` trên client. */
export async function getShopContentLocale(): Promise<ContentLocale> {
  const store = await cookies();
  return parseContentLocale(store.get(SHOP_LOCALE_STORAGE_KEY)?.value);
}
