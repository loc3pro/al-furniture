"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AdminModuleFrame } from "@/design-system/components/AdminModuleFrame";
import { BasePanel } from "@/design-system/components/BasePanel";
import { showAdminToast } from "@/lib/admin-toast";
import {
  DEFAULT_PAYMENT_METHODS,
  apiSettingsSchema,
  cloudSettingsSchema,
  displaySettingsSchema,
  generalSettingsSchema,
  parseJsonTab,
  paymentSettingsSchema,
  seoSettingsSchema,
  type ApiSettings,
  type CloudSettings,
  type DisplaySettings,
  type GeneralSettings,
  type PaymentSettings,
  type SeoSettings,
} from "@/lib/site-integration-schema";
import { DbButton } from "@/dashboard-ui/v1/components/DbButton";
import { DbField } from "@/dashboard-ui/v1/components/DbField";
import { DbInput } from "@/dashboard-ui/v1/components/DbInput";
import { DbSelect, type DbSelectOption } from "@/dashboard-ui/v1/components/DbSelect";
import { DbTabs } from "@/dashboard-ui/v1/components/DbTabs";
import { DbTextarea } from "@/dashboard-ui/v1/components/DbTextarea";

import cls from "./SystemIntegrationClient.module.scss";

type TabKey = "general" | "api" | "payment" | "cloud" | "seo" | "display";

function mergePayment(raw: unknown): PaymentSettings {
  const base = parseJsonTab(raw, paymentSettingsSchema, { methods: [] });
  const methods = base.methods?.length ? base.methods : DEFAULT_PAYMENT_METHODS;
  return { methods };
}

export type InitialPayload = {
  general: unknown;
  api: unknown;
  payment: unknown;
  cloud: unknown;
  seo: unknown;
  display: unknown;
};

function firstZodMessage(err: { issues: { message: string }[] }): string {
  return err.issues[0]?.message ?? "Dữ liệu chưa hợp lệ";
}

export const SystemIntegrationClient = memo(function SystemIntegrationClient({
  initial,
}: {
  initial: InitialPayload;
}) {
  const [tab, setTab] = useState<TabKey>("general");
  const [saving, setSaving] = useState(false);

  const defaults = useMemo(
    () => ({
      general: parseJsonTab(initial.general, generalSettingsSchema, generalSettingsSchema.parse({})),
      api: parseJsonTab(initial.api, apiSettingsSchema, apiSettingsSchema.parse({})),
      payment: mergePayment(initial.payment),
      cloud: parseJsonTab(initial.cloud, cloudSettingsSchema, cloudSettingsSchema.parse({})),
      seo: parseJsonTab(initial.seo, seoSettingsSchema, seoSettingsSchema.parse({})),
      display: parseJsonTab(initial.display, displaySettingsSchema, displaySettingsSchema.parse({})),
    }),
    [initial],
  );

  const [general, setGeneral] = useState<GeneralSettings>(() => defaults.general);
  const [api, setApi] = useState<ApiSettings>(() => defaults.api);
  const [payment, setPayment] = useState<PaymentSettings>(() => defaults.payment);
  const [cloud, setCloud] = useState<CloudSettings>(() => defaults.cloud);
  const [seo, setSeo] = useState<SeoSettings>(() => defaults.seo);
  const [display, setDisplay] = useState<DisplaySettings>(() => defaults.display);

  useEffect(() => {
    setGeneral(defaults.general);
    setApi(defaults.api);
    setPayment(defaults.payment);
    setCloud(defaults.cloud);
    setSeo(defaults.seo);
    setDisplay(defaults.display);
  }, [defaults]);

  const saveTab = useCallback(
    async (key: TabKey) => {
      let payload: unknown;
      if (key === "general") {
        const r = generalSettingsSchema.safeParse(general);
        if (!r.success) {
          showAdminToast(firstZodMessage(r.error), "error");
          return;
        }
        payload = r.data;
      } else if (key === "api") {
        const r = apiSettingsSchema.safeParse(api);
        if (!r.success) {
          showAdminToast(firstZodMessage(r.error), "error");
          return;
        }
        payload = r.data;
      } else if (key === "payment") {
        const r = paymentSettingsSchema.safeParse(payment);
        if (!r.success) {
          showAdminToast(firstZodMessage(r.error), "error");
          return;
        }
        payload = r.data;
      } else if (key === "cloud") {
        const r = cloudSettingsSchema.safeParse(cloud);
        if (!r.success) {
          showAdminToast(firstZodMessage(r.error), "error");
          return;
        }
        payload = r.data;
      } else if (key === "seo") {
        const r = seoSettingsSchema.safeParse(seo);
        if (!r.success) {
          showAdminToast(firstZodMessage(r.error), "error");
          return;
        }
        payload = r.data;
      } else {
        const r = displaySettingsSchema.safeParse(display);
        if (!r.success) {
          showAdminToast(firstZodMessage(r.error), "error");
          return;
        }
        payload = r.data;
      }

      setSaving(true);
      try {
        const res = await fetch("/api/admin/site-integration", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tab: key, payload }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          showAdminToast(j?.error ?? "Không lưu được", "error");
          return;
        }
        showAdminToast("Đã lưu");
      } catch {
        showAdminToast("Dữ liệu chưa hợp lệ hoặc lỗi mạng", "error");
      } finally {
        setSaving(false);
      }
    },
    [general, api, payment, cloud, seo, display],
  );

  const tabBarItems = useMemo(
    () =>
      [
        { key: "general" as const, label: "Chung" },
        { key: "api" as const, label: "API" },
        { key: "payment" as const, label: "Thanh toán" },
        { key: "cloud" as const, label: "Lưu trữ" },
        { key: "seo" as const, label: "SEO" },
        { key: "display" as const, label: "Hiển thị" },
      ] as const,
    [],
  );

  const paymentModeOptions: DbSelectOption[] = [
    { value: "sandbox", label: "Sandbox" },
    { value: "production", label: "Production" },
  ];

  const cloudProviderOptions: DbSelectOption[] = [
    { value: "none", label: "Không dùng" },
    { value: "cloudinary", label: "Cloudinary" },
    { value: "s3", label: "Amazon S3" },
  ];

  const themeOptions: DbSelectOption[] = [
    { value: "light", label: "Sáng" },
    { value: "dark", label: "Tối" },
    { value: "system", label: "Theo hệ thống" },
  ];

  const densityOptions: DbSelectOption[] = [
    { value: "comfortable", label: "Thoải mái" },
    { value: "compact", label: "Gọn" },
  ];

  return (
    <AdminModuleFrame
      header={
        <div>
          <h1 className={cls.title}>Cấu hình hệ thống</h1>
          <p className={cls.lead}>Mỗi tab có nút lưu riêng. Dữ liệu JSON trên máy chủ (bảng SiteIntegrationSettings).</p>
        </div>
      }
      filters={<DbTabs active={tab} items={[...tabBarItems]} onChange={setTab} />}
      footer={
        <DbButton variant="primary" loading={saving} title="Lưu cấu hình tab đang mở" onClick={() => void saveTab(tab)}>
          Lưu
        </DbButton>
      }
    >
      <div className={cls.tabsBody}>
        {tab === "general" ? (
          <div className={cls.formNarrow}>
            <DbField label="Tên site">
              <DbInput
                value={general.siteName}
                onChange={(e) => setGeneral((g) => ({ ...g, siteName: e.target.value }))}
                placeholder="Furniture ECM"
              />
            </DbField>
            <DbField label="URL logo">
              <DbInput
                value={general.logoUrl ?? ""}
                onChange={(e) => setGeneral((g) => ({ ...g, logoUrl: e.target.value || null }))}
                placeholder="https://…"
              />
            </DbField>
            <DbField label="Tagline">
              <DbInput
                value={general.tagline ?? ""}
                onChange={(e) => setGeneral((g) => ({ ...g, tagline: e.target.value || null }))}
              />
            </DbField>
          </div>
        ) : null}

        {tab === "api" ? (
          <div className={cls.formNarrow}>
            <DbField label="Base URL">
              <DbInput
                value={api.baseUrl}
                onChange={(e) => setApi((a) => ({ ...a, baseUrl: e.target.value }))}
                placeholder="https://api.example.com"
              />
            </DbField>
            <DbField label="API Key">
              <DbInput value={api.apiKey} onChange={(e) => setApi((a) => ({ ...a, apiKey: e.target.value }))} />
            </DbField>
            <DbField label="Timeout (ms)">
              <DbInput
                value={String(api.timeoutMs)}
                inputMode="numeric"
                onChange={(e) => setApi((a) => ({ ...a, timeoutMs: Number(e.target.value) || 0 }))}
              />
            </DbField>
            <div className="db-field">
              <label className="db-switch-row">
                <input
                  type="checkbox"
                  checked={api.enabled}
                  onChange={(e) => setApi((a) => ({ ...a, enabled: e.target.checked }))}
                />
                <span>Bật kết nối API</span>
              </label>
            </div>
          </div>
        ) : null}

        {tab === "payment" ? (
          <div className={cls.paymentStack}>
            {payment.methods.map((method, idx) => {
              const panelTitle = method.label || defaults.payment.methods[idx]?.label || `Phương thức ${idx + 1}`;
              return (
                <BasePanel key={method.id} title={panelTitle}>
                  <input type="hidden" value={method.id} readOnly aria-hidden />
                  <input type="hidden" value={method.label} readOnly aria-hidden />
                  <DbField label="Public / Client key">
                    <DbInput
                      value={method.publicKey}
                      onChange={(e) =>
                        setPayment((p) => ({
                          ...p,
                          methods: p.methods.map((m, i) => (i === idx ? { ...m, publicKey: e.target.value } : m)),
                        }))
                      }
                    />
                  </DbField>
                  <DbField label="Secret key">
                    <DbInput
                      value={method.secretKey}
                      onChange={(e) =>
                        setPayment((p) => ({
                          ...p,
                          methods: p.methods.map((m, i) => (i === idx ? { ...m, secretKey: e.target.value } : m)),
                        }))
                      }
                    />
                  </DbField>
                  <DbField label="Chế độ">
                    <DbSelect
                      options={paymentModeOptions}
                      value={method.mode}
                      onChange={(e) =>
                        setPayment((p) => ({
                          ...p,
                          methods: p.methods.map((m, i) =>
                            i === idx ? { ...m, mode: e.target.value as "sandbox" | "production" } : m,
                          ),
                        }))
                      }
                    />
                  </DbField>
                  <div className="db-field">
                    <label className="db-switch-row">
                      <input
                        type="checkbox"
                        checked={method.enabled}
                        onChange={(e) =>
                          setPayment((p) => ({
                            ...p,
                            methods: p.methods.map((m, i) => (i === idx ? { ...m, enabled: e.target.checked } : m)),
                          }))
                        }
                      />
                      <span>Bật phương thức</span>
                    </label>
                  </div>
                </BasePanel>
              );
            })}
          </div>
        ) : null}

        {tab === "cloud" ? (
          <div className={cls.formNarrow}>
            <DbField label="Nhà cung cấp">
              <DbSelect
                options={cloudProviderOptions}
                value={cloud.provider}
                onChange={(e) =>
                  setCloud((c) => ({ ...c, provider: e.target.value as CloudSettings["provider"] }))
                }
              />
            </DbField>
            <DbField label="Cloud name">
              <DbInput value={cloud.cloudName} onChange={(e) => setCloud((c) => ({ ...c, cloudName: e.target.value }))} />
            </DbField>
            <DbField label="Bucket (S3)">
              <DbInput value={cloud.bucket} onChange={(e) => setCloud((c) => ({ ...c, bucket: e.target.value }))} />
            </DbField>
            <DbField label="API key">
              <DbInput value={cloud.apiKey} onChange={(e) => setCloud((c) => ({ ...c, apiKey: e.target.value }))} />
            </DbField>
            <DbField label="API secret">
              <DbInput
                value={cloud.apiSecret}
                onChange={(e) => setCloud((c) => ({ ...c, apiSecret: e.target.value }))}
              />
            </DbField>
            <DbField label="Thư mục">
              <DbInput
                value={cloud.folder}
                onChange={(e) => setCloud((c) => ({ ...c, folder: e.target.value }))}
                placeholder="uploads/products"
              />
            </DbField>
          </div>
        ) : null}

        {tab === "seo" ? (
          <div className={cls.formWide}>
            <DbField label="Meta title">
              <DbInput value={seo.metaTitle} onChange={(e) => setSeo((s) => ({ ...s, metaTitle: e.target.value }))} />
            </DbField>
            <DbField label="Meta description">
              <DbTextarea
                rows={5}
                value={seo.metaDescription}
                onChange={(e) => setSeo((s) => ({ ...s, metaDescription: e.target.value }))}
              />
            </DbField>
          </div>
        ) : null}

        {tab === "display" ? (
          <div className={cls.formNarrow}>
            <DbField label="Theme">
              <DbSelect
                options={themeOptions}
                value={display.themePreset}
                onChange={(e) =>
                  setDisplay((d) => ({ ...d, themePreset: e.target.value as DisplaySettings["themePreset"] }))
                }
              />
            </DbField>
            <DbField label="Mật độ layout">
              <DbSelect
                options={densityOptions}
                value={display.layoutDensity}
                onChange={(e) =>
                  setDisplay((d) => ({ ...d, layoutDensity: e.target.value as DisplaySettings["layoutDensity"] }))
                }
              />
            </DbField>
          </div>
        ) : null}
      </div>
    </AdminModuleFrame>
  );
});
