import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("resolves tailwind conflicts with tailwind-merge", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("ignores falsy inputs", () => {
    expect(cn("base", false, null, undefined, "end")).toBe("base end");
  });
});
