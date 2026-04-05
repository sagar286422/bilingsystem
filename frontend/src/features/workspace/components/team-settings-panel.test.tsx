import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-providers";

import { TeamSettingsPanel } from "./team-settings-panel";

const mockUseSession = vi.fn(() => ({
  data: { user: { id: "user_default" } },
  isPending: false,
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => mockUseSession(),
  },
}));

vi.mock("@/stores/workspace-store", () => ({
  useWorkspaceStore: (sel: (s: { activeOrganizationId: string | null }) => unknown) =>
    sel({ activeOrganizationId: "org_test" }),
}));

const mockGetOrganization = vi.fn();
const mockListTeams = vi.fn();
const mockListTeamMembers = vi.fn();

vi.mock("@/lib/api/organizations", () => ({
  getOrganization: (...a: unknown[]) => mockGetOrganization(...a),
}));

vi.mock("@/lib/api/teams", () => ({
  listTeams: (...a: unknown[]) => mockListTeams(...a),
  listTeamMembers: (...a: unknown[]) => mockListTeamMembers(...a),
  createTeam: vi.fn(),
  addTeamMemberByCredentials: vi.fn(),
  patchTeamMemberRole: vi.fn(),
  teamsQueryKey: (id: string | undefined) => ["teams", id ?? "_"],
  teamMembersQueryKey: (oid: string | undefined, tid: string | undefined) => [
    "teamMembers",
    oid ?? "_",
    tid ?? "_",
  ],
}));

describe("TeamSettingsPanel", () => {
  it("shows read-only banner and disables write controls for org member (not owner/admin)", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user_invited" } },
      isPending: false,
    });
    mockGetOrganization.mockResolvedValue({
      object: "organization",
      id: "org_test",
      name: "Acme",
      owner_id: "user_owner",
      created_at: "",
      updated_at: "",
      membership_role: "member",
    });
    mockListTeams.mockResolvedValue({
      object: "list",
      data: [
        {
          object: "team",
          id: "team_a",
          organization_id: "org_test",
          company_id: null,
          name: "Sales",
          type: "custom",
          created_at: "",
          updated_at: "",
        },
      ],
      has_more: false,
    });
    mockListTeamMembers.mockResolvedValue({
      object: "list",
      data: [],
      has_more: false,
    });

    renderWithProviders(<TeamSettingsPanel />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Read-only access in this workspace/i),
    ).toBeInTheDocument();

    const submitNewTeam = screen.getByRole("button", { name: /create team/i });
    expect(submitNewTeam).toBeDisabled();

    const submitMember = screen.getByRole("button", {
      name: /create account & add to team/i,
    });
    expect(submitMember).toBeDisabled();
  });

  it("allows write actions for organization owner", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user_owner" } },
      isPending: false,
    });
    mockGetOrganization.mockResolvedValue({
      object: "organization",
      id: "org_test",
      name: "Acme",
      owner_id: "user_owner",
      created_at: "",
      updated_at: "",
      membership_role: "owner",
    });
    mockListTeams.mockResolvedValue({
      object: "list",
      data: [
        {
          object: "team",
          id: "team_a",
          organization_id: "org_test",
          company_id: null,
          name: "Sales",
          type: "custom",
          created_at: "",
          updated_at: "",
        },
      ],
      has_more: false,
    });
    mockListTeamMembers.mockResolvedValue({
      object: "list",
      data: [],
      has_more: false,
    });

    renderWithProviders(<TeamSettingsPanel />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /create team/i }),
      ).not.toBeDisabled();
    });

    expect(
      screen.queryByText(/Read-only access in this workspace/i),
    ).not.toBeInTheDocument();
  });
});
