import type { AnswerField } from "../contracts";
import { randomFrom } from "../random";
import { unitCirclePoint } from "../unit-circle";
import { angleMath, circleChoice, finishCircle, locationField, pairFields } from "./circle-fields";

export const circleRotationFamilyIds = ["mth-circle-rotations"];
export const circleRotationVariants = ["negative", "positive-turns", "negative-turns", "reflection", "half-turn", "same-sine", "same-cosine", "coterminal"];
export function circleRotationQuestion(familyId: string, variant: string, seed: string, id: string) {
  if (!circleRotationFamilyIds.includes(familyId)) throw new Error("Unknown circle rotation family.");
  const rng = randomFrom(seed);
  if (variant === "mixed") variant = circleRotationVariants[rng.integer(0, 7)];
  if (variant === "checkpoint") variant = rng.integer(0, 1) ? "negative" : "negative-turns";
  if (!circleRotationVariants.includes(variant)) throw new Error("Unknown circle rotation variant.");
  const base = [30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330][rng.integer(0, 11)];
  const turns = rng.integer(1, 5), radians = rng.integer(0, 1);
  const degrees = variant === "positive-turns" ? base + 360 * turns : variant === "negative-turns" ? base - 360 * turns : variant === "half-turn" ? base + 180 : variant === "same-sine" ? 180 - base : variant === "same-cosine" || variant === "negative" || variant === "reflection" ? -base : base + 360 * turns;
  const point = unitCirclePoint(String(degrees), "degrees"), original = unitCirclePoint(String(base), "degrees");
  let prompt = "", fields: AnswerField[] = [...pairFields(point), locationField(point)], explanation: string[] = [];
  if (["negative", "positive-turns", "negative-turns"].includes(variant)) {
    prompt = "Find the exact terminal coordinates for the directed angle $\\theta=" + angleMath(degrees, radians) + "$ and identify its location. Treat the input sign as a rotation direction.";
    explanation = ["Add or subtract full turns to obtain " + point.standardDegrees + " degrees in [0, 360).",
      "A clockwise input can end in any quadrant. The terminal location sets the coordinate signs.",
      "The point is (" + point.x + ", " + point.y + "), with cosine listed before sine."];
  } else if (variant === "reflection" || variant === "half-turn") {
    const horizontal = variant === "reflection";
    prompt = "At $\\alpha=" + angleMath(base, radians) + "$, the point is (" + original.x + ", " + original.y + "). " + (horizontal ? "Reflect it across the horizontal axis to angle -alpha." : "Rotate it through a half-turn to angle alpha + 180 degrees.") + " Give the new exact coordinates and the coordinate rule.";
    fields = [...pairFields(point), circleChoice("rule", "Coordinate rule", horizontal ? "horizontal" : "opposite", [
      ["horizontal", "(x, -y)", "Reflection across the horizontal axis preserves x and reverses y."],
      ["vertical", "(-x, y)", "This is reflection across the vertical axis."],
      ["opposite", "(-x, -y)", "A half-turn takes the point through the origin to the opposite side."],
    ])];
    explanation = [horizontal ? "Negating the angle reflects its terminal point across the horizontal axis." : "Adding a half-turn reverses both coordinates.",
      "Apply the sign change to the signed coordinates, including any existing negative sign. The new point is (" + point.x + ", " + point.y + ")."];
  } else {
    const same = variant === "same-sine" ? "sine" : variant === "same-cosine" ? "cosine" : "both";
    prompt = "Compare $\\alpha=" + angleMath(base, radians) + "$ and $\\beta=" + angleMath(degrees, radians) + "$. Give beta's exact coordinates and identify what is shared.";
    fields = [...pairFields(point), circleChoice("shared", "What stays the same?", same, [
      ["sine", "Sine only", "A reflection across the vertical axis preserves y but reverses the nonzero x."],
      ["cosine", "Cosine only", "A reflection across the horizontal axis preserves x but reverses the nonzero y."],
      ["both", "Both coordinates", "A whole number of full turns preserves the entire terminal point."],
    ])];
    explanation = [same === "sine" ? "The angles are related by beta = 180 degrees - alpha, so their points reflect across the vertical axis."
      : same === "cosine" ? "The angles are opposites, so their points reflect across the horizontal axis." : "The angles differ by " + turns + " full turns.",
      "Beta ends at (" + point.x + ", " + point.y + "). Equal sine alone or equal cosine alone does not imply equal terminal points."];
  }
  return finishCircle(familyId, id, seed, { category: "conceptual", parameters: { degrees, base, turns, radians }, prompt, fields, explanation });
}
