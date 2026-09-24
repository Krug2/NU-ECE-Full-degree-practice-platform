import { questionSchema, type Question } from "../contracts";
import { foundationPowerQuestion } from "./mth-foundation-powers";
import { randomFrom } from "../random";

export const f01PowerFamilyIds = ["f01-exponent-rules", "f01-root-meaning", "f01-radical-simplify", "f01-root-audit", "f01-radical-check"];

export function f01PowerQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  const rng = randomFrom(seed), base = { id, familyId, familyVersion: 1, courseId: "f01", objectiveId: "m01-l03", critical: true };
  if (["f01-exponent-rules", "f01-root-meaning", "f01-radical-simplify", "f01-radical-check"].includes(familyId)) {
    if (familyId === "f01-root-meaning" && variant !== "absolute") throw new Error("F01 uses numeric root classification");
    const source = familyId === "f01-radical-check" ? "mth-radical-simplify" : familyId.replace("f01-", "mth-");
    const q = foundationPowerQuestion(source, variant, seed, id);
    if (familyId === "f01-exponent-rules" && variant === "negative") {
      q.prompt += " State the restriction on a base when using a negative integer exponent.";
      q.fields.push({
        id: "restriction", kind: "choice", label: "Allowed base for a negative integer exponent", help: "", correct: "nonzero",
        options: [
          { id: "nonzero", label: "Any nonzero real base", feedback: "A negative integer exponent uses a reciprocal, so the base cannot be zero. Negative nonzero bases are allowed." },
          { id: "positive", label: "Only a positive base", feedback: "Negative nonzero bases work too, with the result's sign determined by the integer power." },
          { id: "all", label: "Every real base including zero", feedback: "Zero to a negative power would require division by zero." },
        ],
      });
    }
    if (familyId === "f01-radical-check") {
      const cube = rng.integer(2, 7);
      q.parameters.cube = cube;
      q.prompt += ` Also classify $\\sqrt{-${cube*cube}}$ in the real numbers and evaluate $\\sqrt[3]{-${cube**3}}$.`;
      q.fields.push(
        { id: "real", kind: "choice", label: "Square root of the negative radicand", help: "", correct: "not-real", options: [
          { id: "not-real", label: "No real value", feedback: "The square of any real number is nonnegative. A negative radicand has no real square root." },
          { id: "negative", label: "A negative real value", feedback: "A negative number squared is positive; it cannot produce this radicand." },
          { id: "zero", label: "Zero", feedback: "Zero squared is zero, not a negative radicand." },
        ] },
        { id: "cube", kind: "rational", label: "Real cube root", expected: String(-cube), help: "", unit: "" },
      );
      q.explanation.push(`No real square has value -${cube*cube}. The cube root is -${cube}, because three negative factors produce -${cube**3}.`);
      q.answerSummary += `; negative radicand's square root is not real; cube root -${cube}.`;
    }
    return questionSchema.parse({ ...q, ...base });
  }
  if (familyId === "f01-root-audit") {
    if (!["laws", "principal", "distribution"].includes(variant)) throw new Error("Unknown root audit variant");
    const a = rng.integer(2, 6), m = rng.integer(1, 4), n = rng.integer(1, 4);
    if (variant === "laws") return questionSchema.parse({
      ...base, parameters: { a, m, n }, category: "conceptual",
      prompt: `With base ${a}, give the single-power exponents for $${a}^{${m}}\\cdot${a}^{${n}}$, $${a}^{${m}}/${a}^{${n}}$, and $(${a}^{${m}})^{${n}}$. Then evaluate $${a}^0$.`,
      fields: [
        { id: "product", kind: "rational", label: "Product exponent", expected: String(m+n) },
        { id: "quotient", kind: "rational", label: "Quotient exponent", expected: String(m-n) },
        { id: "nested", kind: "rational", label: "Nested-power exponent", expected: String(m*n) },
        { id: "zero", kind: "rational", label: "Value of the zeroth power", expected: "1" },
      ],
      hints: ["Count factors for a product, cancel factors in a quotient, and count groups in a nested power.", "Same-base products add exponents; quotients subtract them; nested powers multiply them.", `The exponents are ${m+n}, ${m-n}, ${m*n}; the zeroth power is 1.`],
      explanation: [`The product has ${m+n} factors; cancellation in the quotient leaves exponent ${m-n}. The nested power has ${n} groups of ${m} factors.`, "A nonzero value divided by itself is one. The exponent rule gives a zeroth power for that quotient, so a nonzero base to power zero is one. This argument does not define 0^0."],
      answerSummary: `Exponents ${m+n}, ${m-n}, ${m*n}; zeroth power 1.`,
    });
    if (variant === "principal") return questionSchema.parse({
      ...base, parameters: { a }, category: "conceptual",
      prompt: `Find $\\sqrt{${a*a}}$, all real solutions of $x^2=${a*a}$, and $\\sqrt{(-${a})^2}$.`,
      fields: [
        { id: "principal", kind: "rational", label: "Principal square root", expected: String(a) },
        { id: "roots", kind: "roots", label: "All real solutions of the equation", expected: [String(-a), String(a)], numberSystem: "real", help: "Enter both values separated by a comma." },
        { id: "absolute", kind: "rational", label: "Square root of the squared negative input", expected: String(a) },
      ],
      hints: ["The radical symbol selects one nonnegative value. An equation may have more than one solution.", `Both ${a} and -${a} square to ${a*a}.`, "The principal square root of a squared real input is its absolute value."],
      explanation: [`The radical gives ${a}. The equation has the two solutions -${a} and ${a}, which you can check by squaring each.`, `Squaring -${a} and taking the principal square root gives ${a}, not -${a}. The general rule is $\\sqrt{x^2}=|x|$.`],
      answerSummary: `Principal ${a}; solutions -${a}, ${a}; absolute value ${a}.`,
    });
    return questionSchema.parse({
      ...base, parameters: { a, m }, category: "conceptual",
      prompt: `Compare $\\sqrt{${a*a}+${m*m}}$ with $\\sqrt{${a*a}}+\\sqrt{${m*m}}$. Give both exact values.`,
      fields: [
        { id: "left", kind: "exact", label: "Root of the sum", expected: `sqrt(${a*a+m*m})` },
        { id: "right", kind: "rational", label: "Sum of the roots", expected: String(a+m) },
      ],
      hints: ["Evaluate the quantity under the radical first.", "A root of a product of nonnegative factors can split. That rule does not apply to addition.", `Compare sqrt(${a*a+m*m}) with ${a+m}. Squaring the latter produces an extra positive cross term.`],
      explanation: [`The root of the sum is sqrt(${a*a+m*m}); the sum of the individual roots is ${a+m}.`, `The square of ${a+m} is ${(a+m)**2}, greater than ${a*a+m*m}. The two positive numbers cannot be equal.`],
      answerSummary: `sqrt(${a*a+m*m}); ${a+m}.`,
    });
  }
  throw new Error("Unknown F01 power family");
}
