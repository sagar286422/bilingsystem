import type { FastifyPluginAsync } from "fastify";
import * as companyController from "../controllers/company.controller.js";
import {
  orgScopedPreHandlers,
  orgWriteScopedPreHandlers,
} from "../lib/require-org-member.js";

const readPre = [...orgScopedPreHandlers];
const writePre = [...orgWriteScopedPreHandlers];

export const companyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/api/v1/organizations/:organizationId/companies",
    { preHandler: writePre },
    companyController.createCompany,
  );
  fastify.get(
    "/api/v1/organizations/:organizationId/companies",
    { preHandler: readPre },
    companyController.listCompanies,
  );
  fastify.get(
    "/api/v1/organizations/:organizationId/companies/:companyId",
    { preHandler: readPre },
    companyController.getCompany,
  );
  fastify.get(
    "/api/v1/organizations/:organizationId/companies/:companyId/members",
    { preHandler: readPre },
    companyController.listCompanyMembers,
  );
  fastify.post(
    "/api/v1/organizations/:organizationId/companies/:companyId/members",
    { preHandler: writePre },
    companyController.addCompanyMember,
  );
  fastify.delete(
    "/api/v1/organizations/:organizationId/companies/:companyId/members/:userId",
    { preHandler: writePre },
    companyController.removeCompanyMember,
  );
  fastify.patch(
    "/api/v1/organizations/:organizationId/companies/:companyId",
    { preHandler: writePre },
    companyController.patchCompany,
  );
  fastify.delete(
    "/api/v1/organizations/:organizationId/companies/:companyId",
    { preHandler: writePre },
    companyController.deleteCompany,
  );
};
