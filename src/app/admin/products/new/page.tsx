import { prisma } from "@/lib/prisma";
import { ProductNewPageClient } from "./ProductNewPageClient";

export default async function AdminProductNewPage() {
  let categories: { id: string; nameVi: string; nameEn: string }[] = [];
  try {
    categories = await prisma.category.findMany({ orderBy: { nameVi: "asc" } });
  } catch {
    categories = [];
  }

  return <ProductNewPageClient categories={categories} />;
}
