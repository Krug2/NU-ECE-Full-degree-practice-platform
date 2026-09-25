import type { AnswerField } from "../contracts";
import { formatExact, multiplyExact, parseExact } from "../exact-number";
import { randomFrom } from "../random";
import { circleCoordinateCandidates, quadrantSigns, recoverCircleCoordinate, type Coordinate, type Quadrant } from "../unit-circle";
import { circleChoice, finishCircle, pairFields } from "./circle-fields";

export const circleRecoverFamilyIds = ["mth-circle-recover"];
export const circleRecoverVariants = ["from-sine", "from-cosine", "radical-given", "two-points", "impossible", "sign-conflict", "identity", "normalize"];
export function circleRecoverQuestion(familyId: string, variant: string, seed: string, id: string) {
  if (!circleRecoverFamilyIds.includes(familyId)) throw new Error("Unknown circle reconstruction family.");
  const rng = randomFrom(seed);
  if (variant === "mixed") variant = circleRecoverVariants[rng.integer(0, 7)];
  if (variant === "checkpoint") variant = circleRecoverVariants[rng.integer(0, 2)];
  if (!circleRecoverVariants.includes(variant)) throw new Error("Unknown circle reconstruction variant.");
  const quadrant = rng.integer(1, 4) as Quadrant, p = rng.integer(1, 8), q = p + rng.integer(1, 6);
  const coordinate: Coordinate = variant === "from-sine" ? "y" : variant === "from-cosine" ? "x" : rng.integer(0, 1) ? "x" : "y";
  const sign = quadrantSigns(quadrant)[coordinate], radical = variant === "radical-given";
  const known = sign + "*" + (radical ? "sqrt(" + (q * q - p * p) + ")" : p) + "/" + q;
  const value = formatExact(parseExact(known)), result = recoverCircleCoordinate(coordinate, known, quadrant);
  const other = coordinate === "x" ? "y" : "x", fn = coordinate === "x" ? "cosine" : "sine";
  let prompt = "", fields: AnswerField[] = [], explanation: string[] = [];
  if (variant === "impossible" || variant === "sign-conflict") {
    const impossible = variant === "impossible", bad = impossible ? sign * (q + p) + "/" + q : -sign * p + "/" + q;
    prompt = "Audit this claim: " + fn + " is " + bad + " and the terminal point is in quadrant " + quadrant + ". Is the given information possible?";
    fields = [circleChoice("verdict", "Verdict", impossible ? "range" : "sign", [
      ["possible", "Possible as stated", "Check both the coordinate range and the quadrant signs before taking a square root."],
      ["range", "Impossible: magnitude exceeds 1", "A unit-circle coordinate cannot extend beyond the circle's radius."],
      ["sign", "Impossible: sign contradicts the quadrant", "A coordinate in range can still have the wrong sign for the specified quadrant."],
    ])];
    explanation = [impossible ? "The magnitude is (q+p)/q = " + (q + p) + "/" + q + " > 1." : "In quadrant " + quadrant + ", " + coordinate + " must be " + (sign > 0 ? "positive" : "negative") + ".",
      "There is no real terminal point satisfying all the stated data. Do not hide a contradiction by changing the input sign or taking an absolute value."];
  } else if (variant === "two-points") {
    const places = coordinate === "x" ? sign > 0 ? "i-iv" : "ii-iii" : sign > 0 ? "i-ii" : "iii-iv";
    prompt = "On the unit circle, " + coordinate + " = " + value + ". No quadrant is given. Find every possible value of " + other + " and all possible quadrant locations.";
    fields = [{ id: "possible", kind: "roots", expected: circleCoordinateCandidates(known), numberSystem: "real", label: "Every possible " + other + " coordinate", unit: "", help: "Give both exact values separated by commas, using sqrt() where needed." },
      circleChoice("quadrants", "Possible quadrants", places, [
        ["i-iv", "I and IV", "Positive x restricts a point to the right half of the circle."],
        ["ii-iii", "II and III", "Negative x restricts a point to the left half of the circle."],
        ["i-ii", "I and II", "Positive y restricts a point to the upper half of the circle."],
        ["iii-iv", "III and IV", "Negative y restricts a point to the lower half of the circle."],
      ])];
    explanation = ["Squaring the missing coordinate gives 1 - (" + value + ")².", "The two roots are " + result.candidates.join(" and ") + ". Without another sign condition, both points are allowed."];
  } else if (variant === "normalize") {
    const physical = { x: formatExact(multiplyExact(parseExact(result.x), parseExact(String(q)))), y: formatExact(multiplyExact(parseExact(result.y), parseExact(String(q)))) };
    prompt = "A point (" + physical.x + ", " + physical.y + ") lies on a circle of radius " + q + ". Find the normalized point (cos(theta), sin(theta)).";
    fields = pairFields(result);
    explanation = ["Divide both coordinates by r = " + q + " > 0; do not read unnormalized coordinates as trigonometric values.", "The resulting point is (" + result.x + ", " + result.y + "). Its squared coordinates add to 1."];
  } else {
    prompt = "Given " + fn + " = " + value + " in quadrant " + quadrant + ", recover the exact point (cos(theta), sin(theta))." + (variant === "identity" ? " A learner adds the known square to 1. Identify the correct reconstruction equation." : " Choose the missing coordinate's sign from the quadrant.");
    fields = pairFields(result);
    if (variant === "identity") fields.push(circleChoice("equation", "Equation for the missing coordinate u", "subtract", [
      ["subtract", "u² = 1 - (known coordinate)²", "Isolate the unknown square in x² + y² = 1."],
      ["add", "u² = 1 + (known coordinate)²", "Adding produces a squared radius larger than 1."],
      ["linear", "u = 1 - (known coordinate)", "The identity relates squares, not a linear sum."],
    ]));
    explanation = ["The circle equation is x² + y² = 1, so the missing square is 1 - (" + value + ")².",
      "Before selecting a sign, the candidates are " + result.candidates.join(" and ") + ".",
      "Quadrant " + quadrant + " selects " + other + " = " + result.recovered + ". Thus the point is (" + result.x + ", " + result.y + ")."];
  }
  return finishCircle(familyId, id, seed, { category: variant === "normalize" ? "application" : "procedural", parameters: { quadrant, p, q, coordinate: coordinate === "x" ? 0 : 1, sign, radical: Number(radical) }, prompt, fields, explanation });
}
