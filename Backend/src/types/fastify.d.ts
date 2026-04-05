import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    /** Set by `requireSession` preHandler on protected routes */
    authUserId?: string;
    /** Set by `requireOrganizationMember` after session + org path param check */
    orgMember?: {
      organizationId: string;
      role: string;
    };
    /** Set by `requireValidSecretApiKey` (Bearer sk_...) */
    apiKeyAuth?: {
      organizationId: string;
      apiKeyId: string;
      kind: string;
      environment: string;
      name: string;
    };
    /** Set by `requireValidPublishableApiKey` (Bearer pk_...) */
    publishableKeyAuth?: {
      organizationId: string;
      apiKeyId: string;
      environment: string;
      name: string;
    };
  }
}
