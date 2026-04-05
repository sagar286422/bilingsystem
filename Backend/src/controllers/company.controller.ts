import type { FastifyReply, FastifyRequest } from "fastify";
import type { Company } from "@prisma/client";
import * as companyService from "../services/company.service.js";
import * as currencyService from "../services/currency.service.js";

function companyDto(c: Company) {
  return {
    object: "company" as const,
    id: c.id,
    organization_id: c.organizationId,
    name: c.name,
    logo: c.logo,
    country: c.country,
    currency: c.currency,
    tax_id: c.taxId,
    address: c.address,
    default_gateway: c.defaultGateway,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}

export async function createCompany(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  try {
    const data = companyService.parseCompanyCreateBody(request.body);
    const company = await companyService.createCompany(orgId, data);
    return reply.status(201).send(companyDto(company));
  } catch (e) {
    if (e instanceof companyService.CompanyValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    if (e instanceof currencyService.CurrencyValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "INVALID_CURRENCY",
        message: e.message,
      });
    }
    throw e;
  }
}

export async function listCompanies(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const rows = await companyService.listCompanies(orgId);
  return reply.send({
    object: "list",
    data: rows.map(companyDto),
    has_more: false,
  });
}

export async function getCompany(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { companyId } = request.params as { companyId: string };
  const company = await companyService.getCompanyInOrganization(orgId, companyId);
  if (!company) {
    return reply.status(404).send({
      error: "Not Found",
      code: "COMPANY_NOT_FOUND",
      message: "Company not found in this organization.",
    });
  }
  return reply.send(companyDto(company));
}

export async function patchCompany(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { companyId } = request.params as { companyId: string };

  try {
    const patch = companyService.parseCompanyPatchBody(request.body);
    const company = await companyService.updateCompanyInOrganization(
      orgId,
      companyId,
      patch,
    );
    if (!company) {
      return reply.status(404).send({
        error: "Not Found",
        code: "COMPANY_NOT_FOUND",
        message: "Company not found in this organization.",
      });
    }
    return reply.send(companyDto(company));
  } catch (e) {
    if (e instanceof companyService.CompanyValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    if (e instanceof currencyService.CurrencyValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "INVALID_CURRENCY",
        message: e.message,
      });
    }
    throw e;
  }
}

export async function deleteCompany(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { companyId } = request.params as { companyId: string };
  const ok = await companyService.deleteCompanyInOrganization(orgId, companyId);
  if (!ok) {
    return reply.status(404).send({
      error: "Not Found",
      code: "COMPANY_NOT_FOUND",
      message: "Company not found in this organization.",
    });
  }
  return reply.status(204).send();
}

export async function listCompanyMembers(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { companyId } = request.params as { companyId: string };
  const rows = await companyService.listCompanyMembers(orgId, companyId);
  if (!rows) {
    return reply.status(404).send({
      error: "Not Found",
      code: "COMPANY_NOT_FOUND",
      message: "Company not found in this organization.",
    });
  }

  return reply.send({
    object: "list",
    data: rows.map((r) => ({
      object: "company_member" as const,
      id: r.id,
      company_id: r.companyId,
      user_id: r.userId,
      role: r.role,
      created_at: r.createdAt.toISOString(),
      user: {
        id: r.user.id,
        name: r.user.name,
        email: r.user.email,
      },
    })),
    has_more: false,
  });
}

export async function addCompanyMember(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { companyId } = request.params as { companyId: string };
  const body = request.body as { user_id?: string } | undefined;
  const userId =
    typeof body?.user_id === "string" ? body.user_id.trim() : "";
  if (!userId) {
    return reply.status(400).send({
      error: "Bad Request",
      code: "VALIDATION_ERROR",
      message: "user_id is required",
    });
  }

  const result = await companyService.addCompanyMember(orgId, companyId, userId);
  if (result.error === "COMPANY_NOT_FOUND") {
    return reply.status(404).send({
      error: "Not Found",
      code: "COMPANY_NOT_FOUND",
      message: "Company not found in this organization.",
    });
  }
  if (result.error === "USER_NOT_IN_ORGANIZATION") {
    return reply.status(400).send({
      error: "Bad Request",
      code: "USER_NOT_IN_ORGANIZATION",
      message:
        "User must be a member of this organization before they can be linked to a company.",
    });
  }
  if (result.error === "ALREADY_MEMBER") {
    return reply.status(409).send({
      error: "Conflict",
      code: "ALREADY_COMPANY_MEMBER",
      message: "User is already linked to this company.",
    });
  }

  return reply.status(201).send({
    object: "company_member",
    id: result.member.id,
    company_id: result.member.companyId,
    user_id: result.member.userId,
    role: result.member.role,
    created_at: result.member.createdAt.toISOString(),
  });
}

export async function removeCompanyMember(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { companyId, userId } = request.params as {
    companyId: string;
    userId: string;
  };

  const ok = await companyService.removeCompanyMember(
    orgId,
    companyId,
    userId,
  );
  if (!ok) {
    return reply.status(404).send({
      error: "Not Found",
      code: "COMPANY_MEMBER_NOT_FOUND",
      message: "Company not found or user is not linked to this company.",
    });
  }
  return reply.status(204).send();
}
