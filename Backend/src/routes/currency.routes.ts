import type { FastifyPluginAsync } from "fastify";
import * as currencyController from "../controllers/currency.controller.js";

export const currencyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/api/v1/currencies",
    currencyController.listCurrencies,
  );
};
