import { notFound } from "next/navigation";
import { getAdminProductEditBundle } from "@/lib/admin-product-edit-payload";
import { ProductEditPageClient } from "./ProductEditPageClient";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminProductEditPage({ params }: PageProps) {
  const { id } = await params;
  const bundle = await getAdminProductEditBundle(id);
  if (!bundle) notFound();

  return (
    <ProductEditPageClient
      product={bundle.product}
      categories={bundle.categories}
      variants={bundle.variants}
    />
  );
}
