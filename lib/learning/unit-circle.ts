import { z } from "zod";
import { addExact, equalExact, formatExact, multiplyExact, negateExact, parseExact, realExact } from "./exact-number";
import { compareRealExact, parseRealEndpoint } from "./exact-order";
import { equalPiNumbers, parsePiNumber } from "./pi-number";
import { analyzeRotation, type AngleUnit, type RotationLocation } from "./rotation";
import { standardDegrees, trigValue } from "./refreshers/trig";

export const circleLocations: Record<RotationLocation, string> = {
  "quadrant-i": "Quadrant I", "quadrant-ii": "Quadrant II", "quadrant-iii": "Quadrant III", "quadrant-iv": "Quadrant IV",
  "positive-x": "Positive x-axis", "positive-y": "Positive y-axis", "negative-x": "Negative x-axis", "negative-y": "Negative y-axis",
};
export type Coordinate = "x" | "y";
export type Quadrant = 1 | 2 | 3 | 4;
export const quadrantSigns = (quadrant: Quadrant) => ({ x: quadrant === 1 || quadrant === 4 ? 1 : -1, y: quadrant <= 2 ? 1 : -1 });
export function coordinateSign(value: string): "positive" | "negative" | "zero" {
  const sign = compareRealExact(parseRealEndpoint(value), parseExact("0"));
  return sign === 0 ? "zero" : sign < 0 ? "negative" : "positive";
}
export function unitCirclePoint(angle: string, unit: AngleUnit = "radians") {
  const rotation = analyzeRotation(angle, unit), degrees = parsePiNumber(rotation.representativeDegrees);
  const standard = standardDegrees.find(value => equalPiNumbers(degrees, parsePiNumber(String(value))));
  if (standard === undefined) throw new Error("Use an angle coterminal with a multiple of 30 or 45 degrees. Other angles have sine and cosine values, but this investigation does not calculate them exactly.");
  const x = trigValue("cos", standard)!, y = trigValue("sin", standard)!;
  return { ...rotation, standardDegrees: standard, x, y, xSign: coordinateSign(x), ySign: coordinateSign(y) };
}
export function isUnitPoint(x: string, y: string): boolean {
  const a = parseExact(x), b = parseExact(y);
  return realExact(a) && realExact(b) && equalExact(addExact(multiplyExact(a, a), multiplyExact(b, b)), parseExact("1"));
}
export function circleCoordinateCandidates(known: string): string[] {
  const value = parseRealEndpoint(known), one = parseExact("1");
  if (compareRealExact(value, negateExact(one)) < 0 || compareRealExact(value, one) > 0) throw new Error("A unit-circle coordinate must lie in [-1, 1].");
  const remaining = addExact(one, negateExact(multiplyExact(value, value)));
  if ([...remaining.keys()].some(key => key !== 1n)) throw new Error("Use a coordinate whose square is rational; nested radicals are outside this exact reconstruction tool.");
  const positive = parseExact("sqrt(" + formatExact(remaining) + ")");
  if (equalExact(positive, parseExact("0"))) return ["0"];
  return [formatExact(negateExact(positive)), formatExact(positive)];
}
export function recoverCircleCoordinate(coordinate: Coordinate, known: string, quadrant: Quadrant) {
  if (!["x", "y"].includes(coordinate) || ![1, 2, 3, 4].includes(quadrant)) throw new Error("Choose x or y and quadrant I, II, III or IV.");
  const candidates = circleCoordinateCandidates(known), signs = quadrantSigns(quadrant);
  const givenSign = coordinateSign(known);
  if (givenSign === "zero" || candidates.length === 1) throw new Error("An axis point belongs to no quadrant. Use a coordinate strictly between -1 and 1 and different from zero for an open quadrant.");
  if (givenSign !== (signs[coordinate] > 0 ? "positive" : "negative")) throw new Error("The given coordinate sign contradicts the stated quadrant.");
  const other: Coordinate = coordinate === "x" ? "y" : "x";
  const recovered = candidates[signs[other] > 0 ? 1 : 0];
  return { x: coordinate === "x" ? formatExact(parseExact(known)) : recovered, y: coordinate === "y" ? formatExact(parseExact(known)) : recovered, candidates, recovered };
}
export const unitCircleCaseSchema = z.object({
  title: z.string().min(1).max(100), angle: z.string().min(1).max(200), unit: z.enum(["degrees", "radians", "turns"]),
}).strict().superRefine((item, ctx) => {
  try { unitCirclePoint(item.angle, item.unit); } catch (error) { ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : "Check the angle." }); }
});
export type UnitCircleCase = z.infer<typeof unitCircleCaseSchema>;
