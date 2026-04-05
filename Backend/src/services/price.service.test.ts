import { describe, expect, it } from "vitest";

import { parsePriceCreateBody, PriceValidationError } from "./price.service.js";

describe("parsePriceCreateBody", () => {
  it("parses one_time price", () => {
    const p = parsePriceCreateBody({
      currency: "usd",
      unit_amount: 1000,
      type: "one_time",
    });
    expect(p.currency).toBe("USD");
    expect(p.unit_amount).toBe(1000);
    expect(p.type).toBe("one_time");
  });

  it("parses recurring with month interval", () => {
    const p = parsePriceCreateBody({
      currency: "inr",
      unit_amount: 49900,
      type: "recurring",
      interval: "month",
      interval_count: 1,
    });
    expect(p.type).toBe("recurring");
    expect(p.interval).toBe("month");
  });

  it("rejects recurring without interval", () => {
    expect(() =>
      parsePriceCreateBody({
        currency: "USD",
        unit_amount: 0,
        type: "recurring",
      }),
    ).toThrow(PriceValidationError);
  });

  it("rejects non-integer unit_amount", () => {
    expect(() =>
      parsePriceCreateBody({
        currency: "USD",
        unit_amount: 9.99,
        type: "one_time",
      }),
    ).toThrow(PriceValidationError);
  });
});
