/** Giới hạn ngày theo múi Asia/Ho_Chi_Minh — dùng đếm lượt quay / ngày */

export function vietnamDayStartUtc(now = new Date()): Date {
  const dayKey = now.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  return new Date(`${dayKey}T00:00:00+07:00`);
}

export function vietnamDayEndUtc(now = new Date()): Date {
  const dayKey = now.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  return new Date(`${dayKey}T23:59:59.999+07:00`);
}
