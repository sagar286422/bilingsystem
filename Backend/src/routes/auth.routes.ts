import type { FastifyPluginAsync } from "fastify";
import * as betterAuthController from "../controllers/better-auth.controller.js";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    handler: async (request, reply) => {
      try {
        await betterAuthController.handleBetterAuth(request, reply);
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({
          error: "Internal authentication error",
          code: "AUTH_FAILURE",
        });
      }
    },
  });
};
