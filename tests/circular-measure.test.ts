import { expect, it } from "vitest";
import { circularMeasure, circularPath, convertLength, seconds, uniformCircularMotion, type LengthUnit, type TimeUnit } from "../lib/learning/circular-measure";
import { equalPiNumbers, parsePiNumber } from "../lib/learning/pi-number";
const exact = (actual: string | null, expected: string) => expect(actual !== null && equalPiNumbers(parsePiNumber(actual), parsePiNumber(expected)), actual + " = " + expected).toBe(true);
it("converts compatible units before calculating the arc-to-radius ratio", () => {
  exact(convertLength("250", "mm", "m"), "1/4");
  exact(convertLength("7pi", "cm", "m"), "7pi/100");
  exact(convertLength("1", "ft", "in"), "12");
  exact(convertLength("1", "in", "cm"), "2.54");
  expect(() => convertLength("1", "yard" as LengthUnit, "m")).toThrow("supported");
});
it("keeps signed displacement, travel, ordinary sectors and repeated coverage distinct", () => {
  const clockwise = circularMeasure("6", "-150", "degrees");
  exact(clockwise.signedArc, "-5pi"); exact(clockwise.distance, "5pi");
  exact(clockwise.sectorArea, "15pi"); exact(clockwise.uniqueArea, "15pi");
  const repeats = circularMeasure("4", "13/4", "turns");
  exact(repeats.distance, "26pi"); exact(repeats.accumulatedArea, "52pi");
  expect(repeats.sectorArea).toBeNull(); exact(repeats.uniqueArea, "16pi");
  const ordinary = circularMeasure("5", "7/5");
  exact(ordinary.distance, "7"); exact(ordinary.sectorArea, "35/2");
});
it("uses exact full-turn boundaries and handles zero travel", () => {
  exact(circularMeasure("3", "2pi").sectorArea, "9pi");
  expect(circularMeasure("3", "2pi+1/100000000000000000000").sectorArea).toBeNull();
  const rest = circularMeasure("3", "0");
  for (const key of ["distance", "signedArc", "sectorArea", "uniqueArea", "accumulatedArea"] as const) exact(rest[key], "0");
});
it("scales arc length linearly and area quadratically", () => {
  for (let radius = 1; radius <= 9; radius++) for (let angle = 0; angle <= 720; angle += 30) {
    const a = circularMeasure(String(radius), String(angle), "degrees");
    const b = circularMeasure(String(3 * radius), String(angle), "degrees");
    exact(b.distance, "3*(" + a.distance + ")");
    exact(b.accumulatedArea, "9*(" + a.accumulatedArea + ")");
    exact(a.distance, radius * angle + "*pi/180");
    exact(a.accumulatedArea, radius * radius * angle + "*pi/360");
  }
});
it("converts clockwise rpm to signed rates and nonnegative speeds", () => {
  const result = uniformCircularMotion("1/4", { rotation: "-90", unit: "turns", duration: "1", timeUnit: "min" });
  exact(result.elapsedSeconds, "60"); exact(result.averageAngularRate, "-3pi");
  exact(result.averageAngularSpeed, "3pi"); exact(result.averageTangentialSpeed, "3pi/4");
  exact(result.revolutionSeconds, "2/3");
});
it("adds absolute travel over reversals rather than taking the net magnitude", () => {
  const result = circularPath("2", [
    { rotation: "3pi", unit: "radians", duration: "2", timeUnit: "s" },
    { rotation: "-3pi", unit: "radians", duration: "4", timeUnit: "s" },
  ]);
  exact(result.netRotation, "0"); exact(result.signedArc, "0"); exact(result.distance, "12pi");
  exact(result.averageAngularRate, "0"); exact(result.averageAngularSpeed, "pi"); exact(result.averageTangentialSpeed, "2pi");
  expect(result).not.toHaveProperty("revolutionSeconds"); expect(result).not.toHaveProperty("uniqueArea");
});
it("handles rest without inventing a finite time to complete a revolution", () => {
  const result = uniformCircularMotion("2", { rotation: "0", unit: "degrees", duration: "1/2", timeUnit: "h" });
  exact(result.elapsedSeconds, "1800"); exact(result.averageAngularSpeed, "0");
  expect(result.revolutionSeconds).toBeNull();
});
it("checks positive radius and elapsed-time premises before division", () => {
  for (const radius of ["0", "-1"]) expect(() => circularMeasure(radius, "pi")).toThrow("Radius must be positive");
  for (const time of ["0", "-1"]) expect(() => seconds(time, "s")).toThrow("Elapsed time must be positive");
  expect(() => seconds("1", "day" as TimeUnit)).toThrow("Choose");
  expect(() => circularPath("1", [])).toThrow("one to twelve");
});
