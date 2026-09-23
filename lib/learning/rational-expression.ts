import { addPolynomials, degree, equalPolynomials, multiplyPolynomials, parsePolynomial, type Polynomial } from "./polynomial";
import { divideRational, multiplyRational, negateRational } from "./rational";

export type RationalExpression = { numerator: Polynomial; denominator: Polynomial };
const isZero = (value: Polynomial) => value.length === 1 && value[0].numerator === 0n;
function wrapped(source: string): boolean {
  if (source[0] !== "(" || source.at(-1) !== ")") return false;
  let depth = 0;
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "(") depth++;
    if (source[i] === ")") depth--;
    if (depth === 0 && i < source.length-1) return false;
  }
  return depth === 0;
}
export function parseRationalExpression(input: string): RationalExpression {
  let source = input.trim().replaceAll("−", "-").replaceAll("÷", "/");
  if (!source || source.length > 200) throw new Error("Enter one fraction using at most 200 characters, such as (x+1)/(x-2).");
  let depth = 0;
  for (const token of source) {
    if (token === "(") depth++;
    if (token === ")") depth--;
    if (depth < 0 || depth > 12) throw new Error("Balance the parentheses and use at most 12 nested levels.");
  }
  if (depth !== 0) throw new Error("Close each opening parenthesis.");
  while (wrapped(source)) source = source.slice(1, -1).trim();
  const slashes: number[] = [];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "(") depth++;
    if (source[i] === ")") depth--;
    if (source[i] === "/" && depth === 0) slashes.push(i);
  }
  if (slashes.length > 1) throw new Error("Combine the result into one fraction. Put each whole numerator and denominator in parentheses.");
  const parts = slashes.length ? [source.slice(0, slashes[0]).trim(), source.slice(slashes[0]+1).trim()] : [source, "1"];
  if (slashes.length && !parts.every(part => wrapped(part) || /^[+-]?(?:x|\d+(?:\.\d*)?|\.\d+)$/.test(part))) throw new Error("Put each whole numerator and denominator in parentheses, for example (x+1)/(x-2).");
  const [numerator, denominator] = parts.map(parsePolynomial);
  if (isZero(denominator)) throw new Error("The denominator cannot be the zero polynomial.");
  if (degree(numerator) > 6 || degree(denominator) > 6) throw new Error("Use numerator and denominator polynomials of degree at most 6.");
  return { numerator, denominator };
}
function remainder(dividend: Polynomial, divisor: Polynomial): Polynomial {
  let result = dividend;
  while (!isZero(result) && degree(result) >= degree(divisor)) {
    const coefficient = divideRational(result.at(-1)!, divisor.at(-1)!);
    const shifted = [...Array.from({ length: degree(result)-degree(divisor) }, () => ({ numerator: 0n, denominator: 1n })), ...divisor.map(value => negateRational(multiplyRational(coefficient, value)))];
    result = addPolynomials(result, shifted);
  }
  return result;
}
export function commonFactorDegree(expression: RationalExpression): number {
  let a = expression.numerator, b = expression.denominator;
  while (!isZero(b)) {
    const leading = b.at(-1)!;
    b = b.map(value => divideRational(value, leading));
    [a, b] = [b, remainder(a, b)];
  }
  return degree(a);
}
export const equalRationalExpressions = (a: RationalExpression, b: RationalExpression) => equalPolynomials(multiplyPolynomials(a.numerator, b.denominator), multiplyPolynomials(b.numerator, a.denominator));
export function checkRationalExpression(input: string, expected: string): { correct: boolean; message: string } {
  const actual = parseRationalExpression(input), target = parseRationalExpression(expected);
  if (!equalRationalExpressions(actual, target)) return { correct: false, message: "The fraction has a different value. Factor first and check the common denominator or reciprocal step." };
  if (commonFactorDegree(actual) > 0) return { correct: false, message: "The fraction is equivalent where defined, but common variable factors remain. Cancel those factors and keep the original exclusions in the separate answer." };
  return { correct: true, message: "The simplified fraction is equivalent. Its original excluded inputs are checked separately." };
}
