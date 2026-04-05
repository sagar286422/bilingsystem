import { describe, expect, it } from "vitest";

import { formatMoneyMinor } from "@/lib/money";

describe("formatMoneyMinor", () => {
  it("formats cents as decimal with currency", () => {
    expect(formatMoneyMinor(999, "usd")).toBe("9.99 USD");
  });

  it("handles zero", () => {
    expect(formatMoneyMinor(0, "inr")).toBe("0.00 INR");
  });

  it("uses catalog minor units for zero-decimal currencies", () => {
    expect(formatMoneyMinor(1200, "jpy", 0)).toBe("1200 JPY");
  });

  it("uses three decimal places when minor_units is 3", () => {
    expect(formatMoneyMinor(500, "bhd", 3)).toBe("0.500 BHD");
  });
});
