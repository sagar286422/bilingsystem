import { auth } from "../auth.js";

export async function forwardToBetterAuth(params: {
  url: string;
  method: string;
  headers: Headers;
  jsonBody?: unknown;
}): Promise<Response> {
  const req = new Request(params.url, {
    method: params.method,
    headers: params.headers,
    ...(params.jsonBody != null
      ? { body: JSON.stringify(params.jsonBody) }
      : {}),
  });
  return auth.handler(req);
}
