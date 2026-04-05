import { prisma } from "../db/prisma.js";
import { makePrefixedId } from "../lib/prefixed-id.js";

const NAME_MIN = 1;
const NAME_MAX = 200;

export class OrganizationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationValidationError";
  }
}

export function validateOrganizationName(name: unknown): string {
  if (typeof name !== "string") {
    throw new OrganizationValidationError("name must be a string");
  }
  const trimmed = name.trim();
  if (trimmed.length < NAME_MIN) {
    throw new OrganizationValidationError("name is required");
  }
  if (trimmed.length > NAME_MAX) {
    throw new OrganizationValidationError(
      `name must be at most ${NAME_MAX} characters`,
    );
  }
  return trimmed;
}

export async function createOrganization(userId: string, name: string) {
  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        id: makePrefixedId("org"),
        name,
        ownerId: userId,
      },
    });
    await tx.organizationMember.create({
      data: {
        id: makePrefixedId("orgm"),
        organizationId: org.id,
        userId,
        role: "owner",
      },
    });
    return org;
  });
}

const LIST_PAGE_DEFAULT = 1;
const LIST_PAGE_SIZE_DEFAULT = 100;
const LIST_PAGE_SIZE_MAX = 100;

export type ListOrganizationsPageOpts = {
  page: number;
  pageSize: number;
};

export function parseListOrganizationsPagination(query: {
  page?: string;
  page_size?: string;
}): ListOrganizationsPageOpts {
  const pageRaw = query.page?.trim();
  const sizeRaw = query.page_size?.trim();
  const pageParsed = pageRaw ? Number.parseInt(pageRaw, 10) : LIST_PAGE_DEFAULT;
  const sizeParsed = sizeRaw
    ? Number.parseInt(sizeRaw, 10)
    : LIST_PAGE_SIZE_DEFAULT;
  const page = Number.isFinite(pageParsed) && pageParsed >= 1 ? pageParsed : LIST_PAGE_DEFAULT;
  const pageSize = Number.isFinite(sizeParsed)
    ? Math.min(Math.max(sizeParsed, 1), LIST_PAGE_SIZE_MAX)
    : LIST_PAGE_SIZE_DEFAULT;
  return { page, pageSize };
}

export async function listOrganizationsForUserPaginated(
  userId: string,
  opts: ListOrganizationsPageOpts,
) {
  const { page, pageSize } = opts;
  const skip = (page - 1) * pageSize;

  const [totalCount, rows] = await prisma.$transaction([
    prisma.organizationMember.count({ where: { userId } }),
    prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            razorpayCredential: { select: { id: true, keyId: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      skip,
      take: pageSize,
    }),
  ]);

  const hasMore = skip + rows.length < totalCount;

  return {
    rows: rows.map((r) => ({
      organization: r.organization,
      membershipRole: r.role,
    })),
    totalCount,
    page,
    pageSize,
    hasMore,
  };
}

export async function getOrganizationForUser(userId: string, organizationId: string) {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    include: {
      organization: {
        include: {
          razorpayCredential: { select: { id: true, keyId: true } },
        },
      },
    },
  });
  return member;
}

export async function getOrganizationById(organizationId: string) {
  return prisma.organization.findUnique({ where: { id: organizationId } });
}
