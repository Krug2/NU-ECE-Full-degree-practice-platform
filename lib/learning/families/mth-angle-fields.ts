import { formatRational, parseRational } from "../rational";
import { formatPiNumber, parsePiNumber } from "../pi-number";
import type { RotationLocation } from "../rotation";

export const angleExact = (id: string, label: string, expected: string, unit = "") => ({ id, label, kind: "pi-expression" as const, expected: formatPiNumber(parsePiNumber(expected)), unit });
export const angleNumber = (id: string, label: string, expected: string, unit = "") => ({ id, label, kind: "rational" as const, expected: formatRational(parseRational(expected)), unit });
export const angleChoice = (id: string, label: string, correct: string, options: [string, string, string][]) => ({ id, label, kind: "choice" as const, correct, options: options.map(([id, label, feedback]) => ({ id, label, feedback })) });
export const locationLabels: Record<RotationLocation, string> = {
  "positive-x": "Positive x-axis", "positive-y": "Positive y-axis", "negative-x": "Negative x-axis", "negative-y": "Negative y-axis",
  "quadrant-i": "Quadrant I", "quadrant-ii": "Quadrant II", "quadrant-iii": "Quadrant III", "quadrant-iv": "Quadrant IV",
};
export const locationField = (location: RotationLocation) => angleChoice("location", "Terminal ray location", location, Object.entries(locationLabels).map(([id, label]) => [id, label, id === location ? "This is the terminal ray's exact location." : "Reduce by whole turns, then compare with 0, 90, 180 and 270 degrees. Axis rays are outside the open quadrants."]));
export const angleYesNo = (id: string, label: string, yes: boolean, reason: string) => angleChoice(id, label, yes ? "yes" : "no", [["yes", "Yes", reason], ["no", "No", reason]]);
export const angleMath = (source: string) => "$" + formatPiNumber(parsePiNumber(source), true) + "$";
