import { questionSchema, type Question } from "../contracts";
import { formatPolynomial, parsePolynomial } from "../polynomial";
import { parseRational } from "../rational";
import { randomFrom } from "../random";

export const foundationFactoringFamilyIds = ["mth-polynomial-expand", "mth-common-factor", "mth-quadratic-factor", "mth-factor-audit"];
const polynomial = (coefficients: number[], latex = false) => formatPolynomial(coefficients.map(value => parseRational(String(value))), latex);
const linear = (a: number, b: number) => polynomial([b, a], true);
const help = "Use x, ^ for powers, and * for multiplication. Put factors in parentheses. Any order of equivalent terms or factors is accepted.";

export function foundationFactoringQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  const rng = randomFrom(seed), base = { id, familyId, familyVersion: 1, courseId: "mth-215", objectiveId: "b03" };
  if (familyId === "mth-polynomial-expand") {
    if (!["distribution", "product", "square", "area"].includes(variant)) throw new Error("Unknown expansion variant");
    const a = rng.integer(1, 5), b = rng.integer(1, 7), c = -rng.integer(1, 5), d = rng.integer(1, 8);
    const expression = variant === "distribution" ? `${a}(${linear(1, -b)})${c}(${linear(1, d)})` : variant === "square" ? `(${linear(a, -b)})^2` : variant === "area" ? `(${linear(1, b)})(${linear(1, d)})` : `(${linear(a, -b)})(${linear(c, d)})`;
    const coefficients = variant === "distribution" ? [-a*b+c*d, a+c] : variant === "square" ? [b*b, -2*a*b, a*a] : variant === "area" ? [b*d, b+d, 1] : [-b*d, a*d-b*c, a*c];
    const expected = polynomial(coefficients), answer = formatPolynomial(parsePolynomial(expected), true);
    return questionSchema.parse({ ...base, parameters: { a, b, c, d }, category: variant === "area" ? "application" : "procedural", critical: false,
      prompt: variant === "area" ? `A rectangle has side lengths $x+${b}$ cm and $x+${d}$ cm, with $x>0$. Write its area as an expanded polynomial in x, collecting like terms.` : `Expand $${expression}$ and collect like terms.`,
      fields: [{ id: "expression", kind: "polynomial", label: "Expanded polynomial", expected, form: "expanded", unit: variant === "area" ? "cm²" : "", help }],
      hints: ["Multiply each term in one factor by every term in the other. A negative sign belongs to its term.", variant === "distribution" ? "Distribute both outside coefficients before collecting the x terms and constants." : variant === "square" ? "A binomial square has two equal cross products, so the middle term does not disappear." : "Write all four products before combining the two linear terms.", `The collected expression is $${answer}$.`],
      explanation: [variant === "distribution" ? `The x coefficient is $${a}+(${c})=${a+c}$, and the constant is $${a}(-${b})+(${c})${d}=${coefficients[0]}$.` : variant === "square" ? `The square terms are $${a*a}x^2$ and ${b*b}. The two cross products total $-${2*a*b}x$.` : variant === "area" ? `Multiplying length by width gives $x^2+${b}x+${d}x+${b*d}$.` : `The four products are $${a*c}x^2$, $${a*d}x$, $${-b*c}x$, and ${-b*d}.`, `Collect terms with the same power of x to obtain $${answer}$. ${variant === "area" ? "Each term represents part of the area, in square centimeters." : "Terms with different powers remain separate."}`], answerSummary: `$${answer}$${variant === "area" ? " cm²" : ""}` });
  }
  if (familyId === "mth-common-factor") {
    if (variant !== "monomial") throw new Error("Unknown common-factor variant");
    const pair = [[2, 3], [3, 2], [4, 5], [5, 3], [2, 5], [3, 4]][rng.integer(0, 5)];
    const a = pair[0], b = pair[1]*(rng.integer(0, 1) ? -1 : 1), g = rng.integer(2, 9)*(rng.integer(0, 1) ? -1 : 1), power = rng.integer(1, 2);
    const coefficients = Array.from({ length: power+2 }, (_, i) => i === power ? g*b : i === power+1 ? g*a : 0);
    const expected = polynomial(coefficients), answer = `${g}x^{${power}}(${linear(a, b)})`;
    return questionSchema.parse({ ...base, parameters: { a, b, g, power }, category: "procedural", critical: true,
      prompt: `Factor $${polynomial(coefficients, true)}$ completely over the integers. Extract the numerical greatest common factor and every common power of x.`,
      fields: [{ id: "expression", kind: "polynomial", label: "Factored polynomial", expected, form: "factored", factorDegrees: Array.from({ length: power+1 }, () => 1), primitiveFactors: true, help }],
      hints: ["Use the greatest common divisor of the integer coefficients and the smaller power of x.", `One possible outside factor is $${g}x^{${power}}$. Divide each original term by it.`, `The remaining factor is $${linear(a, b)}$.`],
      explanation: [`Both original terms contain $${g}x^{${power}}$. Extracting a negative numerical factor is allowed as long as every inside sign changes consistently.`, `Division leaves $${linear(a, b)}$, whose integer coefficients have greatest common factor 1.`, `Expanding $${answer}$ recovers both original terms. The x power ${power} records ${power} repeated factors of x.`], answerSummary: `$${answer}$` });
  }
  if (familyId === "mth-quadratic-factor") {
    if (!["monic", "leading", "squares", "repeated"].includes(variant)) throw new Error("Unknown factoring variant");
    const pair = [[2, 1], [2, 3], [3, 1], [3, 2], [4, 3], [4, 5]][rng.integer(0, 5)];
    const a = variant === "leading" ? pair[0] : 1, b = (variant === "leading" ? pair[1] : rng.integer(1, 9))*(rng.integer(0, 1) ? -1 : 1);
    const d = variant === "squares" ? -b : variant === "repeated" ? b : rng.integer(1, 9)*(rng.integer(0, 1) ? -1 : 1);
    const coefficients = [b*d, a*d+b, a], expected = polynomial(coefficients), answer = `(${linear(a, b)})(${linear(1, d)})`;
    return questionSchema.parse({ ...base, parameters: { a, b, d }, category: "procedural", critical: false,
      prompt: `Factor $${polynomial(coefficients, true)}$ completely into linear factors with integer coefficients.`,
      fields: [{ id: "expression", kind: "polynomial", label: "Factored polynomial", expected, form: "factored", factorDegrees: [1, 1], primitiveFactors: true, help }],
      hints: [variant === "squares" ? "Use the difference of two squares: A²-B²=(A-B)(A+B)." : variant === "repeated" ? "Look for a perfect-square trinomial, including the sign of its middle term." : "The product must match the leading and constant coefficients, and its cross terms must match the middle coefficient.", `Try factors with leading terms ${a === 1 ? "x and x" : `${a}x and x`}. The constants must multiply to ${b*d}.`, `One factorization is $${answer}$.`],
      explanation: [`The proposed factors have product $${a}x^2+(${a*d+b})x+(${b*d})$.`, `The cross products contribute ${a*d} and ${b} to the x coefficient, totaling ${a*d+b}.`, `Thus $${polynomial(coefficients, true)}=${answer}$. ${variant === "repeated" ? `The equal factors can also be written as $(${linear(1, b)})^2$.` : "Reordering the factors does not change their product."}`], answerSummary: `$${answer}$` });
  }
  if (familyId === "mth-factor-audit") {
    if (!["missing", "sign", "constant"].includes(variant)) throw new Error("Unknown factor audit variant");
    const p = rng.integer(2, 8), q = rng.integer(2, 8), test = rng.integer(1, 4);
    const middle = variant === "missing" ? 0 : variant === "sign" ? -p-q : p+q, constant = variant === "constant" ? -p*q : p*q;
    const original = test*test+middle*test+constant, proposed = (test+p)*(test+q), correct = variant === "constant" ? "constant" : "middle";
    const coefficients = [constant, middle, 1], claim = `(x+${p})(x+${q})`;
    return questionSchema.parse({ ...base, parameters: { p, q, test, middle, constant }, category: "conceptual", critical: true,
      prompt: `Someone claims $${polynomial(coefficients, true)}=${claim}$ for every real x. Expand the proposed factors, identify the coefficient that disagrees, and test the claim at $x=${test}$.`,
      fields: [{ id: "mismatch", kind: "choice", label: "Coefficient that disagrees", correct, options: rng.shuffle([
        { id: "middle", label: "The coefficient of x", feedback: correct === "middle" ? "The cross products give a different linear coefficient from the original polynomial." : "The two cross products give the correct linear coefficient here. Compare the constants." },
        { id: "constant", label: "The constant term", feedback: correct === "constant" ? "The two factor constants have a positive product, whereas the original constant is negative." : "The constant products agree here. Check the cross products and the x coefficient." },
        { id: "none", label: "No coefficient disagrees", feedback: "An identity requires every coefficient to agree. Matching only the first and last terms is insufficient." },
      ]) }, { id: "original", kind: "rational", label: "Original expression at the test input", expected: String(original) }, { id: "proposed", kind: "rational", label: "Proposed factors at the test input", expected: String(proposed) }],
      hints: ["Expand the product before deciding whether it equals the original polynomial.", `The proposed product is $x^2+${p+q}x+${p*q}$.`, `At x=${test}, the original is ${original} and the proposal is ${proposed}.`],
      explanation: [`The product $${claim}$ has coefficients 1, ${p+q}, and ${p*q}.`, `The original has coefficients 1, ${middle}, and ${constant}. The ${correct === "middle" ? "linear coefficient" : "constant term"} differs.`, `At x=${test}, the values ${original} and ${proposed} give a counterexample. One disagreement disproves an identity; agreement at a few inputs would not prove one.`], answerSummary: `${correct === "middle" ? "Coefficient of x" : "Constant term"}; original ${original}, proposed ${proposed}.` });
  }
  throw new Error("This question family is not available.");
}
