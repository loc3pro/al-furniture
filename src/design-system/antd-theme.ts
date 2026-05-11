import type { ThemeConfig } from "antd";

/** Sellzy-like admin: teal sidebar, mint nền, accent #008080, bo góc lớn. */
export const dsAntdTheme: ThemeConfig = {
  token: {
    borderRadius: 8,
    borderRadiusLG: 12,
    fontSize: 15,
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    colorPrimary: "#008080",
    colorInfo: "#008080",
    colorSuccess: "#2a9d6f",
    colorWarning: "#e8a23d",
    colorError: "#d64545",
    colorBgLayout: "#f0f9f6",
    colorBgContainer: "#ffffff",
    colorText: "#0f2622",
    colorTextSecondary: "#5c726d",
    lineHeight: 1.5,
    /** Một chiều cao cho Input / Select / Button (middle) — đồng bộ filter bar mọi trang. */
    controlHeight: 40,
    controlHeightSM: 40,
    controlHeightLG: 40,
  },
  components: {
    Layout: {
      bodyBg: "transparent",
      headerBg: "#ffffff",
      headerHeight: "auto",
      headerPadding: "0 16px",
      footerBg: "transparent",
      siderBg: "#004d4d",
    },
    Menu: {
      itemBorderRadius: 8,
      groupTitleFontSize: 11,
      darkItemBg: "transparent",
      darkItemSelectedBg: "#d4f5ea",
      darkItemSelectedColor: "#004040",
      darkItemHoverBg: "rgba(255,255,255,0.1)",
      darkItemColor: "rgba(255,255,255,0.72)",
    },
    Button: {
      borderRadius: 8,
      paddingInline: 16,
      contentFontSizeSM: 14,
      primaryShadow: "0 2px 8px rgba(0, 128, 128, 0.22)",
    },
    Input: {
      borderRadius: 8,
    },
    Select: {
      borderRadius: 10,
      borderRadiusLG: 14,
      optionPadding: "10px 12px",
      optionSelectedBg: "#d4f5ea",
      optionSelectedColor: "#084a3a",
      optionActiveBg: "#ecf6f1",
      optionSelectedFontWeight: 600,
    },
    Card: {
      borderRadiusLG: 12,
      paddingLG: 24,
    },
    Table: {
      borderRadius: 8,
      headerBg: "#f4faf7",
      headerColor: "#5c726d",
      rowHoverBg: "#f0faf7",
      borderColor: "transparent",
    },
    Tag: {
      borderRadiusSM: 8,
    },
    Form: {
      labelFontSize: 14,
      verticalLabelPadding: "0 0 8px",
    },
    Tabs: {
      horizontalMargin: "0 0 16px 0",
    },
    Pagination: {
      borderRadius: 8,
      itemActiveBg: "#d4f5ea",
    },
  },
};
