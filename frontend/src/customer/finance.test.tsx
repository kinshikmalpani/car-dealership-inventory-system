import { describe, it, expect } from "vitest";
import { money } from "../api";
import { calculateEmi } from "./finance";
describe("Indian pricing and EMI planning", () => {
  it("formats lakh and crore groups with rupees", () => {
    expect(money(12345678)).toBe("₹1,23,45,678.00");
  });
  it("handles zero interest without division by zero", () => {
    expect(calculateEmi(120000, 0, 12)).toBe(10000);
  });
  it("uses reducing-balance amortization", () => {
    expect(calculateEmi(500000, 9, 60)).toBeCloseTo(10379.18, 2);
  });
  it("rejects invalid inputs", () => {
    expect(calculateEmi(100, 9, 0)).toBe(0);
  });
});
