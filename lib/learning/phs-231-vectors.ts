import { z } from "zod";

export const vectorSchema = z.tuple([z.number().int().min(-10).max(10), z.number().int().min(-10).max(10), z.number().int().min(-10).max(10)]);
export type Vector3 = z.infer<typeof vectorSchema>;
export const phs231VectorActivitySchema = z.object({ kind: z.literal("phs231-vectors"), prompt: z.string().min(1).max(6000), a: vectorSchema, b: vectorSchema }).strict();
export type VectorActivity = z.infer<typeof phs231VectorActivitySchema>;

export function vectorResults(a: Vector3, b: Vector3) {
  vectorSchema.parse(a); vectorSchema.parse(b);
  const sum = a.map((n,i) => n+b[i]) as Vector3;
  const cross = [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]].map(n=>n===0?0:n) as Vector3;
  const dot = a.reduce((n,v,i) => n+v*b[i],0);
  return { sum, cross, dot, magnitudeA: Math.hypot(...a), magnitudeB: Math.hypot(...b), magnitudeSum: Math.hypot(...sum), projectionOnB: Math.hypot(...b) === 0 ? null : dot/Math.hypot(...b) };
}
