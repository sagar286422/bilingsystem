import type { FastifyReply, FastifyRequest } from "fastify";
import {
  fastifyHeadersToFetchHeaders,
  requestUrlString,
} from "../lib/http.js";
import * as betterAuthProxy from "../services/better-auth-proxy.service.js";

export async function handleBetterAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const url = requestUrlString(request);
  const headers = fastifyHeadersToFetchHeaders(request);
  const jsonBody = request.body;

  const response = await betterAuthProxy.forwardToBetterAuth({
    url,
    method: request.method,
    headers,
    jsonBody,
  });

  reply.status(response.status);
  response.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === "transfer-encoding" || k === "content-length") return;
    void reply.header(key, value);
  });
  const buf = response.body ? await response.arrayBuffer() : null;
  return reply.send(buf ? Buffer.from(buf) : null);
}
