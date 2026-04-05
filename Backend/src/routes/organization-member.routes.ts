import type { FastifyPluginAsync } from "fastify";
import * as organizationMemberController from "../controllers/organization-member.controller.js";
import {
  orgOwnerScopedPreHandlers,
  orgScopedPreHandlers,
  orgWriteScopedPreHandlers,
} from "../lib/require-org-member.js";

const readPre = [...orgScopedPreHandlers];
const writePre = [...orgWriteScopedPreHandlers];
const ownerPre = [...orgOwnerScopedPreHandlers];

export const organizationMemberRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/api/v1/organizations/:organizationId/members",
    { preHandler: readPre },
    organizationMemberController.listOrganizationMembers,
  );
  fastify.post(
    "/api/v1/organizations/:organizationId/members",
    { preHandler: writePre },
    organizationMemberController.addOrganizationMember,
  );
  fastify.patch(
    "/api/v1/organizations/:organizationId/members/:memberId",
    { preHandler: ownerPre },
    organizationMemberController.patchOrganizationMember,
  );
  fastify.delete(
    "/api/v1/organizations/:organizationId/members/:memberId",
    { preHandler: ownerPre },
    organizationMemberController.deleteOrganizationMember,
  );
};
