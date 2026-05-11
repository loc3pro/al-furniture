import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminOrSeller } from "@/lib/admin-auth";

const patchSchema = z.object({
  eventActive: z.boolean().optional(),
  bannerTitle: z.string().min(1).max(200).optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  maxSpinsPerUserDay: z.number().int().min(1).max(50).optional(),
});

export async function GET() {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const cfg = await prisma.spinWheelConfig.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });

  return NextResponse.json({
    eventActive: cfg.eventActive,
    bannerTitle: cfg.bannerTitle,
    startsAt: cfg.startsAt?.toISOString() ?? null,
    endsAt: cfg.endsAt?.toISOString() ?? null,
    maxSpinsPerUserDay: cfg.maxSpinsPerUserDay,
  });
}

export async function PATCH(req: Request) {
  const gate = await requireAdminOrSeller();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload không hợp lệ" }, { status: 400 });
  }

  const data = parsed.data;
  const cfg = await prisma.spinWheelConfig.update({
    where: { id: "default" },
    data: {
      ...(data.eventActive !== undefined ? { eventActive: data.eventActive } : {}),
      ...(data.bannerTitle !== undefined ? { bannerTitle: data.bannerTitle } : {}),
      ...(data.startsAt !== undefined
        ? { startsAt: data.startsAt === null ? null : new Date(data.startsAt) }
        : {}),
      ...(data.endsAt !== undefined ? { endsAt: data.endsAt === null ? null : new Date(data.endsAt) } : {}),
      ...(data.maxSpinsPerUserDay !== undefined ? { maxSpinsPerUserDay: data.maxSpinsPerUserDay } : {}),
    },
  });

  return NextResponse.json({
    eventActive: cfg.eventActive,
    bannerTitle: cfg.bannerTitle,
    startsAt: cfg.startsAt?.toISOString() ?? null,
    endsAt: cfg.endsAt?.toISOString() ?? null,
    maxSpinsPerUserDay: cfg.maxSpinsPerUserDay,
  });
}
