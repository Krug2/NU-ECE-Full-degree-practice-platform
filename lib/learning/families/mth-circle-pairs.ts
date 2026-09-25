import type { AnswerField } from "../contracts";
import { randomFrom } from "../random";
import { unitCirclePoint } from "../unit-circle";
import { angleMath, circleChoice, circleExact, circleReference, finishCircle, pairFields } from "./circle-fields";

export const circlePairFamilyIds = ["mth-circle-pairs"];
export const circlePairVariants = ["first-quadrant", "second-quadrant", "third-quadrant", "fourth-quadrant", "reference", "coordinate-order", "derive-diagonal", "derive-thirty", "radius", "range"];
export function circlePairQuestion(familyId: string, variant: string, seed: string, id: string) {
  if (!circlePairFamilyIds.includes(familyId)) throw new Error("Unknown unit-circle pair family.");
  const rng = randomFrom(seed);
  if (variant === "mixed") variant = circlePairVariants[rng.integer(0, circlePairVariants.length - 1)];
  if (variant === "checkpoint") variant = circlePairVariants[rng.integer(1, 3)];
  if (!circlePairVariants.includes(variant)) throw new Error("Unknown unit-circle pair variant.");
  const fixed = circlePairVariants.indexOf(variant);
  const quadrant = fixed < 4 ? fixed + 1 : rng.integer(1, 4), reference = [30, 45, 60][rng.integer(0, 2)];
  const degrees = quadrant === 1 ? reference : quadrant === 2 ? 180 - reference : quadrant === 3 ? 180 + reference : 360 - reference;
  const radians = rng.integer(0, 1), radius = rng.integer(2, 9), point = unitCirclePoint(String(degrees), "degrees");
  let fields: AnswerField[] = [...pairFields(point), circleReference(point)], prompt = "", explanation: string[] = [];
  if (fixed < 4 || variant === "reference") {
    prompt = (variant === "reference" ? "Use a reference triangle" : "Locate the point in quadrant " + quadrant) + " for $\\theta=" + angleMath(degrees, radians) + "$. Give the exact ordered coordinates and the acute reference angle in radians.";
    explanation = ["The terminal point is in quadrant " + quadrant + ". The reference angle is " + reference + " degrees, measured to the horizontal axis.",
      "Use the 30-60-90 or 45-45-90 triangle for magnitudes, then attach the quadrant signs.",
      "Cosine is x = " + point.x + "; sine is y = " + point.y + ". Squaring both coordinates and adding gives 1."];
  } else if (variant === "coordinate-order") {
    prompt = "At $\\theta=" + angleMath(degrees, radians) + "$, a learner writes the point as (sin(theta), cos(theta)). Repair the definition and give the correct ordered pair.";
    fields = [...pairFields(point), circleChoice("order", "Correct coordinate definition", "cos-first", [
      ["sin-first", "(sin(theta), cos(theta))", "The horizontal projection is adjacent/hypotenuse, which is cosine."],
      ["cos-first", "(cos(theta), sin(theta))", "Cosine is the horizontal coordinate and sine is the vertical coordinate."],
      ["positive", "(|cos(theta)|, |sin(theta)|)", "Absolute values erase the signs needed outside quadrant I."],
    ])];
    explanation = ["The ordered pair always lists horizontal first and vertical second.", "Therefore x = " + point.x + " and y = " + point.y + ". Equal coordinates at a diagonal do not change the definition."];
  } else if (variant === "derive-diagonal") {
    prompt = "A square of side " + radius + " is cut diagonally. Scale its diagonal to radius 1 and use the first-quadrant point at 45 degrees. Find both coordinates and their squared sum.";
    fields = [...pairFields({ x: "sqrt(2)/2", y: "sqrt(2)/2" }), circleExact("sum", "x² + y²", "1")];
    explanation = ["The diagonal is " + radius + "√2, so each normalized leg is 1/√2.", "Equivalently, x = y > 0 and 2x² = 1. Both coordinates are √2/2 and their squared sum is 1."];
  } else if (variant === "derive-thirty") {
    prompt = "Bisect an equilateral triangle of side " + 2 * radius + " and scale the hypotenuse to 1. Give the unit-circle point at 30 degrees, then the vertical coordinate at 60 degrees.";
    fields = [...pairFields({ x: "sqrt(3)/2", y: "1/2" }), circleExact("sixty", "Sine of 60 degrees", "sqrt(3)/2")];
    explanation = ["The short leg is half the hypotenuse, so at 30 degrees y = 1/2.", "Then x² = 1 - 1/4 = 3/4; choose x > 0. Complementary angles exchange the two positive coordinates."];
  } else if (variant === "radius") {
    prompt = "A radius-" + radius + " circle has terminal angle $\\theta=" + angleMath(degrees, radians) + "$. Normalize its point to the unit circle and report cosine and sine.";
    explanation = ["The physical coordinates are r cos(theta) and r sin(theta). Divide each by the positive radius r = " + radius + ".", "The normalized point is (" + point.x + ", " + point.y + "); the ratios do not grow with the radius."];
    fields = [...pairFields(point), circleExact("normalized-radius", "Normalized radius", "1")];
  } else {
    prompt = "For a rotation of " + (degrees + radius * 360) + " degrees, decide whether sine and cosine exist and state the smallest and largest possible values of either function over all real angles.";
    fields = [circleChoice("domain", "Does this rotation have sine and cosine values?", "yes", [
      ["yes", "Yes, every real angle has a terminal point", "Whole turns do not prevent a point from existing."],
      ["no", "No, angles must stay within one turn", "The angle can include any number of signed turns."],
    ]), circleExact("minimum", "Minimum function value", "-1"), circleExact("maximum", "Maximum function value", "1")];
    explanation = ["An angle can make arbitrarily many turns while still defining a terminal point.", "Both coordinates lie in [-1, 1]. The endpoints occur on the axes, so the bounds are included."];
  }
  return finishCircle(familyId, id, seed, { category: variant === "radius" ? "application" : "procedural", parameters: { degrees, reference, quadrant, radians, radius }, prompt, fields, explanation });
}
