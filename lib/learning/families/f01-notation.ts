import { questionSchema, type Question } from "../contracts";
import { foundationNumberQuestion } from "./mth-foundation-numbers";
import { foundationPowerQuestion } from "./mth-foundation-powers";
import { randomFrom } from "../random";

export const f01NotationFamilyIds = ["f01-scientific-notation", "f01-exact-approximate", "f01-notation-check"];
export function f01NotationQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  const rng = randomFrom(seed), base = { id, familyId, familyVersion: 1, courseId: "f01", objectiveId: "m01-l04", critical: true };
  if (familyId === "f01-scientific-notation") return questionSchema.parse({ ...foundationPowerQuestion("mth-scientific-notation", variant, seed, id), ...base });
  if (familyId === "f01-exact-approximate") return questionSchema.parse({ ...foundationNumberQuestion("mth-exact-approximate", variant, seed, id), ...base });
  if (familyId !== "f01-notation-check" || !["product", "rounding", "estimate"].includes(variant)) throw new Error("Unknown F01 notation variant");
  if (variant === "product") {
    const a = rng.integer(11, 99), b = rng.integer(11, 99), m = rng.integer(-4, 4), n = rng.integer(-4, 4);
    const shift = a*b >= 1000 ? 1 : 0, denominator = shift ? 1000 : 100;
    const exponent = m+n+shift;
    return questionSchema.parse({
      ...base, parameters: { a, b, m, n }, category: "procedural",
      prompt: `Compute $(${a/10}\\times10^{${m}})(${b/10}\\times10^{${n}})$. Give the normalized positive coefficient, its integer exponent, and the same value as a decimal or exact expression.`,
      fields: [
        { id: "coefficient", kind: "rational", label: "Normalized coefficient", expected: `${a*b}/${denominator}` },
        { id: "exponent", kind: "rational", label: "Integer exponent", expected: String(exponent) },
        { id: "value", kind: "rational", label: "Equivalent value", expected: `${a*b}/100*10^(${m+n})`, help: "A decimal, fraction, or exact expression such as 3*10^(-2) is accepted." },
      ],
      hints: ["Multiply the coefficients and combine the powers of ten.", `The raw coefficient is ${a*b/100} and the raw exponent is ${m+n}.`, shift ? "The coefficient is at least ten. Divide it by ten and increase the exponent by one." : "The coefficient is already at least one and less than ten."],
      explanation: [`The raw product is $(${a*b}/100)\\times10^{${m+n}}$.`, `The normalized coefficient is ${a*b/denominator}, with exponent ${exponent}. Moving a factor of ten between coefficient and power preserves the value.`],
      answerSummary: `Coefficient ${a*b/denominator}; exponent ${exponent}; exact value (${a*b}/100)*10^(${m+n}).`,
    });
  }
  const a = rng.integer(2, 8), b = rng.integer(2, 9), numerator = variant === "estimate" ? a*100 : a, denominator = variant === "estimate" ? b : 11;
  const places = variant === "estimate" ? 1 : 2, scale = 10**places;
  const rounded = Math.round(numerator*scale/denominator)/scale, value = numerator/denominator;
  const band = value < 1 ? "small" : value < 10 ? "ones" : value < 100 ? "tens" : "hundreds";
  return questionSchema.parse({
    ...base, parameters: { a, b, numerator, denominator, places }, category: "application",
    prompt: `A numerical model gives $${numerator}/${denominator}$. First identify its size interval; then round to ${places} decimal place${places === 1 ? "" : "s"}. Keep the fraction in your work until this final step.`,
    fields: [
      { id: "band", kind: "choice", label: "Size of the unrounded result", correct: band, options: rng.shuffle([
        { id: "small", label: "At least 0 but less than 1", feedback: value < 1 ? "The positive numerator is smaller than the positive denominator." : "Compare numerator and denominator; this quotient is at least one." },
        { id: "ones", label: "At least 1 but less than 10", feedback: band === "ones" ? "The quotient lies between one and ten." : "Multiply these proposed bounds by the positive denominator to check them." },
        { id: "tens", label: "At least 10 but less than 100", feedback: band === "tens" ? "The numerator is at least ten but less than one hundred times the denominator." : "Compare the numerator with ten and one hundred times the denominator." },
        { id: "hundreds", label: "At least 100 but less than 1000", feedback: band === "hundreds" ? "The numerator is at least one hundred but less than one thousand times the denominator." : "This interval is too large. Check the decimal scale before accepting calculator digits." },
      ]) },
      { id: "rounded", kind: "rational", label: "Rounded value", expected: rounded.toFixed(places), help: `Round to the nearest ${places === 1 ? "tenth" : "hundredth"}. Equivalent exact representations of that rounded number are accepted.` },
    ],
    hints: ["Compare the numerator with simple multiples of the denominator.", `Use the digit immediately after the ${places === 1 ? "tenths" : "hundredths"} place to decide whether to increase the retained digit.`, `The requested rounded result is ${rounded.toFixed(places)}.`],
    explanation: [`The exact value is ${numerator}/${denominator}. Its interval is determined before rounding.`, `Rounding at the requested place gives ${rounded.toFixed(places)}. An estimate checks size, while the final decimal answers the requested precision. If the fraction terminates at that place, the decimal is exact; otherwise use approximately equal.`],
    answerSummary: `Size interval: ${band}; rounded result ${rounded.toFixed(places)}.`,
  });
}
