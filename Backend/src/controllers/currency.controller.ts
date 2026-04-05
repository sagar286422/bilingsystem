import type { FastifyReply, FastifyRequest } from "fastify";
import type { Currency } from "@prisma/client";
import * as currencyService from "../services/currency.service.js";

function currencyDto(c: Currency) {
  return {
    object: "currency" as const,
    code: c.code,
    name: c.name,
    minor_units: c.minorUnits,
    symbol: c.symbol,
    active: c.active,
    sort_order: c.sortOrder,
    metadata: c.metadata,
  };
}

/**
 * Reference data — no org in path. Safe read-only list for dashboards (CORS + optional session).
 */
export async function listCurrencies(_request: FastifyRequest, reply: FastifyReply) {
  const rows = await currencyService.listActiveCurrencies();
  return reply.send({
    object: "list",
    data: rows.map(currencyDto),
    has_more: false,
  });
}
