import type { FastifyRequest } from "fastify";

/**
 * Full URL passed to Better Auth's handler. It must match `BETTER_AUTH_URL` (the public
 * browser/Next origin). Requests that hit Render via Vercel rewrites still carry Render's
 * `Host`; rebuilding from `BETTER_AUTH_URL` avoids CSRF / origin validation failures.
 */
export function requestUrlString(request: FastifyRequest): string {
  const pathAndQuery = request.url;
  const publicBase = process.env.BETTER_AUTH_URL?.replace(/\/$/, "").trim();
  if (publicBase) {
    return new URL(pathAndQuery, `${publicBase}/`).toString();
  }

  const host = request.headers.host ?? "localhost:4000";
  const xfProto = request.headers["x-forwarded-proto"];
  const protoHeader = Array.isArray(xfProto) ? xfProto[0] : xfProto;
  const scheme = protoHeader === "https" ? "https" : "http";
  return new URL(pathAndQuery, `${scheme}://${host}`).toString();
}

export function fastifyHeadersToFetchHeaders(request: FastifyRequest): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.append(key, value);
    }
  }
  return headers;
}
