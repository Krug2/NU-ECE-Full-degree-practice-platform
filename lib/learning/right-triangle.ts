import { addExact, divideExact, equalExact, formatExact, multiplyExact, parseExact } from "./exact-number";
import { compareRealExact, parseRealEndpoint } from "./exact-order";

export type TriangleSide = "opposite" | "adjacent" | "hypotenuse";
export type AcuteFunction = "sin" | "cos" | "tan";
const zero = parseExact("0");

export function exactRightTriangle(AB: string, AC: string, BC: string, angleAt: "B" | "C") {
  const values = { AB: parseRealEndpoint(AB), AC: parseRealEndpoint(AC), BC: parseRealEndpoint(BC) };
  if (Object.values(values).some(value => compareRealExact(value, zero) <= 0)) throw new Error("Every side must be a positive real length.");
  if (!equalExact(addExact(multiplyExact(values.AB, values.AB), multiplyExact(values.AC, values.AC)), multiplyExact(values.BC, values.BC))) {
    throw new Error("For a right angle at A, AB² + AC² must equal BC² exactly.");
  }
  const oppositeSide = angleAt === "B" ? "AC" : "AB", adjacentSide = angleAt === "B" ? "AB" : "AC";
  return {
    oppositeSide, adjacentSide,
    opposite: formatExact(values[oppositeSide]), adjacent: formatExact(values[adjacentSide]), hypotenuse: formatExact(values.BC),
    sin: formatExact(divideExact(values[oppositeSide], values.BC)),
    cos: formatExact(divideExact(values[adjacentSide], values.BC)),
    tan: formatExact(divideExact(values[oppositeSide], values[adjacentSide])),
  };
}

function positive(value: number) {
  if (!Number.isFinite(value) || value <= 0) throw new Error("Use a finite positive side length.");
}

export function solveRightTriangle(degrees: number, known: TriangleSide, length: number) {
  if (!Number.isFinite(degrees) || degrees <= 0 || degrees >= 90) throw new Error("The reference angle must be strictly between 0 and 90 degrees.");
  positive(length);
  const radians = degrees * Math.PI / 180;
  const hypotenuse = known === "hypotenuse" ? length : length / (known === "opposite" ? Math.sin(radians) : Math.cos(radians));
  const result = { opposite: hypotenuse * Math.sin(radians), adjacent: hypotenuse * Math.cos(radians), hypotenuse, degrees, complement: 90 - degrees };
  result[known] = length;
  if (![result.opposite, result.adjacent, result.hypotenuse].every(Number.isFinite)) throw new Error("These measurements exceed the supported numeric range.");
  return result;
}

export function acuteAngle(fn: AcuteFunction, numerator: number, denominator: number) {
  positive(numerator); positive(denominator);
  const ratio = numerator / denominator;
  if (!Number.isFinite(ratio) || ratio <= 0 || fn !== "tan" && ratio >= 1) throw new Error("These sides do not define a strictly acute angle for the selected ratio.");
  const degrees = (fn === "sin" ? Math.asin(ratio) : fn === "cos" ? Math.acos(ratio) : Math.atan(ratio)) * 180 / Math.PI;
  if (degrees <= 0 || degrees >= 90) throw new Error("The angle is too close to a degenerate triangle at this precision.");
  return degrees;
}

export const specialRatios = {
  30: { sin: "1/2", cos: "sqrt(3)/2", tan: "sqrt(3)/3" },
  45: { sin: "sqrt(2)/2", cos: "sqrt(2)/2", tan: "1" },
  60: { sin: "sqrt(3)/2", cos: "1/2", tan: "sqrt(3)" },
} as const;
