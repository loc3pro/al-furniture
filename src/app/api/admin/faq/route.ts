import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminOrSeller } from "@/lib/admin-auth";

const createBody = z.object({
  questionVi: z.string().min(1).max(500),
  questionEn: z.string().min(1).max(500),
  answerVi: z.string().min(1),
  answerEn: z.string().min(1),
  published: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  let rows: Awaited<ReturnType<typeof prisma.faqItem.findMany>> = [];
  try {
    rows = await prisma.faqItem.findMany({ orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }] });
  } catch {
    rows = [];
  }
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = createBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  try {
    const row = await prisma.faqItem.create({
      data: {
        questionVi: parsed.data.questionVi,
        questionEn: parsed.data.questionEn,
        answerVi: parsed.data.answerVi,
        answerEn: parsed.data.answerEn,
        published: parsed.data.published ?? true,
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    });
    return NextResponse.json({ item: row });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Không tạo được" }, { status: 500 });
  }
}
