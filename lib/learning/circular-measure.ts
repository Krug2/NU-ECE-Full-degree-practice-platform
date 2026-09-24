import { addPiNumbers, dividePiNumbers, formatPiNumber, multiplyPiNumbers, negatePiNumber, parsePiNumber, type PiNumber } from "./pi-number";
import { comparePiNumbers } from "./pi-order";
import { parseRational, formatRational } from "./rational";
import { angleRadians, type AngleUnit } from "./rotation";

const lengthScale = { mm: "1/1000", cm: "1/100", m: "1", km: "1000", in: "127/5000", ft: "381/1250" };
const timeScale = { s: "1", min: "60", h: "3600" };
export type LengthUnit = keyof typeof lengthScale;
export type TimeUnit = keyof typeof timeScale;
export type CircularSegment = { rotation: string; unit: AngleUnit; duration: string; timeUnit: TimeUnit };
const zero = parsePiNumber("0"), full = parsePiNumber("2pi");
const magnitude = (value: PiNumber) => comparePiNumbers(value, zero) < 0 ? negatePiNumber(value) : value;
const positive = (source: string, label: string) => {
  const value = parseRational(source);
  if (value.numerator <= 0n) throw new Error(label + " must be positive.");
  return parsePiNumber(formatRational(value));
};
export function convertLength(source: string, from: LengthUnit, to: LengthUnit): string {
  if (!Object.hasOwn(lengthScale, from) || !Object.hasOwn(lengthScale, to)) throw new Error("Choose a supported length unit.");
  return formatPiNumber(multiplyPiNumbers(parsePiNumber(source), parsePiNumber("(" + lengthScale[from] + ")/(" + lengthScale[to] + ")")));
}
export function seconds(source: string, unit: TimeUnit): PiNumber {
  if (!Object.hasOwn(timeScale, unit)) throw new Error("Choose seconds, minutes or hours.");
  return multiplyPiNumbers(positive(source, "Elapsed time"), parsePiNumber(timeScale[unit]));
}

export function circularMeasure(radius: string, rotation: string, unit: AngleUnit = "radians") {
  const r = positive(radius, "Radius"), angle = angleRadians(rotation, unit), travel = magnitude(angle);
  const area = multiplyPiNumbers(multiplyPiNumbers(r, r), dividePiNumbers(travel, parsePiNumber("2")));
  const disk = multiplyPiNumbers(multiplyPiNumbers(r, r), parsePiNumber("pi"));
  const ordinary = comparePiNumbers(travel, full) <= 0;
  return {
    radians: formatPiNumber(angle),
    angularTravel: formatPiNumber(travel),
    signedArc: formatPiNumber(multiplyPiNumbers(r, angle)),
    distance: formatPiNumber(multiplyPiNumbers(r, travel)),
    accumulatedArea: formatPiNumber(area),
    sectorArea: ordinary ? formatPiNumber(area) : null,
    uniqueArea: formatPiNumber(ordinary ? area : disk),
  };
}

export function circularPath(radius: string, segments: CircularSegment[]) {
  const r = positive(radius, "Radius");
  if (segments.length < 1 || segments.length > 12) throw new Error("Use one to twelve motion segments.");
  let net = zero, travel = zero, duration = zero;
  for (const segment of segments) {
    const angle = angleRadians(segment.rotation, segment.unit);
    net = addPiNumbers(net, angle);
    travel = addPiNumbers(travel, magnitude(angle));
    duration = addPiNumbers(duration, seconds(segment.duration, segment.timeUnit));
  }
  return {
    netRotation: formatPiNumber(net),
    angularTravel: formatPiNumber(travel),
    elapsedSeconds: formatPiNumber(duration),
    signedArc: formatPiNumber(multiplyPiNumbers(r, net)),
    distance: formatPiNumber(multiplyPiNumbers(r, travel)),
    averageAngularRate: formatPiNumber(dividePiNumbers(net, duration)),
    averageAngularSpeed: formatPiNumber(dividePiNumbers(travel, duration)),
    averageTangentialSpeed: formatPiNumber(dividePiNumbers(multiplyPiNumbers(r, travel), duration)),
  };
}

export function uniformCircularMotion(radius: string, segment: CircularSegment) {
  const path = circularPath(radius, [segment]), speed = parsePiNumber(path.averageAngularSpeed);
  return { ...path, revolutionSeconds: comparePiNumbers(speed, zero) === 0 ? null : formatPiNumber(dividePiNumbers(full, speed)) };
}
