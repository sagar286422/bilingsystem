import { describe, expect, it } from "vitest";

import {
  parseProductCreateBody,
  ProductValidationError,
} from "./product.service.js";

describe("parseProductCreateBody", () => {
  it("parses minimal create body", () => {
    expect(parseProductCreateBody({ name: "  Pro  " })).toEqual({
      name: "Pro",
    });
  });

  it("includes optional fields", () => {
    expect(
      parseProductCreateBody({
        name: "X",
        description: "desc",
        active: false,
        metadata: { sku: "a" },
      }),
    ).toMatchObject({
      name: "X",
      description: "desc",
      active: false,
    });
  });

  it("rejects empty name", () => {
    expect(() => parseProductCreateBody({ name: "  " })).toThrow(
      ProductValidationError,
    );
  });
});
