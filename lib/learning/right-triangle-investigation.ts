import { z } from "zod";
import { formatExact, multiplyExact, parseExact } from "./exact-number";
import { compareRealExact, parseRealEndpoint } from "./exact-order";
import { parseRational } from "./rational";
import { exactRightTriangle } from "./right-triangle";

type TriangleCase = { title: string; AB: string; AC: string; BC: string; angleAt: "B" | "C"; scale: string };
export function analyzeRightTriangleInvestigation(item: TriangleCase) {
  for (const side of [item.AB, item.AC, item.BC]) {
    const value = parseRealEndpoint(side);
    if (compareRealExact(value, parseExact("1/10")) < 0 || compareRealExact(value, parseExact("100")) > 0) throw new Error("Use exact side lengths from 1/10 to 100 cm in this investigation.");
  }
  const scale = parseRational(item.scale);
  if (scale.numerator * 10n < scale.denominator || scale.numerator > 10n * scale.denominator) throw new Error("Use a rational scale factor from 1/10 to 10.");
  const B = exactRightTriangle(item.AB, item.AC, item.BC, "B"), C = exactRightTriangle(item.AB, item.AC, item.BC, "C");
  const scaled = Object.fromEntries((["AB", "AC", "BC"] as const).map(side => [side, formatExact(multiplyExact(parseExact(item[side]), parseExact(item.scale)))])) as Record<"AB" | "AC" | "BC", string>;
  return { B, C, selected: item.angleAt === "B" ? B : C, scaled };
}
export const rightTriangleCaseSchema = z.object({
  title: z.string().min(1).max(100),
  AB: z.string().min(1).max(200), AC: z.string().min(1).max(200), BC: z.string().min(1).max(200),
  angleAt: z.enum(["B", "C"]), scale: z.string().min(1).max(30),
}).strict().superRefine((item, ctx) => {
  try { analyzeRightTriangleInvestigation(item); } catch (error) { ctx.addIssue({ code: "custom", message: error instanceof Error ? error.message : "Check the triangle." }); }
});
export type RightTriangleCase = z.infer<typeof rightTriangleCaseSchema>;
