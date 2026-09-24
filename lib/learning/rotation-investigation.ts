import { z } from "zod";
import { addPiNumbers, formatPiNumber, multiplyPiNumbers, parsePiNumber } from "./pi-number";
import { approximatePiNumber, comparePiNumbers } from "./pi-order";
import { analyzeRotation, angleRadians } from "./rotation";
import { circularMeasure } from "./circular-measure";
import { formatRational, multiplyRational, parseRational } from "./rational";

export const rotationLabCaseSchema = z.object({
  title: z.string().min(1).max(120),
  first: z.string().min(1).max(200),
  second: z.string().min(1).max(200),
  unit: z.enum(["degrees", "radians", "turns"]),
  radius: z.string().min(1).max(200),
  scale: z.string().min(1).max(200),
}).strict();
export type RotationLabCase = z.infer<typeof rotationLabCaseSchema>;
export function analyzeRotationInvestigation(input: RotationLabCase) {
  const item = rotationLabCaseSchema.parse(input);
  const radius = parseRational(item.radius), scale = parseRational(item.scale);
  const radiusNumber = Number(radius.numerator) / Number(radius.denominator), scaleNumber = Number(scale.numerator) / Number(scale.denominator);
  if (radius.numerator * 10n < radius.denominator || radius.numerator > 20n * radius.denominator) throw new Error("Use a radius from 1/10 to 20 cm in this activity.");
  if (scale.numerator * 4n < scale.denominator || scale.numerator > 4n * scale.denominator) throw new Error("Use a radius scale from 1/4 to 4 in this activity.");
  const first = analyzeRotation(item.first, item.unit), second = analyzeRotation(item.second, item.unit);
  const net = addPiNumbers(angleRadians(item.first, item.unit), angleRadians(item.second, item.unit));
  const final = analyzeRotation(formatPiNumber(net)), a = circularMeasure(item.radius, item.first, item.unit), b = circularMeasure(item.radius, item.second, item.unit);
  const travel = addPiNumbers(parsePiNumber(a.angularTravel), parsePiNumber(b.angularTravel));
  const distance = addPiNumbers(parsePiNumber(a.distance), parsePiNumber(b.distance));
  const area = addPiNumbers(parsePiNumber(a.accumulatedArea), parsePiNumber(b.accumulatedArea));
  const absoluteNet = parsePiNumber(circularMeasure("1", formatPiNumber(net)).distance);
  const scaledRadius = formatRational(multiplyRational(radius, scale));
  return {
    item, first, second, final,
    net: formatPiNumber(net), travel: formatPiNumber(travel), distance: formatPiNumber(distance),
    signedArc: formatPiNumber(multiplyPiNumbers(net, parsePiNumber(item.radius))),
    scaledRadius, scaleSquared: formatRational(multiplyRational(scale, scale)),
    scaledDistance: formatPiNumber(multiplyPiNumbers(distance, parsePiNumber(item.scale))),
    accumulatedArea: formatPiNumber(area),
    scaledAccumulatedArea: formatPiNumber(multiplyPiNumbers(area, parsePiNumber(formatRational(multiplyRational(scale, scale))))),
    relation: comparePiNumbers(travel, absoluteNet) === 0 ? "equal" as const : "greater" as const,
    plot: {
      radius: radiusNumber, scaledRadius: radiusNumber * scaleNumber,
      firstStart: 0, secondStart: approximatePiNumber(parsePiNumber(first.representative)),
      firstSweep: approximatePiNumber(parsePiNumber(a.radians)), secondSweep: approximatePiNumber(parsePiNumber(b.radians)),
      terminal: approximatePiNumber(parsePiNumber(final.representative)),
    },
  };
}
