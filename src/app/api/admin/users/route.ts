import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { ADMIN_PAGE_SIZE_DEFAULT } from "@/lib/admin-pagination";
import { looksLikeEmail, looksLikePhone, normalizeVnPhone } from "@/lib/identifiers";
import { recordAdminAudit } from "@/lib/admin-audit";

const PAGE_SIZE = ADMIN_PAGE_SIZE_DEFAULT;

function parseRole(raw: string | null): Role | undefined {
  if (!raw) return undefined;
  return Object.values(Role).includes(raw as Role) ? (raw as Role) : undefined;
}

const createBody = z.object({
  identifier: z.string().min(3).max(200),
  password: z.string().min(6).max(200),
  name: z.string().max(120).optional().nullable(),
  role: z.nativeEnum(Role),
});

/** Tạo người dùng (email hoặc SĐT + mật khẩu) — chỉ ADMIN. */
export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const json = await req.json().catch(() => null);
  const parsed = createBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const { password, identifier, name, role } = parsed.data;
  const idTrim = identifier.trim();

  let email: string | null = null;
  let phone: string | null = null;
  if (looksLikeEmail(idTrim)) {
    email = idTrim.toLowerCase();
  } else if (looksLikePhone(idTrim)) {
    phone = normalizeVnPhone(idTrim);
  } else {
    return NextResponse.json(
      { error: "Nhập email hợp lệ hoặc số điện thoại Việt Nam" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findFirst({
    where: email ? { email } : { phone: phone! },
  });
  if (existing) {
    return NextResponse.json({ error: "Tài khoản đã tồn tại" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const nameTrim = name?.trim();

  try {
    const user = await prisma.user.create({
      data: {
        name: nameTrim ? nameTrim : null,
        email,
        phone,
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    });

    await recordAdminAudit({
      actorUserId: gate.session.sub,
      action: "user.create",
      entityType: "User",
      entityId: user.id,
      summary: `Tạo người dùng ${email ?? phone ?? user.id} (${role})`,
    });

    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ error: "Không tạo được tài khoản" }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const roleFilter = parseRole(searchParams.get("role"));
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where: Prisma.UserWhereInput = {};
  if (q.length > 0) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }
  if (roleFilter) where.role = roleFilter;

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      total,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch {
    return NextResponse.json({ error: "Không tải được danh sách" }, { status: 500 });
  }
}
