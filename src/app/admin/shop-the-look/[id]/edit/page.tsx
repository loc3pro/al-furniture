import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminShopTheLookEditor } from "@/components/admin/AdminShopTheLookEditor";

export const metadata = { title: "Sửa Shop the Look — Admin" };

type Props = { params: Promise<{ id: string }> };

export default async function AdminShopTheLookEditPage({ params }: Props) {
  const { id } = await params;

  const look = await prisma.shopTheLook.findUnique({
    where: { id },
    include: {
      hotspots: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: { select: { nameVi: true } },
        },
      },
    },
  });

  if (!look) notFound();

  return (
    <AdminShopTheLookEditor
      mode="edit"
      id={look.id}
      initial={{
        slug: look.slug,
        title: look.title,
        subtitle: look.subtitle ?? "",
        description: look.description ?? "",
        heroImageUrl: look.heroImageUrl,
        published: look.published,
        editorZoom: look.editorZoom,
        hotspots: look.hotspots.map((h) => ({
          clientKey: h.id,
          productId: h.productId,
          productName: h.product.nameVi,
          xPercent: h.xPercent,
          yPercent: h.yPercent,
        })),
      }}
    />
  );
}
