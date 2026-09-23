import { parsePolynomial } from "./polynomial";
import { parseRational, type Rational } from "./rational";

export function parsePiMultiple(input: string): Rational {
  const source = input.trim().toLowerCase().replaceAll("π", "pi");
  if (!source || source.length > 200 || /[^\d\s.+\-*/^()−×÷]/.test(source.replaceAll("pi", ""))) throw new Error("Enter an exact multiple of pi, such as pi/6 or -3*pi/4.");
  try {
    const value = parsePolynomial(source.replaceAll("pi", "x"));
    if (value.length > 2 || value[0].numerator !== 0n) throw new Error("Not a rational multiple of pi");
    return value[1] ?? parseRational("0");
  } catch { throw new Error("Use a rational multiple of pi, such as (3*pi)/4. Keep pi out of denominators and powers."); }
}
export function formatPiMultiple(value: Rational, latex = false): string {
  if (value.numerator === 0n) return "0";
  const sign = value.numerator < 0n ? "-" : "", numerator = value.numerator < 0n ? -value.numerator : value.numerator;
  const top = `${numerator === 1n ? "" : `${numerator}${latex ? "" : "*"}`}${latex ? "\\pi" : "pi"}`;
  return `${sign}${value.denominator === 1n ? top : latex ? `\\frac{${top}}{${value.denominator}}` : `${top}/${value.denominator}`}`;
}
export function angleInRadians(input: string, unit: "degrees" | "radians"): number {
  const hasPi = /pi|π/i.test(input);
  if (hasPi && unit === "degrees") throw new Error("Use a number or fraction in degree mode. Use pi expressions in radian mode.");
  const value = hasPi ? parsePiMultiple(input) : parseRational(input);
  const amount = Number(value.numerator)/Number(value.denominator)*(hasPi ? Math.PI : 1);
  if (!Number.isFinite(amount) || Math.abs(amount) > 1_000_000) throw new Error("Use an angle with magnitude at most 1,000,000 in the selected unit.");
  return unit === "degrees" ? amount*Math.PI/180 : amount;
}
