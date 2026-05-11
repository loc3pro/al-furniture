import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

const patchBody = z.object({
  role: z.nativeEnum(Role).optional(),
  name: z.string().max(200).nullable().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

async function assertCanDemoteAdmin(targetId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { role: true },
  });
  if (!target) return { ok: false, message: "Không tìm thấy người dùng" };
  if (target.role !== Role.ADMIN) return { ok: true };
  if (adminCount <= 1) {
    return { ok: false, message: "Không thể bỏ vai trò admin của tài khoản admin duy nhất" };
  }
  return { ok: true };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const { role: nextRole, name } = parsed.data;
  if (nextRole === undefined && name === undefined) {
    return NextResponse.json({ error: "Không có thay đổi" }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }

    if (nextRole !== undefined && nextRole !== existing.role) {
      if (existing.role === Role.ADMIN && nextRole !== Role.ADMIN) {
        const ok = await assertCanDemoteAdmin(id);
        if (!ok.ok) {
          return NextResponse.json({ error: ok.message }, { status: 400 });
        }
      }
    }

    const data: { role?: Role; name?: string | null } = {};
    if (nextRole !== undefined) data.role = nextRole;
    if (name !== undefined) {
      const t = name?.trim();
      data.name = t ? t : null;
    }

    const user = await prisma.user.update({
      where: { id },
      data,
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
    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ error: "Cập nhật thất bại" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  if (id === gate.session.sub) {
    return NextResponse.json({ error: "Không thể xóa chính tài khoản đang đăng nhập" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    }
    if (user.role === Role.ADMIN) {
      const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Không thể xóa admin duy nhất" }, { status: 400 });
      }
    }

    await prisma.$transaction([
      prisma.order.updateMany({ where: { userId: id }, data: { userId: null } }),
      prisma.user.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Không xóa được (còn ràng buộc dữ liệu)" }, { status: 409 });
  }
}
