import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/require-session";

const addressBody = z.object({
  line: z.string().min(1).max(500),
  ward: z.string().max(200).optional(),
  district: z.string().max(200).optional(),
  city: z.string().min(1).max(200),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const rows = await prisma.address.findMany({
    where: { userId: gate.session.sub },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ addresses: rows });
}

export async function POST(req: Request) {
  const gate = await requireSession();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = addressBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Địa chỉ không hợp lệ" }, { status: 400 });
  }

  const d = parsed.data;
  const created = await prisma.$transaction(async (tx) => {
    if (d.isDefault) {
      await tx.address.updateMany({
        where: { userId: gate.session.sub },
        data: { isDefault: false },
      });
    }
    return tx.address.create({
      data: {
        userId: gate.session.sub,
        line: d.line,
        ward: d.ward,
        district: d.district,
        city: d.city,
        isDefault: d.isDefault ?? false,
      },
    });
  });

  return NextResponse.json({ address: created });
}
