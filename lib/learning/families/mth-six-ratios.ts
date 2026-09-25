import type { AnswerField } from "../contracts";
import { formatExact, parseExact } from "../exact-number";
import { randomFrom } from "../random";
import { sixFromPoint, sixFromRatio } from "../six-trig";
import { unitCirclePoint, type Quadrant } from "../unit-circle";
import type { TrigName } from "../refreshers/trig";
import { angleMath, circleChoice } from "./circle-fields";
import { finishSix, functionNames, sixFields, sixSummary } from "./six-fields";

export const sixRatioFamilyIds = ["mth-six-ratios"];
export const sixRatioVariants = ["coordinates", "normalize", "sine-given", "cosine-given", "tangent-given", "cotangent-given", "secant-given", "cosecant-given", "special-angle", "signed-turns", "inconsistent"];
const givens: Record<string, TrigName> = { "sine-given": "sin", "cosine-given": "cos", "tangent-given": "tan", "cotangent-given": "cot", "secant-given": "sec", "cosecant-given": "csc" };
export function sixRatioQuestion(familyId: string, variant: string, seed: string, id: string) {
  if (!sixRatioFamilyIds.includes(familyId)) throw new Error("Unknown six-ratio family.");
  const rng = randomFrom(seed);
  if (variant === "mixed") variant = sixRatioVariants[rng.integer(0, 10)];
  if (variant === "checkpoint") variant = sixRatioVariants[rng.integer(2, 7)];
  if (!sixRatioVariants.includes(variant)) throw new Error("Unknown six-ratio variant.");
  const quadrant = rng.integer(1, 4) as Quadrant, a = rng.integer(2, 9), b = a + rng.integer(1, 5), turns = rng.integer(1, 4);
  const sx = [1, 4].includes(quadrant) ? 1 : -1, sy = quadrant < 3 ? 1 : -1, angle = [30, 45, 60][rng.integer(0, 2)], radians = rng.integer(0, 1), issue = rng.integer(0, 2);
  const base = quadrant === 1 ? angle : quadrant === 2 ? 180 - angle : quadrant === 3 ? 180 + angle : 360 - angle;
  const degrees = variant === "signed-turns" ? base - 360 * turns : base;
  let point = sixFromPoint(String(sx * a), String(sy * b)), prompt = "", fields: AnswerField[] = [], explanation: string[] = [];
  if (variant === "special-angle" || variant === "signed-turns") {
    const unit = unitCirclePoint(String(degrees), "degrees"); point = sixFromPoint(unit.x, unit.y);
    prompt = "Calculate all six exact trigonometric values at $\\theta=" + angleMath(degrees, radians) + "$. Keep radicals exact and inspect each denominator.";
    explanation = ["The terminal point on the unit circle is (" + point.unitX + ", " + point.unitY + "), in quadrant " + quadrant + ".",
      "Use sin=y, cos=x, tan=y/x, sec=1/x, csc=1/y and cot=x/y. Both coordinates are nonzero.", sixSummary(point.values)];
  } else if (givens[variant]) {
    const fn = givens[variant], given = point.values[fn]!;
    point = sixFromRatio(fn, given, quadrant);
    prompt = "Given " + functionNames[fn] + " = $" + formatExact(parseExact(given), true) + "$ and a terminal ray in quadrant " + quadrant + ", reconstruct all six exact trigonometric values.";
    explanation = [fn === "sin" || fn === "cos" ? "Use x²+y²=1 to recover the other coordinate and select its sign from the quadrant." : fn === "sec" || fn === "csc" ? "Take the reciprocal to recover cosine or sine, then use the circle identity and quadrant signs." : "Use the signed ratio of the two coordinates with a positive radius; the quadrant selects their individual signs.",
      "The normalized point is (" + point.unitX + ", " + point.unitY + ").", sixSummary(point.values)];
  } else if (variant === "inconsistent") {
    prompt = issue === 0 ? "A learner claims sec(theta) = " + a + "/" + b + " for a real angle. Audit the claim."
      : issue === 1 ? "A learner claims sin(theta) = -" + a + "/" + b + " in quadrant II. Audit the claim."
        : "Only sin(theta) = " + a + "/" + b + " is given. Can this information uniquely determine all six values?";
    fields = [circleChoice("verdict", "Conclusion", ["range", "sign", "ambiguous"][issue], [
      ["range", "Impossible because of the function range", "A defined secant has magnitude at least 1."],
      ["sign", "Impossible because of the quadrant sign", "Sine is positive in quadrant II."],
      ["ambiguous", "Two terminal points remain possible", "A positive sine strictly below 1 allows quadrants I and II, whose cosines have opposite signs."],
      ["unique", "All six values are uniquely determined", "Check the range, sign and whether enough quadrant information was supplied."],
    ])];
    explanation = [issue === 0 ? "The fraction lies strictly between 0 and 1, outside the secant range." : issue === 1 ? "Quadrant II has positive y, so its sine cannot be negative." : "The given vertical coordinate intersects the unit circle at two points with opposite horizontal coordinates.",
      "A valid reconstruction requires consistent givens and enough sign information. Do not select a square-root sign without justification."];
  } else {
    prompt = variant === "normalize" ? "A terminal ray passes through (" + sx * a + ", " + sy * b + "). Normalize the point and compute all six values. The coordinates use common length units."
      : "On the unit circle, (cos(theta), sin(theta)) = (" + point.unitX + ", " + point.unitY + "). Compute all six exact values.";
    explanation = [variant === "coordinates" ? "The given coordinates already have radius 1. Read cosine from x and sine from y." : "The physical ray point has radius sqrt(" + (a * a + b * b) + "). Divide its coordinates by that positive radius.",
      "Tangent and cotangent divide the signed coordinates in opposite orders; secant and cosecant divide the radius by a coordinate.", sixSummary(point.values)];
  }
  if (!fields.length) fields = sixFields(point.values);
  return finishSix(familyId, id, seed, { category: variant === "normalize" ? "application" : "procedural", parameters: { quadrant, a, b, sx, sy, degrees, radians, issue }, prompt, fields, explanation });
}
