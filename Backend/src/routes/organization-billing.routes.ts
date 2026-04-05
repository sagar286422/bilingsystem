import type { FastifyPluginAsync } from "fastify";
import * as organizationBillingController from "../controllers/organization-billing.controller.js";
import { orgWriteScopedPreHandlers } from "../lib/require-org-member.js";

/** Session + org owner/admin only — do not expose BYOK secret updates to API keys. */
const pre = [...orgWriteScopedPreHandlers];

export const organizationBillingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.patch(
    "/api/v1/organizations/:organizationId/billing",
    { preHandler: pre },
    organizationBillingController.patchOrganizationBilling,
  );
};
