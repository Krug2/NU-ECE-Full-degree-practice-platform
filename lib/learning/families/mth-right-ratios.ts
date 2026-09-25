import { questionSchema, type AnswerField, type Question } from "../contracts";
import { randomFrom } from "../random";
import { exactRightTriangle } from "../right-triangle";
import { choose, exactLength, rightBase } from "./right-fields";

export const rightRatioFamilyIds = ["mth-right-ratios"];
export const rightRatioVariants = ["labels", "sine", "cosine", "tangent", "complement", "scale", "validity", "range"];
export function rightRatioQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  if (!rightRatioFamilyIds.includes(familyId)) throw new Error("Unknown right-triangle ratio family.");
  const rng = randomFrom(seed);
  if (variant === "mixed") variant = rightRatioVariants[rng.integer(0, rightRatioVariants.length - 1)];
  if (!rightRatioVariants.includes(variant)) throw new Error("Unknown right-triangle ratio variant.");
  const size = rng.integer(1, 3);
  const [a, b, h] = [[8, 15, 17], [5, 12, 13], [7, 24, 25], [9, 40, 41]][rng.integer(0, 3)].map(n => n * size);
  const atB = rng.integer(0, 1) === 0, angleAt = atB ? "B" : "C";
  const triangle = exactRightTriangle(String(a), String(b), String(h), angleAt);
  const scale = rng.integer(2, 7), valid = rng.integer(0, 1) === 0, candidateH = h + (valid ? 0 : 1);
  const parameters = { a, b, h, atB: Number(atB), scale, candidateH };
  const figure = { kind: "right-triangle", title: "Reference angle in triangle ABC", angleAt, AB: a + " cm", AC: b + " cm", BC: h + " cm" };
  const side = (id: string, label: string, correct: string) => choose(id, label, correct.toLowerCase(), rng.shuffle(["AB", "AC", "BC"]).map(name => [
    name.toLowerCase(), name, name === "BC" ? "BC is across from the right angle, so it is the hypotenuse." : name === triangle.oppositeSide ? name + " is opposite the marked angle, becoming adjacent after the switch." : name + " is adjacent to the marked angle, becoming opposite after the switch.",
  ]));
  let prompt = "", fields: AnswerField[] = [], explanation: string[] = [];
  if (variant === "labels") {
    prompt = "Name all three side roles relative to the marked angle at " + angleAt + ", then name the opposite side after switching to the other acute angle.";
    fields = [side("hypotenuse", "Hypotenuse", "BC"), side("opposite", "Opposite side", triangle.oppositeSide), side("adjacent", "Adjacent leg", triangle.adjacentSide), side("switched", "Opposite side after switching angles", triangle.adjacentSide)];
    explanation = ["BC stays opposite the right angle at A.", "At " + angleAt + ", " + triangle.oppositeSide + " is opposite and " + triangle.adjacentSide + " is the adjacent leg.", "Switching the reference angle exchanges the two leg roles; it does not move any side."];
  } else if (["sine", "cosine", "tangent"].includes(variant)) {
    const fn = variant === "sine" ? "sin" : variant === "cosine" ? "cos" : "tan";
    const correct = fn === "sin" ? "oh" : fn === "cos" ? "ah" : "oa";
    prompt = "For the marked angle at " + angleAt + ", choose the definition of " + variant + " and give its exact value.";
    fields = [choose("ratio", "Ratio definition", correct, rng.shuffle([
      ["oh", "opposite / hypotenuse", "This defines sine."],
      ["ah", "adjacent leg / hypotenuse", "This defines cosine."],
      ["oa", "opposite / adjacent leg", "This defines tangent."],
      ["ho", "hypotenuse / opposite", "This is reciprocal sine, not sine, cosine or tangent."],
    ])), exactLength("value", "Exact ratio", triangle[fn])];
    explanation = ["Locate the marked angle before naming either leg.", "$\\" + fn + "\\theta=" + triangle[fn] + "$, using lengths in the same unit.", "The length units cancel. The ratio has no length unit."];
  } else if (variant === "complement") {
    prompt = "Let theta be the marked angle at " + angleAt + " and phi the other acute angle. Give sin(phi), cos(phi), and theta + phi.";
    fields = [exactLength("sine", "sin(phi)", triangle.cos), exactLength("cosine", "cos(phi)", triangle.sin), exactLength("sum", "Sum of the acute angles", "90", "degrees")];
    explanation = ["The two acute angles fill the 90 degrees remaining after the right angle.", "The opposite leg for phi is the adjacent leg for theta, so sine and cosine exchange.", "These identities use complementary angles, not equal angles in general."];
  } else if (variant === "scale") {
    prompt = "Scale every side of the displayed triangle by " + scale + ". Find the new AB and the new sine of the marked angle.";
    fields = [exactLength("ab", "Scaled AB", String(a * scale), "cm"), exactLength("sine", "Sine after scaling", triangle.sin)];
    explanation = ["AB becomes " + a * scale + " cm.", "Both numerator and denominator multiply by " + scale + "; that common factor cancels.", "Similarity preserves acute angles and side ratios, not side lengths."];
  } else if (variant === "validity") {
    prompt = "A proposed triangle has AB = " + a + " cm, AC = " + b + " cm and BC = " + candidateH + " cm. Can A be a right angle for these exact lengths?";
    fields = [exactLength("legs", "AB squared plus AC squared", String(a * a + b * b), "cm²"), exactLength("hyp", "BC squared", String(candidateH * candidateH), "cm²"),
      choose("valid", "Right angle at A?", valid ? "yes" : "no", [["yes", "Yes", "A right angle at A requires AB² + AC² = BC²."], ["no", "No", "Unequal squared totals rule out a right angle at A."]])];
    explanation = ["AB² + AC² = " + (a * a + b * b) + " cm², while BC² = " + candidateH * candidateH + " cm².", valid ? "The positive lengths satisfy the Pythagorean converse." : "The claimed perpendicular geometry is inconsistent with these exact lengths.", "Do not apply right-triangle ratios merely because a sketch looks square."];
  } else {
    prompt = "The marked angle at " + angleAt + " is strictly acute. Choose the range statement that always holds and evaluate its tangent exactly.";
    fields = [choose("range", "Always true for a strictly acute angle", "positive", [
      ["positive", "0 < sine < 1; 0 < cosine < 1; tangent > 0", "Both legs are positive and shorter than the hypotenuse; either leg can be longer than the other."],
      ["bounded", "All three ratios must be less than 1", "Tangent compares the legs and can exceed 1."],
      ["units", "All three ratios have units of centimeters", "Equal length units cancel in each ratio."],
    ]), exactLength("tangent", "Exact tangent", triangle.tan)];
    explanation = ["The hypotenuse is longer than each positive leg, so sine and cosine lie strictly between 0 and 1.", "Tangent is a positive leg ratio with no universal upper bound.", "For this reference angle, tangent = " + triangle.tan + "."];
  }
  return questionSchema.parse({
    ...rightBase(familyId, id), category: "conceptual", parameters, prompt, ...(variant === "validity" ? {} : { figure }), fields,
    hints: ["Identify the right angle, then the chosen acute angle.", explanation[0], explanation.slice(1).join(" ")],
    explanation, answerSummary: fields.map(field => field.label + ": " + (field.kind === "choice" ? field.options.find(option => option.id === field.correct)!.label : "expected" in field ? field.expected : "")).join("; "),
  });
}
