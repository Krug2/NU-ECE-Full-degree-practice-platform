import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { analyzeRotation } from "../rotation";
import { angleChoice, angleExact, angleMath, angleNumber, angleYesNo, locationField, locationLabels } from "./mth-angle-fields";

export const angleLocationFamilyIds = ["mth-angle-location"] as const;
export const angleLocationVariants = ["degree-representative", "radian-representative", "signed-turns", "coterminal-test", "coterminal-family", "quadrants", "quadrantal-rays", "reference-angle", "interval-convention"];
export function angleLocationQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  if (familyId !== "mth-angle-location") throw new Error("Unknown angle location family");
  const rng = randomFrom(seed);
  if (variant === "mixed") variant = angleLocationVariants[rng.integer(0, angleLocationVariants.length - 1)];
  const mode = angleLocationVariants.indexOf(variant);
  if (mode < 0) throw new Error("Unknown angle location variant");
  const k = rng.integer(-4, 4), quarter = rng.integer(0, 3), acute = [15, 30, 45, 60, 75][rng.integer(0, 4)], flag = rng.integer(0, 3), n = rng.integer(1, 4), q = rng.integer(2, 8);
  const principal = quarter * 90 + acute, degrees = 360 * k + principal;
  const ordinary = (flag % 2 ? -1 : 1) * (6 + n * 3);
  const source = mode === 1 ? String(ordinary) : mode === 2 ? "-(" + (2 * n) + "+1/" + q + ")*pi" : mode === 6 ? String(360 * k + quarter * 90) : mode === 8 ? (2 * k + (flag % 2)) + "*pi" : String(degrees);
  const unit = mode === 1 || mode === 2 || mode === 8 ? "radians" as const : "degrees" as const;
  const result = analyzeRotation(source, unit);
  const base = { id, familyId, familyVersion: 1, courseId: "mth-215", objectiveId: "m06-l01", critical: true, category: "conceptual", parameters: { mode, k, quarter, acute, flag, n, q, principal, degrees, ordinary } };
  const finish = (prompt: string, fields: unknown[], explanation: string[]) => questionSchema.parse({ ...base, prompt, fields: fields.map(field => {
    const item = field as { kind: string; options?: unknown[] };
    return item.kind === "choice" ? { ...item, options: rng.shuffle(item.options!) } : item;
  }), hints: ["A full turn is 360 degrees or 2pi radians. Coterminal angles differ by an integer number of full turns.", "Read the requested interval carefully. Axis rays are not in the four open quadrants.", "For a clockwise path, distinguish the integer in theta = representative + 2pi*k from the count of complete traveled revolutions."], explanation, answerSummary: explanation.join(" ") });
  if (mode === 3) {
    const difference = flag % 2 ? 360 * n : 360 * n + 180, second = degrees + difference, same = flag % 2 === 1;
    return finish("Compare rotations of " + degrees + " degrees and " + second + " degrees. Give (second - first)/360 and decide whether the terminal rays agree. Both begin in standard position.", [
      angleNumber("difference", "Difference measured in full turns", difference + "/360", "turns"),
      angleYesNo("coterminal", "Are the angles coterminal?", same, "Coterminal angles differ by an integer number of full turns; a half-integer difference places them on opposite rays."),
      angleYesNo("travel", "Do these two complete rotations have equal signed measures?", false, "Their nonzero difference changes the complete rotation, even when a terminal ray is shared."),
    ], ["The difference is " + difference + "/360 turns.", same ? "This is an integer, so the terminal rays agree." : "This is a half-integer rather than an integer, so the terminal rays differ.", "Their complete signed rotations differ because the difference is nonzero."]);
  }
  if (mode === 4) return finish("Describe every angle coterminal with " + degrees + " degrees. Also supply the angle one full turn above it and one full turn below it. Negative and zero integer indices must be allowed.", [
    angleChoice("family", "Complete coterminal family", "integer", [["integer", degrees + " + 360j degrees, for every integer j", "Integer multiples of a full turn produce exactly all coterminal angles."], ["positive", degrees + " + 360j degrees, for positive integers j only", "Positive indices omit the original angle and the angles reached with negative whole turns."], ["half", degrees + " + 180j degrees, for every integer j", "Odd half-turn shifts point along the opposite ray."], ["real", degrees + " + 360j degrees, for every real j", "Noninteger multiples of a turn generally change the terminal ray."]]),
    angleNumber("above", "One full turn above the given angle", String(degrees + 360), "degrees"),
    angleNumber("below", "One full turn below the given angle", String(degrees - 360), "degrees"),
  ], ["All such angles are " + degrees + " + 360j degrees for integer j.", "The requested neighbors are " + (degrees + 360) + " degrees and " + (degrees - 360) + " degrees."]);
  if (mode === 8) return finish("For " + angleMath(source) + " radians, give three coterminal representatives under the explicitly different conventions below. Include permitted endpoints exactly.", [
    angleExact("nonnegative", "Representative in [0, 2pi)", result.representative, "rad"),
    angleExact("positive", "Least strictly positive coterminal angle", result.leastPositive, "rad"),
    angleExact("symmetric", "Representative in (-pi, pi]", result.symmetric, "rad"),
    locationField(result.location),
  ], ["The representative in [0,2pi) is " + result.representative + " radians.", "The least strictly positive representative is " + result.leastPositive + "; zero does not qualify as positive.", "The representative in (-pi,pi] is " + result.symmetric + ". In particular, negative pi is replaced by positive pi."]);
  const intro = "A rotation is " + angleMath(source) + " " + unit + ". ";
  if (mode === 2) return finish(intro + "Write theta = representative + 2pi*k with representative in [0,2pi). Separately count the complete clockwise revolutions actually traveled, and give the remaining clockwise angular magnitude.", [
    angleExact("representative", "Representative in [0, 2pi)", result.representative, "rad"),
    angleNumber("quotient", "Integer k in the representative equation", result.quotient),
    angleNumber("completed", "Complete traveled clockwise revolutions", String(result.fullTraveledTurns), "turns"),
    angleExact("remainder", "Remaining clockwise angular magnitude", result.travelRemainder, "rad"), locationField(result.location),
  ], ["The representative is " + result.representative + " and k=" + result.quotient + ".", "The path completes " + result.fullTraveledTurns + " clockwise turns followed by " + result.travelRemainder + " radians clockwise.", "The negative floor quotient includes the shift needed to obtain a nonnegative representative; it is not a count of completed clockwise turns."]);
  if (mode === 5 || mode === 6 || mode === 7) return finish(intro + "Locate the terminal ray and decide whether a strictly acute reference angle exists. Here acute means strictly between 0 and pi/2; an axis ray has no acute reference angle.", [
    angleExact("representative", "Representative in [0, 2pi)", result.representative, "rad"), locationField(result.location),
    angleYesNo("acute", "Does a strictly acute reference angle exist?", result.referenceAngle !== null, result.referenceAngle === null ? "The ray lies on an axis, so its reference angle is not strictly between zero and a right angle." : "The ray is inside an open quadrant. Its smaller angle to the horizontal axis is strictly acute."),
    ...(result.referenceAngle === null ? [] : [angleExact("reference", "Strictly acute reference angle", result.referenceAngle, "rad")]),
  ], ["The nonnegative representative is " + result.representative + " radians, on " + locationLabels[result.location] + ".", result.referenceAngle === null ? "An axis ray has no strictly acute reference angle under this convention." : "The acute distance to the horizontal axis is " + result.referenceAngle + " radians."]);
  return finish(intro + "Find its representative in " + (mode === 0 ? "[0,360) degrees" : "[0,2pi) radians") + " and the integer k in theta = representative + k full turns. Retain exact pi expressions for ordinary radians.", [
    angleExact("representative", mode === 0 ? "Representative in [0, 360)" : "Representative in [0, 2pi)", mode === 0 ? result.representativeDegrees : result.representative, mode === 0 ? "degrees" : "rad"),
    angleNumber("quotient", "Integer k in the representative equation", result.quotient), locationField(result.location),
  ], ["The representative is " + (mode === 0 ? result.representativeDegrees + " degrees" : result.representative + " radians") + ".", "The integer k is " + result.quotient + ". Adding it times a full turn recovers the given rotation.", "The terminal ray lies on " + locationLabels[result.location] + "."]);
}
