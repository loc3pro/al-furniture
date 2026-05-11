import type { HomeSectionBlockId } from "@/lib/homepage-section-order";
import { DEFAULT_HOME_SECTION_BLOCK_ORDER } from "@/lib/homepage-section-order";

/** Cấu hình trang chủ sau khi merge DB + mặc định */
export type HomePageConfigMerged = {
  featuredTitle: string;
  featuredProductsMode: "AUTO" | "CUSTOM";
  featuredSectionEnabled: boolean;
  featuredProductIds: string[];
  newSectionTitle: string;
  newProductsMode: "AUTO" | "CUSTOM";
  newSectionEnabled: boolean;
  newProductIds: string[];
  newProductsLimit: number;
  livingSectionTitle: string;
  /** Danh mục fallback khi không chọn SP tay — chỉ dùng server-side */
  livingCategorySlug: string;
  livingProductsMode: "AUTO" | "CUSTOM";
  livingSectionEnabled: boolean;
  livingProductIds: string[];
  livingLimit: number;
  newsSectionTitle: string;
  newsMode: "AUTO" | "CUSTOM";
  newsSectionEnabled: boolean;
  newsPostIds: string[];
  newsLimit: number;
  shopLookSectionEnabled: boolean;
  shopLookTitle: string;
  shopLookSubtitle: string;
  shopLookMode: "AUTO" | "CUSTOM";
  shopLookCardLimit: number;
  shopLookOrderIds: string[];
  /** Thứ tự khối nội dung dưới banner trên cửa hàng */
  sectionBlockOrder: HomeSectionBlockId[];
};

/** Giá trị mặc định khi chưa có bản ghi HomePageConfig */
export const DEFAULT_HOME_PAGE_CONFIG: HomePageConfigMerged = {
  featuredTitle: "Bộ sưu tập nổi bật",
  featuredProductsMode: "AUTO",
  featuredSectionEnabled: true,
  featuredProductIds: [],
  newSectionTitle: "Sản phẩm mới",
  newProductsMode: "AUTO",
  newSectionEnabled: true,
  newProductIds: [],
  newProductsLimit: 12,
  livingSectionTitle: "Sản phẩm nổi bật",
  livingCategorySlug: "phong-khach",
  livingProductsMode: "AUTO",
  livingSectionEnabled: true,
  livingProductIds: [],
  livingLimit: 8,
  newsSectionTitle: "Tin tức",
  newsMode: "AUTO",
  newsSectionEnabled: true,
  newsPostIds: [],
  newsLimit: 3,
  shopLookSectionEnabled: true,
  shopLookTitle: "Shop the look",
  shopLookSubtitle:
    "Cảm hứng phối nội thất phòng khách hiện đại — tông trung tính, chất liệu tự nhiên.",
  shopLookMode: "AUTO",
  shopLookCardLimit: 3,
  shopLookOrderIds: [],
  sectionBlockOrder: [...DEFAULT_HOME_SECTION_BLOCK_ORDER],
};

export type HomePageConfigPublic = HomePageConfigMerged;
