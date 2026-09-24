import { questionSchema, type Question } from "../contracts";
import { foundationNumberQuestion } from "./mth-foundation-numbers";
import { randomFrom } from "../random";

export const f01NumberFamilyIds = ["f01-signed-change", "f01-operation-order", "f01-sign-precedence"];

export function f01NumberQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  const rng = randomFrom(seed);
  const base = { id, familyId, familyVersion: 1, courseId: "f01", objectiveId: "m01-l01", critical: true };
  if (familyId === "f01-sign-precedence") {
    return questionSchema.parse({ ...foundationNumberQuestion("mth-sign-precedence", variant, seed, id), ...base });
  }
  if (familyId === "f01-signed-change") {
    if (!["add", "subtract", "compare", "zero"].includes(variant)) throw new Error("Unknown signed-change variant");
    const a = rng.integer(-15, 15), b = rng.integer(1, 12), n = rng.integer(1, 9);
    if (variant === "zero") return questionSchema.parse({
      ...base, parameters: { n }, category: "conceptual",
      prompt: `Compare $0/${n}$, $${n}/0$, and $0/0$. Which divisions have a defined real value?`,
      fields: [
        { id: "zero", kind: "rational", label: `Zero divided by ${n}`, expected: "0" },
        { id: "classification", kind: "choice", label: "Divisions with zero denominator", correct: "undefined", options: rng.shuffle([
          { id: "undefined", label: "Both are undefined", feedback: "A nonzero numerator cannot equal zero times a quotient. For 0/0 every multiplier gives zero, so division does not select a unique value." },
          { id: "zero", label: "Both equal zero", feedback: "A zero numerator gives zero only when the denominator is nonzero." },
          { id: "one", label: "The nonzero numerator gives infinity and 0/0 equals one", feedback: "Infinity is not a real quotient. The cancellation rule a/a=1 requires a nonzero." },
        ]) },
      ],
      hints: ["Division asks which number multiplied by the denominator produces the numerator.", `Only zero multiplied by ${n} gives zero.`, "A denominator of zero never defines a real quotient."],
      explanation: [`The equation ${n}q=0 has the unique solution q=0.`, `The equation 0q=${n} has no solution, while 0q=0 has every real solution. Neither defines a unique quotient.`],
      answerSummary: `0/${n}=0; both quotients with denominator zero are undefined.`,
    });
    const subtract = variant === "subtract", value = subtract ? a + b : a - b;
    return questionSchema.parse({
      ...base, parameters: { a, b, subtract: Number(subtract) }, category: variant === "compare" ? "conceptual" : "application",
      prompt: subtract
        ? `A signed reading is ${a}. Calculate $${a}-(-${b})$, then compare the result with the starting reading.`
        : `A reading starts at ${a} and changes by $-${b}$. Find the new reading and compare it with ${a}.`,
      fields: [
        { id: "value", kind: "rational", label: "Resulting reading", expected: String(value) },
        { id: "comparison", kind: "choice", label: "Result compared with the starting reading", correct: subtract ? "greater" : "less", options: rng.shuffle([
          { id: "less", label: "Less than the starting reading", feedback: subtract ? "Subtracting a negative adds its positive opposite, moving right." : "Adding a negative change moves left by its magnitude." },
          { id: "greater", label: "Greater than the starting reading", feedback: subtract ? "Subtracting a negative moves right, even when both readings are negative." : "The change is negative. Position, rather than absolute value, determines which reading is greater." },
          { id: "equal", label: "Equal to the starting reading", feedback: "The change is nonzero, so the position changes." },
        ]) },
        { id: "distance", kind: "rational", label: "Result's distance from zero", expected: String(Math.abs(value)) },
      ],
      hints: ["Rewrite subtraction as adding the opposite; distinguish position from distance.", subtract ? `Subtracting -${b} means adding ${b}.` : `Adding -${b} means moving ${b} units left.`, `The reading is ${value}; its distance from zero is ${Math.abs(value)}.`],
      explanation: [subtract ? `$${a}-(-${b})=${a}+${b}=${value}$.` : `$${a}+(-${b})=${value}$.`, `The result is ${subtract ? "greater" : "less"} than ${a}. Its distance from zero, $|${value}|$, is ${Math.abs(value)}. Distance cannot be negative.`],
      answerSummary: `Reading ${value}; ${subtract ? "greater" : "less"}; distance ${Math.abs(value)}.`,
    });
  }
  if (familyId === "f01-operation-order") {
    if (!["chain", "grouped", "fraction-bar"].includes(variant)) throw new Error("Unknown operation-order variant");
    const a = rng.integer(2, 12), b = rng.integer(2, 6), c = rng.integer(2, 5), d = rng.integer(1, 8);
    const chain = variant === "chain", grouped = variant === "grouped";
    const expression = chain ? `${a*b}\\div${b}\\cdot${c}` : grouped ? `-${a}+${b}(${c}-${d})` : `\\frac{${a}+${b}}{${c}+${d}}`;
    const value = chain ? String(a*c) : grouped ? String(-a+b*(c-d)) : `${a+b}/${c+d}`;
    const alternate = chain ? `${a*b}\\div(${b}\\cdot${c})` : grouped ? `(-${a}+${b})(${c}-${d})` : `${a}+${b}/${c}+${d}`;
    const alternateValue = chain ? `${a}/${c}` : grouped ? String((-a+b)*(c-d)) : `${a*c+b+d*c}/${c}`;
    return questionSchema.parse({
      ...base, parameters: { a, b, c, d }, category: "conceptual",
      prompt: `Evaluate both $${expression}$ and $${alternate}$. Explain which grouping rule applies to the first expression.`,
      fields: [
        { id: "value", kind: "rational", label: "First expression", expected: value },
        { id: "alternate", kind: "rational", label: "Second expression", expected: alternateValue },
        { id: "reason", kind: "choice", label: "Rule for the first expression", correct: chain ? "left" : "group", options: rng.shuffle([
          { id: "left", label: "Multiplication and division share priority; work left to right", feedback: chain ? "Divide first here because it occurs first. Multiplication has no priority over division." : "That rule is valid, but the first step here is to evaluate each indicated group." },
          { id: "group", label: "Evaluate each group before combining it with the rest", feedback: chain ? "The first expression has no denominator parentheses. Do not insert a new group that changes it." : "Parentheses and a fraction bar group complete expressions." },
          { id: "multiply", label: "Always multiply before any division or grouped addition", feedback: "Grouping comes first, and multiplication shares its priority with division." },
        ]) },
      ],
      hints: ["Mark the groups before performing any operations.", chain ? `Divide ${a*b} by ${b} before multiplying by ${c}.` : grouped ? `The inner difference is ${c-d}.` : `The fraction's numerator is ${a+b} and its denominator is ${c+d}.`, `The values are ${value} and ${alternateValue}.`],
      explanation: [chain ? `The first calculation is $(${a*b}/${b})${c}=${a*c}$. The second has the entire product in the denominator.` : grouped ? "In the first expression only the difference is multiplied by the coefficient. The second makes a different sum the other factor." : "A fraction bar groups both numerator and denominator. Inline division without parentheses does not group the added terms.", `The first value is ${value}; the second is ${alternateValue}. Parentheses must describe the intended computation.`],
      answerSummary: `${value}; ${alternateValue}; ${chain ? "equal priority, left to right" : "evaluate groups first"}.`,
    });
  }
  throw new Error("Unknown F01 number family");
}
