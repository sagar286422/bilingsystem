import { apiFetch, readApiError } from "@/lib/api/http";
import { billingPublishableKey } from "@/lib/env-public";

function publicCheckoutHeaders(): HeadersInit {
  if (!billingPublishableKey) return {};
  return { Authorization: `Bearer ${billingPublishableKey}` };
}

export type PublicPaymentPageResponse = {
  object: "public_payment_page";
  slug: string;
  title: string;
  product_name: string;
  product_description: string | null;
  amount_minor: number;
  currency: string;
  price_type: string;
  interval: string | null;
  interval_count: number | null;
  payment_mode: string;
  platform_fee_bps: number;
  organization_name: string;
  customization: Record<string, unknown>;
};

export async function getPublicPaymentPage(
  slug: string,
): Promise<PublicPaymentPageResponse> {
  const res = await apiFetch(
    `/api/v1/public/payment-pages/${encodeURIComponent(slug)}`,
    { credentials: "omit", headers: publicCheckoutHeaders() },
  );
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<PublicPaymentPageResponse>;
}

export type RazorpayOrderResponse = {
  object: "razorpay_order";
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  transaction_id: string;
  platform_fee_minor: number;
  title: string;
  product_name: string;
  price_type: string;
  interval: string | null;
  interval_count: number | null;
};

export async function createPublicPaymentOrder(
  slug: string,
  body: { email: string; name?: string | null; quantity?: number },
): Promise<RazorpayOrderResponse> {
  const res = await apiFetch(
    `/api/v1/public/payment-pages/${encodeURIComponent(slug)}/orders`,
    {
      method: "POST",
      body: JSON.stringify(body),
      credentials: "omit",
      headers: publicCheckoutHeaders(),
    },
  );
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<RazorpayOrderResponse>;
}

export async function verifyPublicPayment(
  slug: string,
  body: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
): Promise<{
  object: "payment_verified";
  transaction_id: string;
  already_verified: boolean;
}> {
  const res = await apiFetch(
    `/api/v1/public/payment-pages/${encodeURIComponent(slug)}/verify-payment`,
    {
      method: "POST",
      body: JSON.stringify(body),
      credentials: "omit",
      headers: publicCheckoutHeaders(),
    },
  );
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<{
    object: "payment_verified";
    transaction_id: string;
    already_verified: boolean;
  }>;
}
