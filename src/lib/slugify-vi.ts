/** Sinh slug URL an toàn từ tiêu đề tiếng Việt (chữ thường, dấu -). */
export function slugifyVi(title: string): string {
  const raw = title
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const s = raw.slice(0, 120);
  return s.length > 0 ? s : "shop-the-look";
}
