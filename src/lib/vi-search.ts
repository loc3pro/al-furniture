/**
 * Bỏ dấu tiếng Việt (dùng khi DB chưa có extension unaccent).
 * Gần với kết quả unaccent() cho tìm kiếm cơ bản.
 */
export function stripVietnameseTones(s: string): string {
  let t = s.normalize("NFD").replace(/\p{M}/gu, "");
  t = t.replace(/\u0111/g, "d").replace(/\u0110/g, "D");
  return t;
}
