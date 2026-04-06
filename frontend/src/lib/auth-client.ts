import { createAuthClient } from "better-auth/react";

import { getSiteOrigin } from "@/lib/env-public";

/**
 * Auth requests go to the same origin as the Next app; `next.config` rewrites
 * `/api/auth/*` to the Fastify backend so session cookies stay on the UI origin.
 */
export const authClient = createAuthClient({
  baseURL: getSiteOrigin(),
  fetchOptions: {
    credentials: "include",
  },
});
