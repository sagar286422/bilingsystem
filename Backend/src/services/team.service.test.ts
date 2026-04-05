import { describe, expect, it } from "vitest";

import { parseAddTeamMemberBody, TeamValidationError } from "./team.service.js";

describe("parseAddTeamMemberBody", () => {
  it("parses user_id", () => {
    expect(parseAddTeamMemberBody({ user_id: "user_abc" })).toEqual({
      kind: "user_id",
      userId: "user_abc",
    });
  });

  it("parses email and password", () => {
    expect(
      parseAddTeamMemberBody({
        email: "Person@Example.com",
        password: "secretpass",
        name: "Pat",
      }),
    ).toEqual({
      kind: "credentials",
      email: "person@example.com",
      password: "secretpass",
      name: "Pat",
    });
  });

  it("rejects both user_id and credentials", () => {
    expect(() =>
      parseAddTeamMemberBody({
        user_id: "x",
        email: "a@b.com",
        password: "pw",
      }),
    ).toThrow(TeamValidationError);
  });

  it("rejects empty body", () => {
    expect(() => parseAddTeamMemberBody({})).toThrow(TeamValidationError);
  });
});
