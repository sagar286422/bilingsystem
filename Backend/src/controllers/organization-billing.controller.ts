import type { FastifyReply, FastifyRequest } from "fastify";
import * as organizationBillingService from "../services/organization-billing.service.js";

function billingOrgDto(
  org: NonNullable<
    Awaited<ReturnType<typeof organizationBillingService.patchOrganizationBilling>>
  >,
) {
  const cred = org.razorpayCredential;
  return {
    object: "organization" as const,
    id: org.id,
    name: org.name,
    owner_id: org.ownerId,
    created_at: org.createdAt.toISOString(),
    updated_at: org.updatedAt.toISOString(),
    payment_mode: org.paymentMode,
    platform_fee_bps: org.platformFeeBps,
    byok_configured: Boolean(cred),
    razorpay_key_id_suffix:
      cred?.keyId && cred.keyId.length >= 4 ? cred.keyId.slice(-4) : null,
  };
}

export async function patchOrganizationBilling(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  try {
    const patch = organizationBillingService.parseOrganizationBillingPatch(
      request.body,
    );
    if (Object.keys(patch).length === 0) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: "No billing fields to update.",
      });
    }

    if (
      patch.razorpay_key_secret !== undefined &&
      patch.razorpay_key_id === undefined
    ) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: "razorpay_key_id is required when razorpay_key_secret is set.",
      });
    }

    const updated = await organizationBillingService.patchOrganizationBilling(
      orgId,
      patch,
    );
    if (!updated) {
      return reply.status(404).send({
        error: "Not Found",
        code: "ORGANIZATION_NOT_FOUND",
      });
    }
    return reply.send(billingOrgDto(updated));
  } catch (e) {
    if (e instanceof organizationBillingService.OrganizationBillingValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    if (e instanceof Error && e.message.includes("GATEWAY_CREDENTIALS_MASTER_KEY")) {
      return reply.status(503).send({
        error: "Service Unavailable",
        code: "ENCRYPTION_NOT_CONFIGURED",
        message: e.message,
      });
    }
    throw e;
  }
}
