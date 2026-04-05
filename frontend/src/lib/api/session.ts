import { apiFetch, readApiError } from "@/lib/api/http";

/** Better Auth session payload from Fastify `GET /api/me` (cookie session). */
export type MeResponse = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    emailVerified?: boolean;
    image?: string | null;
    createdAt?: string;
    updatedAt?: string;
  };
  session: {
    id: string;
    userId: string;
    expiresAt?: string;
  };
};

/**
 * Server-verified identity via session cookie. Use alongside client `useSession`
 * when you need the same source of truth as API routes.
 */
export async function getMe(): Promise<MeResponse> {
  const res = await apiFetch("/api/me");
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return res.json() as Promise<MeResponse>;
}
