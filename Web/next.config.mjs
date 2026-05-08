/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https: http: ws: wss:",
  "object-src 'none'",
  "form-action 'self'",
].join("; ");

const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  devIndicators: false,
  allowedDevOrigins: ["192.168.29.50"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-site" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/seat",
        destination: "/student",
      },
      {
        source: "/seat/:path*",
        destination: "/student/:path*",
      },
      {
        source: "/admin/seating-plan",
        destination: "/admin/seating",
      },
      {
        source: "/admin/qr-codes",
        destination: "/admin/qrcodes",
      },
    ];
  },
};

export default nextConfig;
