import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { makePrefixedId } from "../lib/prefixed-id.js";
import * as razorpayService from "./razorpay.service.js";
import * as orgGatewayService from "./organization-gateway.service.js";

export class PaymentPageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentPageValidationError";
  }
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Whitelisted checkout keys — extend as needed without DB migrations. */
const CUSTOMIZATION_KEYS = new Set([
  "accent",
  "page_bg",
  "card_bg",
  "text",
  "text_muted",
  "border",
  "logo_url",
  "hero_subtitle",
  "footer_note",
  "checkout_button_label",
  "success_title",
  "success_message",
  "theme",
  "card_radius",
  "show_fee_disclosure",
  "font_sans",
]);

const MAX_URL = 2048;
const MAX_LONG = 600;
const MAX_SHORT = 280;

export function parsePaymentPageCustomization(raw: unknown): Record<string, unknown> {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new PaymentPageValidationError("customization must be a JSON object");
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!CUSTOMIZATION_KEYS.has(k)) continue;
    if (typeof v === "boolean") {
      if (k === "show_fee_disclosure") out[k] = v;
      continue;
    }
    if (typeof v !== "string") continue;
    const s = v.trim();
    if (k === "logo_url") {
      if (s.length <= MAX_URL) out[k] = s;
      continue;
    }
    const lim =
      k === "hero_subtitle" ||
      k === "footer_note" ||
      k === "checkout_button_label" ||
      k === "success_title" ||
      k === "success_message"
        ? MAX_LONG
        : k === "page_bg" || k === "card_bg"
          ? MAX_LONG
          : MAX_SHORT;
    if (s.length <= lim) out[k] = s;
  }
  if (
    out.theme !== undefined &&
    out.theme !== "light" &&
    out.theme !== "dark"
  ) {
    delete out.theme;
  }
  if (
    out.card_radius !== undefined &&
    out.card_radius !== "sm" &&
    out.card_radius !== "md" &&
    out.card_radius !== "lg" &&
    out.card_radius !== "xl"
  ) {
    delete out.card_radius;
  }
  return out;
}

function mergeCustomizationJson(
  existing: unknown,
  patch: Record<string, unknown>,
): Prisma.InputJsonValue {
  const base =
    existing &&
    typeof existing === "object" &&
    !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return { ...base, ...patch } as Prisma.InputJsonValue;
}

export function parsePaymentPageCreateBody(body: unknown): {
  slug: string;
  company_id: string;
  price_id: string;
  title?: string | null;
  customization?: Record<string, unknown>;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new PaymentPageValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const slugRaw = b.slug;
  if (typeof slugRaw !== "string" || !slugRaw.trim()) {
    throw new PaymentPageValidationError("slug is required");
  }
  const slug = slugRaw.trim().toLowerCase();
  if (!SLUG_RE.test(slug) || slug.length < 2) {
    throw new PaymentPageValidationError(
      "slug must be 2–63 chars: lowercase letters, digits, hyphens; cannot start/end with hyphen.",
    );
  }
  const company_id = typeof b.company_id === "string" ? b.company_id.trim() : "";
  if (!company_id) {
    throw new PaymentPageValidationError("company_id is required");
  }
  const price_id = typeof b.price_id === "string" ? b.price_id.trim() : "";
  if (!price_id) {
    throw new PaymentPageValidationError("price_id is required");
  }
  let title: string | null | undefined;
  if (b.title !== undefined) {
    if (b.title === null) title = null;
    else if (typeof b.title === "string") title = b.title.trim() || null;
    else throw new PaymentPageValidationError("title must be a string or null");
  }
  let customization: Record<string, unknown> | undefined;
  if (b.customization !== undefined) {
    customization = parsePaymentPageCustomization(b.customization);
  }
  return { slug, company_id, price_id, title, customization };
}

export async function createPaymentPageInOrganization(
  organizationId: string,
  input: ReturnType<typeof parsePaymentPageCreateBody>,
) {
  const company = await prisma.company.findFirst({
    where: { id: input.company_id, organizationId },
  });
  if (!company) return { error: "COMPANY_NOT_FOUND" as const };

  const price = await prisma.price.findFirst({
    where: {
      id: input.price_id,
      active: true,
      product: { organizationId, active: true },
    },
    include: { product: true },
  });
  if (!price) return { error: "PRICE_NOT_FOUND" as const };

  try {
    const row = await prisma.paymentPage.create({
      data: {
        id: makePrefixedId("pp"),
        organizationId,
        companyId: input.company_id,
        priceId: input.price_id,
        slug: input.slug,
        title: input.title ?? null,
        active: true,
        customization:
          (input.customization && Object.keys(input.customization).length > 0
            ? input.customization
            : {}) as Prisma.InputJsonValue,
      },
      include: {
        price: { include: { product: true } },
        company: true,
      },
    });
    return { page: row };
  } catch (e: unknown) {
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      return { error: "SLUG_TAKEN" as const };
    }
    throw e;
  }
}

export async function listPaymentPagesForOrganization(organizationId: string) {
  return prisma.paymentPage.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      price: { include: { product: true } },
      company: true,
    },
  });
}

export function parsePaymentPagePatchBody(body: unknown): {
  title?: string | null;
  active?: boolean;
  customization?: Record<string, unknown>;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new PaymentPageValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const out: {
    title?: string | null;
    active?: boolean;
    customization?: Record<string, unknown>;
  } = {};
  if (b.title !== undefined) {
    if (b.title === null) out.title = null;
    else if (typeof b.title === "string") out.title = b.title.trim() || null;
    else throw new PaymentPageValidationError("title must be a string or null");
  }
  if (b.active !== undefined) {
    if (typeof b.active !== "boolean") {
      throw new PaymentPageValidationError("active must be a boolean");
    }
    out.active = b.active;
  }
  if (b.customization !== undefined) {
    out.customization = parsePaymentPageCustomization(b.customization);
  }
  if (Object.keys(out).length === 0) {
    throw new PaymentPageValidationError(
      "At least one of title, active, or customization is required.",
    );
  }
  return out;
}

export async function patchPaymentPageInOrganization(
  organizationId: string,
  paymentPageId: string,
  patch: ReturnType<typeof parsePaymentPagePatchBody>,
) {
  const page = await prisma.paymentPage.findFirst({
    where: { id: paymentPageId, organizationId },
    include: {
      price: { include: { product: true } },
      company: true,
    },
  });
  if (!page) return { error: "NOT_FOUND" as const };

  const data: Prisma.PaymentPageUpdateInput = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.active !== undefined) data.active = patch.active;
  if (
    patch.customization !== undefined &&
    Object.keys(patch.customization).length > 0
  ) {
    data.customization = mergeCustomizationJson(
      page.customization,
      patch.customization,
    );
  }

  if (Object.keys(data).length === 0) {
    return { page };
  }

  const row = await prisma.paymentPage.update({
    where: { id: paymentPageId },
    data,
    include: {
      price: { include: { product: true } },
      company: true,
    },
  });
  return { page: row };
}

export async function getActivePaymentPageBySlug(slug: string) {
  return prisma.paymentPage.findFirst({
    where: { slug: slug.toLowerCase(), active: true },
    include: {
      organization: true,
      company: true,
      price: { include: { product: true } },
    },
  });
}

export function parseCreateOrderBody(body: unknown): {
  email: string;
  name?: string | null;
  quantity?: number;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new PaymentPageValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  if (typeof b.email !== "string" || !b.email.trim()) {
    throw new PaymentPageValidationError("email is required");
  }
  const email = b.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new PaymentPageValidationError("email is invalid");
  }
  let name: string | null | undefined;
  if (b.name !== undefined) {
    if (b.name === null) name = null;
    else if (typeof b.name === "string") name = b.name.trim() || null;
    else throw new PaymentPageValidationError("name must be a string or null");
  }
  let quantity = 1;
  if (b.quantity !== undefined) {
    if (typeof b.quantity !== "number" || !Number.isInteger(b.quantity)) {
      throw new PaymentPageValidationError("quantity must be an integer");
    }
    if (b.quantity < 1) {
      throw new PaymentPageValidationError("quantity must be at least 1");
    }
    quantity = b.quantity;
  }
  return { email, name, quantity };
}

export function parseVerifyPaymentBody(body: unknown): {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new PaymentPageValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const razorpay_order_id =
    typeof b.razorpay_order_id === "string" ? b.razorpay_order_id.trim() : "";
  const razorpay_payment_id =
    typeof b.razorpay_payment_id === "string"
      ? b.razorpay_payment_id.trim()
      : "";
  const razorpay_signature =
    typeof b.razorpay_signature === "string"
      ? b.razorpay_signature.trim()
      : "";
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new PaymentPageValidationError(
      "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
    );
  }
  return { razorpay_order_id, razorpay_payment_id, razorpay_signature };
}

export async function createRazorpayOrderForPaymentPage(
  slug: string,
  body: ReturnType<typeof parseCreateOrderBody>,
) {
  const page = await getActivePaymentPageBySlug(slug);
  if (!page) return { error: "PAYMENT_PAGE_NOT_FOUND" as const };

  const price = page.price;
  if (!price.active || !price.product.active) {
    return { error: "PRICE_INACTIVE" as const };
  }

  const quantity = body.quantity ?? 1;
  const amountMinor = price.unitAmount * quantity;
  const org = page.organization;
  const platformFeeMinor = Math.floor(
    (amountMinor * org.platformFeeBps) / 10_000,
  );

  const creds = await orgGatewayService.resolveRazorpayCredentialsForOrg(
    org.id,
  );
  if ("error" in creds) return { error: creds.error };

  const customer = await prisma.customer.upsert({
    where: {
      companyId_email: { companyId: page.companyId, email: body.email },
    },
    create: {
      id: makePrefixedId("cus"),
      organizationId: org.id,
      companyId: page.companyId,
      email: body.email,
      name: body.name ?? null,
      metadata: {},
    },
    update: {
      ...(body.name !== undefined && body.name !== null
        ? { name: body.name }
        : {}),
    },
  });

  const txn = await prisma.transaction.create({
    data: {
      id: makePrefixedId("txn"),
      organizationId: org.id,
      companyId: page.companyId,
      customerId: customer.id,
      subscriptionId: null,
      invoiceId: null,
      amount: amountMinor,
      currency: price.currency,
      status: "pending",
      gateway: "razorpay",
      gatewayReferenceId: "pending",
      paymentPageId: page.id,
      platformFeeMinor,
      metadata: {
        quantity,
        price_id: price.id,
        payment_mode: org.paymentMode,
        billing_interval: price.interval,
        price_type: price.type,
      },
    },
  });

  const keyIdForCheckout =
    (await orgGatewayService.razorpayKeyIdForCheckout(org.id)) ?? creds.keyId;

  try {
    const order = await razorpayService.razorpayCreateOrder({
      keyId: creds.keyId,
      keySecret: creds.keySecret,
      amountMinor,
      currency: price.currency,
      receipt: txn.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40) || `t${txn.id.slice(-12)}`,
      notes: {
        transaction_id: txn.id,
        organization_id: org.id,
        payment_page_id: page.id,
      },
    });

    const updated = await prisma.transaction.update({
      where: { id: txn.id },
      data: { gatewayReferenceId: order.id },
    });

    return {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyIdForCheckout,
      transaction_id: updated.id,
      platform_fee_minor: platformFeeMinor,
      title: page.title ?? page.price.product.name,
      product_name: page.price.product.name,
      price_type: price.type,
      interval: price.interval,
      interval_count: price.intervalCount,
    };
  } catch (e) {
    await prisma.transaction
      .update({
        where: { id: txn.id },
        data: { status: "failed", gatewayReferenceId: "order_failed" },
      })
      .catch(() => {});
    if (e instanceof razorpayService.RazorpayApiError) {
      return {
        error: "RAZORPAY_ERROR" as const,
        message: e.message,
      };
    }
    throw e;
  }
}

export async function verifyRazorpayPaymentForPage(
  slug: string,
  body: ReturnType<typeof parseVerifyPaymentBody>,
) {
  const page = await getActivePaymentPageBySlug(slug);
  if (!page) return { error: "PAYMENT_PAGE_NOT_FOUND" as const };

  const creds = await orgGatewayService.resolveRazorpayCredentialsForOrg(
    page.organizationId,
  );
  if ("error" in creds) return { error: creds.error };

  const ok = razorpayService.razorpayVerifyPaymentSignature(
    body.razorpay_order_id,
    body.razorpay_payment_id,
    body.razorpay_signature,
    creds.keySecret,
  );
  if (!ok) return { error: "INVALID_SIGNATURE" as const };

  const pay = await razorpayService.razorpayFetchPayment({
    keyId: creds.keyId,
    keySecret: creds.keySecret,
    paymentId: body.razorpay_payment_id,
  });

  if (pay.status !== "authorized" && pay.status !== "captured") {
    return { error: "PAYMENT_NOT_COMPLETE" as const, status: pay.status };
  }

  if (
    pay.order_id &&
    pay.order_id !== body.razorpay_order_id
  ) {
    return { error: "ORDER_MISMATCH" as const };
  }

  const txn = await prisma.transaction.findFirst({
    where: {
      gatewayReferenceId: body.razorpay_order_id,
      organizationId: page.organizationId,
      paymentPageId: page.id,
    },
  });
  if (!txn) return { error: "TRANSACTION_NOT_FOUND" as const };
  if (txn.status === "succeeded") {
    return { ok: true as const, transaction_id: txn.id, already_verified: true };
  }
  if (pay.amount !== txn.amount) {
    return { error: "AMOUNT_MISMATCH" as const };
  }

  const prevMeta =
    txn.metadata &&
    typeof txn.metadata === "object" &&
    !Array.isArray(txn.metadata)
      ? (txn.metadata as Record<string, unknown>)
      : {};

  await prisma.transaction.update({
    where: { id: txn.id },
    data: {
      status: "succeeded",
      metadata: { ...prevMeta, razorpay_payment_id: body.razorpay_payment_id },
    },
  });

  return { ok: true as const, transaction_id: txn.id, already_verified: false };
}
