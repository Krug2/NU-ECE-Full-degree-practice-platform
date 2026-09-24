import type { Rational } from "./rational";

export type RealBounds = { lower: bigint; upper: bigint };
export const boundScale = 10n ** 80n;
const cache = new Map<string, RealBounds>();
const floor = (n: bigint, d: bigint): bigint => {
  if (d < 0n) return floor(-n, -d);
  if (d === 0n) throw new Error("Division by zero is undefined.");
  const q = n / d;
  return n < 0n && n % d !== 0n ? q - 1n : q;
};
const ceil = (n: bigint, d: bigint) => -floor(-n, d);
const interval = (lower: bigint, upper: bigint): RealBounds => {
  if (lower > upper || lower.toString().length > 400 || upper.toString().length > 400) throw new Error("Use a smaller expression for this calculation.");
  return { lower, upper };
};
function memo(key: string, compute: () => RealBounds): RealBounds {
  let value = cache.get(key);
  if (!value) {
    value = compute();
    if (cache.size >= 256) cache.delete(cache.keys().next().value!);
    cache.set(key, value);
  }
  return { ...value };
}
export const rationalBounds = (r: Rational): RealBounds => interval(floor(r.numerator * boundScale, r.denominator), ceil(r.numerator * boundScale, r.denominator));
export const addBounds = (a: RealBounds, b: RealBounds) => interval(a.lower + b.lower, a.upper + b.upper);
export const negateBounds = (a: RealBounds) => interval(-a.upper, -a.lower);
export function multiplyBounds(a: RealBounds, b: RealBounds): RealBounds {
  const products = [a.lower * b.lower, a.lower * b.upper, a.upper * b.lower, a.upper * b.upper];
  return interval(floor(products.reduce((x, y) => x < y ? x : y), boundScale), ceil(products.reduce((x, y) => x > y ? x : y), boundScale));
}
export function divideBounds(a: RealBounds, b: RealBounds): RealBounds {
  if (b.lower <= 0n && b.upper >= 0n) throw new Error("This denominator is zero or too close to zero to verify. Simplify it first.");
  const inverse = interval(floor(boundScale * boundScale, b.upper), ceil(boundScale * boundScale, b.lower));
  return multiplyBounds(a, inverse);
}
export function integerPowerBounds(value: RealBounds, power: number): RealBounds {
  if (!Number.isInteger(power) || Math.abs(power) > 120) throw new Error("Use a smaller integer power.");
  if (power === 0 && value.lower <= 0n && value.upper >= 0n) throw new Error("Exclude zero before using the zeroth power.");
  if (power < 0) return divideBounds(rationalBounds({ numerator: 1n, denominator: 1n }), integerPowerBounds(value, -power));
  let result = interval(boundScale, boundScale), base = value, remaining = power;
  while (remaining) {
    if (remaining % 2) result = multiplyBounds(result, base);
    remaining = Math.floor(remaining / 2);
    if (remaining) base = multiplyBounds(base, base);
  }
  return result;
}

function logRatio(n: bigint, d: bigint): RealBounds {
  const a = n - d, b = n + d;
  if (a === 0n) return interval(0n, 0n);
  let numerator = a, denominator = b, lower = 0n, upper = 0n;
  for (let k = 0n; k < 96n; k++) {
    const scaled = 2n * boundScale * numerator, divisor = (2n * k + 1n) * denominator;
    lower += floor(scaled, divisor); upper += ceil(scaled, divisor);
    numerator *= a * a; denominator *= b * b;
  }
  const tail = ceil(2n * boundScale * numerator * b * b, denominator * 193n * (b * b - a * a));
  return interval(lower, upper + tail);
}
export function logarithmBounds(r: Rational): RealBounds {
  if (r.numerator <= 0n || r.denominator <= 0n) throw new Error("A real logarithm requires a strictly positive argument.");
  if (r.numerator.toString().length > 30 || r.denominator.toString().length > 30) throw new Error("Use smaller numbers inside the logarithm.");
  return memo(`ln:${r.numerator}/${r.denominator}`, () => {
    let n = r.numerator, d = r.denominator, power = 0n;
    while (n >= 2n * d) { d *= 2n; power++; }
    while (n < d) { n *= 2n; power--; }
    const logTwo = memo("ln-two", () => logRatio(2n, 1n));
    return addBounds(logRatio(n, d), multiplyBounds(rationalBounds({ numerator: power, denominator: 1n }), logTwo));
  });
}

function smallExponential(n: bigint, d: bigint): RealBounds {
  let numerator = 1n, denominator = 1n, lower = boundScale, upper = boundScale;
  for (let k = 1n; k <= 96n; k++) {
    numerator *= n; denominator *= d * k;
    lower += floor(boundScale * numerator, denominator);
    upper += ceil(boundScale * numerator, denominator);
  }
  numerator *= n; denominator *= d * 97n;
  const tail = ceil(boundScale * numerator * d * 98n, denominator * (d * 98n - n));
  return interval(lower, upper + tail);
}
export function exponentialBounds(r: Rational): RealBounds {
  if (r.numerator.toString().length > 100 || r.denominator.toString().length > 100) throw new Error("Use smaller numbers in the exponent.");
  if (r.denominator <= 0n || r.numerator < -120n * r.denominator || r.numerator > 120n * r.denominator) throw new Error("Use an exponential input between -120 and 120.");
  return memo(`exp:${r.numerator}/${r.denominator}`, () => {
    const n = r.numerator < 0n ? -r.numerator : r.numerator;
    let d = r.denominator, squares = 0;
    while (2n * n > d) { d *= 2n; squares++; }
    let result = smallExponential(n, d);
    for (let i = 0; i < squares; i++) result = multiplyBounds(result, result);
    return r.numerator < 0n ? divideBounds(interval(boundScale, boundScale), result) : result;
  });
}

function integerRoot(value: bigint, degree: bigint): bigint {
  if (value < 2n) return value;
  let x = 1n << BigInt(Math.ceil(value.toString(2).length / Number(degree)));
  while (true) {
    const next = ((degree - 1n) * x + value / x ** (degree - 1n)) / degree;
    if (next >= x) return x;
    x = next;
  }
}
export function rootBounds(r: Rational, degree: number): RealBounds {
  if (r.denominator <= 0n || r.numerator < 0n) throw new Error("Use a nonnegative real root argument.");
  if (!Number.isInteger(degree) || degree < 1 || degree > 60 || r.numerator.toString().length > 100 || r.denominator.toString().length > 100) throw new Error("Use a root index from 1 to 60 and smaller numbers.");
  return memo(`root:${degree}:${r.numerator}/${r.denominator}`, () => {
    const order = BigInt(degree), scaled = r.numerator * boundScale ** order;
    const lower = integerRoot(scaled / r.denominator, order);
    return interval(lower, lower ** order * r.denominator === scaled ? lower : lower + 1n);
  });
}
export const boundsNumber = (value: RealBounds) => Number(value.lower + value.upper) / (2 * Number(boundScale));
