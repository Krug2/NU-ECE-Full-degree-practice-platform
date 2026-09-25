import { questionSchema, type AnswerField, type Question } from "../contracts";
import { randomFrom } from "../random";
import { acuteAngle, solveRightTriangle, type AcuteFunction, type TriangleSide } from "../right-triangle";
import { choose, exactLength, measured, rightBase } from "./right-fields";

export const rightSolveFamilyIds = ["mth-right-solve"];
export const rightSolveVariants = ["opposite-hyp", "adjacent-hyp", "hyp-opposite", "hyp-adjacent", "opposite-adjacent", "adjacent-opposite", "angle-sine", "angle-cosine", "angle-tangent", "complete", "mode", "rounding"];
const specifications: Record<string, [TriangleSide, TriangleSide, AcuteFunction, string]> = {
  "opposite-hyp": ["opposite", "hypotenuse", "sin", "multiply"],
  "adjacent-hyp": ["adjacent", "hypotenuse", "cos", "multiply"],
  "hyp-opposite": ["hypotenuse", "opposite", "sin", "divide"],
  "hyp-adjacent": ["hypotenuse", "adjacent", "cos", "divide"],
  "opposite-adjacent": ["opposite", "adjacent", "tan", "multiply"],
  "adjacent-opposite": ["adjacent", "opposite", "tan", "divide"],
};
export function rightSolveQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  if (!rightSolveFamilyIds.includes(familyId)) throw new Error("Unknown triangle-solving family.");
  const rng = randomFrom(seed);
  if (variant === "mixed") variant = rightSolveVariants[rng.integer(0, rightSolveVariants.length - 1)];
  if (!rightSolveVariants.includes(variant)) throw new Error("Unknown triangle-solving variant.");
  const degrees = rng.integer(17, 73), length = rng.integer(25, 450) / 10, atB = rng.integer(0, 1);
  const [o, a, h] = [[8, 15, 17], [5, 12, 13], [7, 24, 25], [20, 21, 29]][rng.integer(0, 3)];
  const oppositeSide = atB ? "AC" : "AB", adjacentSide = atB ? "AB" : "AC";
  let prompt = "", fields: AnswerField[] = [], explanation: string[] = [];
  if (specifications[variant]) {
    const [unknown, known, fn, operation] = specifications[variant], solution = solveRightTriangle(degrees, known, length);
    const names = { opposite: oppositeSide, adjacent: adjacentSide, hypotenuse: "BC" };
    prompt = "ABC is right at A. The angle at " + (atB ? "B" : "C") + " is " + degrees + " degrees and " + names[known] + " = " + length + " cm. Find " + names[unknown] + ". Choose a ratio involving only the known and requested side, then the algebraic operation.";
    fields = [
      choose("function", "Ratio to use directly", fn, [["sin", "sine", "Sine relates opposite and hypotenuse."], ["cos", "cosine", "Cosine relates adjacent and hypotenuse."], ["tan", "tangent", "Tangent relates opposite and adjacent."]]),
      choose("operation", "Apply the function value to the known length", operation, [["multiply", "Multiply the known length by the function value", "Use this when the desired length is the numerator and the known length is the denominator."], ["divide", "Divide the known length by the function value", "Use this when the unknown length is in the denominator of the ratio."]]),
      measured("length", "Requested side length", solution[unknown], "cm"),
    ];
    explanation = ["At the selected angle, opposite is " + oppositeSide + ", adjacent is " + adjacentSide + ", and hypotenuse is BC.",
      "Use " + fn + " to relate " + unknown + " and " + known + ". " + (operation === "multiply" ? "Multiply" : "Divide") + " the known length by the function value in degree mode.",
      names[unknown] + " ≈ " + solution[unknown].toFixed(4) + " cm. Round only the final result to 0.01 cm."];
  } else if (variant.startsWith("angle-")) {
    const fn: AcuteFunction = variant === "angle-sine" ? "sin" : variant === "angle-cosine" ? "cos" : "tan";
    const numerator = fn === "cos" ? a : o, denominator = fn === "tan" ? a : h;
    const result = acuteAngle(fn, numerator, denominator);
    prompt = "In a right triangle, the chosen acute angle has " + (fn === "cos" ? "adjacent leg " : "opposite leg ") + numerator + " cm and " + (fn === "tan" ? "adjacent leg " : "hypotenuse ") + denominator + " cm. Use these two sides directly to find both acute angles.";
    fields = [choose("inverse", "Inverse function for the given sides", fn, [["sin", "inverse sine", "Use inverse sine on opposite/hypotenuse."], ["cos", "inverse cosine", "Use inverse cosine on adjacent/hypotenuse."], ["tan", "inverse tangent", "Use inverse tangent on opposite/adjacent."], ["reciprocal", "reciprocal of the ratio", "A reciprocal is another ratio, not an angle."]]),
      measured("angle", "Chosen acute angle", result, "degrees"), measured("other", "Other acute angle", 90 - result, "degrees")];
    explanation = ["The ratio is " + numerator + "/" + denominator + ".", "Apply inverse " + fn + " in degree-output mode: the chosen angle is approximately " + result.toFixed(4) + " degrees.", "The other acute angle is 90 minus this result, approximately " + (90 - result).toFixed(4) + " degrees."];
  } else if (variant === "mode") {
    prompt = "A strictly acute triangle angle is " + degrees + " degrees. You enter the unchanged number " + degrees + " into sine. Which calculator mode matches the measurement, and what sine value should appear to three decimal places?";
    fields = [choose("mode", "Mode for the unchanged degree number", "degrees", [["degrees", "DEG", "The unchanged number is a degree measure."], ["radians", "RAD", "RAD requires first converting the degree measure by multiplying by pi/180."]]),
      { id: "value", label: "Sine value", kind: "numeric", expected: Math.sin(degrees * Math.PI / 180), absoluteTolerance: .0005, relativeTolerance: 0, unit: "", help: "Use at least three decimal places. Tolerance: 0.0005." }];
    explanation = ["The angle is " + degrees + " degrees, not " + degrees + " radians.", "Use DEG for the unchanged number, or convert to " + degrees + "*pi/180 before using RAD.", "The sine is approximately " + Math.sin(degrees * Math.PI / 180).toFixed(6) + ", a dimensionless ratio."];
  } else {
    const solution = solveRightTriangle(degrees, variant === "complete" ? "hypotenuse" : "opposite", length);
    prompt = variant === "complete"
      ? "Complete a right triangle with reference angle " + degrees + " degrees and hypotenuse " + length + " cm. Find both legs relative to that angle and the other acute angle."
      : "A right triangle has reference angle " + degrees + " degrees and opposite leg " + length + " cm. One calculation finds the hypotenuse first, then the adjacent leg. Find the adjacent leg and choose the precision rule for that two-step method.";
    fields = variant === "complete" ? [measured("opposite", "Opposite leg", solution.opposite, "cm"), measured("adjacent", "Adjacent leg", solution.adjacent, "cm"), exactLength("other", "Other acute angle", String(90 - degrees), "degrees")]
      : [measured("adjacent", "Adjacent leg", solution.adjacent, "cm"), choose("precision", "Intermediate precision", "retain", [["retain", "Keep the unrounded hypotenuse for the second calculation", "Round at the end; the direct tangent method provides a cross-check."], ["round", "Round the hypotenuse to the nearest whole centimeter first", "Early rounding introduces an avoidable error into the next side."], ["replace", "Replace sine and cosine by 0.5 for acute angles", "Trigonometric ratios vary with the angle."]])];
    explanation = ["The reference angle fixes which leg is opposite and which is adjacent.",
      variant === "complete" ? "Opposite = h sin(theta); adjacent = h cos(theta)." : "First h = opposite/sin(theta), then adjacent = h cos(theta). Directly, adjacent = opposite/tan(theta).",
      "Opposite ≈ " + solution.opposite.toFixed(4) + " cm; adjacent ≈ " + solution.adjacent.toFixed(4) + " cm; hypotenuse ≈ " + solution.hypotenuse.toFixed(4) + " cm.",
      "The complementary angle is " + (90 - degrees) + " degrees. Use unrounded sides in the Pythagorean check."];
  }
  return questionSchema.parse({ ...rightBase(familyId, id), category: "procedural", parameters: { degrees, length, atB, o, a, h }, prompt, fields: fields.map(field => field.kind === "choice" ? { ...field, options: rng.shuffle(field.options) } : field),
    hints: ["Choose the reference angle and label opposite, adjacent and hypotenuse.", explanation[0], explanation.slice(1).join(" ")],
    explanation, answerSummary: fields.map(field => field.label + ": " + (field.kind === "choice" ? field.options.find(option => option.id === field.correct)!.label : field.kind === "numeric" ? field.expected.toFixed(field.unit === "degrees" ? 1 : field.unit === "" ? 3 : 2) + " " + field.unit : "expected" in field ? field.expected : "")).join("; "),
  });
}
