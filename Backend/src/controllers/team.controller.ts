import type { FastifyReply, FastifyRequest } from "fastify";
import type { Team } from "@prisma/client";
import * as teamService from "../services/team.service.js";

function teamDto(t: Team) {
  return {
    object: "team" as const,
    id: t.id,
    organization_id: t.organizationId,
    company_id: t.companyId,
    name: t.name,
    type: t.type,
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
  };
}

export async function createTeam(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  try {
    const data = teamService.parseTeamCreateBody(request.body);
    const team = await teamService.createTeam(orgId, data);
    return reply.status(201).send(teamDto(team));
  } catch (e) {
    if (e instanceof teamService.TeamValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }
}

export async function listTeams(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const rows = await teamService.listTeams(orgId);
  return reply.send({
    object: "list",
    data: rows.map(teamDto),
    has_more: false,
  });
}

export async function getTeam(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { teamId } = request.params as { teamId: string };
  const team = await teamService.getTeamInOrganization(orgId, teamId);
  if (!team) {
    return reply.status(404).send({
      error: "Not Found",
      code: "TEAM_NOT_FOUND",
      message: "Team not found in this organization.",
    });
  }
  return reply.send(teamDto(team));
}

export async function patchTeam(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { teamId } = request.params as { teamId: string };

  try {
    const patch = teamService.parseTeamPatchBody(request.body);
    const team = await teamService.updateTeamInOrganization(orgId, teamId, patch);
    if (!team) {
      return reply.status(404).send({
        error: "Not Found",
        code: "TEAM_NOT_FOUND",
        message: "Team not found in this organization.",
      });
    }
    return reply.send(teamDto(team));
  } catch (e) {
    if (e instanceof teamService.TeamValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }
}

export async function deleteTeam(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { teamId } = request.params as { teamId: string };
  const ok = await teamService.deleteTeamInOrganization(orgId, teamId);
  if (!ok) {
    return reply.status(404).send({
      error: "Not Found",
      code: "TEAM_NOT_FOUND",
      message: "Team not found in this organization.",
    });
  }
  return reply.status(204).send();
}

export async function addTeamMember(request: FastifyRequest, reply: FastifyReply) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { teamId } = request.params as { teamId: string };

  let parsed: teamService.AddTeamMemberBody;
  try {
    parsed = teamService.parseAddTeamMemberBody(request.body);
  } catch (e) {
    if (e instanceof teamService.TeamValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }

  const result = await teamService.addTeamMember(orgId, teamId, parsed);
  if (result.error === "TEAM_NOT_FOUND") {
    return reply.status(404).send({
      error: "Not Found",
      code: "TEAM_NOT_FOUND",
      message: "Team not found in this organization.",
    });
  }
  if (result.error === "USER_NOT_IN_ORGANIZATION") {
    return reply.status(400).send({
      error: "Bad Request",
      code: "USER_NOT_IN_ORGANIZATION",
      message: "User must be a member of this organization before joining a team.",
    });
  }
  if (result.error === "USER_EMAIL_EXISTS") {
    return reply.status(409).send({
      error: "Conflict",
      code: "USER_EMAIL_EXISTS",
      message:
        "An account with this email already exists. Add them with user_id after they join the org, or use a different email.",
    });
  }
  if (result.error === "CREDENTIAL_VALIDATION") {
    return reply.status(400).send({
      error: "Bad Request",
      code: "VALIDATION_ERROR",
      message: result.message,
    });
  }
  if (result.error === "ALREADY_MEMBER") {
    return reply.status(409).send({
      error: "Conflict",
      code: "ALREADY_TEAM_MEMBER",
      message: "User is already on this team.",
    });
  }

  return reply.status(201).send({
    object: "team_member",
    id: result.member.id,
    team_id: result.member.teamId,
    user_id: result.member.userId,
    role: result.member.role,
    created_at: result.member.createdAt.toISOString(),
  });
}

export async function listTeamMembers(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { teamId } = request.params as { teamId: string };
  const rows = await teamService.listTeamMembers(orgId, teamId);
  if (!rows) {
    return reply.status(404).send({
      error: "Not Found",
      code: "TEAM_NOT_FOUND",
      message: "Team not found in this organization.",
    });
  }

  return reply.send({
    object: "list",
    data: rows.map((r) => ({
      object: "team_member" as const,
      id: r.id,
      team_id: r.teamId,
      user_id: r.userId,
      role: r.role,
      created_at: r.createdAt.toISOString(),
      user: {
        id: r.user.id,
        name: r.user.name,
        email: r.user.email,
      },
    })),
    has_more: false,
  });
}

export async function patchTeamMember(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { teamId, userId } = request.params as {
    teamId: string;
    userId: string;
  };

  let patch: { role: string };
  try {
    patch = teamService.parsePatchTeamMemberBody(request.body);
  } catch (e) {
    if (e instanceof teamService.TeamValidationError) {
      return reply.status(400).send({
        error: "Bad Request",
        code: "VALIDATION_ERROR",
        message: e.message,
      });
    }
    throw e;
  }

  const result = await teamService.patchTeamMemberRole(
    orgId,
    teamId,
    userId,
    patch.role,
  );
  if (result.error === "TEAM_NOT_FOUND") {
    return reply.status(404).send({
      error: "Not Found",
      code: "TEAM_NOT_FOUND",
      message: "Team not found in this organization.",
    });
  }
  if (result.error === "MEMBER_NOT_FOUND") {
    return reply.status(404).send({
      error: "Not Found",
      code: "TEAM_MEMBER_NOT_FOUND",
      message: "User is not on this team.",
    });
  }

  const m = result.member;
  return reply.send({
    object: "team_member" as const,
    id: m.id,
    team_id: m.teamId,
    user_id: m.userId,
    role: m.role,
    created_at: m.createdAt.toISOString(),
  });
}

export async function removeTeamMember(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const orgId = request.orgMember?.organizationId;
  if (!orgId) {
    return reply.status(500).send({ error: "Internal Server Error" });
  }

  const { teamId, userId } = request.params as {
    teamId: string;
    userId: string;
  };

  const ok = await teamService.removeTeamMember(orgId, teamId, userId);
  if (!ok) {
    return reply.status(404).send({
      error: "Not Found",
      code: "TEAM_MEMBER_NOT_FOUND",
      message: "Team not found or user is not on this team.",
    });
  }
  return reply.status(204).send();
}
