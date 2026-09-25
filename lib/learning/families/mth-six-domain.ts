import type { AnswerField } from "../contracts";
import { randomFrom } from "../random";
import { sixFromPoint, sixNames } from "../six-trig";
import { unitCirclePoint } from "../unit-circle";
import type { TrigName } from "../refreshers/trig";
import { angleMath, circleChoice } from "./circle-fields";
import { finishSix, functionNames, sixFields, sixSummary, sixValueField } from "./six-fields";

export const sixDomainFamilyIds = ["mth-six-domain"];
export const sixDomainVariants = ["positive-x", "positive-y", "negative-x", "negative-y", "tangent-domain", "cotangent-domain", "secant-domain", "cosecant-domain", "range", "reciprocal-trap"];
export function sixDomainQuestion(familyId: string, variant: string, seed: string, id: string) {
  if (!sixDomainFamilyIds.includes(familyId)) throw new Error("Unknown six-function domain family.");
  const rng = randomFrom(seed);
  if (variant === "mixed") variant = sixDomainVariants[rng.integer(0, 9)];
  if (variant === "checkpoint") variant = sixDomainVariants[rng.integer(0, 3)];
  if (!sixDomainVariants.includes(variant)) throw new Error("Unknown six-function domain variant.");
  const index = sixDomainVariants.indexOf(variant), axis = index < 4 ? index : rng.integer(0, 1) * 2 + 1, turns = rng.integer(-4, 4), radians = rng.integer(0, 1);
  const degrees = axis * 90 + turns * 360, functionIndex = rng.integer(0, 5), fn = sixNames[functionIndex];
  let prompt = "", fields: AnswerField[] = [], explanation: string[] = [];
  if (index < 4) {
    const unit = unitCirclePoint(String(degrees), "degrees"), result = sixFromPoint(unit.x, unit.y), xZero = axis % 2 === 1;
    prompt = "Compute all six trigonometric values at $\\theta=" + angleMath(degrees, radians) + "$. Type undefined when appropriate, and identify the coordinate that makes the undefined denominators zero.";
    fields = [...sixFields(result.values), circleChoice("zero", "Which denominator is zero?", xZero ? "x" : "y", [
      ["x", "x = 0, affecting tangent and secant", "Tangent and secant divide by the horizontal coordinate."],
      ["y", "y = 0, affecting cotangent and cosecant", "Cotangent and cosecant divide by the vertical coordinate."],
      ["r", "r = 0, affecting sine and cosine", "A unit-circle point has positive radius 1."],
    ])];
    explanation = ["The terminal point is (" + unit.x + ", " + unit.y + "), with radius 1.",
      xZero ? "Tangent and secant are undefined because x=0. Cotangent is zero because its numerator x is zero and its denominator y is nonzero." : "Cosecant and cotangent are undefined because y=0. Tangent is zero because its numerator y is zero and its denominator x is nonzero.",
      sixSummary(result.values)];
  } else if (variant.endsWith("-domain")) {
    const name = ({ "tangent-domain": "tan", "cotangent-domain": "cot", "secant-domain": "sec", "cosecant-domain": "csc" } as Record<string, TrigName>)[variant], xZero = name === "tan" || name === "sec";
    prompt = "State the excluded radian angles for " + functionNames[name] + ", then list its undefined degree inputs and its zero-value degree inputs in [0, 360). The integer k ranges over all integers.";
    fields = [circleChoice("domain", "Excluded radian angles", xZero ? "xzero" : "yzero", [
      ["xzero", "pi/2 + k*pi", "These angles end on the vertical axis, where x=0."],
      ["yzero", "k*pi", "These angles end on the horizontal axis, where y=0."],
      ["both", "k*pi/2", "This would exclude both axes; inspect the particular denominator."],
      ["none", "No excluded real angles", "The reciprocal or quotient denominator does vanish at some angles."],
    ]), { id: "excluded", kind: "roots", label: "Undefined inputs in [0, 360)", expected: xZero ? ["90", "270"] : ["0", "180"], numberSystem: "real", unit: "degrees", help: "Separate exact degree values with commas. Exclude 360." },
    { id: "zeros", kind: "roots", label: "Zero-value inputs in [0, 360)", expected: name === "tan" ? ["0", "180"] : name === "cot" ? ["90", "270"] : [], numberSystem: "real", unit: "degrees", help: "Give every allowed degree value, or none. A zero output and an undefined input are different." }];
    explanation = [name + " divides by " + (xZero ? "x=cos(theta)" : "y=sin(theta)") + " on the unit circle.",
      "Exclude every zero of that denominator, including negative integer turns.",
      name === "sec" || name === "csc" ? "Its numerator is 1, so the function never equals zero." : "Its zero outputs occur where the numerator is zero and the denominator is not."];
  } else if (variant === "range") {
    const outside = fn === "sec" || fn === "csc", bounded = fn === "sin" || fn === "cos";
    prompt = "Describe the complete real range of " + functionNames[fn] + " and decide whether zero is a possible output.";
    fields = [circleChoice("range", "Range", outside ? "outside" : bounded ? "bounded" : "real", [
      ["outside", "(-infinity, -1] union [1, infinity)", "Reciprocals of nonzero coordinates in [-1,1] have magnitude at least 1."],
      ["bounded", "[-1, 1]", "The normalized sine and cosine coordinates stay within the unit circle."],
      ["real", "All real numbers", "Tangent and cotangent attain every real ratio."],
      ["positive", "Positive numbers only", "The quadrant can make a defined trigonometric ratio negative."],
    ]), circleChoice("zero", "Can the function equal zero?", outside ? "no" : "yes", [
      ["yes", "Yes", "Sine, cosine, tangent and cotangent each have allowed zero outputs."],
      ["no", "No", "Secant and cosecant have a nonzero numerator and never equal zero."],
    ])];
    explanation = [outside ? "The magnitude is at least 1 wherever this reciprocal is defined." : bounded ? "This function is a unit-circle coordinate and includes both extreme values -1 and 1." : "This coordinate quotient can be zero, positive or negative without a finite bound.",
      "Range concerns output values. Undefined angle inputs belong to the domain discussion, not to the range."];
  } else {
    prompt = "At $\\theta=" + angleMath(degrees, radians) + "$, compare tangent, cotangent and the expression 1/tan(theta). Decide why taking a reciprocal may lose a valid cotangent input.";
    fields = [sixValueField("tan", "Tangent at this angle", null), sixValueField("cot", "Cotangent at this angle", "0"), sixValueField("expression", "The expression 1/tan(theta)", null),
      circleChoice("reason", "Why does the direct definition matter?", "direct", [
        ["direct", "x/y exists even though y/x does not", "On a vertical axis y is nonzero and x=0. Cotangent is 0/y, while tangent would divide by zero."],
        ["infinity", "The reciprocal of infinity is zero", "Infinity is not a real tangent value at this angle."],
        ["same", "Both expressions have identical domains", "Writing 1/tan requires tangent to exist and be nonzero."],
      ])];
    explanation = ["The terminal point is on a vertical axis: x=0 and y=1 or -1.", "The definition cot=x/y gives zero, while tan=y/x is undefined.", "The expression 1/tan cannot be evaluated here. The reciprocal identity is valid only on the common domain."];
  }
  return finishSix(familyId, id, seed, { category: "conceptual", parameters: { axis, turns, degrees, radians, functionIndex }, prompt, fields, explanation });
}
