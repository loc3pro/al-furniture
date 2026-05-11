import { prisma } from "@/lib/prisma";
import { FaqAdminClient, type FaqAdminRow } from "./FaqAdminClient";

export default async function AdminFaqPage() {
  let rows: FaqAdminRow[] = [];
  try {
    const db = await prisma.faqItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });
    rows = db.map((r) => ({
      id: r.id,
      questionVi: r.questionVi,
      questionEn: r.questionEn,
      answerVi: r.answerVi,
      answerEn: r.answerEn,
      published: r.published,
      sortOrder: r.sortOrder,
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch {
    rows = [];
  }

  return <FaqAdminClient initialRows={rows} />;
}
