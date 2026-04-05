import type { FastifyReply, FastifyRequest } from "fastify";
import * as sessionService from "../services/session.service.js";

export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  const session = await sessionService.getSessionForRequest(request);
  if (!session) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  return reply.send(session);
}
