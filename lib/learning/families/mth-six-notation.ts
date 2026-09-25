import type { AnswerField } from "../contracts";
import { divideExact, formatExact, parseExact } from "../exact-number";
import { formatPiNumber, parsePiNumber } from "../pi-number";
import { randomFrom } from "../random";
import { sixFromPoint } from "../six-trig";
import { unitCirclePoint } from "../unit-circle";
import { circleChoice, circleExact } from "./circle-fields";
import { finishSix, sixValueField } from "./six-fields";

export const sixNotationFamilyIds = ["mth-six-notation"];
export const sixNotationVariants = ["sine-inverse", "cosine-inverse", "tangent-inverse", "negative-power", "quotient-identity", "pythagorean-cosine", "pythagorean-sine", "cancel-restrictions"];
const condition = (correct: string): AnswerField => circleChoice("condition", "Required denominator condition", correct, [
  ["x", "cos(theta) is nonzero", "Division by cosine, or its square, requires a nonzero horizontal coordinate."],
  ["y", "sin(theta) is nonzero", "Division by sine, or its square, requires a nonzero vertical coordinate."],
  ["both", "Both sine and cosine are nonzero", "The original expression may impose both conditions even after cancellation."],
  ["none", "No denominator restrictions", "An algebraic identity does not authorize division by zero."],
]);
export function sixNotationQuestion(familyId: string, variant: string, seed: string, id: string) {
  if (!sixNotationFamilyIds.includes(familyId)) throw new Error("Unknown trigonometric notation family.");
  const rng = randomFrom(seed);
  if (variant === "mixed") variant = sixNotationVariants[rng.integer(0, 7)];
  if (variant === "checkpoint") variant = sixNotationVariants[rng.integer(0, 2)];
  if (!sixNotationVariants.includes(variant)) throw new Error("Unknown trigonometric notation variant.");
  const index = sixNotationVariants.indexOf(variant), functionIndex = index < 3 ? index : rng.integer(0, 2), fn = (["sin", "cos", "tan"] as const)[functionIndex];
  const base = [30, 45, 60][rng.integer(0, 2)], sign = rng.integer(0, 1) ? 1 : -1, degrees = fn === "cos" ? sign > 0 ? base : 180 - base : sign * base;
  const a = rng.integer(2, 9), b = rng.integer(2, 9), cot = rng.integer(0, 1);
  const point = unitCirclePoint(String(degrees), "degrees"), value = sixFromPoint(point.x, point.y).values[fn]!;
  const reciprocal = formatExact(divideExact(parseExact("1"), parseExact(value)));
  let prompt = "", fields: AnswerField[] = [], explanation: string[] = [];
  if (index < 3) {
    const range = fn === "sin" ? "[-pi/2, pi/2]" : fn === "cos" ? "[0, pi]" : "(-pi/2, pi/2)";
    prompt = "Let u = $" + formatExact(parseExact(value), true) + "$. Calculate 1/u and the principal inverse arc" + fn + "(u). Give the angle in radians in " + range + ", then distinguish the two output types.";
    fields = [sixValueField("reciprocal", "Reciprocal 1/u", reciprocal),
      { id: "inverse", kind: "pi-expression", label: "Principal inverse angle", expected: formatPiNumber(parsePiNumber(degrees + "*pi/180")), unit: "rad", help: "Use an exact expression in pi within the stated principal range." },
      circleChoice("meaning", "What does the principal inverse return?", "angle", [
        ["angle", "An angle whose function value is u", "The inverse reverses the input-output relationship on the stated principal range."],
        ["ratio", "The reciprocal ratio 1/u", "Taking a reciprocal changes a ratio; an inverse function returns an input angle."],
        ["negative", "The negative of the function value", "A superscript -1 used for an inverse function does not mean negation."],
      ])];
    explanation = ["The reciprocal is " + reciprocal + ", a dimensionless number.",
      "The principal angle is " + degrees + " degrees, or " + formatPiNumber(parsePiNumber(degrees + "*pi/180")) + " radians. It lies in " + range + ".",
      "The conventional notation " + fn + "⁻¹(u) names arc" + fn + "(u), whereas [u]⁻¹ means 1/u."];
  } else if (variant === "negative-power") {
    prompt = "At theta = " + degrees + " degrees, " + fn + "(theta) = " + value + ". Evaluate [" + fn + "(theta)]^(-1) and identify what the negative power means.";
    fields = [sixValueField("reciprocal", "Value of the negative power", reciprocal), circleChoice("notation", "Meaning of the brackets and exponent", "reciprocal", [
      ["reciprocal", "1 divided by the complete function value", "The exponent applies to the output inside the brackets."],
      ["inverse", "A principal inverse angle", "Write arc" + fn + " for the inverse function; the brackets here enclose a value being raised to a power."],
      ["input", "Replace theta with 1/theta", "The written power acts on the output, not on the input angle."],
    ])];
    explanation = ["For any nonzero number v, v^(-1)=1/v.", "Here v=" + value + ", so its reciprocal is " + reciprocal + ". This operation does not ask for an inverse angle."];
  } else if (variant === "quotient-identity") {
    prompt = "Rewrite " + (cot ? "cotangent" : "tangent") + " as a quotient of sine and cosine, retaining the denominator condition.";
    fields = [circleChoice("formula", "Coordinate quotient", cot ? "x-over-y" : "y-over-x", [
      ["y-over-x", "sin(theta) / cos(theta)", "This is tangent, with a nonzero cosine denominator."],
      ["x-over-y", "cos(theta) / sin(theta)", "This is cotangent, with a nonzero sine denominator."],
      ["one-over-x", "1 / cos(theta)", "This is secant, not a quotient of the two coordinates."],
    ]), condition(cot ? "y" : "x")];
    explanation = ["On a unit circle x=cos(theta) and y=sin(theta).", cot ? "Cotangent is x/y and requires y nonzero." : "Tangent is y/x and requires x nonzero."];
  } else if (variant.startsWith("pythagorean-")) {
    const cosine = variant === "pythagorean-cosine";
    prompt = "Given " + (cosine ? "tan(theta)" : "cot(theta)") + " = " + sign * a + "/" + b + ", calculate " + (cosine ? "sec²(theta)" : "csc²(theta)") + " exactly. Choose the identity and the condition needed to derive it from sin²+cos²=1.";
    fields = [circleExact("square", cosine ? "Exact secant squared" : "Exact cosecant squared", (a * a + b * b) + "/" + b * b),
      circleChoice("identity", "Derived identity", cosine ? "sec" : "csc", [
        ["sec", "1 + tan²(theta) = sec²(theta)", "Divide the circle identity by cosine squared where cosine is nonzero."],
        ["csc", "1 + cot²(theta) = csc²(theta)", "Divide the circle identity by sine squared where sine is nonzero."],
        ["minus", "1 - tan²(theta) = sec²(theta)", "Dividing the sum of two squares preserves the plus sign."],
      ]), condition(cosine ? "x" : "y")];
    explanation = ["Divide every term of the circle identity by the appropriate nonzero squared coordinate.",
      "The required square is 1 + (" + sign * a + "/" + b + ")² = " + (a * a + b * b) + "/" + b * b + ". Squaring removes the given sign.",
      "A squared reciprocal does not by itself select the sign of the unsquared function."];
  } else {
    prompt = "Simplify sec(theta)/tan(theta), keeping its original domain. Then compare the original expression with the simplified cosecant at theta = " + sign * 90 + " degrees.";
    fields = [circleChoice("simplified", "Simplified expression on the original domain", "csc", [
      ["csc", "csc(theta)", "(1/cos)/(sin/cos) reduces to 1/sin when both original denominators and the outer divisor are valid."],
      ["sec", "sec(theta)", "The tangent divisor changes the expression."],
      ["sin", "sin(theta)", "Dividing by tangent leaves the reciprocal of sine, not sine."],
    ]), condition("both"), sixValueField("original", "Original expression at the stated angle", null), sixValueField("simplified-value", "Cosecant at the stated angle", String(sign))];
    explanation = ["The original secant and tangent require cosine nonzero, and dividing by tangent also requires sine nonzero.",
      "The reduced expression 1/sin(theta) agrees on that original domain, but by itself allows additional angles.",
      "At the stated vertical-axis angle, the original expression is undefined while cosecant equals " + sign + ". Cancellation does not restore an excluded input."];
  }
  return finishSix(familyId, id, seed, { category: "conceptual", parameters: { functionIndex, degrees, a, b, sign, cot }, prompt, fields, explanation });
}
