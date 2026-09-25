import { z } from "zod";
import { addExact, divideExact, equalExact, formatExact, multiplyExact, negateExact, parseExact, type ExactNumber } from "./exact-number";
import { compareRealExact, parseRealEndpoint } from "./exact-order";
import { quadrantSigns, recoverCircleCoordinate, type Quadrant } from "./unit-circle";
import type { TrigName } from "./refreshers/trig";

export const sixNames = ["sin", "cos", "tan", "sec", "csc", "cot"] as const;
export type SixValues = Record<TrigName, string | null>;
const zero = parseExact("0"), one = parseExact("1");
const square = (value: ExactNumber) => multiplyExact(value, value);
function rationalRoot(value: ExactNumber) {
  if ([...value.keys()].some(key => key !== 1n)) throw new Error("Use coordinates or a ratio whose required squared length is rational. Nested radicals are outside this exact tool.");
  return parseExact("sqrt(" + formatExact(value) + ")");
}
export function sixFromPoint(xText: string, yText: string) {
  const x = parseRealEndpoint(xText), y = parseRealEndpoint(yText), radius = rationalRoot(addExact(square(x), square(y)));
  if (equalExact(radius, zero)) throw new Error("The origin has no terminal direction. Use a nonzero point.");
  const ratios: Record<TrigName, [ExactNumber, ExactNumber]> = {
    sin: [y, radius], cos: [x, radius], tan: [y, x], sec: [radius, x], csc: [radius, y], cot: [x, y],
  };
  const values = Object.fromEntries(sixNames.map(name => {
    const [top, bottom] = ratios[name];
    return [name, equalExact(bottom, zero) ? null : formatExact(divideExact(top, bottom))];
  })) as SixValues;
  return {
    x: formatExact(x), y: formatExact(y), radius: formatExact(radius),
    unitX: values.cos!, unitY: values.sin!, values,
    denominators: Object.fromEntries(sixNames.map(name => [name, formatExact(ratios[name][1])])) as Record<TrigName, string>,
  };
}
export function sixFromRatio(name: TrigName, source: string, quadrant: Quadrant) {
  if (!sixNames.includes(name) || ![1, 2, 3, 4].includes(quadrant)) throw new Error("Choose a trigonometric function and an open quadrant.");
  const value = parseRealEndpoint(source), signs = quadrantSigns(quadrant);
  if (equalExact(value, zero)) throw new Error("A zero ratio is incompatible with an open quadrant.");
  if (name === "sin" || name === "cos" || name === "sec" || name === "csc") {
    const coordinate = name === "cos" || name === "sec" ? "x" : "y";
    const known = name === "sec" || name === "csc" ? divideExact(one, value) : value;
    const point = recoverCircleCoordinate(coordinate, formatExact(known), quadrant);
    return sixFromPoint(point.x, point.y);
  }
  if (compareRealExact(value, zero) !== signs.x * signs.y) throw new Error("The ratio sign contradicts the stated quadrant.");
  const radius = rationalRoot(addExact(one, square(value)));
  const anchor = divideExact(parseExact(String(name === "tan" ? signs.x : signs.y)), radius);
  const other = multiplyExact(value, anchor);
  return name === "tan" ? sixFromPoint(formatExact(anchor), formatExact(other)) : sixFromPoint(formatExact(other), formatExact(anchor));
}
export function transformedSix(values: SixValues, transform: "reflection" | "half-turn" | "full-turn"): SixValues {
  return Object.fromEntries(sixNames.map(name => {
    const changeSign = transform === "reflection" ? name !== "cos" && name !== "sec" : transform === "half-turn" ? name !== "tan" && name !== "cot" : false;
    const value = values[name];
    return [name, value === null ? null : changeSign ? formatExact(negateExact(parseExact(value))) : value];
  })) as SixValues;
}
export function analyzeSixCase(item: { x: string; y: string }) {
  for (const source of [item.x, item.y]) {
    const value = parseRealEndpoint(source);
    if (compareRealExact(value, parseExact("-100")) < 0 || compareRealExact(value, parseExact("100")) > 0) throw new Error("Use coordinates from -100 to 100 in this investigation.");
  }
  return sixFromPoint(item.x, item.y);
}
export const sixCaseSchema = z.object({
  title: z.string().min(1).max(100), x: z.string().min(1).max(200), y: z.string().min(1).max(200),
}).strict().superRefine((item, ctx) => {
  try { analyzeSixCase(item); } catch (error) { ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : "Check the point." }); }
});
export type SixCase = z.infer<typeof sixCaseSchema>;
