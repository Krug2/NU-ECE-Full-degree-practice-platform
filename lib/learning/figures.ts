import { z } from "zod";
import { piecewiseSchema } from "./piecewise";
import { transformedFunctionSchema } from "./transformations";

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
export const transformedFigureSchema = z.object({
  kind:z.literal("transformed-function"),title:z.string().min(1).max(100),model:transformedFunctionSchema,
  extent:z.number().int().min(2).max(24).default(12),showParent:z.boolean().default(false),
}).strict();
export const dataTableFigureSchema = z.object({
  kind: z.literal("data-table"), title: z.string().min(1).max(100),
  columns: z.array(z.string().min(1).max(100).regex(/\S/)).min(2).max(6),
  rows: z.array(z.array(z.string().min(1).max(160).regex(/\S/)).min(2).max(6)).min(1).max(24),
  note: z.string().max(1000).default(""),
}).strict().refine(figure => new Set(figure.columns).size === figure.columns.length, "Column labels must be unique")
  .refine(figure => figure.rows.every(row => row.length === figure.columns.length), "Each row must match the column labels");
export const questionFigureSchema = z.discriminatedUnion("kind", [coordinateFigureSchema, triangleFigureSchema, piecewiseFigureSchema, transformedFigureSchema, dataTableFigureSchema]);
export type DataTableFigureData = z.infer<typeof dataTableFigureSchema>;
export type TransformedFigure = z.infer<typeof transformedFigureSchema>;
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
