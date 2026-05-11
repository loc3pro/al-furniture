/** Gợi ý bộ màu website khách (ThemeSettings) — áp dụng qua PUT /api/admin/theme */

export type StorefrontThemePreset = {
  id: string;
  name: string;
  description: string;
  colors: {
    primaryColor: string;
    accentColor: string;
    headerBg: string;
    menuColor: string;
    textOnPrimary: string;
    buttonHoverBg: string;
  };
};

export const STOREFRONT_THEME_PRESETS: StorefrontThemePreset[] = [
  {
    id: "warm-wood",
    name: "Gỗ ấm",
    description: "Nâu đất, be sữa — gần với mặc định, hợp nội thất cổ điển.",
    colors: {
      primaryColor: "#2C2620",
      accentColor: "#8B7355",
      headerBg: "#F7F4EF",
      menuColor: "#1A1612",
      textOnPrimary: "#FAF8F5",
      buttonHoverBg: "#EBE5DF",
    },
  },
  {
    id: "sage-calm",
    name: "Xanh lá dịu",
    description: "Tông xanh nhạt, thư giãn — phù hợp phòng khách hiện đại.",
    colors: {
      primaryColor: "#2D3D36",
      accentColor: "#6B9080",
      headerBg: "#F4F7F5",
      menuColor: "#1C2822",
      textOnPrimary: "#F8FBF9",
      buttonHoverBg: "#EBE5DF",
    },
  },
  {
    id: "navy-clean",
    name: "Xanh navy",
    description: "Chữ và nút tối trên nền sáng — nhìn rõ, formal.",
    colors: {
      primaryColor: "#1E3A5F",
      accentColor: "#3D6FB8",
      headerBg: "#F5F7FB",
      menuColor: "#152B47",
      textOnPrimary: "#FFFFFF",
      buttonHoverBg: "#EBE5DF",
    },
  },
  {
    id: "terracotta",
    name: "Đất nung",
    description: "Accent đỏ đất ấm, header kem — nổi bật nút kêu gọi.",
    colors: {
      primaryColor: "#4A3228",
      accentColor: "#C4624D",
      headerBg: "#FBF6F2",
      menuColor: "#2C1810",
      textOnPrimary: "#FFF8F5",
      buttonHoverBg: "#EBE5DF",
    },
  },
  {
    id: "mono-soft",
    name: "Tối giản xám",
    description: "Xám than — trung tính, hợp showroom tối giản.",
    colors: {
      primaryColor: "#2C2C2C",
      accentColor: "#6B7280",
      headerBg: "#FAFAFA",
      menuColor: "#111827",
      textOnPrimary: "#FFFFFF",
      buttonHoverBg: "#EBE5DF",
    },
  },
];
