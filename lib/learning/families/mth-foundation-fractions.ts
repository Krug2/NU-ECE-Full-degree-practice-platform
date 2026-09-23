import { questionSchema, type Question } from "../contracts";
import { formatPolynomial } from "../polynomial";
import { formatRational, parseRational } from "../rational";
import { randomFrom } from "../random";

export const foundationFractionFamilyIds = ["mth-rational-simplify", "mth-rational-operations", "mth-cancel-audit", "mth-rational-model"];
const polynomial = (coefficients: number[], latex = false) => formatPolynomial(coefficients.map(value => parseRational(String(value))), latex);
const factor = (root: number) => polynomial([-root, 1]);
const help = "Enter one simplified fraction, with each whole numerator and denominator in parentheses, such as (x+1)/(x-2). A polynomial result can be entered directly. Keep excluded inputs in the separate answer.";
const exclusions = (values: string[]) => ({ id: "excluded", kind: "roots", label: "All original excluded inputs", numberSystem: "real", expected: values, help: "List every excluded input separated by commas. Cancellation does not restore an input. Use an exact fraction when needed." });
const valueField = (expected: string, domainFieldId = "excluded") => ({ id: "expression", kind: "rational-expression", label: "Simplified expression", expected, domainFieldId, help });

export function foundationFractionQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  const rng = randomFrom(seed), base = { id, familyId, familyVersion: 1, courseId: "mth-215", objectiveId: "b04", critical: true };
  const [a, b, c] = rng.shuffle(Array.from({ length: 17 }, (_, i) => i-8));
  if (familyId === "mth-rational-simplify") {
    if (!["factors", "squares", "monomial"].includes(variant)) throw new Error("Unknown rational simplification variant");
    const n = rng.integer(2, 9), g = rng.integer(2, 8), h = rng.integer(3, 9), power = rng.integer(2, 3);
    const original = variant === "factors" ? `\\frac{(${factor(a)})(${factor(b)})}{(${factor(a)})(${factor(c)})}` : variant === "squares" ? `\\frac{x^2-${n*n}}{x-${n}}` : `\\frac{${g}x^{${power}}}{${h}x}`;
    const expected = variant === "factors" ? `(${factor(b)})/(${factor(c)})` : variant === "squares" ? `x+${n}` : `(${g}*x^${power-1})/${h}`;
    const excluded = (variant === "factors" ? [a, c] : variant === "squares" ? [n] : [0]).map(String);
    return questionSchema.parse({ ...base, parameters: { a, b, c, n, g, h, power }, category: "procedural", prompt: `Simplify $${original}$ and retain every excluded input from the original expression.`, fields: [valueField(expected), exclusions(excluded)],
      hints: ["Record every zero of the original denominator before canceling.", variant === "squares" ? `Factor the numerator as $(x-${n})(x+${n})$.` : variant === "factors" ? `The common factor is $${factor(a)}$.` : "The numerator and denominator share a factor x.", `The simplified value is ${expected}; original exclusions: ${excluded.join(", ")}.`],
      explanation: [`The original denominator is zero at ${excluded.join(" and ")}, so those inputs are excluded.`, variant === "squares" ? `Factoring the difference of squares exposes the common factor x-${n}.` : variant === "factors" ? `Cancel the common factor $${factor(a)}$ only where it is nonzero.` : `Cancel one factor x, leaving power ${power-1} in the numerator.`, `The simplified result is ${expected}, with the original exclusions still attached.`], answerSummary: `${expected}; excluded inputs: ${excluded.join(", ")}.` });
  }
  if (familyId === "mth-rational-operations") {
    if (!["add", "subtract", "multiply", "divide", "complex"].includes(variant)) throw new Error("Unknown rational operation variant");
    const u = rng.integer(1, 5), v = rng.integer(1, 5), k = rng.integer(2, 5), subtract = variant === "subtract";
    let original: string, expected: string, excluded: string[], reasoning: string[];
    if (variant === "add" || subtract) {
      const signed = subtract ? -v : v, numerator = polynomial([-u*b-signed*a, u+signed]);
      original = `\\frac{${u}}{${factor(a)}}${subtract ? "-" : "+"}\\frac{${v}}{${factor(b)}}`;
      expected = `(${numerator})/((${factor(a)})(${factor(b)}))`; excluded = [String(a), String(b)];
      reasoning = [`Use the common denominator $(${factor(a)})(${factor(b)})$.`, `The new numerator is $${u}(${factor(b)})${subtract ? "-" : "+"}${v}(${factor(a)})=${polynomial([-u*b-signed*a, u+signed], true)}$.`, "Multiply each whole numerator by its missing factor. Subtraction changes every sign in the second numerator."];
    } else if (variant === "complex") {
      original = `\\frac{\\frac1{${factor(a)}}}{\\frac1{${factor(a)}}+${k}}`;
      expected = `1/(${polynomial([1-k*a, k])})`; excluded = [String(a), formatRational(parseRational(`${a}-1/${k}`))];
      reasoning = [`The inner fractions require x not equal to ${a}.`, `The entire divisor must also be nonzero: $1+${k}(${factor(a)})\\ne0$, which excludes ${excluded[1]}.`, `Multiply the top and bottom of the large fraction by $${factor(a)}$. The result is ${expected}; retain both original exclusions.`];
    } else {
      original = variant === "multiply" ? `\\frac{${factor(a)}}{${factor(b)}}\\cdot\\frac{${factor(b)}}{${factor(c)}}` : `\\frac{${factor(a)}}{${factor(b)}}\\div\\frac{${factor(c)}}{${factor(b)}}`;
      expected = `(${factor(a)})/(${factor(c)})`; excluded = [String(b), String(c)];
      reasoning = variant === "multiply" ? [`The original denominators exclude ${b} and ${c}.`, `Multiplication puts $${factor(b)}$ in the numerator and denominator, so it can be canceled on the original domain.`] : [`The two original denominators exclude ${b}. The divisor equals zero at ${c}, so that input must also be excluded.`, `Multiply by the reciprocal of the second fraction, then cancel $${factor(b)}$.`];
    }
    return questionSchema.parse({ ...base, parameters: { a, b, c, u, v, k }, category: "procedural", prompt: `Write $${original}$ as one simplified expression and give all original excluded inputs.`, fields: [valueField(expected), exclusions(excluded)],
      hints: ["Begin with the original domain. A divisor must be both defined and nonzero.", variant === "add" || subtract ? "Use the product of the two distinct denominator factors as a common denominator." : variant === "complex" ? "Clear the small denominators in the numerator and denominator of the large fraction." : variant === "divide" ? "Replace division by multiplication by the second fraction's reciprocal." : "Multiply numerators and denominators, then cancel common factors.", `The result is ${expected}; exclusions: ${excluded.join(", ")}.`],
      explanation: [...reasoning, `The final expression is ${expected}, defined on the original domain excluding ${excluded.join(" and ")}. A reduced denominator alone may not show every original exclusion.`], answerSummary: `${expected}; excluded inputs: ${excluded.join(", ")}.` });
  }
  if (familyId === "mth-cancel-audit") {
    if (!["sum", "partial"].includes(variant)) throw new Error("Unknown cancellation audit variant");
    const p = rng.integer(2, 8), q = p+rng.integer(1, 5), k = rng.integer(2, 6), x = rng.integer(2, 5);
    const original = variant === "sum" ? `\\frac{x+${p}}{x+${q}}` : `\\frac{${k}x+${p}}x`, proposal = variant === "sum" ? `\\frac{${p}}{${q}}` : `${k+p}`;
    const actual = formatRational(parseRational(variant === "sum" ? `(${x}+${p})/(${x}+${q})` : `(${k}*${x}+${p})/${x}`)), proposed = formatRational(parseRational(variant === "sum" ? `${p}/${q}` : String(k+p)));
    return questionSchema.parse({ ...base, parameters: { p, q, k, x }, category: "conceptual", prompt: `A learner claims $${original}=${proposal}$ after canceling x. Explain the error and test the equality at $x=${x}$, which is allowed in the original expression.`,
      fields: [{ id: "reason", kind: "choice", label: "Why the cancellation fails", correct: "factor", options: rng.shuffle([
        { id: "factor", label: "The whole numerator and denominator do not share the proposed factor x", feedback: "Cancellation divides the entire numerator and denominator by one nonzero factor. An added term cannot be crossed out on its own." },
        { id: "same", label: "Any identical symbol can be canceled wherever it appears", feedback: "Matching symbols inside sums are terms, not factors of the entire numerator and denominator." },
        { id: "never", label: "A variable can never be canceled", feedback: "Common nonzero variable factors can be canceled. Record their original exclusions first." },
      ]) }, { id: "original", kind: "rational", label: "Original value at the test input", expected: actual }, { id: "proposed", kind: "rational", label: "Proposed value at the test input", expected: proposed }],
      hints: ["Ask whether every term in the numerator contains the proposed factor.", `Substitute x=${x} into both expressions before simplifying.`, `The original is ${actual}; the proposed value is ${proposed}. They differ.`],
      explanation: [variant === "sum" ? "The x in each sum is an addend. Neither whole polynomial has a factor x because its constant is nonzero." : `Split the fraction correctly: $(${k}x+${p})/x=${k}+${p}/x$, with x nonzero. The second term still contains its denominator.`, `At x=${x}, the two values are ${actual} and ${proposed}. This allowed input disproves the proposed identity.`], answerSummary: `Only common factors cancel; original ${actual}, proposed ${proposed}.` });
  }
  if (familyId === "mth-rational-model") {
    if (variant !== "average") throw new Error("Unknown rational model variant");
    const u = rng.integer(2, 7), v = rng.integer(3, 9);
    return questionSchema.parse({ ...base, parameters: { u, v }, category: "application", prompt: `A practice model assigns a processing energy of $${u}x^2+${v}x$ joules to a batch of mass x kilograms. Batch mass must be positive. Simplify the average energy per kilogram, $(${u}x^2+${v}x)/x$, and give the full domain allowed by the model.`,
      fields: [{ ...valueField(`${u}x+${v}`, "domain"), unit: "J/kg" }, { id: "domain", kind: "intervals", label: "Model domain for x", expected: [{ lower: "0", upper: null, lowerClosed: false, upperClosed: false }], help: "Use interval notation. Include both the denominator restriction and the positive-mass condition." }],
      hints: ["Divide the total energy by mass and cancel the shared factor only when x is nonzero.", `The numerator factors as $x(${u}x+${v})$.`, "A positive batch mass requires x>0, which also keeps the original denominator nonzero."],
      explanation: [`The average is $${u}x+${v}$ J/kg for x>0.`, "The reduced polynomial can be evaluated at zero or a negative number, but those inputs are outside this model. A zero-mass batch has no defined energy per kilogram in the original quotient."], answerSummary: `${u}x+${v} J/kg; domain (0, inf).` });
  }
  throw new Error("This question family is not available.");
}
