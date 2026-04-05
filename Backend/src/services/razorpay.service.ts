import { createHmac } from "node:crypto";

const RAZORPAY_API = "https://api.razorpay.com/v1";

export class RazorpayApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = "RazorpayApiError";
  }
}

function basicAuth(keyId: string, keySecret: string): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export async function razorpayCreateOrder(input: {
  keyId: string;
  keySecret: string;
  amountMinor: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string; status: string }> {
  const receipt =
    input.receipt.length > 40 ? input.receipt.slice(0, 40) : input.receipt;
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: basicAuth(input.keyId, input.keySecret),
    },
    body: JSON.stringify({
      amount: input.amountMinor,
      currency: input.currency.toUpperCase(),
      receipt,
      notes: input.notes ?? {},
    }),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const desc =
      typeof data.error === "object" &&
      data.error !== null &&
      "description" in data.error
        ? String((data.error as { description?: string }).description)
        : typeof data.description === "string"
          ? data.description
          : res.statusText;
    throw new RazorpayApiError(desc || "Razorpay error", res.status, data);
  }
  const id = typeof data.id === "string" ? data.id : "";
  if (!id) {
    throw new RazorpayApiError("Invalid Razorpay order response", res.status, data);
  }
  return {
    id,
    amount: Number(data.amount),
    currency: String(data.currency ?? input.currency),
    status: String(data.status ?? "created"),
  };
}

export async function razorpayFetchPayment(input: {
  keyId: string;
  keySecret: string;
  paymentId: string;
}): Promise<{ status: string; amount: number; currency: string; order_id?: string }> {
  const res = await fetch(
    `${RAZORPAY_API}/payments/${encodeURIComponent(input.paymentId)}`,
    {
      headers: {
        Authorization: basicAuth(input.keyId, input.keySecret),
      },
    },
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const desc =
      typeof data.error === "object" &&
      data.error !== null &&
      "description" in data.error
        ? String((data.error as { description?: string }).description)
        : res.statusText;
    throw new RazorpayApiError(desc || "Razorpay error", res.status, data);
  }
  const orderId =
    typeof data.order_id === "string"
      ? data.order_id
      : data.order_id == null
        ? undefined
        : String(data.order_id);
  return {
    status: String(data.status ?? ""),
    amount: Number(data.amount),
    currency: String(data.currency ?? ""),
    ...(orderId ? { order_id: orderId } : {}),
  };
}

export function razorpayVerifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expected = createHmac("sha256", keySecret).update(body).digest("hex");
  return expected.length === signature.length && expected === signature;
}
