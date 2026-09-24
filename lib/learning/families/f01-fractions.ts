import { questionSchema, type Question } from "../contracts";
import { foundationNumberQuestion } from "./mth-foundation-numbers";
import { randomFrom } from "../random";

export const f01FractionFamilyIds = ["f01-signed-fractions", "f01-fraction-pair", "f01-proportion", "f01-fraction-reason"];

export function f01FractionQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  const rng = randomFrom(seed), base = { id, familyId, familyVersion: 1, courseId: "f01", objectiveId: "m01-l02", critical: true };
  if (familyId === "f01-signed-fractions") {
    return questionSchema.parse({ ...foundationNumberQuestion("mth-signed-fractions", variant, seed, id), ...base });
  }
  if (familyId === "f01-fraction-pair") {
    if (!["sum-difference", "product-quotient"].includes(variant)) throw new Error("Unknown fraction pair");
    const a = -rng.integer(1, 8), b = rng.integer(2, 9), c = rng.integer(1, 8), d = rng.integer(2, 9);
    const sum = variant === "sum-difference", first = sum ? `${a*d+b*c}/${b*d}` : `${a*c}/${b*d}`;
    const second = sum ? `${a*d-b*c}/${b*d}` : `${a*d}/${b*c}`;
    return questionSchema.parse({
      ...base, parameters: { a, b, c, d }, category: "procedural",
      prompt: `Use $A=\\frac{${a}}{${b}}$ and $B=\\frac{${c}}{${d}}$. Find ${sum ? "A+B and A-B" : "AB and A/B"} exactly.`,
      fields: [
        { id: "first", kind: "rational", label: sum ? "Sum" : "Product", expected: first },
        { id: "second", kind: "rational", label: sum ? "Difference" : "Quotient", expected: second },
      ],
      hints: [sum ? "Rename the fractions with a common denominator before combining them." : "Use a reciprocal only for division, and only invert the divisor.", `A common denominator is ${b*d}; the reciprocal of B is ${d}/${c}.`, `The results are ${first} and ${second}.`],
      explanation: [sum ? "The common-denominator numerators are ad and bc. Addition combines them; subtraction subtracts the second numerator." : "The product multiplies both numerators and both denominators. Division multiplies A by d/c because B is nonzero.", `The exact results are ${first} and ${second}. Reducing a fraction changes its representation, not its value.`],
      answerSummary: `${first}; ${second}.`,
    });
  }
  if (familyId === "f01-proportion") {
    if (!["direct", "percent", "remaining", "reverse", "combined"].includes(variant)) throw new Error("Unknown proportion variant");
    const count = rng.integer(2, 9), mass = rng.integer(1, 8), target = rng.integer(3, 15), percent = rng.integer(1, 9)*10;
    const whole = rng.integer(2, 20)*5, part = whole*percent/100;
    const direct = variant === "direct" || variant === "combined";
    const remaining = variant === "remaining", reverse = variant === "reverse";
    const expected = direct ? `${mass*target}/${count}` : String(reverse ? whole : remaining ? whole-part : part);
    const prompt = direct
      ? `Assume identical components: ${count} components have total mass ${mass} g. What mass would ${target} components have under this constant-mass-per-component model?`
      : reverse ? `A used cable length of ${part} m is ${percent}% of the original roll. Find the original length.`
      : `A roll contains ${whole} m of cable and ${percent}% of that original length is used. Find the ${remaining ? "remaining" : "used"} length.`;
    return questionSchema.parse({
      ...base, parameters: { count, mass, target, percent, whole }, category: "application",
      prompt: prompt + (variant === "combined" ? ` Separately, find ${percent}% of ${whole} m of cable.` : ""),
      fields: [
        { id: "value", kind: "rational", label: direct ? "Scaled mass" : reverse ? "Original length" : remaining ? "Remaining length" : "Used length", expected, unit: direct ? "g" : "m" },
        ...(variant === "combined" ? [{ id: "part", kind: "rational", label: "Cable part", expected: String(part), unit: "m" }] : []),
        { id: "reason", kind: "choice", label: "Why this calculation applies", correct: direct ? "rate" : "whole", options: rng.shuffle([
          { id: "rate", label: "The stated model keeps the mass per component constant", feedback: direct ? "Use the same ratio mass/count for both groups. This relies on the stated identical-component model." : "This is a percentage of a named original length; a component rate is not part of the problem." },
          { id: "whole", label: "The percentage is a fraction of the original roll", feedback: direct ? "The mass question uses a constant ratio, not a percentage of a roll." : "Percent means per hundred of the stated whole. Do not change the reference whole midway." },
          { id: "difference", label: "Always add the same difference when the input increases", feedback: "A proportional model preserves a ratio. A percent uses a fraction of a named whole. Neither follows this unconditional additive rule." },
        ]) },
      ],
      hints: [direct ? "First find mass per component." : "Write the percentage as p/100 and name the whole.", direct ? `The rate is ${mass}/${count} g per component.` : reverse ? `Divide the known part by ${percent}/100.` : `The used part is ${whole} times ${percent}/100.`, `The requested value is ${expected}${direct ? " g" : " m"}.`],
      explanation: [direct ? `Multiply ${mass}/${count} g per component by ${target} components. The result is ${expected} g.` : reverse ? `Part = (percent/100) times whole, so whole = ${part}/(${percent}/100) = ${whole} m.` : `The used part is ${part} m; the remaining length is ${whole-part} m. Their sum is the original ${whole} m.`, variant === "combined" ? `For the cable, ${percent}/100 times ${whole} m gives ${part} m.` : "Keep the unit attached to the quantity, and check against the stated model or original whole."],
      answerSummary: `${expected} ${direct ? "g" : "m"}${variant === "combined" ? `; cable part ${part} m` : ""}.`,
    });
  }
  if (familyId === "f01-fraction-reason") {
    if (!["common", "cancel", "decimal"].includes(variant)) throw new Error("Unknown fraction reasoning variant");
    const a = rng.integer(1, 8), b = a+rng.integer(1, 6), k = rng.integer(2, 7), digits = rng.integer(1, 999);
    const common = variant === "common", decimal = variant === "decimal";
    const first = common ? `\\frac1{${a}}+\\frac1{${b}}` : `\\frac{${k}+${a}}{${k}+${b}}`;
    const wrong = common ? `\\frac2{${a+b}}` : `\\frac{${a}}{${b}}`;
    return questionSchema.parse({
      ...base, parameters: { a, b, k, digits }, category: "conceptual",
      prompt: `A learner writes $${first}=${wrong}$. Diagnose the error and give the correct exact value.` + (decimal ? ` Also express the terminating decimal ${(digits/1000).toFixed(3)} as a fraction and as a percentage.` : ""),
      fields: [
        { id: "value", kind: "rational", label: "Correct exact value", expected: common ? `${a+b}/${a*b}` : `${k+a}/${k+b}` },
        { id: "reason", kind: "choice", label: "Error in the proposed equality", correct: common ? "parts" : "factors", options: rng.shuffle([
          { id: "parts", label: "Addition needs equal-sized parts; denominators are not added", feedback: common ? "Rename both fractions with a common denominator and then add the counts." : "The original expression is one fraction. The error occurs when canceling terms within its sums." },
          { id: "factors", label: "Cancellation requires a factor of the whole numerator and denominator", feedback: common ? "No cancellation was proposed here. The error is adding denominators when adding fractions." : "An added k is a term. It is not a common factor of both whole sums." },
          { id: "valid", label: "There is no error; matching numbers may always be removed", feedback: "Test both sides numerically. Removing matching terms or adding denominators changes the value." },
        ]) },
        ...(decimal ? [
          { id: "fraction", kind: "rational", label: "Decimal as an exact fraction", expected: `${digits}/1000` },
          { id: "percent", kind: "rational", label: "Percentage number", expected: `${digits}/10`, help: "Enter the number before the percent sign; for 37.5%, enter 37.5." },
        ] : []),
      ],
      hints: ["Check whether the operations involve terms or factors.", common ? `A common denominator is ${a*b}.` : `The complete sums are ${k+a} and ${k+b}.`, decimal ? "A thousandths decimal is digits/1000; multiply that value by 100 to obtain its percentage number." : "Compare the proposed and correct quotients before deciding that a rule is valid."],
      explanation: [common ? `The sum is (${a}+${b})/(${a} times ${b}), because the two unit fractions must use the same-sized parts.` : `The true quotient is ${k+a}/${k+b}; ${a}/${b} differs because ${a} and ${b} are distinct. Cancel only a factor of the entire numerator and denominator.`, ...(decimal ? [`The decimal equals ${digits}/1000 exactly and ${digits/10}%. This is a terminating decimal, so no rounding is involved.`] : [])],
      answerSummary: `Correct quotient: ${common ? `${a+b}/${a*b}` : `${k+a}/${k+b}`}.${decimal ? ` Decimal: ${digits}/1000 = ${digits/10}%.` : ""}`,
    });
  }
  throw new Error("Unknown F01 fraction family");
}
