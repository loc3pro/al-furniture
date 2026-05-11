/** Hiển thị tên nhân viên admin (ưu tiên tên, sau đó email). */
export function staffDisplayName(u: { name: string | null; email: string | null } | null | undefined): string {
  if (!u) return "—";
  const n = u.name?.trim();
  if (n) return n;
  const e = u.email?.trim();
  if (e) return e;
  return "—";
}
