"use client";

import Link from "next/link";
import { PaymentMethod } from "@prisma/client";
import { useCallback, useMemo, useState } from "react";
import type { ReportsSummaryPayload } from "@/lib/admin-reports-summary";
import { formatVnd } from "@/lib/money";
import { orderStatusLabel } from "@/lib/order-status-vi";
import exportStyles from "./reports-export.module.scss";
import styles from "./reports.module.scss";
import dashStyles from "./reports-dashboard.module.scss";
import { NoDataEmpty } from "@/components/ui/NoDataEmpty";
import { ReportsChartsGate } from "./ReportsChartsGate";

const PAYMENT_VI: Record<PaymentMethod, string> = {
  COD: "COD",
  MOMO: "Ví MoMo",
  BANK_TRANSFER: "Chuyển khoản",
};

function formatRangeVi(fromIso: string, toIso: string): string {
  try {
    const a = new Date(`${fromIso}T12:00:00`);
    const b = new Date(`${toIso}T12:00:00`);
    const opts: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "short",
      year: "numeric",
    };
    return `${a.toLocaleDateString("vi-VN", opts)} → ${b.toLocaleDateString("vi-VN", opts)}`;
  } catch {
    return `${fromIso} → ${toIso}`;
  }
}

function isoTodayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(baseIso: string, deltaDays: number): string {
  const d = new Date(`${baseIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

export function AdminReportsDashboard({ initial }: { initial: ReportsSummaryPayload }) {
  const [data, setData] = useState<ReportsSummaryPayload>(initial);
  const [from, setFrom] = useState(initial.range.from);
  const [to, setTo] = useState(initial.range.to);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const rangeLabel = useMemo(() => formatRangeVi(data.range.from, data.range.to), [data.range]);

  const revenueExportHref = useMemo(() => {
    const q = new URLSearchParams({
      from: data.range.from,
      to: data.range.to,
    }).toString();
    return `/api/admin/export/revenue-daily?${q}`;
  }, [data.range]);

  const fetchRange = useCallback(async (nextFrom: string, nextTo: string) => {
    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams({ from: nextFrom, to: nextTo }).toString();
      const res = await fetch(`/api/admin/reports/summary?${q}`, { credentials: "same-origin" });
      const j = (await res.json()) as ReportsSummaryPayload & { error?: string };
      if (!res.ok) {
        throw new Error(j.error ?? "Không tải được báo cáo");
      }
      setData(j);
      setFrom(j.range.from);
      setTo(j.range.to);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi mạng");
    } finally {
      setLoading(false);
    }
  }, []);

  const onApply = useCallback(() => {
    void fetchRange(from, to);
  }, [fetchRange, from, to]);

  const presetRolling = useCallback(
    (days: number) => {
      const end = isoTodayUtc();
      const start = addDaysIso(end, -(days - 1));
      setFrom(start);
      setTo(end);
      void fetchRange(start, end);
    },
    [fetchRange],
  );

  const presetThisMonth = useCallback(() => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const fromIso = start.toISOString().slice(0, 10);
    const toIso = isoTodayUtc();
    setFrom(fromIso);
    setTo(toIso);
    void fetchRange(fromIso, toIso);
  }, [fetchRange]);

  const presetToday = useCallback(() => {
    const d = isoTodayUtc();
    setFrom(d);
    setTo(d);
    void fetchRange(d, d);
  }, [fetchRange]);

  return (
    <>
      <div className={dashStyles.dashboard}>
        <div className={dashStyles.toolbar}>
          <p className={dashStyles.toolbarTitle}>Lọc theo ngày</p>
          <div className={dashStyles.dateRow}>
            <div className={dashStyles.dateField}>
              <label htmlFor="report-from">Từ ngày</label>
              <input
                id="report-from"
                className={dashStyles.dateInput}
                type="date"
                value={from}
                max={to}
                disabled={loading}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className={dashStyles.dateField}>
              <label htmlFor="report-to">Đến ngày</label>
              <input
                id="report-to"
                className={dashStyles.dateInput}
                type="date"
                value={to}
                min={from}
                disabled={loading}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <button type="button" className={dashStyles.applyBtn} disabled={loading} title="Áp dụng khoảng ngày" onClick={onApply}>
              Xem
            </button>
          </div>
          <div className={dashStyles.presets}>
            <span className={dashStyles.presetsLabel}>Nhanh:</span>
            <button
              type="button"
              className={dashStyles.presetBtn}
              disabled={loading}
              onClick={presetToday}
            >
              Hôm nay
            </button>
            <button
              type="button"
              className={dashStyles.presetBtn}
              disabled={loading}
              onClick={() => presetRolling(7)}
            >
              7 ngày
            </button>
            <button
              type="button"
              className={dashStyles.presetBtn}
              disabled={loading}
              onClick={() => presetRolling(30)}
            >
              30 ngày
            </button>
            <button
              type="button"
              className={dashStyles.presetBtn}
              disabled={loading}
              onClick={presetThisMonth}
            >
              Tháng này
            </button>
            <button
              type="button"
              className={dashStyles.presetBtn}
              disabled={loading}
              onClick={() => presetRolling(90)}
            >
              90 ngày
            </button>
          </div>
        </div>

        {err ? <div className={dashStyles.errorBanner}>{err}</div> : null}
        {loading ? <div className={dashStyles.loadingBanner}>Đang cập nhật số liệu…</div> : null}

        <section className={dashStyles.sectionShell}>
          <div className={dashStyles.sectionHead}>
            <h2 className={styles.h2}>Xuất dữ liệu (CSV / Excel)</h2>
            <p className={dashStyles.sectionDesc}>
              Xuất doanh thu theo đúng{" "}
              <strong>
                khoảng ngày đang xem ({data.range.from} — {data.range.to})
              </strong>
              , hoặc tải toàn bộ kho dữ liệu.
            </p>
          </div>
          <div className={exportStyles.exportGrid}>
            <a className={exportStyles.exportCard} href="/api/admin/export/products">
              <strong>Toàn bộ sản phẩm</strong>
              <span>Danh mục, giá, tồn, slug…</span>
            </a>
            <a className={exportStyles.exportCard} href="/api/admin/export/orders">
              <strong>Toàn bộ đơn hàng</strong>
              <span>Khách, tổng tiền, trạng thái, PTTT</span>
            </a>
            <a className={exportStyles.exportCard} href="/api/admin/export/order-lines">
              <strong>Dòng đơn chi tiết</strong>
              <span>Mỗi dòng = 1 biến thể trong đơn</span>
            </a>
            <a className={exportStyles.exportCard} href={revenueExportHref}>
              <strong>Doanh thu theo ngày</strong>
              <span>Theo khoảng ngày đang chọn — chỉ đơn hoàn thành</span>
            </a>
            <a className={exportStyles.exportCard} href="/api/admin/export/revenue-daily?days=90">
              <strong>Doanh thu 90 ngày gần nhất</strong>
              <span>Lăn theo hôm nay (tùy chọn nhanh)</span>
            </a>
          </div>
          <p className={`${styles.lead} ${dashStyles.exportLead}`}>
            Trên danh sách <Link href="/admin/products">Sản phẩm</Link> và{" "}
            <Link href="/admin/orders">Đơn hàng</Link> có thêm nút xuất theo đúng bộ lọc hiện tại.
          </p>
        </section>

        <section className={`${styles.section} ${dashStyles.sectionShell}`}>
          <div className={dashStyles.sectionHead}>
            <h2 className={styles.h2}>Biểu đồ</h2>
            <p className={dashStyles.sectionDesc}>Theo khoảng ngày đã chọn phía trên.</p>
          </div>
          <ReportsChartsGate
            statusSlices={data.statusSlices}
            topProducts={data.topProducts}
            dailyCompleted={data.dailyCompleted}
            topWishlisted={data.topWishlisted}
            rangeLabel={rangeLabel}
          />
        </section>

        <section className={`${dashStyles.kpiSection} ${dashStyles.sectionShell}`}>
          <div className={dashStyles.kpiHead}>
            <h2 className={`${styles.h2} ${dashStyles.kpiTitle}`}>Đơn hoàn thành trong khoảng</h2>
            <p className={dashStyles.kpiSubtitle}>{rangeLabel}</p>
          </div>
          <div className={dashStyles.kpiGrid}>
            <div className={dashStyles.kpiCard}>
              <span className={dashStyles.kpiCardLabel}>Doanh thu</span>
              <strong>{formatVnd(data.kpis.revenueCompleted)}</strong>
            </div>
            <div className={dashStyles.kpiCard}>
              <span className={dashStyles.kpiCardLabel}>Số đơn</span>
              <strong>{data.kpis.ordersCompleted}</strong>
            </div>
            <div className={dashStyles.kpiCard}>
              <span className={dashStyles.kpiCardLabel}>Tài khoản khách mới</span>
              <strong>{data.kpis.newCustomers}</strong>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${dashStyles.sectionShell}`}>
          <div className={dashStyles.sectionHead}>
            <h2 className={styles.h2}>Đơn hàng theo trạng thái</h2>
            <p className={dashStyles.sectionDesc}>Các đơn được tạo trong khoảng ngày đã chọn.</p>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Trạng thái</th>
                  <th>Số đơn</th>
                  <th>Tổng tiền ghi nhận</th>
                </tr>
              </thead>
              <tbody>
                {data.byStatus.length === 0 ? (
                  <NoDataEmpty colSpan={3} dense cellClassName={styles.muted} />
                ) : (
                  data.byStatus.map((r) => (
                    <tr key={r.status}>
                      <td>{orderStatusLabel(r.status)}</td>
                      <td>{r.count}</td>
                      <td>{formatVnd(r.sum)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${styles.section} ${dashStyles.sectionShell}`}>
          <div className={dashStyles.sectionHead}>
            <h2 className={styles.h2}>Thanh toán theo phương thức</h2>
            <p className={dashStyles.sectionDesc}>Đơn hàng tạo trong khoảng ngày đã chọn.</p>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Phương thức</th>
                  <th>Số đơn</th>
                  <th>Tổng tiền</th>
                </tr>
              </thead>
              <tbody>
                {data.paymentRows.length === 0 ? (
                  <NoDataEmpty colSpan={3} dense cellClassName={styles.muted} />
                ) : (
                  data.paymentRows.map((r) => (
                    <tr key={r.method}>
                      <td>{PAYMENT_VI[r.method as PaymentMethod] ?? r.method}</td>
                      <td>{r.count}</td>
                      <td>{formatVnd(r.sum)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${styles.section} ${dashStyles.sectionShell}`}>
          <div className={dashStyles.sectionHead}>
            <h2 className={styles.h2}>Sản phẩm mới theo danh mục (top)</h2>
            <p className={dashStyles.sectionDesc}>Đếm sản phẩm có ngày tạo nằm trong khoảng đã chọn.</p>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Danh mục</th>
                  <th>Số SP</th>
                </tr>
              </thead>
              <tbody>
                {data.categoryRows.length === 0 ? (
                  <NoDataEmpty
                    colSpan={2}
                    dense
                    cellClassName={styles.muted}
                    description="Không có sản phẩm mới trong khoảng này."
                  />
                ) : (
                  data.categoryRows.map((r) => (
                    <tr key={r.name}>
                      <td>{r.name}</td>
                      <td>{r.products}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${styles.section} ${dashStyles.sectionShell}`}>
          <div className={dashStyles.sectionHead}>
            <h2 className={styles.h2}>Wishlist trong khoảng</h2>
            <p className={dashStyles.sectionDesc}>
              Lượt thêm vào yêu thích (khách đăng nhập) có thời điểm trong khoảng ngày đã chọn.
            </p>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Lượt</th>
                </tr>
              </thead>
              <tbody>
                {data.topWishlisted.length === 0 ? (
                  <NoDataEmpty
                    colSpan={2}
                    dense
                    cellClassName={styles.muted}
                    description="Không có dữ liệu trong khoảng này."
                  />
                ) : (
                  data.topWishlisted.map((r, i) => (
                    <tr key={`${r.name}-${i}`}>
                      <td>{r.name}</td>
                      <td>{r.wishes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${styles.section} ${dashStyles.sectionShell}`}>
          <div className={dashStyles.sectionHead}>
            <h2 className={styles.h2}>Biến thể bán chạy (ước lượng doanh thu)</h2>
            <p className={dashStyles.sectionDesc}>Chỉ đơn hoàn thành có ngày tạo trong khoảng đã chọn.</p>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Số lượng</th>
                  <th>Doanh thu ước tính</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.length === 0 ? (
                  <NoDataEmpty colSpan={3} dense cellClassName={styles.muted} />
                ) : (
                  data.topProducts.map((r, i) => (
                    <tr key={i}>
                      <td>{r.name}</td>
                      <td>{r.sold}</td>
                      <td>{formatVnd(r.revenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
