import { prisma } from "../db/prisma.js";
import { makePrefixedId } from "../lib/prefixed-id.js";
import * as currencyService from "./currency.service.js";
import { getOrganizationForUser } from "./organization.service.js";

export class CompanyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompanyValidationError";
  }
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new CompanyValidationError(`${field} must be a string`);
  }
  const t = value.trim();
  if (!t) {
    throw new CompanyValidationError(`${field} is required`);
  }
  return t;
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new CompanyValidationError("optional fields must be strings when provided");
  }
  const t = value.trim();
  return t.length ? t : undefined;
}

export function parseCompanyCreateBody(body: unknown): {
  name: string;
  country: string;
  currency: string;
  logo?: string;
  taxId?: string;
  address?: string;
  defaultGateway?: string;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new CompanyValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const name = requireNonEmptyString(b.name, "name");
  const countryRaw = requireNonEmptyString(b.country, "country").toUpperCase();
  if (countryRaw.length !== 2) {
    throw new CompanyValidationError("country must be a 2-letter ISO code");
  }
  const currencyRaw = requireNonEmptyString(b.currency, "currency").toUpperCase();
  if (currencyRaw.length !== 3) {
    throw new CompanyValidationError("currency must be a 3-letter code");
  }
  return {
    name,
    country: countryRaw,
    currency: currencyRaw,
    logo: optionalString(b.logo),
    taxId: optionalString(b.tax_id ?? b.taxId),
    address: optionalString(b.address),
    defaultGateway: optionalString(
      b.default_gateway ?? b.defaultGateway,
    ),
  };
}

export function parseCompanyPatchBody(body: unknown): Partial<{
  name: string;
  logo: string | null;
  country: string;
  currency: string;
  taxId: string | null;
  address: string | null;
  defaultGateway: string | null;
}> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new CompanyValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const out: Partial<{
    name: string;
    logo: string | null;
    country: string;
    currency: string;
    taxId: string | null;
    address: string | null;
    defaultGateway: string | null;
  }> = {};

  if (b.name !== undefined) {
    out.name = requireNonEmptyString(b.name, "name");
  }
  if (b.logo !== undefined) {
    out.logo = b.logo === null ? null : optionalString(b.logo) ?? null;
  }
  if (b.country !== undefined) {
    const c = requireNonEmptyString(b.country, "country").toUpperCase();
    if (c.length !== 2) {
      throw new CompanyValidationError("country must be a 2-letter ISO code");
    }
    out.country = c;
  }
  if (b.currency !== undefined) {
    const cur = requireNonEmptyString(b.currency, "currency").toUpperCase();
    if (cur.length !== 3) {
      throw new CompanyValidationError("currency must be a 3-letter code");
    }
    out.currency = cur;
  }
  if (b.tax_id !== undefined || b.taxId !== undefined) {
    const v = b.tax_id ?? b.taxId;
    out.taxId = v === null ? null : optionalString(v) ?? null;
  }
  if (b.address !== undefined) {
    out.address = b.address === null ? null : optionalString(b.address) ?? null;
  }
  if (b.default_gateway !== undefined || b.defaultGateway !== undefined) {
    const v = b.default_gateway ?? b.defaultGateway;
    out.defaultGateway = v === null ? null : optionalString(v) ?? null;
  }

  if (Object.keys(out).length === 0) {
    throw new CompanyValidationError("no valid fields to update");
  }
  return out;
}

export async function createCompany(
  organizationId: string,
  data: ReturnType<typeof parseCompanyCreateBody>,
) {
  await currencyService.requireActiveCurrencyCode(data.currency);
  return prisma.company.create({
    data: {
      id: makePrefixedId("comp"),
      organizationId,
      name: data.name,
      country: data.country,
      currency: data.currency,
      logo: data.logo ?? null,
      taxId: data.taxId ?? null,
      address: data.address ?? null,
      defaultGateway: data.defaultGateway ?? null,
    },
  });
}

export async function listCompanies(organizationId: string) {
  return prisma.company.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getCompanyInOrganization(
  organizationId: string,
  companyId: string,
) {
  return prisma.company.findFirst({
    where: { id: companyId, organizationId },
  });
}

export async function updateCompanyInOrganization(
  organizationId: string,
  companyId: string,
  patch: ReturnType<typeof parseCompanyPatchBody>,
) {
  const existing = await getCompanyInOrganization(organizationId, companyId);
  if (!existing) return null;
  if (patch.currency !== undefined) {
    await currencyService.requireActiveCurrencyCode(patch.currency);
  }
  return prisma.company.update({
    where: { id: companyId },
    data: {
      ...("name" in patch && patch.name !== undefined ? { name: patch.name } : {}),
      ...("logo" in patch && patch.logo !== undefined ? { logo: patch.logo } : {}),
      ...("country" in patch && patch.country !== undefined
        ? { country: patch.country }
        : {}),
      ...("currency" in patch && patch.currency !== undefined
        ? { currency: patch.currency }
        : {}),
      ...("taxId" in patch && patch.taxId !== undefined ? { taxId: patch.taxId } : {}),
      ...("address" in patch && patch.address !== undefined
        ? { address: patch.address }
        : {}),
      ...("defaultGateway" in patch && patch.defaultGateway !== undefined
        ? { defaultGateway: patch.defaultGateway }
        : {}),
    },
  });
}

export async function deleteCompanyInOrganization(
  organizationId: string,
  companyId: string,
) {
  const existing = await getCompanyInOrganization(organizationId, companyId);
  if (!existing) return false;
  await prisma.company.delete({ where: { id: companyId } });
  return true;
}

export async function addCompanyMember(
  organizationId: string,
  companyId: string,
  targetUserId: string,
) {
  const company = await getCompanyInOrganization(organizationId, companyId);
  if (!company) return { error: "COMPANY_NOT_FOUND" as const };

  const target = await getOrganizationForUser(targetUserId, organizationId);
  if (!target) return { error: "USER_NOT_IN_ORGANIZATION" as const };

  try {
    const row = await prisma.companyMember.create({
      data: {
        id: makePrefixedId("cm"),
        companyId,
        userId: targetUserId,
        role: "member",
      },
    });
    return { member: row };
  } catch {
    return { error: "ALREADY_MEMBER" as const };
  }
}

export async function listCompanyMembers(
  organizationId: string,
  companyId: string,
) {
  const company = await getCompanyInOrganization(organizationId, companyId);
  if (!company) return null;

  return prisma.companyMember.findMany({
    where: { companyId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function removeCompanyMember(
  organizationId: string,
  companyId: string,
  targetUserId: string,
) {
  const company = await getCompanyInOrganization(organizationId, companyId);
  if (!company) return false;

  const result = await prisma.companyMember.deleteMany({
    where: { companyId, userId: targetUserId },
  });
  return result.count > 0;
}
