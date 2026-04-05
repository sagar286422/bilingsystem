import { apiFetch, readApiError } from "@/lib/api/http";
import type { OrganizationDto } from "@/lib/api/organizations";

export type PatchOrganizationBillingBody = {
  payment_mode?: "platform" | "byok_razorpay";
  platform_fee_bps?: number;
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
};

export async function patchOrganizationBilling(
  organizationId: string,
  body: PatchOrganizationBillingBody,
): Promise<OrganizationDto> {
  const res = await apiFetch(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/billing`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<OrganizationDto>;
}
