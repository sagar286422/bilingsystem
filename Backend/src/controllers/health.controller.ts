import type { FastifyReply, FastifyRequest } from "fastify";
import * as healthService from "../services/health.service.js";

export async function getHealth(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send(healthService.getHealthPayload());
}
