import type { AnswerField } from "../contracts";
import { randomFrom } from "../random";
import { unitCirclePoint } from "../unit-circle";
import { angleMath, circleChoice, finishCircle, locationField, pairFields } from "./circle-fields";

export const circleAxisFamilyIds = ["mth-circle-axes"];
export const circleAxisVariants = ["positive-x", "positive-y", "negative-x", "negative-y", "zero-sine", "zero-cosine"];
export function circleAxisQuestion(familyId: string, variant: string, seed: string, id: string) {
  if (!circleAxisFamilyIds.includes(familyId)) throw new Error("Unknown circle axis family.");
  const rng = randomFrom(seed);
  if (variant === "mixed") variant = circleAxisVariants[rng.integer(0, 5)];
  if (variant === "checkpoint") variant = circleAxisVariants[rng.integer(0, 3)];
  if (!circleAxisVariants.includes(variant)) throw new Error("Unknown circle axis variant.");
  const axis = Math.max(0, circleAxisVariants.indexOf(variant)), turns = rng.integer(-5, 5), radians = rng.integer(0, 1);
  const degrees = axis * 90 + turns * 360;
  let prompt = "", fields: AnswerField[] = [], explanation: string[] = [];
  if (variant.startsWith("zero-")) {
    const sine = variant === "zero-sine";
    prompt = "List every degree angle in [0, 360) where " + (sine ? "sine" : "cosine") + " is zero. A learner also includes 360 degrees. Decide whether that endpoint belongs to the stated interval.";
    fields = [{ id: "angles", kind: "roots", label: "Every angle in the interval", expected: sine ? ["0", "180"] : ["90", "270"], numberSystem: "real", unit: "degrees", help: "Separate the exact degree measures with commas. Include every allowed solution once." },
      circleChoice("endpoint", "Should 360 degrees be included?", "exclude", [
        ["exclude", "No, the upper endpoint is excluded", "The closing parenthesis excludes 360 even when it shares a terminal point with zero."],
        ["include", "Yes, a whole turn is always included", "The interval determines which angle labels are permitted."],
      ])];
    explanation = [sine ? "Sine is y, which is zero at the two horizontal-axis points: 0 and 180 degrees." : "Cosine is x, which is zero at the two vertical-axis points: 90 and 270 degrees.",
      "The interval includes zero and excludes 360. Different angle labels can share a point, but only labels inside the requested interval are answers."];
  } else {
    const point = unitCirclePoint(String(degrees), "degrees");
    prompt = "Evaluate the unit-circle point at $\\theta=" + angleMath(degrees, radians) + "$ exactly. Name the terminal axis and decide whether this point has an acute reference angle.";
    fields = [...pairFields(point), locationField(point), circleChoice("reference", "Acute reference angle", "none", [
      ["none", "None: the terminal side is on an axis", "Reference angles here are strictly acute. Read an axis point directly."],
      ["zero", "Zero is an acute angle", "An acute angle is strictly greater than zero and less than 90 degrees."],
      ["ninety", "90 degrees is an acute angle", "90 degrees is a right angle, not an acute angle."],
    ])];
    explanation = ["Removing full turns gives " + axis * 90 + " degrees and the axis point (" + point.x + ", " + point.y + ").",
      "The radius is 1; one coordinate is zero and the other is 1 or -1. These values are exact, with no tiny rounding residue.",
      "An axis is a boundary between quadrants, not part of either open quadrant. No acute reference triangle is needed."];
  }
  return finishCircle(familyId, id, seed, { category: "conceptual", parameters: { degrees, turns, radians, axis }, prompt, fields, explanation });
}
