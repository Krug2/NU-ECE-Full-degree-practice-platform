import { addPiNumbers, dividePiNumbers, formatPiNumber, multiplyPiNumbers, negatePiNumber, parsePiNumber, type PiNumber } from "./pi-number";
import { comparePiNumbers } from "./pi-order";

export type AngleUnit = "degrees" | "radians" | "turns";
export type RotationLocation = "positive-x" | "positive-y" | "negative-x" | "negative-y" | "quadrant-i" | "quadrant-ii" | "quadrant-iii" | "quadrant-iv";
const zero = parsePiNumber("0"), pi = parsePiNumber("pi"), full = parsePiNumber("2pi"), half = parsePiNumber("pi/2");
const subtract = (a: PiNumber, b: PiNumber) => addPiNumbers(a, negatePiNumber(b));

export function angleRadians(source: string, unit: AngleUnit): PiNumber {
  const value = parsePiNumber(source);
  if (unit === "radians") return value;
  if (unit === "degrees") return multiplyPiNumbers(value, parsePiNumber("pi/180"));
  if (unit === "turns") return multiplyPiNumbers(value, full);
  throw new Error("Choose degrees, radians or turns.");
}

export function analyzeRotation(source: string, unit: AngleUnit = "radians") {
  const angle = angleRadians(source, unit), sign = comparePiNumbers(angle, zero);
  const magnitude = sign < 0 ? negatePiNumber(angle) : angle;
  if (comparePiNumbers(magnitude, parsePiNumber("1000000")) > 0) throw new Error("This activity supports rotations of at most 1,000,000 radians in magnitude.");
  let low = 0, high = 200000;
  while (low < high) {
    const middle = low + Math.ceil((high - low) / 2);
    if (comparePiNumbers(magnitude, multiplyPiNumbers(full, parsePiNumber(String(middle)))) >= 0) low = middle;
    else high = middle - 1;
  }
  const travelRemainder = subtract(magnitude, multiplyPiNumbers(full, parsePiNumber(String(low))));
  const partial = comparePiNumbers(travelRemainder, zero) !== 0;
  const representative = sign < 0 && partial ? subtract(full, travelRemainder) : travelRemainder;
  const quotient = sign < 0 ? -(low + Number(partial)) : low;
  const fromHalf = comparePiNumbers(representative, half), fromPi = comparePiNumbers(representative, pi);
  const fromThreeHalves = comparePiNumbers(representative, parsePiNumber("3pi/2"));
  let location: RotationLocation, reference: PiNumber | null;
  if (comparePiNumbers(representative, zero) === 0) { location = "positive-x"; reference = null; }
  else if (fromHalf === 0) { location = "positive-y"; reference = null; }
  else if (fromPi === 0) { location = "negative-x"; reference = null; }
  else if (fromThreeHalves === 0) { location = "negative-y"; reference = null; }
  else if (fromHalf < 0) { location = "quadrant-i"; reference = representative; }
  else if (fromPi < 0) { location = "quadrant-ii"; reference = subtract(pi, representative); }
  else if (fromThreeHalves < 0) { location = "quadrant-iii"; reference = subtract(representative, pi); }
  else { location = "quadrant-iv"; reference = subtract(full, representative); }
  return {
    radians: formatPiNumber(angle),
    degrees: formatPiNumber(dividePiNumbers(angle, parsePiNumber("pi/180"))),
    turns: formatPiNumber(dividePiNumbers(angle, full)),
    representative: formatPiNumber(representative),
    representativeDegrees: formatPiNumber(dividePiNumbers(representative, parsePiNumber("pi/180"))),
    leastPositive: formatPiNumber(comparePiNumbers(representative, zero) === 0 ? full : representative),
    symmetric: formatPiNumber(fromPi > 0 ? subtract(representative, full) : representative),
    quotient: String(quotient),
    fullTraveledTurns: low,
    travelRemainder: formatPiNumber(travelRemainder),
    direction: sign < 0 ? "clockwise" as const : sign > 0 ? "counterclockwise" as const : "none" as const,
    location,
    referenceAngle: reference === null ? null : formatPiNumber(reference),
  };
}

export function areCoterminal(a: string, aUnit: AngleUnit, b: string, bUnit: AngleUnit): boolean {
  return comparePiNumbers(parsePiNumber(analyzeRotation(a, aUnit).representative), parsePiNumber(analyzeRotation(b, bUnit).representative)) === 0;
}
