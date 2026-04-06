/**
 * Public site origin (this Next app — not Render). Better Auth calls
 * `{origin}/api/auth/*`, which Next rewrites to `BACKEND_URL`.
 *
 * Set `NEXT_PUBLIC_SITE_URL` on Vercel (Production + Preview) so builds and SSR
 * match your hostname. If it is missing, the browser falls back to
 * `window.location.origin` so deployed sign-in does not stick to localhost.
 */
export function getSiteOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")?.trim();
  if (env) return env;
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:3000";
}

/**
 * Optional publishable key (`pk_test_...`) for hosted `/pay/{slug}` when the API sets
 * `PUBLIC_CHECKOUT_REQUIRE_PUBLISHABLE_KEY=true`. Safe to expose in the browser.
 */
export const billingPublishableKey =
  process.env.NEXT_PUBLIC_BILLING_PUBLISHABLE_KEY?.trim() || "";

export const isGoogleAuthEnabled =
  process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "1";
