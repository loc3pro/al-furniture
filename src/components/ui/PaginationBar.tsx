"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useMemo, useState } from "react";
import { Select } from "antd";
import { ChevronDown } from "lucide-react";
import { adminListUrl, type AdminListQueryNav } from "@/lib/admin-list-url";
import { compactAdminPageList } from "@/lib/admin-pagination";
import { SELECT_MENU_CHECK } from "@/design-system/select-icons";
import styles from "./PaginationBar.module.scss";

/** Dùng từ Server Component: pathname + query cố định (không gửi hàm qua RSC). */
export type PaginationQueryNav = AdminListQueryNav;

type BasePaginationProps = {
  variant?: "admin" | "shop";
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  itemLabel?: string;
  showItemRange?: boolean;
  showGoTo?: boolean;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (size: number) => void;
};

export type PaginationBarProps = BasePaginationProps &
  (
    | { queryNav: PaginationQueryNav; hrefForPage?: never; hrefForPageSize?: never }
    | {
        queryNav?: undefined;
        hrefForPage: (page: number) => string;
        hrefForPageSize?: (size: number) => string;
      }
  );

export function PaginationBar(props: PaginationBarProps) {
  const {
    variant = "admin",
    page,
    totalPages,
    totalItems,
    pageSize,
    itemLabel = "mục",
    showItemRange = true,
    showGoTo = true,
    pageSizeOptions,
    onPageSizeChange,
    queryNav,
    hrefForPage: hrefForPageProp,
    hrefForPageSize: hrefForPageSizeProp,
  } = props;

  const router = useRouter();
  const pageSizeId = useId();
  const [goDraft, setGoDraft] = useState("");

  const { hrefForPage, hrefForPageSize } = useMemo(() => {
    if (queryNav) {
      return {
        hrefForPage: (p: number) => adminListUrl(queryNav, p, pageSize),
        hrefForPageSize: (s: number) => adminListUrl(queryNav, 1, s),
      };
    }
    return {
      hrefForPage: hrefForPageProp as (p: number) => string,
      hrefForPageSize: hrefForPageSizeProp,
    };
  }, [queryNav, hrefForPageProp, hrefForPageSizeProp, pageSize]);

  const tp = Math.max(1, totalPages);

  const sizeOptions = useMemo(() => {
    if (pageSizeOptions?.length && pageSizeOptions.length > 0) {
      const set = new Set(pageSizeOptions);
      set.add(pageSize);
      return [...set].sort((a, b) => a - b);
    }
    if (onPageSizeChange != null || (!queryNav && hrefForPageSizeProp != null)) {
      const set = new Set([10, 20, 50, 100]);
      set.add(pageSize);
      return [...set].sort((a, b) => a - b);
    }
    return [];
  }, [pageSizeOptions, pageSize, onPageSizeChange, hrefForPageSizeProp, queryNav]);

  const showPageSize =
    sizeOptions.length > 0 &&
    (onPageSizeChange != null ||
      hrefForPageSize != null ||
      (queryNav != null && pageSizeOptions != null && pageSizeOptions.length > 0));

  if (totalItems <= 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  function goSubmit(e: FormEvent) {
    e.preventDefault();
    const raw = goDraft.trim();
    if (raw === "") return;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    const target = Math.min(Math.max(1, n), tp);
    router.push(hrefForPage(target));
    setGoDraft("");
  }

  function onPageSizeSelect(next: number) {
    if (next === pageSize) return;
    if (onPageSizeChange) {
      onPageSizeChange(next);
      return;
    }
    if (hrefForPageSize) router.push(hrefForPageSize(next));
  }

  const pillClass =
    variant === "shop"
      ? `${styles.pill} ${styles.pillShop}`
      : `${styles.pill} ${styles.pillAdmin}`;
  const metaClass =
    variant === "shop" ? `${styles.metaRow} ${styles.metaShop}` : `${styles.metaRow} ${styles.metaAdmin}`;

  const items = compactAdminPageList(page, tp);

  const outerClass =
    variant === "shop" ? styles.outer : `${styles.outer} ${styles.outerAdmin}`;

  return (
    <div className={outerClass}>
      <div className={pillClass}>
        <nav className={styles.nav} aria-label="Phân trang">
          {page > 1 ? (
            <Link
              href={hrefForPage(page - 1)}
              className={styles.arrowBtn}
              aria-label="Trang trước"
              prefetch={false}
            >
              <span className={styles.arrowText}>«</span>
            </Link>
          ) : (
            <span className={`${styles.arrowBtn} ${styles.arrowDisabled}`} aria-hidden>
              <span className={styles.arrowText}>«</span>
            </span>
          )}

          {items.map((item, idx) =>
            item.kind === "gap" ? (
              <span key={`g-${idx}`} className={styles.ellipsis}>
                …
              </span>
            ) : (
              <Link
                key={item.n}
                href={hrefForPage(item.n)}
                prefetch={false}
                className={item.n === page ? `${styles.pageNum} ${styles.pageActive}` : styles.pageNum}
              >
                {item.n}
              </Link>
            ),
          )}

          {page < tp ? (
            <Link href={hrefForPage(page + 1)} className={styles.arrowBtn} aria-label="Trang sau" prefetch={false}>
              <span className={styles.arrowText}>»</span>
            </Link>
          ) : (
            <span className={`${styles.arrowBtn} ${styles.arrowDisabled}`} aria-hidden>
              <span className={styles.arrowText}>»</span>
            </span>
          )}
        </nav>

        {showPageSize ? (
          <div className={styles.pageSizeWrap}>
            <Select<number>
              id={pageSizeId}
              className={styles.pageSizeSelect}
              value={pageSize}
              onChange={(n) => onPageSizeSelect(n)}
              aria-label="Số mục mỗi trang"
              variant="outlined"
              suffixIcon={<ChevronDown size={14} strokeWidth={2} aria-hidden />}
              menuItemSelectedIcon={SELECT_MENU_CHECK}
              popupMatchSelectWidth={false}
              options={sizeOptions.map((n) => ({ value: n, label: `${n} / trang` }))}
            />
          </div>
        ) : null}

        {showGoTo ? (
          <form className={styles.goTo} onSubmit={goSubmit}>
            <span className={styles.goToLabel}>Đến</span>
            <input
              name="goPage"
              className={styles.goToInput}
              inputMode="numeric"
              autoComplete="off"
              placeholder={String(page)}
              aria-label="Số trang cần chuyển"
              value={goDraft}
              onChange={(e) => setGoDraft(e.target.value)}
            />
            <span className={styles.goToLabel}>trang</span>
          </form>
        ) : null}
      </div>
    </div>
  );
}
