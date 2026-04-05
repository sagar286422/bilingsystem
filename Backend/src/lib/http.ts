import type { FastifyRequest } from "fastify";

export function requestUrlString(request: FastifyRequest): string {
  return new URL(request.url, `http://${request.headers.host}`).toString();
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
