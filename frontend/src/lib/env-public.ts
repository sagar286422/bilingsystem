/** Browser origin for Better Auth client (Next dev server), not the Fastify port. */
export const siteOrigin =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Optional publishable key (`pk_test_...`) for hosted `/pay/{slug}` when the API sets
 * `PUBLIC_CHECKOUT_REQUIRE_PUBLISHABLE_KEY=true`. Safe to expose in the browser.
 */
export const billingPublishableKey =
  process.env.NEXT_PUBLIC_BILLING_PUBLISHABLE_KEY?.trim() || "";

export const isGoogleAuthEnabled =
  process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "1";
