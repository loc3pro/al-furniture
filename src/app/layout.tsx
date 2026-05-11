import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.scss";
import "@/components/invoice/invoice-print-globals.scss";
import { StoreProvider } from "@/store/StoreProvider";
import { GlobalLoadingProvider } from "@/components/layout/GlobalLoading";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";
import { getThemeSettings, resolveButtonHoverBg } from "@/lib/theme";
import { isSafeThemeAssetUrl } from "@/lib/theme-asset-url";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Theme/CSS variables phải đọc DB mỗi request — tránh cache layout khiến khách không thấy màu mới */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Furniture ECM — Nội thất cao cấp",
    template: "%s · Furniture ECM",
  },
  description: "E-commerce nội thất — Next.js, Prisma, theo master plan.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getThemeSettings();
  const favRaw = theme.faviconUrl?.trim();
  const faviconHref = favRaw && isSafeThemeAssetUrl(favRaw) ? favRaw : null;

  const cssVars = `
    :root {
      --color-primary: ${theme.primaryColor};
      --color-accent: ${theme.accentColor};
      --color-header-bg: ${theme.headerBg};
      --color-menu: ${theme.menuColor};
      --color-on-primary: ${theme.textOnPrimary};
      --color-button-hover: ${resolveButtonHoverBg(theme)};
    }
  `;

  /* suppressHydrationWarning trên html/body: extension (Grammarly, …) chèn attribute trước hydrate */
  return (
    <html lang="vi" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssVars }} />
        {faviconHref ? <link rel="icon" href={faviconHref} /> : null}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <StoreProvider>
          <ConfirmDialogProvider>
            <GlobalLoadingProvider>
              <a className="skip-link" href="#main">
                Bỏ qua nội dung
              </a>
              {children}
            </GlobalLoadingProvider>
          </ConfirmDialogProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
