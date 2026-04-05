import type { FastifyPluginAsync } from "fastify";
import * as healthController from "../controllers/health.controller.js";

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", healthController.getHealth);
};
