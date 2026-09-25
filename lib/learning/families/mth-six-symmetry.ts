import type { AnswerField } from "../contracts";
import { randomFrom } from "../random";
import { sixFromPoint, sixNames, transformedSix } from "../six-trig";
import { unitCirclePoint } from "../unit-circle";
import { angleMath, circleChoice } from "./circle-fields";
import { finishSix, functionNames, sixValueField } from "./six-fields";

export const sixSymmetryFamilyIds = ["mth-six-symmetry"];
export const sixSymmetryVariants = ["parity", "period", "negative-value", "half-turn", "full-turn", "period-evidence", "odd-zero"];
export function sixSymmetryQuestion(familyId: string, variant: string, seed: string, id: string) {
  if (!sixSymmetryFamilyIds.includes(familyId)) throw new Error("Unknown six-function symmetry family.");
  const rng = randomFrom(seed);
  if (variant === "mixed") variant = sixSymmetryVariants[rng.integer(0, 6)];
  if (!sixSymmetryVariants.includes(variant) && variant !== "checkpoint") throw new Error("Unknown six-function symmetry variant.");
  const functionIndex = variant === "period-evidence" ? rng.integer(0, 1) : variant === "odd-zero" ? [0, 2, 4, 5][rng.integer(0, 3)] : rng.integer(0, 5);
  const fn = sixNames[functionIndex], degrees = [30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330][rng.integer(0, 11)], radians = rng.integer(0, 1);
  const point = unitCirclePoint(String(degrees), "degrees"), values = sixFromPoint(point.x, point.y).values;
  const even = fn === "cos" || fn === "sec", quotient = fn === "tan" || fn === "cot";
  const reflected = transformedSix(values, "reflection")[fn], half = transformedSix(values, "half-turn")[fn];
  const parity = () => circleChoice("parity", "Parity on the function's domain", even ? "even" : "odd", [
    ["even", "Even: f(-theta) = f(theta)", "Cosine and secant preserve the horizontal coordinate under reflection."],
    ["odd", "Odd: f(-theta) = -f(theta)", "Sine, tangent, cosecant and cotangent reverse sign under reflection where defined."],
    ["neither", "Neither even nor odd", "Each of the six basic trigonometric functions has one of these two symmetries."],
  ]);
  const period = (): AnswerField => ({ id: "period", kind: "pi-expression", label: "Fundamental period", expected: quotient ? "pi" : "2pi", unit: "rad", help: "Give the least positive repeat interval, preserving the function's domain." });
  let prompt = "", fields: AnswerField[] = [], explanation: string[] = [];
  if (variant === "checkpoint") {
    prompt = "For f = " + functionNames[fn] + " and $\\theta=" + angleMath(degrees, radians) + "$, evaluate f(-theta), f(theta+pi) and f(theta+2pi). The shifts pi and 2pi are radians, or 180 and 360 degrees. State the parity and fundamental period.";
    fields = [sixValueField("negative", "Value at -theta", reflected), sixValueField("half", "Value after a half-turn", half), sixValueField("full", "Value after a full turn", values[fn]), parity(), period()];
    explanation = ["Reflection negates y and preserves x; cosine and secant are even, while the other four functions are odd.",
      "A half-turn negates both coordinates. The signs cancel in tangent and cotangent, while the other four values change sign.",
      "Every full turn restores the point. The fundamental period is " + (quotient ? "pi" : "2pi") + " radians."];
  } else if (variant === "period-evidence") {
    prompt = "A learner observes " + (fn === "sin" ? "sin(0)=sin(pi)=0" : "cos(pi/2)=cos(3pi/2)=0") + " and claims pi is a period. Test f = " + functionNames[fn] + " at theta = " + degrees + " degrees and theta + 180 degrees, then evaluate the claim.";
    fields = [sixValueField("start", "Value at theta", values[fn]), sixValueField("half", "Value after a half-turn", half),
      circleChoice("claim", "Does the observed pair establish a period?", "no", [
        ["no", "No, a period must work throughout the domain", "These two new values are opposite and nonzero, giving a counterexample."],
        ["yes", "Yes, one matching pair is enough", "A single repeated output can occur without the whole function repeating."],
        ["zero", "Yes, zeros alone determine the period", "Locations of repeated zeros are not enough to determine all output values."],
      ])];
    explanation = ["The claimed period must preserve every defined output, not just a chosen zero.", "Here f(theta)=" + values[fn] + " and f(theta+pi)=" + half + ", which are unequal.", "The fundamental period remains 2pi."];
  } else if (variant === "odd-zero") {
    const exists = fn === "sin" || fn === "tan";
    prompt = "The " + functionNames[fn] + " function is odd. Evaluate it at zero and decide whether oddness alone forces every odd function to have f(0)=0.";
    fields = [sixValueField("zero", "Function value at zero", exists ? "0" : null), circleChoice("claim", "Correct statement", "conditional", [
      ["conditional", "f(0)=0 follows only if zero is in the domain", "Oddness relates opposite inputs that are in the domain."],
      ["always", "Every odd function must be defined at zero", "Cosecant and cotangent are odd but exclude zero."],
      ["never", "No odd function can be defined at zero", "Sine and tangent are odd and both equal zero there."],
    ])];
    explanation = [exists ? "At the point (1,0), this function has a zero numerator and a nonzero denominator." : "At the point (1,0), this function divides by y=0 and is undefined.", "If zero belongs to an odd function's domain, f(0)=-f(0) forces f(0)=0. It does not force zero to belong to that domain."];
  } else {
    const transform = variant === "half-turn" ? "half-turn" : variant === "full-turn" ? "full-turn" : "reflection";
    const value = transformedSix(values, transform)[fn], transformation = transform === "half-turn" ? "theta + pi" : transform === "full-turn" ? "theta + 2pi" : "-theta";
    prompt = "For " + functionNames[fn] + " at theta = " + degrees + " degrees, evaluate the value at " + transformation + ". Any pi shifts are radians. " + (variant === "period" ? "Also give the fundamental period." : variant === "parity" || variant === "negative-value" ? "Also identify the parity." : "Explain the coordinate effect.");
    fields = [sixValueField("value", "Transformed function value", value)];
    if (variant === "period") fields.push(period());
    else if (variant === "parity" || variant === "negative-value") fields.push(parity());
    else fields.push(circleChoice("rule", "Why this transformation has that effect", transform === "full-turn" ? "full" : quotient ? "cancel" : "negate", [
      ["full", "A full turn restores both coordinates", "This explains the common 2pi repeat interval."],
      ["cancel", "A half-turn negates both quotient coordinates", "The two minus signs cancel in y/x and x/y."],
      ["negate", "A half-turn reverses this coordinate or its reciprocal", "Sine, cosine, secant and cosecant reverse sign after pi."],
    ]));
    explanation = ["At the starting angle " + fn + "=" + values[fn] + ".", "At " + transformation + " the value is " + value + ".",
      "Its parity is " + (even ? "even" : "odd") + " and its fundamental period is " + (quotient ? "pi" : "2pi") + " radians, on the function's domain."];
  }
  return finishSix(familyId, id, seed, { category: "conceptual", parameters: { functionIndex, degrees, radians }, prompt, fields, explanation });
}
