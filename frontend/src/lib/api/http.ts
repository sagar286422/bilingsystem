export type ApiErrorBody = {
  error?: string;
  code?: string;
  message?: string;
};

function getBrowserApiBase(): string {
  return "";
}

/** Server-side calls during SSR/RSC; direct to Fastify. */
function getServerApiBase(): string {
  return (
    process.env.BACKEND_URL ??
    process.env.INTERNAL_API_URL ??
    "http://localhost:4000"
  );
}

export function apiBase(): string {
  return typeof window === "undefined" ? getServerApiBase() : getBrowserApiBase();
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const base = apiBase();
  const url = path.startsWith("http") ? path : `${base}${path}`;

  const headers = new Headers(init.headers);
  if (
    init.body != null &&
    typeof init.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });
}

export async function readApiError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as ApiErrorBody;
    return data.message ?? data.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}
