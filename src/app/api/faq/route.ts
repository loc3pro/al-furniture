import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** FAQ công khai (chỉ bản ghi published) — dùng cho trang shop. */
type PublicFaqItem = {
  id: string;
  questionVi: string;
  questionEn: string;
  answerVi: string;
  answerEn: string;
  sortOrder: number;
};

export async function GET() {
  let rows: PublicFaqItem[] = [];
  try {
    rows = await prisma.faqItem.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        questionVi: true,
        questionEn: true,
        answerVi: true,
        answerEn: true,
        sortOrder: true,
      },
    });
  } catch {
    rows = [];
  }
  return NextResponse.json({ items: rows });
}
