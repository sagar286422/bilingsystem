/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Proxy API to the Fastify backend so the browser stays on the Next origin.
   * Production (Vercel): set BACKEND_URL to your Render API (no trailing slash).
   */
  async rewrites() {
    const raw = process.env.BACKEND_URL ?? "http://localhost:4000";
    const backend = raw.replace(/\/$/, "");
    return [
      { source: "/api/auth/:path*", destination: `${backend}/api/auth/:path*` },
      { source: "/api/v1/:path*", destination: `${backend}/api/v1/:path*` },
      { source: "/api/me", destination: `${backend}/api/me` },
    ];
  },
};

export default nextConfig;
