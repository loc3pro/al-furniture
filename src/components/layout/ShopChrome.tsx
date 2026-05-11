"use client";

import { ToastViewport } from "@/components/ui/ToastViewport";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { ConsentAndAnalytics } from "@/components/consent/ConsentAndAnalytics";
import { AppMessageBanner } from "@/components/layout/AppMessageBanner";
import type { NavMegaCategory } from "@/lib/nav-mega-data";
import { ShopLocaleProvider } from "@/lib/shop-locale";
import { ShopSessionProvider } from "@/components/session/ShopSessionProvider";
import { FloatingRail } from "./FloatingRail";
import { ShopFooter } from "./ShopFooter";
import { SiteHeader } from "./SiteHeader";
import chromeStyles from "./ShopChrome.module.scss";

export function ShopChrome({
  children,
  footerNote,
  logoUrl,
  logoDarkUrl,
  brandText,
  brandBesideLogo,
  headerShowBrandBesideLogo,
  headerStoreName,
  navMegaCategories = [],
  headerHotlineLabel,
  headerHotlinePhoneDisplay,
  headerHotlineTelHref,
  floatingHotlineDigits,
  headerShippingLine1,
  headerShippingLine2,
}: {
  children: React.ReactNode;
  footerNote: string | null;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  brandText?: string;
  brandBesideLogo?: string | null;
  headerShowBrandBesideLogo?: boolean;
  /** Tên cửa hàng cạnh logo (optional). */
  headerStoreName?: string | null;
  navMegaCategories?: NavMegaCategory[];
  headerHotlineLabel?: string;
  headerHotlinePhoneDisplay?: string;
  headerHotlineTelHref?: string | null;
  /** Digits only — rail «Gọi …» + tel link; fallback env nếu trống. */
  floatingHotlineDigits?: string;
  headerShippingLine1?: string;
  headerShippingLine2?: string;
}) {
  return (
    <div className="shop-chrome" data-shop-chrome>
      <ShopSessionProvider>
        <ShopLocaleProvider>
          <div data-shop-print-hide>
            <SiteHeader
              logoUrl={logoUrl ?? null}
              logoDarkUrl={logoDarkUrl ?? null}
              brandText={brandText}
              brandBesideLogo={brandBesideLogo ?? null}
              headerShowBrandBesideLogo={headerShowBrandBesideLogo ?? false}
              headerStoreName={headerStoreName ?? null}
              navMegaCategories={navMegaCategories}
              hotlineLabel={headerHotlineLabel}
              hotlinePhoneDisplay={headerHotlinePhoneDisplay}
              hotlineTelHref={headerHotlineTelHref ?? null}
              shippingLine1={headerShippingLine1}
              shippingLine2={headerShippingLine2}
            />
            <div className={chromeStyles.headerSpacer} aria-hidden />
            <ConsentAndAnalytics />
            <AppMessageBanner variant="shop" />
          </div>
          <main id="main">{children}</main>
          <div data-shop-print-hide>
            <ShopFooter footerNote={footerNote} />
            <FloatingRail hotlineDigits={floatingHotlineDigits} hotlineDisplay={headerHotlinePhoneDisplay} />
            <ChatWidget />
            <ToastViewport surface="shop" />
          </div>
        </ShopLocaleProvider>
      </ShopSessionProvider>
    </div>
  );
}
