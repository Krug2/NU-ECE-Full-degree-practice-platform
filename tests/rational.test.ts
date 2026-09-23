import { describe, expect, it } from "vitest";
import { equalRational, formatRational, parseRational } from "../lib/learning/rational";

describe("exact arithmetic input", () => {
  it.each([
    ["2/4", "1/2"], ["0.1 + 0.2", "3/10"], [".5", "1/2"], ["3.", "3"],
    ["-2^2", "-4"], ["(-2)^2", "4"], ["2^-3", "1/8"], ["2^3^2", "512"],
    ["3 - (1/2 + 1/3)", "13/6"], ["−4 ÷ 6", "-2/3"], ["0/-4", "0"],
  ])("parses %s exactly as %s", (input, answer) => expect(formatRational(parseRational(input))).toBe(answer));
  it("never accepts a close decimal as an exact fraction", () => {
    expect(equalRational(parseRational("0.333333333333"), parseRational("1/3"))).toBe(false);
    expect(equalRational(parseRational("-4/-8"), parseRational("0.5"))).toBe(true);
  });
  it.each(["", "1/0", "0^-1", "0^0", "1/2/0", "2^13", "2^.5", "2^3^4", "(1+2", "1+2)", "2(3)", "1e100", "Infinity", "NaN", "alert(1)", "x=3", "[1,2]", "2**3", "2..3", "()", "1;2", "1\\2", "(".repeat(20)+"1"+")".repeat(20), "1".repeat(201)])("rejects unsupported or unbounded input %s", input => {
    expect(() => parseRational(input)).toThrow();
  });
  it("agrees with independent cross-multiplication over a varied fraction grid", () => {
    for (let a=-8; a<=8; a++) for (let b=1; b<=8; b++) {
      const answer=parseRational(`${a}/${b}+1/3`);
      expect(answer.numerator * BigInt(3*b)).toBe(BigInt(3*a+b)*answer.denominator);
    }
  });
});
