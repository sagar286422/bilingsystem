import { describe, expect, it } from "vitest";

import { canManageOrgMembersAndTeams } from "@/lib/workspace-permissions";

describe("canManageOrgMembersAndTeams", () => {
  it("returns true for organization owner_id match", () => {
    expect(
      canManageOrgMembersAndTeams(
        {
          owner_id: "user_a",
          membership_role: "member",
        },
        "user_a",
      ),
    ).toBe(true);
  });

  it("returns true for admin membership", () => {
    expect(
      canManageOrgMembersAndTeams(
        { owner_id: "user_owner", membership_role: "admin" },
        "user_b",
      ),
    ).toBe(true);
  });

  it("returns true for owner membership string", () => {
    expect(
      canManageOrgMembersAndTeams(
        { owner_id: "user_owner", membership_role: "owner" },
        "user_owner",
      ),
    ).toBe(true);
  });

  it("returns false for plain member who is not owner", () => {
    expect(
      canManageOrgMembersAndTeams(
        { owner_id: "user_owner", membership_role: "member" },
        "user_invited",
      ),
    ).toBe(false);
  });

  it("returns false without org or user", () => {
    expect(canManageOrgMembersAndTeams(undefined, "u")).toBe(false);
    expect(
      canManageOrgMembersAndTeams(
        { owner_id: "o", membership_role: "admin" },
        undefined,
      ),
    ).toBe(false);
  });
});
