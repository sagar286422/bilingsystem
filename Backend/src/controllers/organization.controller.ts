import type { FastifyReply, FastifyRequest } from "fastify";
import * as organizationService from "../services/organization.service.js";

function toOrganizationDto(
  org: {
    id: string;
    name: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    paymentMode?: string;
    platformFeeBps?: number;
    razorpayCredential?: { id: string; keyId: string } | null;
  },
  membershipRole?: string,
) {
  const cred = org.razorpayCredential;
  return {
    object: "organization" as const,
    id: org.id,
    name: org.name,
    owner_id: org.ownerId,
    created_at: org.createdAt.toISOString(),
    updated_at: org.updatedAt.toISOString(),
    payment_mode: org.paymentMode ?? "platform",
    platform_fee_bps: org.platformFeeBps ?? 100,
    byok_configured: Boolean(cred),
    razorpay_key_id_suffix:
      cred?.keyId && cred.keyId.length >= 4 ? cred.keyId.slice(-4) : null,
    ...(membershipRole ? { membership_role: membershipRole } : {}),
  };
}

export async function createOrganization(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.authUserId;
  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const body = request.body as { name?: string } | undefined;

  try {
    const name = organizationService.validateOrganizationName(body?.name);
    const org = await organizationService.createOrganization(userId, name);
    return reply.status(201).send(toOrganizationDto(org, "owner"));
  } catch (e) {
    if (e instanceof organizationService.OrganizationValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }
}

export async function listOrganizations(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.authUserId;
  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const q = request.query as { page?: string; page_size?: string };
  const { page, pageSize } =
    organizationService.parseListOrganizationsPagination(q);

  const result = await organizationService.listOrganizationsForUserPaginated(
    userId,
    { page, pageSize },
  );

  return reply.send({
    object: "list",
    data: result.rows.map((r) =>
      toOrganizationDto(r.organization, r.membershipRole),
    ),
    has_more: result.hasMore,
    total_count: result.totalCount,
    page: result.page,
    page_size: result.pageSize,
  });
}

export async function getOrganization(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userId = request.authUserId;
  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const { organizationId } = request.params as { organizationId: string };
  const member = await organizationService.getOrganizationForUser(
    userId,
    organizationId,
  );

  if (!member) {
    return reply.status(404).send({
      error: "Not Found",
      code: "ORGANIZATION_NOT_FOUND",
      message: "Organization not found or you are not a member.",
    });
  }

  return reply.send(
    toOrganizationDto(member.organization, member.role),
  );
}
