import { expect, it } from "vitest";
import { approximateExact, equalExact, equalRootSets, formatExact, parseExact, parseRootSet, realExact } from "../lib/learning/exact-number";
import katex from "katex";

it.each([
  ["sqrt(12)/2", "sqrt(3)"], ["sqrt(8)+sqrt(18)", "5sqrt(2)"],
  ["sqrt(2)*sqrt(3)", "sqrt(6)"], ["sqrt(6)*sqrt(10)", "2sqrt(15)"],
  ["(1+sqrt(5))/2", "0.5+sqrt(20)/4"], ["1/sqrt(2)", "sqrt(2)/2"],
  ["1/(sqrt(2)+sqrt(3))", "sqrt(3)-sqrt(2)"], ["sqrt(1/2)", "sqrt(2)/2"],
  ["(3+4i)/(1-2i)", "-1+2i"], ["i^9", "i"], ["i^(-2)", "-1"],
  ["sqrt(-12)", "2i*sqrt(3)"], ["sqrt(-2)*sqrt(-3)", "-sqrt(6)"],
  ["(2+sqrt(3))*(2-sqrt(3))", "1"], ["sqrt(4)-2", "0"],
  ["-2^2", "-4"], ["(-2)^2", "4"], ["2^3^2", "512"],
])("recognizes equivalent exact values %s and %s", (input, equivalent) => {
  expect(equalExact(parseExact(input), parseExact(equivalent))).toBe(true);
});

it("keeps roots distinct from rounded values and respects the requested number system", () => {
  expect(equalExact(parseExact("sqrt(2)"), parseExact("1.414214"))).toBe(false);
  expect(realExact(parseExact("2+i"))).toBe(false);
  expect(realExact(parseExact("(1+i)*(1-i)"))).toBe(true);
  expect(approximateExact(parseExact("2+3i*sqrt(2)"))).toEqual({ real: 2, imaginary: 3*Math.SQRT2 });
});

it("compares complete root sets independently of order and repetitions", () => {
  expect(equalRootSets(parseRootSet("{1+sqrt(2),1-sqrt(2)}"),parseRootSet("1-sqrt(2);1+sqrt(8)/2"))).toBe(true);
  expect(equalRootSets(parseRootSet("2,2"),parseRootSet("2"))).toBe(true);
  expect(equalRootSets(parseRootSet("2"),parseRootSet("2,-2"))).toBe(false);
  expect(parseRootSet("empty")).toEqual([]);
});
it.each(["0","-1/3","sqrt(8)/2","-sqrt(2)+1/2","(1+i)/(2-i)","sqrt(2)+i*sqrt(3)","-i","1+i"])("formats %s without changing its exact value",expression=>{
  const value=parseExact(expression);
  expect(equalExact(parseExact(formatExact(value)),value)).toBe(true);
  expect(()=>katex.renderToString(formatExact(value,true),{strict:"error",trust:false})).not.toThrow();
});

it.each(["1/0", "1/(sqrt(2)-sqrt(2))", "sqrt(1+i)", "sqrt(1000001)", "sqrt(3", "sqrt3", "2 3", "alert(1)", "Infinity", "NaN", "x", "0^0", "2^100", "(".repeat(13)+"1"+")".repeat(13), "1+".repeat(90)+"1"])("rejects unsafe or unsupported input %s", input => {
  expect(() => parseExact(input)).toThrow();
});
