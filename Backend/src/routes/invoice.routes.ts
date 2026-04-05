import type { FastifyPluginAsync } from "fastify";
import * as invoiceController from "../controllers/invoice.controller.js";
import {
  orgAccessDualPreHandlers,
  orgAccessDualWritePreHandlers,
} from "../lib/require-org-access-dual.js";

const readPre = [...orgAccessDualPreHandlers];
const writePre = [...orgAccessDualWritePreHandlers];

export const invoiceRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/api/v1/organizations/:organizationId/companies/:companyId/invoices",
    { preHandler: readPre },
    invoiceController.listInvoices,
  );

  fastify.post(
    "/api/v1/organizations/:organizationId/companies/:companyId/invoices",
    { preHandler: writePre },
    invoiceController.createInvoice,
  );

  fastify.get(
    "/api/v1/organizations/:organizationId/companies/:companyId/invoices/:invoiceId",
    { preHandler: readPre },
    invoiceController.getInvoice,
  );

  fastify.patch(
    "/api/v1/organizations/:organizationId/companies/:companyId/invoices/:invoiceId",
    { preHandler: writePre },
    invoiceController.patchInvoice,
  );
};

