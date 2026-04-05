import type { FastifyPluginAsync } from "fastify";
import * as sessionController from "../controllers/session.controller.js";

export const sessionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/me", sessionController.getMe);
};
