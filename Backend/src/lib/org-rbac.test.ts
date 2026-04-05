import { describe, expect, it } from "vitest";

import { normalizeOrgMemberRole, sessionUserCanWriteOrg } from "./org-rbac.js";

describe("sessionUserCanWriteOrg", () => {
  it("allows organization owner user id even if membership role is member", () => {
    expect(
      sessionUserCanWriteOrg("user_owner", "user_owner", "member"),
    ).toBe(true);
  });

  it("allows admin membership", () => {
    expect(
      sessionUserCanWriteOrg("user_owner", "user_other", "admin"),
    ).toBe(true);
  });

  it("denies org member with role member when not owner", () => {
    expect(
      sessionUserCanWriteOrg("user_owner", "user_plain", "member"),
    ).toBe(false);
  });

  it("treats unknown role like member", () => {
    expect(
      sessionUserCanWriteOrg("user_owner", "user_plain", "billing"),
    ).toBe(false);
  });
});

describe("normalizeOrgMemberRole", () => {
  it("returns member for unknown strings", () => {
    expect(normalizeOrgMemberRole("unknown")).toBe("member");
  });
});
