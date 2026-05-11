import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const rows = await prisma.review.findMany({
    where: { userId: gate.session.sub },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      rating: true,
      comment: true,
      status: true,
      createdAt: true,
      product: { select: { nameVi: true, slug: true } },
    },
  });

  const reviews = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    productName: r.product.nameVi,
    productSlug: r.product.slug,
  }));

  return NextResponse.json({ reviews });
}
