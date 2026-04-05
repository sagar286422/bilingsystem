import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../db/prisma.js";
import { makePrefixedId } from "../lib/prefixed-id.js";

export class ApiKeyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyValidationError";
  }
}

export function parseCreateApiKeyBody(body: unknown): {
  name: string;
  kind: "secret" | "publishable";
  environment: "test" | "live";
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ApiKeyValidationError("body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  if (typeof b.name !== "string" || !b.name.trim()) {
    throw new ApiKeyValidationError("name is required");
  }
  const kind = b.kind;
  const environment = b.environment;
  if (kind !== "secret" && kind !== "publishable") {
    throw new ApiKeyValidationError('kind must be "secret" or "publishable"');
  }
  if (environment !== "test" && environment !== "live") {
    throw new ApiKeyValidationError('environment must be "test" or "live"');
  }
  return {
    name: b.name.trim(),
    kind,
    environment,
  };
}

function buildKeyToken(
  kind: "secret" | "publishable",
  environment: "test" | "live",
): { fullKey: string; keyHash: string; prefix: string } {
  const k = kind === "secret" ? "sk" : "pk";
  const secretPart = randomBytes(24).toString("base64url");
  const fullKey = `${k}_${environment}_${secretPart}`;
  const keyHash = createHash("sha256").update(fullKey, "utf8").digest("hex");
  const prefix =
    fullKey.length > 12 ? `${fullKey.slice(0, 12)}...` : `${fullKey}...`;
  return { fullKey, keyHash, prefix };
}

export async function createApiKey(
  organizationId: string,
  input: ReturnType<typeof parseCreateApiKeyBody>,
) {
  const { fullKey, keyHash, prefix } = buildKeyToken(
    input.kind,
    input.environment,
  );

  const row = await prisma.apiKey.create({
    data: {
      id: makePrefixedId("key"),
      organizationId,
      name: input.name,
      kind: input.kind,
      environment: input.environment,
      keyHash,
      prefix,
    },
  });

  return { row, secret: fullKey };
}

export async function listApiKeysForOrganization(organizationId: string) {
  return prisma.apiKey.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getApiKeyInOrganization(
  organizationId: string,
  apiKeyId: string,
) {
  return prisma.apiKey.findFirst({
    where: { id: apiKeyId, organizationId },
  });
}

export async function revokeApiKey(
  organizationId: string,
  apiKeyId: string,
): Promise<boolean> {
  const row = await getApiKeyInOrganization(organizationId, apiKeyId);
  if (!row || row.revokedAt) return false;
  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { revokedAt: new Date() },
  });
  return true;
}

export async function verifySecretKeyBearer(token: string) {
  if (!token.startsWith("sk_")) return null;
  const keyHash = createHash("sha256").update(token, "utf8").digest("hex");
  const row = await prisma.apiKey.findUnique({
    where: { keyHash },
  });
  if (!row || row.revokedAt || row.kind !== "secret") return null;
  return row;
}

/** Browser-safe key: limited to public checkout + `whoami-publishable` only. */
export async function verifyPublishableKeyBearer(token: string) {
  if (!token.startsWith("pk_")) return null;
  const keyHash = createHash("sha256").update(token, "utf8").digest("hex");
  const row = await prisma.apiKey.findUnique({
    where: { keyHash },
  });
  if (!row || row.revokedAt || row.kind !== "publishable") return null;
  return row;
}
