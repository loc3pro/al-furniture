import { z } from "zod";

export const generalSettingsSchema = z.object({
  siteName: z.string().max(120).default(""),
  logoUrl: z.string().max(2000).optional().nullable(),
  tagline: z.string().max(240).optional().nullable(),
});

export const apiSettingsSchema = z.object({
  baseUrl: z.string().max(2000).default(""),
  apiKey: z.string().max(2000).default(""),
  timeoutMs: z.coerce.number().int().min(1000).max(600_000).default(30_000),
  enabled: z.boolean().default(false),
});

export const paymentMethodSchema = z.object({
  id: z.string(),
  label: z.string(),
  publicKey: z.string().default(""),
  secretKey: z.string().default(""),
  mode: z.enum(["sandbox", "production"]).default("sandbox"),
  enabled: z.boolean().default(false),
});

export const paymentSettingsSchema = z.object({
  methods: z.array(paymentMethodSchema).default([]),
});

export const cloudSettingsSchema = z.object({
  provider: z.enum(["cloudinary", "s3", "none"]).default("none"),
  cloudName: z.string().max(200).default(""),
  bucket: z.string().max(200).default(""),
  apiKey: z.string().max(2000).default(""),
  apiSecret: z.string().max(2000).default(""),
  folder: z.string().max(500).default(""),
});

export const seoSettingsSchema = z.object({
  metaTitle: z.string().max(200).default(""),
  metaDescription: z.string().max(2000).default(""),
});

export const displaySettingsSchema = z.object({
  themePreset: z.enum(["light", "dark", "system"]).default("light"),
  layoutDensity: z.enum(["comfortable", "compact"]).default("comfortable"),
});

export type GeneralSettings = z.infer<typeof generalSettingsSchema>;
export type ApiSettings = z.infer<typeof apiSettingsSchema>;
export type PaymentSettings = z.infer<typeof paymentSettingsSchema>;
export type CloudSettings = z.infer<typeof cloudSettingsSchema>;
export type SeoSettings = z.infer<typeof seoSettingsSchema>;
export type DisplaySettings = z.infer<typeof displaySettingsSchema>;

export const DEFAULT_PAYMENT_METHODS: z.infer<typeof paymentMethodSchema>[] = [
  { id: "stripe", label: "Stripe", publicKey: "", secretKey: "", mode: "sandbox", enabled: false },
  { id: "paypal", label: "PayPal", publicKey: "", secretKey: "", mode: "sandbox", enabled: false },
];

export function parseJsonTab<T>(raw: unknown, schema: z.ZodType<T>, fallback: T): T {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return fallback;
}
