import { apiFetch, readApiError } from "@/lib/api/http";

export const currenciesQueryKey = ["currencies", "active"] as const;

export type CurrencyDto = {
  object: "currency";
  code: string;
  name: string;
  minor_units: number;
  symbol: string | null;
  active: boolean;
  sort_order: number;
  metadata: unknown;
};

export type CurrencyListResponse = {
  object: "list";
  data: CurrencyDto[];
  has_more: boolean;
};

export async function listCurrencies(): Promise<CurrencyListResponse> {
  const res = await apiFetch("/api/v1/currencies");
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<CurrencyListResponse>;
}

export function minorUnitsByCode(
  data: CurrencyDto[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of data) {
    m.set(c.code.toUpperCase(), c.minor_units);
  }
  return m;
}
