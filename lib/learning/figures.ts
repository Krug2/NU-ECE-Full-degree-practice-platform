import { z } from "zod";
import { piecewiseSchema } from "./piecewise";

export const coordinatePointSchema = z.object({ name: z.string().regex(/^[A-D]$/), xTicks: z.number().int().min(-4).max(4), yTicks: z.number().int().min(-4).max(4) }).strict();
export const coordinateFigureSchema = z.object({
  kind: z.literal("coordinates"), title: z.string().min(1).max(100), xLabel: z.string().min(1).max(40), yLabel: z.string().min(1).max(40),
  xStep: z.number().int().min(1).max(10), yStep: z.number().int().min(1).max(10),
  points: z.array(coordinatePointSchema).min(1).max(4), line: z.boolean().default(false),
}).strict().refine(figure => new Set(figure.points.map(point => point.name)).size === figure.points.length, "Point labels must be unique")
  .refine(figure => !figure.line || figure.points.length === 2 && (figure.points[0].xTicks !== figure.points[1].xTicks || figure.points[0].yTicks !== figure.points[1].yTicks), "A line requires two distinct points");
export type CoordinateFigure = z.infer<typeof coordinateFigureSchema>;
export type CoordinatePoint = z.infer<typeof coordinatePointSchema>;
export const triangleFigureSchema = z.object({
  kind: z.literal("right-triangle"), title: z.string().min(1).max(100), angleAt: z.enum(["B", "C"]),
  AB: z.string().min(1).max(120), AC: z.string().min(1).max(120), BC: z.string().min(1).max(120),
}).strict();
export const piecewiseFigureSchema = z.object({
  kind: z.literal("piecewise"), title: z.string().min(1).max(100),
  xLabel: z.string().min(1).max(40), yLabel: z.string().min(1).max(40), model: piecewiseSchema,
}).strict();
export const questionFigureSchema = z.discriminatedUnion("kind", [coordinateFigureSchema, triangleFigureSchema, piecewiseFigureSchema]);
export type PiecewiseFigure = z.infer<typeof piecewiseFigureSchema>;
export type TriangleFigure = z.infer<typeof triangleFigureSchema>;
export type QuestionFigureData = z.infer<typeof questionFigureSchema>;
export const coordinatePixel = (point: Pick<CoordinatePoint, "xTicks" | "yTicks">) => ({ x: 180+26*point.xTicks, y: 170-24*point.yTicks });
export const coordinateValue = (figure: CoordinateFigure, point: CoordinatePoint) => ({ x: figure.xStep*point.xTicks, y: figure.yStep*point.yTicks });
export function describeCoordinate(point: CoordinatePoint): string {
  const horizontal = point.xTicks === 0 ? "on the vertical axis" : `${Math.abs(point.xTicks)} horizontal tick intervals ${point.xTicks < 0 ? "left" : "right"} of the vertical axis`;
  const vertical = point.yTicks === 0 ? "on the horizontal axis" : `${Math.abs(point.yTicks)} vertical tick intervals ${point.yTicks < 0 ? "below" : "above"} the horizontal axis`;
  return `${point.name} is ${horizontal}, and ${vertical}.`;
}
