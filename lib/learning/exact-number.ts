import { addRational, divideRational, equalRational, formatRational, multiplyRational, negateRational, parseRational, type Rational } from "./rational";

export type ExactNumber = Map<bigint, Rational>;
const one = parseRational("1");
const zero = parseRational("0");
const absolute = (n: bigint) => n < 0n ? -n : n;
const constant = (value: Rational): ExactNumber => value.numerator === 0n ? new Map() : new Map([[1n, value]]);
const gcd = (a: bigint, b: bigint) => { while (b) [a, b] = [b, a % b]; return a; };

function addTerm(result: ExactNumber, radicand: bigint, coefficient: Rational) {
  const value = addRational(result.get(radicand) ?? zero, coefficient);
  if (value.numerator === 0n) result.delete(radicand); else result.set(radicand, value);
  if (result.size > 16 || absolute(radicand) > 1_000_000_000_000n) throw new Error("Use a simpler exact expression.");
}

export function addExact(a: ExactNumber, b: ExactNumber): ExactNumber {
  const result = new Map(a);
  for (const [radicand, coefficient] of b) addTerm(result, radicand, coefficient);
  return result;
}
export const negateExact = (value: ExactNumber): ExactNumber => new Map([...value].map(([radicand, coefficient]) => [radicand, negateRational(coefficient)]));

export function multiplyExact(a: ExactNumber, b: ExactNumber): ExactNumber {
  const result: ExactNumber = new Map();
  for (const [left, x] of a) for (const [right, y] of b) {
    const common = gcd(absolute(left), absolute(right));
    const sign = left < 0n && right < 0n ? -1n : 1n;
    const radicand = left * right / (common * common);
    addTerm(result, radicand, multiplyRational(multiplyRational(x, y), { numerator: sign * common, denominator: 1n }));
  }
  return result;
}

function rationalValue(value: ExactNumber): Rational {
  if (value.size === 0) return zero;
  if (value.size === 1 && value.has(1n)) return value.get(1n)!;
  throw new Error("Use a rational number inside sqrt() or as an exponent.");
}

function squareRoot(value: ExactNumber): ExactNumber {
  const rational = rationalValue(value);
  if (rational.numerator === 0n) return new Map();
  let remaining = absolute(rational.numerator * rational.denominator), outside = 1n, inside = 1n;
  if (remaining > 1_000_000n) throw new Error("Use a smaller fraction inside sqrt().");
  for (let factor = 2n; factor * factor <= remaining; factor++) {
    let count = 0;
    while (remaining % factor === 0n) { remaining /= factor; count++; }
    outside *= factor ** BigInt(Math.floor(count / 2));
    if (count % 2) inside *= factor;
  }
  inside *= remaining;
  if (rational.numerator < 0n) inside = -inside;
  return new Map([[inside, divideRational({ numerator: outside, denominator: 1n }, { numerator: rational.denominator, denominator: 1n })]]);
}

export function divideExact(a: ExactNumber, b: ExactNumber): ExactNumber {
  if (b.size === 0) throw new Error("Division by zero is undefined.");
  if (b.size === 1) {
    const [radicand, coefficient] = [...b][0];
    const inverse = divideRational(one, multiplyRational(coefficient, { numerator: radicand, denominator: 1n }));
    return multiplyExact(a, new Map([[radicand, inverse]]));
  }
  if (b.size === 2) {
    const [first, second] = [...b];
    const conjugate: ExactNumber = new Map([first, [second[0], negateRational(second[1])]]);
    return divideExact(multiplyExact(a, conjugate), multiplyExact(b, conjugate));
  }
  throw new Error("Simplify the denominator to one or two terms first.");
}

export const equalExact = (a: ExactNumber, b: ExactNumber) => a.size === b.size && [...a].every(([radicand, value]) => b.has(radicand) && equalRational(value, b.get(radicand)!));
export const realExact = (value: ExactNumber) => [...value.keys()].every(radicand => radicand > 0n);
export function formatExact(value: ExactNumber, latex = false): string {
  const terms = [...value].sort(([a],[b]) => a>0n&&b<0n?-1:a<0n&&b>0n?1:Number(absolute(a)-absolute(b)));
  return terms.map(([radicand, coefficient],index) => {
    const positive = {numerator:absolute(coefficient.numerator),denominator:coefficient.denominator};
    const number = latex && positive.denominator!==1n ? `\\frac{${positive.numerator}}{${positive.denominator}}` : formatRational(positive);
    const imaginary = radicand<0n ? "i" : "";
    const root = absolute(radicand)>1n ? latex?`\\sqrt{${absolute(radicand)}}`:`sqrt(${absolute(radicand)})` : "";
    const factors = [positive.numerator===positive.denominator&&(imaginary||root)?"":number,imaginary,root].filter(Boolean);
    return `${coefficient.numerator<0n?"-":index?"+":""}${factors.join(latex?" ":"*")}`;
  }).join("") || "0";
}
export const approximateExact = (value: ExactNumber) => [...value].reduce((result, [radicand, coefficient]) => {
  result[radicand > 0n ? "real" : "imaginary"] += Number(coefficient.numerator) / Number(coefficient.denominator) * Math.sqrt(Number(absolute(radicand)));
  return result;
}, { real: 0, imaginary: 0 });

export function parseExact(input: string): ExactNumber {
  const source = input.trim().replaceAll("−", "-").replaceAll("×", "*").replaceAll("÷", "/");
  if (!source || source.length > 200) throw new Error("Enter an exact number using at most 200 characters.");
  const tokens = source.match(/sqrt|i|(?:\d+(?:\.\d*)?|\.\d+)|[()+\-*/^]|\S/g) ?? [];
  if (tokens.length > 80) throw new Error("Use a shorter exact expression.");
  let index = 0, depth = 0;
  const take = (token: string) => tokens[index] === token && (++index > 0);
  function primary(): ExactNumber {
    if (++depth > 12) throw new Error("Use fewer nested parentheses.");
    let value: ExactNumber;
    if (take("sqrt")) {
      if (!take("(")) throw new Error("Write square roots as sqrt(3), with parentheses.");
      value = squareRoot(sum());
      if (!take(")")) throw new Error("Close each square-root parenthesis.");
    } else if (take("(")) {
      value = sum();
      if (!take(")")) throw new Error("Close each opening parenthesis.");
    } else if (take("i")) value = new Map([[-1n, one]]);
    else {
      const token = tokens[index++];
      if (!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) throw new Error("Use numbers, sqrt(number), i, parentheses, and + - * / ^.");
      value = constant(parseRational(token));
    }
    depth--;
    return value;
  }
  function power(): ExactNumber {
    const base = primary();
    if (!take("^")) return base;
    const exponent = rationalValue(unary());
    if (exponent.denominator !== 1n || absolute(exponent.numerator) > 12n) throw new Error("Use an integer exponent between -12 and 12.");
    if (base.size === 0 && exponent.numerator === 0n) throw new Error("Zero to the zeroth power is not supported here.");
    let result = constant(one);
    for (let n = 0n; n < absolute(exponent.numerator); n++) result = multiplyExact(result, base);
    return exponent.numerator < 0n ? divideExact(constant(one), result) : result;
  }
  function unary(): ExactNumber {
    if (take("+")) return unary();
    if (take("-")) return negateExact(unary());
    return power();
  }
  function product(): ExactNumber {
    let value = unary();
    while (index < tokens.length) {
      if (take("*")) value = multiplyExact(value, unary());
      else if (take("/")) value = divideExact(value, unary());
      else if (["i", "sqrt", "("].includes(tokens[index])) value = multiplyExact(value, unary());
      else break;
    }
    return value;
  }
  function sum(): ExactNumber {
    let value = product();
    while (index < tokens.length) {
      if (take("+")) value = addExact(value, product());
      else if (take("-")) value = addExact(value, negateExact(product()));
      else break;
    }
    return value;
  }
  const answer = sum();
  if (index !== tokens.length) throw new Error("Check the expression's punctuation and use * for multiplication.");
  return answer;
}

export function parseRootSet(input: string): ExactNumber[] {
  const source = input.trim().replace(/^\{(.*)\}$/, "$1");
  if (["empty", "none", "∅", ""].includes(source.toLowerCase())) return [];
  if (source.length > 500) throw new Error("Use at most 500 characters for the root list.");
  const entries = source.split(/[,;]/);
  if (entries.length > 8) throw new Error("Enter at most eight distinct roots.");
  const result: ExactNumber[] = [];
  for (const entry of entries) {
    const number = parseExact(entry);
    if (!result.some(value => equalExact(value, number))) result.push(number);
  }
  return result;
}

export const equalRootSets = (a: ExactNumber[], b: ExactNumber[]) => a.length === b.length && a.every(value => b.some(other => equalExact(value, other)));
