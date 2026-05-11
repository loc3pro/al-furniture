import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrSeller } from "@/lib/admin-auth";

export async function GET(req: Request) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  const products = await prisma.product.findMany({
    where: q
      ? {
          OR: [
            { nameVi: { contains: q, mode: "insensitive" } },
            { nameEn: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    take: 40,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      nameVi: true,
      nameEn: true,
      slug: true,
      category: { select: { nameVi: true, nameEn: true } },
    },
  });

  return NextResponse.json({ products });
}
