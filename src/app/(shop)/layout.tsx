import {
  getThemeSettings,
  resolveBrandText,
  resolveHeaderHotline,
  resolveHeaderShipping,
  resolveHeaderStoreName,
} from "@/lib/theme";
import { loadNavMegaCategories } from "@/lib/nav-mega-data";
import { getShopContentLocale } from "@/lib/shop-content-locale-server";
import { ShopChrome } from "@/components/layout/ShopChrome";
import { ShopAntdGate } from "@/design-system/ShopAntdGate";
import "./shop-ui.scss";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const locale = await getShopContentLocale();
  const [theme, navMegaCategories] = await Promise.all([
    getThemeSettings(),
    loadNavMegaCategories(locale),
  ]);
  const hotline = resolveHeaderHotline(theme);
  const shipping = resolveHeaderShipping(theme);
  return (
    <ShopAntdGate>
    <ShopChrome
      footerNote={theme.footerNote}
      logoUrl={theme.logoUrl}
      logoDarkUrl={theme.logoDarkUrl}
      brandText={resolveBrandText(theme)}
      brandBesideLogo={theme.brandText?.trim() || null}
      headerShowBrandBesideLogo={theme.headerShowBrandBesideLogo ?? false}
      headerStoreName={resolveHeaderStoreName(theme)}
      navMegaCategories={navMegaCategories}
      headerHotlineLabel={hotline.label}
      headerHotlinePhoneDisplay={hotline.phoneDisplay}
      headerHotlineTelHref={hotline.telHref}
      floatingHotlineDigits={hotline.phoneDigits}
      headerShippingLine1={shipping.line1}
      headerShippingLine2={shipping.line2}
    >
      {children}
    </ShopChrome>
    </ShopAntdGate>
  );
}
