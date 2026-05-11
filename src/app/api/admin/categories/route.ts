import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminOrSeller } from "@/lib/admin-auth";
import { slugify } from "@/lib/slug";

const createBody = z.object({
  nameVi: z.string().min(1).max(200),
  nameEn: z.string().min(1).max(200),
  slug: z.string().min(1).max(150).optional(),
  parentId: z.string().nullable().optional(),
  metaTitleVi: z.string().optional(),
  metaTitleEn: z.string().optional(),
  metaDescriptionVi: z.string().optional(),
  metaDescriptionEn: z.string().optional(),
});

export async function GET() {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const rows = await prisma.category.findMany({
    orderBy: { nameVi: "asc" },
    include: { parent: { select: { id: true, nameVi: true, nameEn: true } } },
  });
  return NextResponse.json({ categories: rows });
}

export async function POST(req: Request) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = createBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const d = parsed.data;
  let slug = d.slug ? slugify(d.slug) : slugify(d.nameVi);
  const exists = await prisma.category.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString(36)}`;

  try {
    const cat = await prisma.category.create({
      data: {
        nameVi: d.nameVi,
        nameEn: d.nameEn,
        slug,
        parentId: d.parentId ?? null,
        metaTitleVi: d.metaTitleVi?.trim() || null,
        metaTitleEn: d.metaTitleEn?.trim() || null,
        metaDescriptionVi: d.metaDescriptionVi?.trim() || null,
        metaDescriptionEn: d.metaDescriptionEn?.trim() || null,
      },
    });
    return NextResponse.json({ category: cat });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Không tạo được danh mục" }, { status: 409 });
  }
}
