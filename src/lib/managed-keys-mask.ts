/** Che giá trị nhạy cảm khi trả về API (không log đầy đủ). */
export function maskSecretValue(raw: string): string {
  const t = raw.trim();
  if (t.length <= 4) return "****";
  return `••••${t.slice(-4)}`;
}
