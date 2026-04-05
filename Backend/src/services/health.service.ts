export function getHealthPayload() {
  return {
    ok: true as const,
    service: "billing-api",
  };
}
