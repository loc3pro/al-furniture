/** Dùng từ Server Component: pathname + query cố định (không gửi hàm qua RSC). */
export type AdminListQueryNav = {
  pathname: string;
  query: Record<string, string | undefined>;
  defaultPageSize: number;
  pageParam?: string;
  pageSizeParam?: string;
};

export function adminListUrl(nav: AdminListQueryNav, targetPage: number, targetPageSize: number): string {
  const pageParam = nav.pageParam ?? "page";
  const pageSizeParam = nav.pageSizeParam ?? "pageSize";
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(nav.query)) {
    if (v !== undefined && v !== "") q.set(k, v);
  }
  if (targetPage > 1) q.set(pageParam, String(targetPage));
  if (targetPageSize !== nav.defaultPageSize) q.set(pageSizeParam, String(targetPageSize));
  const s = q.toString();
  return s ? `${nav.pathname}?${s}` : nav.pathname;
}
