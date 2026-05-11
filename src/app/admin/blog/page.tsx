import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminStickyPageHeader } from "@/components/admin/AdminStickyPageHeader";
import { AdminToolbarStrip } from "@/components/admin/AdminToolbarStrip";
import {
  blogListHrefForSortColumn,
  blogPaginationQueryRecord,
  buildBlogListOrderBy,
  buildBlogListWhere,
  parseBlogListSearchParams,
  type BlogSortMode,
} from "@/lib/admin-blog-list";
import styles from "./admin-blog.module.scss";
import { NoDataEmpty } from "@/components/ui/NoDataEmpty";
import { BlogCreateSplit } from "./BlogCreateSplit";
import { BlogListToolbar } from "./BlogListToolbar";
import { BlogListTbody } from "./BlogListTbody";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    author?: string;
    from?: string;
    to?: string;
    sort?: string;
    dir?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function AdminBlogListPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const parsed = parseBlogListSearchParams(sp);
  const skip = (parsed.page - 1) * parsed.pageSize;
  const where = buildBlogListWhere(parsed);
  const orderBy = buildBlogListOrderBy(parsed.sort, parsed.dir);

  let posts: { id: string; title: string; slug: string; authorName: string; publishedAt: Date }[] = [];
  let total = 0;
  let authorNames: string[] = [];
  try {
    ;[posts, total, authorNames] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy,
        skip,
        take: parsed.pageSize,
        select: { id: true, title: true, slug: true, authorName: true, publishedAt: true },
      }),
      prisma.blogPost.count({ where }),
      prisma.blogPost
        .findMany({
          select: { authorName: true },
          distinct: ["authorName"],
          orderBy: { authorName: "asc" },
        })
        .then((rows) => rows.map((r) => r.authorName)),
    ]);
  } catch {
    posts = [];
    total = 0;
    authorNames = [];
  }

  const totalPages = Math.max(1, Math.ceil(total / parsed.pageSize));

  function ThSort({ col, children }: { col: BlogSortMode; children: ReactNode }) {
    const active = parsed.sort === col;
    return (
      <th className={styles.thSortCell}>
        <Link
          href={blogListHrefForSortColumn(parsed, col)}
          className={active ? `${styles.thSort} ${styles.thSortActive}` : styles.thSort}
        >
          <span>{children}</span>
          <span className={styles.sortGlyphs} aria-hidden>
            <span className={active && parsed.dir === "asc" ? styles.sortArrowOn : styles.sortArrowDim}>↑</span>
            <span className={active && parsed.dir === "desc" ? styles.sortArrowOn : styles.sortArrowDim}>↓</span>
          </span>
        </Link>
      </th>
    );
  }

  const toolbarKey = `${parsed.q}|${parsed.author}|${parsed.from}|${parsed.to}|${parsed.sort}|${parsed.dir}|${parsed.page}|${parsed.pageSize}|${authorNames.join(",")}`;

  const listRows = posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    authorName: p.authorName,
    publishedAt: p.publishedAt.toISOString(),
  }));

  return (
    <AdminPageLayout
      scrollClassName={styles.pageScroll}
      header={
        <AdminStickyPageHeader joinToolbarBelow>
          <div className="adminPageHeaderRow">
            <div className="adminPageHeaderMain">
              <h1 className={styles.title}>Blog</h1>
            </div>
            <div className="adminToolbar adminToolbar--end">
              <BlogCreateSplit />
            </div>
          </div>
        </AdminStickyPageHeader>
      }
      toolbar={
        <AdminToolbarStrip joinHeaderAbove>
          <BlogListToolbar key={toolbarKey} initialParsed={parsed} authorNames={authorNames} />
        </AdminToolbarStrip>
      }
    >
      <div className={styles.shellCard}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <ThSort col="title">Tiêu đề</ThSort>
                <ThSort col="author">Tác giả</ThSort>
                <th className={styles.thHeadPlain}>Slug</th>
                <ThSort col="date">Ngày xuất bản</ThSort>
                <th className={styles.thActions}>Thao tác</th>
              </tr>
            </thead>
            {posts.length === 0 ? (
              <tbody>
                <NoDataEmpty colSpan={5} cellClassName={styles.emptyCell} />
              </tbody>
            ) : (
              <BlogListTbody rows={listRows} />
            )}
          </table>
        </div>

        <AdminPagination
          queryNav={{
            pathname: "/admin/blog",
            query: blogPaginationQueryRecord(parsed),
            defaultPageSize: parsed.pageSize,
          }}
          page={parsed.page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={parsed.pageSize}
          itemLabel="bài viết"
        />
      </div>
    </AdminPageLayout>
  );
}
