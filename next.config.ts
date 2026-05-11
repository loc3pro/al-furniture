import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Chỉ gắn CSP ở development: Turbopack/HMR hoặc vài lib (vd. Recharts) có thể dùng eval;
 * thêm `unsafe-eval` tránh DevTools báo chặn script-src. Production không set CSP ở đây để
 * không siết chặt deploy hiện có — nếu bạn tự cấu hình CSP ở nginx/hosting, thêm
 * `unsafe-eval` cho dev hoặc chỉ dùng `script-src 'self'` khi chắc bundle không cần eval.
 */
function devContentSecurityPolicy(): string {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https://accounts.google.com",
    "https://*.google.com",
    "https://*.googleapis.com",
    "https://*.gstatic.com",
    "https://cdn.jsdelivr.net",
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://accounts.google.com https://*.google.com https://*.googleapis.com https://*.gstatic.com https://cdn.jsdelivr.net",
    "frame-src https://accounts.google.com https://*.google.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "placehold.co", pathname: "/**" },
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
  async headers() {
    if (!isDev) return [];
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: devContentSecurityPolicy() }],
      },
    ];
  },
};

export default nextConfig;
