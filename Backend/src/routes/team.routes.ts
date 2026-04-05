import type { FastifyPluginAsync } from "fastify";
import * as teamController from "../controllers/team.controller.js";
import {
  orgScopedPreHandlers,
  orgWriteScopedPreHandlers,
} from "../lib/require-org-member.js";

const readPre = [...orgScopedPreHandlers];
const writePre = [...orgWriteScopedPreHandlers];

export const teamRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/api/v1/organizations/:organizationId/teams",
    { preHandler: writePre },
    teamController.createTeam,
  );
  fastify.get(
    "/api/v1/organizations/:organizationId/teams",
    { preHandler: readPre },
    teamController.listTeams,
  );
  fastify.get(
    "/api/v1/organizations/:organizationId/teams/:teamId",
    { preHandler: readPre },
    teamController.getTeam,
  );
  fastify.patch(
    "/api/v1/organizations/:organizationId/teams/:teamId",
    { preHandler: writePre },
    teamController.patchTeam,
  );
  fastify.delete(
    "/api/v1/organizations/:organizationId/teams/:teamId",
    { preHandler: writePre },
    teamController.deleteTeam,
  );

  fastify.post(
    "/api/v1/organizations/:organizationId/teams/:teamId/members",
    { preHandler: writePre },
    teamController.addTeamMember,
  );
  fastify.get(
    "/api/v1/organizations/:organizationId/teams/:teamId/members",
    { preHandler: readPre },
    teamController.listTeamMembers,
  );
  fastify.patch(
    "/api/v1/organizations/:organizationId/teams/:teamId/members/:userId",
    { preHandler: writePre },
    teamController.patchTeamMember,
  );
  fastify.delete(
    "/api/v1/organizations/:organizationId/teams/:teamId/members/:userId",
    { preHandler: writePre },
    teamController.removeTeamMember,
  );
};
