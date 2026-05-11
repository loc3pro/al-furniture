/** UTF-8 BOM để Excel nhận đúng tiếng Việt khi mở file CSV. */
const CSV_BOM = "\uFEFF";

function escapeCsvCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[\r\n",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export type CsvColumn = { key: string; header: string };

export function rowsToCsv(columns: CsvColumn[], rows: Record<string, unknown>[]): string {
  const header = columns.map((c) => escapeCsvCell(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(","));
  return CSV_BOM + [header, ...lines].join("\r\n");
}

export function asciiFilenameSafe(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "export";
}
