import type { ContentLocale } from "@/lib/content-locale";
import {
  pickCategoryName,
  pickProductDescription,
  pickProductName,
  pickVariantColor,
  pickVariantSize,
} from "@/lib/content-locale";

type CatPick = { nameVi: string; nameEn: string; slug: string };

type VarPick = {
  id: string;
  colorLabelVi: string;
  colorLabelEn: string;
  colorHex: string | null;
  sizeLabelVi: string;
  sizeLabelEn: string;
  priceAdjustment: number;
  stockQuantity: number;
  sku: string;
  imageUrls: unknown;
};

type ProductListRow = {
  id: string;
  nameVi: string;
  nameEn: string;
  slug: string;
  basePrice: number;
  salePrice: number | null;
  discountPercent: number;
  isFeatured: boolean;
  soldCount: number;
  category: CatPick;
  variants: { priceAdjustment: number; imageUrls: unknown }[];
  minPrice?: number;
  thumbUrl?: string | null;
};

/** Dùng cho GET /api/:locale/products (đã tính minPrice, thumbUrl ở route). */
export function mapProductListItem(
  p: ProductListRow,
  locale: ContentLocale,
  extra: { minPrice: number; thumbUrl: string | null },
) {
  return {
    id: p.id,
    name: pickProductName(p, locale),
    slug: p.slug,
    basePrice: p.basePrice,
    salePrice: p.salePrice,
    discountPercent: p.discountPercent,
    minPrice: extra.minPrice,
    isFeatured: p.isFeatured,
    soldCount: p.soldCount,
    category: {
      slug: p.category.slug,
      name: pickCategoryName(p.category, locale),
    },
    thumbUrl: extra.thumbUrl,
  };
}

type ProductDetail = {
  id: string;
  nameVi: string;
  nameEn: string;
  productCode: string | null;
  slug: string;
  descriptionVi: string;
  descriptionEn: string;
  basePrice: number;
  salePrice: number | null;
  discountPercent: number;
  brandNameVi: string | null;
  brandNameEn: string | null;
  category: CatPick;
  depositAmount: number | null;
  metaTitleVi: string | null;
  metaTitleEn: string | null;
  metaDescriptionVi: string | null;
  metaDescriptionEn: string | null;
  isFeatured: boolean;
  viewCount: number;
  soldCount: number;
  createdAt: Date;
  updatedAt: Date;
  categoryId: string;
  variants: VarPick[];
};

export function mapProductDetailForApi(p: ProductDetail, locale: ContentLocale) {
  return {
    id: p.id,
    productCode: p.productCode,
    slug: p.slug,
    name: pickProductName(p, locale),
    description: pickProductDescription(p, locale),
    basePrice: p.basePrice,
    salePrice: p.salePrice,
    discountPercent: p.discountPercent,
    brandName: locale === "en" ? p.brandNameEn : p.brandNameVi,
    category: { slug: p.category.slug, name: pickCategoryName(p.category, locale) },
    depositAmount: p.depositAmount,
    metaTitle: locale === "en" ? p.metaTitleEn : p.metaTitleVi,
    metaDescription: locale === "en" ? p.metaDescriptionEn : p.metaDescriptionVi,
    isFeatured: p.isFeatured,
    viewCount: p.viewCount,
    soldCount: p.soldCount,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    variants: p.variants.map((v) => ({
      id: v.id,
      colorLabel: pickVariantColor(v, locale),
      sizeLabel: pickVariantSize(v, locale),
      colorHex: v.colorHex,
      priceAdjustment: v.priceAdjustment,
      stockQuantity: v.stockQuantity,
      sku: v.sku,
      imageUrls: v.imageUrls,
    })),
  };
}
