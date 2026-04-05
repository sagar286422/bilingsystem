import { createAuthClient } from "better-auth/react";

import { siteOrigin } from "@/lib/env-public";

/**
 * Auth requests go to the same origin as the Next app; `next.config` rewrites
 * `/api/auth/*` to the Fastify backend so cookies stay on localhost:3000.
 */
export const authClient = createAuthClient({
  baseURL: siteOrigin,
  fetchOptions: {
    credentials: "include",
  },
});
