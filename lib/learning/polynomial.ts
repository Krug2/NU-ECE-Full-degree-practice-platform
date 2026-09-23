import { addRational, divideRational, equalRational, formatRational, multiplyRational, negateRational, parseRational, type Rational } from "./rational";

export type Polynomial = Rational[];
type Node = { kind: "number" | "variable"; value: Polynomial } | { kind: "negative"; value: Polynomial; child: Node } | { kind: "binary"; op: string; value: Polynomial; left: Node; right: Node };
const zero = () => parseRational("0");
const one = () => parseRational("1");
const normalize = (value: Polynomial) => {
  while (value.length > 1 && value.at(-1)!.numerator === 0n) value.pop();
  if (value.length > 13) throw new Error("Use a polynomial of degree at most 12.");
  return value;
};
export const degree = (value: Polynomial) => value.length - 1;
export const equalPolynomials = (a: Polynomial, b: Polynomial) => a.length === b.length && a.every((coefficient, index) => equalRational(coefficient, b[index]));
export const addPolynomials = (a: Polynomial, b: Polynomial): Polynomial => normalize(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => addRational(a[i] ?? zero(), b[i] ?? zero())));
export function multiplyPolynomials(a: Polynomial, b: Polynomial): Polynomial {
  if (degree(a) + degree(b) > 12) throw new Error("Use a polynomial of degree at most 12.");
  const result = Array.from({ length: a.length + b.length - 1 }, zero);
  a.forEach((left, i) => b.forEach((right, j) => { result[i + j] = addRational(result[i + j], multiplyRational(left, right)); }));
  return normalize(result);
}
export function evaluatePolynomial(value: Polynomial, x: Rational): Rational {
  return value.reduceRight((sum, coefficient) => addRational(multiplyRational(sum, x), coefficient), zero());
}

function parseNode(input: string): Node {
  const source = input.trim().replaceAll("−", "-").replaceAll("×", "*").replaceAll("÷", "/");
  if (!source || source.length > 200) throw new Error("Enter a polynomial in x using at most 200 characters.");
  const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)|[x()+\-*/^]|\S/g) ?? [];
  if (tokens.length > 100) throw new Error("Use a shorter polynomial expression.");
  let index = 0, depth = 0;
  const take = (token: string) => tokens[index] === token && (++index > 0);
  function binary(op: string, left: Node, right: Node): Node {
    let value: Polynomial;
    if (op === "+" || op === "-") value = addPolynomials(left.value, op === "+" ? right.value : right.value.map(negateRational));
    else if (op === "*") value = multiplyPolynomials(left.value, right.value);
    else if (op === "/") {
      if (degree(right.value) !== 0) throw new Error("For polynomial answers, divide only by a nonzero constant. Variable denominators need a rational-expression question.");
      value = normalize(left.value.map(coefficient => divideRational(coefficient, right.value[0])));
    } else {
      const exponent = right.value[0];
      if (degree(right.value) !== 0 || exponent.denominator !== 1n || exponent.numerator < 0n || exponent.numerator > 12n) throw new Error("Use whole-number exponents from 0 to 12 in a polynomial.");
      if (degree(left.value) === 0 && left.value[0].numerator === 0n && exponent.numerator === 0n) throw new Error("Zero to the zeroth power is not supported here.");
      value = [one()];
      for (let power = 0; power < Number(exponent.numerator); power++) value = multiplyPolynomials(value, left.value);
    }
    return { kind: "binary", op, left, right, value };
  }
  function primary(): Node {
    if (++depth > 12) throw new Error("Use fewer nested parentheses.");
    let node: Node;
    if (take("(")) {
      node = sum();
      if (!take(")")) throw new Error("Close each opening parenthesis.");
    } else if (take("x")) node = { kind: "variable", value: [zero(), one()] };
    else {
      const token = tokens[index++];
      if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token) || token.length > 30) throw new Error("Use x, numbers, fractions, parentheses, and + - * / ^ only.");
      node = { kind: "number", value: [parseRational(token)] };
    }
    depth--;
    return node;
  }
  function power(): Node {
    const node = primary();
    return take("^") ? binary("^", node, unary()) : node;
  }
  function unary(): Node {
    if (take("+")) return unary();
    if (take("-")) { const child = unary(); return { kind: "negative", child, value: child.value.map(negateRational) }; }
    return power();
  }
  function product(): Node {
    let node = unary();
    while (index < tokens.length) {
      if (take("*")) node = binary("*", node, unary());
      else if (take("/")) node = binary("/", node, unary());
      else if (tokens[index] === "x" || tokens[index] === "(") node = binary("*", node, unary());
      else break;
    }
    return node;
  }
  function sum(): Node {
    let node = product();
    while (index < tokens.length) {
      if (take("+")) node = binary("+", node, product());
      else if (take("-")) node = binary("-", node, product());
      else break;
    }
    return node;
  }
  const node = sum();
  if (index !== tokens.length) throw new Error("Check the punctuation. Use * for multiplication and ^ for powers.");
  return node;
}

export const parsePolynomial = (input: string): Polynomial => parseNode(input).value;
function monomial(node: Node): boolean {
  if (degree(node.value) === 0) return true;
  if (node.kind === "variable") return true;
  if (node.kind === "negative") return monomial(node.child);
  return node.kind === "binary" && ["*", "/", "^"].includes(node.op) && monomial(node.left) && monomial(node.right);
}
function expandedTerms(node: Node): Node[] {
  if (node.kind === "negative") return expandedTerms(node.child);
  if (node.kind === "binary" && ["+", "-"].includes(node.op)) return [...expandedTerms(node.left), ...expandedTerms(node.right)];
  return [node];
}
function factors(node: Node): Polynomial[] {
  if (degree(node.value) === 0) return [];
  if (node.kind === "negative") return factors(node.child);
  if (node.kind === "binary") {
    if (node.op === "*") return [...factors(node.left), ...factors(node.right)];
    if (node.op === "/") return factors(node.left);
    if (node.op === "^") return Array.from({ length: Number(node.right.value[0].numerator) }, () => factors(node.left)).flat();
  }
  return [node.value];
}
function primitive(value: Polynomial): boolean {
  let gcd = 0n;
  for (const coefficient of value) {
    if (coefficient.denominator !== 1n) return false;
    let b = coefficient.numerator < 0n ? -coefficient.numerator : coefficient.numerator;
    while (b) [gcd, b] = [b, gcd % b];
  }
  return gcd === 1n;
}
export type PolynomialForm = { form: "equivalent" | "expanded" | "factored"; factorDegrees: number[]; primitiveFactors: boolean };
export function checkPolynomialForm(input: string, expected: Polynomial, options: PolynomialForm): { correct: boolean; message: string } {
  const node = parseNode(input);
  if (!equalPolynomials(node.value, expected)) return { correct: false, message: "The polynomials differ. Distribute to every term, then compare coefficients of the same power of x." };
  if (options.form === "expanded") {
    const terms = expandedTerms(node), degrees = terms.map(term => degree(term.value));
    if (terms.some(term => !monomial(term)) || new Set(degrees).size !== degrees.length || (terms.length > 1 && terms.some(term => term.value.every(coefficient => coefficient.numerator === 0n)))) return { correct: false, message: "Your expression is equivalent. Finish expanding products and collecting like terms." };
  }
  if (options.form === "factored") {
    const parts = factors(node), actual = parts.map(degree).sort((a, b) => a - b), required = [...options.factorDegrees].sort((a, b) => a - b);
    if (actual.length !== required.length || actual.some((value, index) => value !== required[index])) return { correct: false, message: "Your expression is equivalent, but the requested factors are not all separated. Factor each remaining polynomial; repeated factors can use powers." };
    if (options.primitiveFactors && !parts.every(primitive)) return { correct: false, message: "Extract the remaining numerical common factors. Each variable factor should have integer coefficients with greatest common factor 1." };
  }
  return { correct: true, message: "The expression is exactly equivalent and has the requested form." };
}

export function formatPolynomial(value: Polynomial, latex = false): string {
  const terms: string[] = [];
  for (let power = degree(value); power >= 0; power--) {
    const coefficient = value[power];
    if (coefficient.numerator === 0n) continue;
    const negative = coefficient.numerator < 0n, magnitude = negative ? negateRational(coefficient) : coefficient;
    const scalar = magnitude.denominator === 1n ? String(magnitude.numerator) : latex ? `\\frac{${magnitude.numerator}}{${magnitude.denominator}}` : `(${formatRational(magnitude)})`;
    const unit = magnitude.numerator === magnitude.denominator;
    const variable = power === 0 ? "" : power === 1 ? "x" : latex ? `x^{${power}}` : `x^${power}`;
    terms.push(`${negative ? "-" : terms.length ? "+" : ""}${power > 0 && unit ? "" : scalar}${!latex && power > 0 && !unit ? "*" : ""}${variable}`);
  }
  return terms.join("") || "0";
}
