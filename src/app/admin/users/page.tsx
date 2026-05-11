import type { Prisma } from "@prisma/client";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ADMIN_PAGE_SIZE_DEFAULT } from "@/lib/admin-pagination";
import { UsersManagement, type AdminUserRow } from "./UsersManagement";

const PAGE_SIZE = ADMIN_PAGE_SIZE_DEFAULT;

function parseRoleFilter(raw?: string): Role | undefined {
  if (!raw?.trim()) return undefined;
  const t = raw.trim();
  return Object.values(Role).includes(t as Role) ? (t as Role) : undefined;
}

type PageProps = {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
};

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const roleRaw = (sp.role ?? "").trim();
  const roleFilterEnum = parseRoleFilter(sp.role);
  const roleFilter =
    roleRaw === "" || Object.values(Role).includes(roleRaw as Role) ? roleRaw : "";
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const skip = (pageNum - 1) * PAGE_SIZE;

  const where: Prisma.UserWhereInput = {};
  if (q.length > 0) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }
  if (roleFilterEnum) where.role = roleFilterEnum;

  const session = await getSession();

  let users: AdminUserRow[] = [];
  let total = 0;
  try {
    const [rows, count] = await Promise.all([
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
    users = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      role: r.role,
      createdAtIso: r.createdAt.toISOString(),
      ordersCount: r._count.orders,
    }));
    total = count;
  } catch {
    users = [];
    total = 0;
  }

  return (
    <UsersManagement
      users={users}
      total={total}
      page={pageNum}
      q={q}
      roleFilter={roleFilter}
      currentUserId={session?.sub ?? null}
    />
  );
}
