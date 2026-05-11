import { prisma } from "@/lib/prisma";
import type { ProductPayload, VariantPayload } from "@/app/admin/products/[id]/ProductEditForm";

export type AdminProductEditBundle = {
  product: ProductPayload;
  categories: { id: string; nameVi: string; nameEn: string }[];
  variants: VariantPayload[];
};

/** Dữ liệu form chỉnh sản phẩm — dùng cho trang admin và GET API. */
export async function getAdminProductEditBundle(productId: string): Promise<AdminProductEditBundle | null> {
  let categories: { id: string; nameVi: string; nameEn: string }[] = [];
  try {
    categories = await prisma.category.findMany({
      orderBy: { nameVi: "asc" },
      select: { id: true, nameVi: true, nameEn: true },
    });
  } catch {
    categories = [];
  }

  let product: {
    id: string;
    nameVi: string;
    nameEn: string;
    productCode: string | null;
    slug: string;
    descriptionVi: string;
    descriptionEn: string;
    basePrice: number;
    discountPercent: number;
    salePrice: number | null;
    categoryId: string;
    isFeatured: boolean;
    brandNameVi: string | null;
    brandNameEn: string | null;
    metaTitleVi: string | null;
    metaTitleEn: string | null;
    metaDescriptionVi: string | null;
    metaDescriptionEn: string | null;
    depositAmount: number | null;
    tags: string[];
    variants: {
      id: string;
      colorLabelVi: string;
      colorLabelEn: string;
      colorHex: string | null;
      sizeLabelVi: string;
      sizeLabelEn: string;
      priceAdjustment: number;
      stockQuantity: number;
      imageUrls: unknown;
    }[];
  } | null = null;

  try {
    product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        nameVi: true,
        nameEn: true,
        productCode: true,
        slug: true,
        descriptionVi: true,
        descriptionEn: true,
        basePrice: true,
        discountPercent: true,
        salePrice: true,
        categoryId: true,
        isFeatured: true,
        brandNameVi: true,
        brandNameEn: true,
        metaTitleVi: true,
        metaTitleEn: true,
        metaDescriptionVi: true,
        metaDescriptionEn: true,
        depositAmount: true,
        tags: true,
        variants: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            colorLabelVi: true,
            colorLabelEn: true,
            colorHex: true,
            sizeLabelVi: true,
            sizeLabelEn: true,
            priceAdjustment: true,
            stockQuantity: true,
            imageUrls: true,
          },
        },
      },
    });
  } catch {
    product = null;
  }

  if (!product) return null;

  const variantRows: VariantPayload[] = product.variants.map((v) => {
    const raw = v.imageUrls;
    const urls = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
    return {
      id: v.id,
      colorLabelVi: v.colorLabelVi,
      colorLabelEn: v.colorLabelEn,
      colorHex: v.colorHex,
      sizeLabelVi: v.sizeLabelVi,
      sizeLabelEn: v.sizeLabelEn,
      priceAdjustment: v.priceAdjustment,
      stockQuantity: v.stockQuantity,
      imageUrls: urls,
    };
  });

  const { variants: _variants, ...productFields } = product;
  const productForForm = {
    ...productFields,
    tags: Array.isArray(productFields.tags) ? productFields.tags.map((t) => String(t)) : [],
  };

  let categoriesForForm = categories;
  const hasProductCat = categoriesForForm.some((c) => c.id === product.categoryId);
  if (!hasProductCat) {
    try {
      const orphan = await prisma.category.findUnique({
        where: { id: product.categoryId },
        select: { id: true, nameVi: true, nameEn: true },
      });
      if (orphan) {
        categoriesForForm = [...categoriesForForm, orphan].sort((a, b) =>
          a.nameVi.localeCompare(b.nameVi, "vi"),
        );
      }
    } catch {
      /* ignore */
    }
  }

  return {
    product: productForForm,
    categories: categoriesForForm,
    variants: variantRows,
  };
}
