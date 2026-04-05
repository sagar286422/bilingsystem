import type { FastifyReply, FastifyRequest } from "fastify";
import * as sessionService from "../services/session.service.js";

export async function requireSession(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const session = await sessionService.getSessionForRequest(request);
  if (!session?.user?.id) {
    return reply.status(401).send({
      error: "Unauthorized",
      code: "UNAUTHORIZED",
      message: "Sign in required. Send session cookies from Better Auth.",
    });
  }
  request.authUserId = session.user.id;
}
