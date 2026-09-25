import { questionSchema, type AnswerField, type Question } from "../contracts";
import { randomFrom } from "../random";
import { specialRatios } from "../right-triangle";
import { choose, exactLength, rightBase } from "./right-fields";

export const rightSpecialFamilyIds = ["mth-right-special"];
export const rightSpecialVariants = ["derive-45", "derive-30", "exact-sin", "exact-cos", "exact-tan", "missing-45", "missing-30"];
export function rightSpecialQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  if (!rightSpecialFamilyIds.includes(familyId)) throw new Error("Unknown special-triangle family.");
  const rng = randomFrom(seed);
  if (variant === "mixed") variant = rightSpecialVariants[rng.integer(0, rightSpecialVariants.length - 1)];
  if (!rightSpecialVariants.includes(variant)) throw new Error("Unknown special-triangle variant.");
  const size = rng.integer(2, 12), angle = [30, 45, 60][rng.integer(0, 2)] as 30 | 45 | 60;
  const radians = rng.integer(0, 1), knownHypotenuse = rng.integer(0, 1);
  let prompt = "", fields: AnswerField[] = [], explanation: string[] = [];
  if (variant === "derive-45") {
    prompt = "A square of side " + size + " cm is cut along a diagonal. Find the diagonal exactly and the two acute angles in either resulting triangle.";
    fields = [exactLength("length", "Diagonal length", size + "*sqrt(2)", "cm"), exactLength("angle", "Each acute angle", "45", "degrees"),
      choose("reason", "Why are the acute angles equal?", "equal", [["equal", "Equal legs give equal opposite angles", "The two square sides form equal legs; their opposite angles are equal and add to 90 degrees."], ["right", "Every right triangle has equal acute angles", "Only an isosceles right triangle has equal acute angles."], ["scale", "The diagonal equals a side", "The hypotenuse is longer than either leg."]])];
    explanation = ["The Pythagorean theorem gives $h^2=2(" + size + ")^2$, so $h=" + size + "\\sqrt{2}$ cm.", "The equal acute angles add to 90 degrees, so each is 45 degrees.", "The length pattern is s, s, s√2 for any positive scale s."];
  } else if (variant === "derive-30") {
    prompt = "Bisect an equilateral triangle of side " + 2 * size + " cm with an altitude. Find the altitude exactly and the angle opposite the half-base in one resulting right triangle.";
    fields = [exactLength("length", "Altitude", size + "*sqrt(3)", "cm"), exactLength("angle", "Angle opposite the half-base", "30", "degrees"),
      choose("reason", "Correct relation for the altitude h", "difference", [["difference", "h² = (whole side)² - (half-base)²", "The whole original side is the hypotenuse; subtract the short leg's square."], ["sum", "h² = (whole side)² + (half-base)²", "The altitude is a leg, not the hypotenuse."], ["half", "h = half of the original side", "The half-base is the short leg; the altitude is longer."]])];
    explanation = ["The half-base is " + size + " cm and the hypotenuse is " + 2 * size + " cm.", "$h^2=(" + 2 * size + ")^2-(" + size + ")^2=3(" + size + ")^2$, so $h=" + size + "\\sqrt{3}$ cm.", "The altitude bisects the apex angle of 60 degrees, producing 30 degrees opposite the short leg."];
  } else if (variant.startsWith("exact-")) {
    const fn = variant.slice(6) as "sin" | "cos" | "tan";
    const angleText = radians ? "\\pi/" + (180 / angle) : angle + "^\\circ";
    prompt = "Evaluate $\\" + fn + "(" + angleText + ")$ exactly using a special triangle. State the degree measure of this angle as a mode check.";
    fields = [exactLength("value", "Exact function value", specialRatios[angle][fn]), exactLength("degrees", "Angle in degrees", String(angle), "degrees")];
    explanation = [angle === 45 ? "Use the side pattern 1, 1, √2." : "Use the side pattern 1, √3, 2; the side opposite 30 degrees is the short leg.",
      fn === "sin" ? "Divide opposite by hypotenuse." : fn === "cos" ? "Divide adjacent by hypotenuse." : "Divide opposite by adjacent.",
      "The exact value is " + specialRatios[angle][fn] + ". A decimal approximation discards the exact radical when one is present."];
  } else if (variant === "missing-45") {
    prompt = "A 45-45-90 triangle has " + (knownHypotenuse ? "hypotenuse" : "one leg") + " " + size + " cm. Find " + (knownHypotenuse ? "each leg" : "the hypotenuse") + " exactly.";
    fields = [exactLength("length", knownHypotenuse ? "Each leg" : "Hypotenuse", knownHypotenuse ? size + "/sqrt(2)" : size + "*sqrt(2)", "cm")];
    explanation = ["For equal legs s, the hypotenuse is s√2.", knownHypotenuse ? "Divide the given hypotenuse by √2. Multiplying would make the leg longer than the hypotenuse." : "Multiply a leg by √2 to obtain the longer hypotenuse.", "Equivalent rationalized and unrationalized exact forms are accepted."];
  } else {
    prompt = "A 30-60-90 triangle has " + (knownHypotenuse ? "hypotenuse " + 2 * size : "long leg $" + size + "\\sqrt{3}$") + " cm. Find the short leg and " + (knownHypotenuse ? "the long leg" : "the hypotenuse") + " exactly.";
    fields = [exactLength("short", "Short leg", String(size), "cm"), exactLength("other", knownHypotenuse ? "Long leg" : "Hypotenuse", knownHypotenuse ? size + "*sqrt(3)" : String(2 * size), "cm")];
    explanation = ["The side lengths are s, s√3, 2s, opposite 30, 60 and 90 degrees respectively.", knownHypotenuse ? "The hypotenuse is twice the short leg, so first divide by 2." : "The long leg is √3 times the short leg, so divide by √3.", "Recover the remaining side from the same scale s = " + size + " cm."];
  }
  return questionSchema.parse({ ...rightBase(familyId, id), category: "procedural", parameters: { size, angle, radians, knownHypotenuse }, prompt, fields,
    hints: ["Identify the angle opposite each side before using a special-triangle pattern.", explanation[0], explanation.slice(1).join(" ")],
    explanation, answerSummary: fields.map(field => field.label + ": " + (field.kind === "choice" ? field.options.find(option => option.id === field.correct)!.label : "expected" in field ? field.expected : "")).join("; "),
  });
}
