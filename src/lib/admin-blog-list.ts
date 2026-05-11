import type { Prisma } from "@prisma/client";
import { ADMIN_PAGE_SIZE_DEFAULT } from "@/lib/admin-pagination";

export type BlogSortMode = "date" | "title" | "author";

export type BlogListParsed = {
  q: string;
  author: string;
  from: string;
  to: string;
  sort: BlogSortMode;
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function startOfDayUtc(ymd: string): Date | null {
  if (!YMD.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function endOfDayUtc(ymd: string): Date | null {
  if (!YMD.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
}

export function parseBlogListSearchParams(sp: {
  q?: string;
  author?: string;
  from?: string;
  to?: string;
  sort?: string;
  dir?: string;
  page?: string;
  pageSize?: string;
}): BlogListParsed {
  const q = (sp.q ?? "").trim();
  const author = (sp.author ?? "").trim();
  const from = (sp.from ?? "").trim();
  const to = (sp.to ?? "").trim();
  const sort: BlogSortMode =
    sp.sort === "title" ? "title" : sp.sort === "author" ? "author" : "date";
  const dir = sp.dir === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const ps = parseInt(sp.pageSize ?? "", 10);
  const pageSize =
    Number.isFinite(ps) && ps >= 1 && ps <= 100 ? ps : ADMIN_PAGE_SIZE_DEFAULT;
  return { q, author, from, to, sort, dir, page, pageSize };
}

export function buildBlogListWhere(parsed: BlogListParsed): Prisma.BlogPostWhereInput {
  const parts: Prisma.BlogPostWhereInput[] = [];
  if (parsed.q.length > 0) {
    const q = parsed.q;
    parts.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { authorName: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (parsed.author.length > 0) {
    parts.push({ authorName: parsed.author });
  }
  const range: Prisma.DateTimeFilter = {};
  const fromD = parsed.from ? startOfDayUtc(parsed.from) : null;
  const toD = parsed.to ? endOfDayUtc(parsed.to) : null;
  if (fromD) range.gte = fromD;
  if (toD) range.lte = toD;
  if (Object.keys(range).length > 0) {
    parts.push({ publishedAt: range });
  }
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0]!;
  return { AND: parts };
}

export function buildBlogListOrderBy(
  sort: BlogSortMode,
  dir: "asc" | "desc",
): Prisma.BlogPostOrderByWithRelationInput {
  if (sort === "title") return { title: dir };
  if (sort === "author") return { authorName: dir };
  return { publishedAt: dir };
}

/** Chuỗi query `?q=…&author=…` — đồng bộ server, toolbar, phân trang. */
export function blogListQueryFromParsed(parsed: BlogListParsed): string {
  const p = new URLSearchParams();
  if (parsed.q) p.set("q", parsed.q);
  if (parsed.author) p.set("author", parsed.author);
  if (parsed.from) p.set("from", parsed.from);
  if (parsed.to) p.set("to", parsed.to);
  const defaultSort = parsed.sort === "date" && parsed.dir === "desc";
  if (!defaultSort) {
    p.set("sort", parsed.sort === "title" ? "title" : parsed.sort === "author" ? "author" : "date");
    p.set("dir", parsed.dir);
  }
  if (parsed.page > 1) p.set("page", String(parsed.page));
  if (parsed.pageSize !== ADMIN_PAGE_SIZE_DEFAULT) p.set("pageSize", String(parsed.pageSize));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function blogListHref(parsed: BlogListParsed): string {
  return `/admin/blog${blogListQueryFromParsed(parsed)}`;
}

export function blogPaginationQueryRecord(parsed: BlogListParsed): Record<string, string | undefined> {
  const o: Record<string, string | undefined> = {};
  if (parsed.q) o.q = parsed.q;
  if (parsed.author) o.author = parsed.author;
  if (parsed.from) o.from = parsed.from;
  if (parsed.to) o.to = parsed.to;
  const defaultSort = parsed.sort === "date" && parsed.dir === "desc";
  if (!defaultSort) {
    o.sort = parsed.sort === "title" ? "title" : parsed.sort === "author" ? "author" : "date";
    o.dir = parsed.dir;
  }
  if (parsed.pageSize !== ADMIN_PAGE_SIZE_DEFAULT) o.pageSize = String(parsed.pageSize);
  return o;
}

/** Link sort cột bảng — giữ filter, đổi sort/dir, về trang 1. */
export function blogListHrefForSortColumn(
  parsed: BlogListParsed,
  col: BlogSortMode,
): string {
  const active = parsed.sort === col;
  const dir: "asc" | "desc" =
    active
      ? parsed.dir === "asc"
        ? "desc"
        : "asc"
      : col === "date"
        ? "desc"
        : col === "author"
          ? "asc"
          : "asc";
  return blogListHref({ ...parsed, sort: col, dir, page: 1 });
}
