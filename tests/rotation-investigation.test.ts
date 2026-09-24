import { expect, it } from "vitest";
import { analyzeRotationInvestigation } from "../lib/learning/rotation-investigation";
import { equalPiNumbers, parsePiNumber } from "../lib/learning/pi-number";
const base = { title: "Sweep", radius: "3", scale: "2", first: "120", second: "0", unit: "degrees" as const };
const exact = (a: string, b: string) => expect(equalPiNumbers(parsePiNumber(a), parsePiNumber(b))).toBe(true);
it("connects scaled geometry to exact motion without awarding evidence", () => {
  const result = analyzeRotationInvestigation(base);
  exact(result.net, "2pi/3"); exact(result.distance, "2pi"); exact(result.scaledDistance, "4pi");
  exact(result.accumulatedArea, "3pi"); exact(result.scaledAccumulatedArea, "12pi");
  expect(result).toMatchObject({ relation: "equal", scaledRadius: "6", scaleSquared: "4", final: { location: "quadrant-ii" } });
  expect(result).not.toHaveProperty("evidence");
});
it("preserves nonzero travel and repeated area when a reversal ends at the initial ray", () => {
  const result = analyzeRotationInvestigation({ ...base, first: "450", second: "-450" });
  exact(result.net, "0"); exact(result.travel, "5pi"); exact(result.distance, "15pi");
  exact(result.accumulatedArea, "45pi/2");
  expect(result).toMatchObject({ relation: "greater", final: { location: "positive-x", fullTraveledTurns: 0 }, first: { fullTraveledTurns: 1 }, second: { fullTraveledTurns: 1 } });
});
it("handles ordinary radians, negative motion and exact axes", () => {
  for (const [first, location] of [["1", "quadrant-i"], ["-pi/2", "negative-y"], ["-4pi", "positive-x"], ["13pi/2", "positive-y"]]) {
    const result = analyzeRotationInvestigation({ ...base, first, unit: "radians" });
    expect(result.final.location).toBe(location); expect(Number.isFinite(result.plot.terminal)).toBe(true);
  }
});
it("reports activity control limits instead of inventing a result", () => {
  for (const change of [{ radius: "0" }, { radius: "21" }, { scale: "0" }, { scale: "5" }, { first: "1/0" }, { first: "1000001", unit: "radians" as const }]) expect(() => analyzeRotationInvestigation({ ...base, ...change })).toThrow();
});
