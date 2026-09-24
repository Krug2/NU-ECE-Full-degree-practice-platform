import { z } from "zod";

const magnitude = z.number().finite().min(0).max(10000);
export const measurementInputsSchema = z.object({
  distance: magnitude,
  distanceUncertainty: magnitude,
  time: z.number().finite().positive().max(10000),
  timeUncertainty: magnitude,
}).strict().refine(p => p.distanceUncertainty <= p.distance && p.timeUncertainty < p.time, "Distance bounds must be nonnegative and time bounds strictly positive.");

export const phs231MeasurementActivitySchema = measurementInputsSchema.extend({
  kind: z.literal("phs231-measurement"),
  prompt: z.string().min(1).max(6000),
}).refine(p => p.distanceUncertainty <= p.distance && p.timeUncertainty < p.time, "Distance bounds must be nonnegative and time bounds strictly positive.");

export type MeasurementInputs = z.infer<typeof measurementInputsSchema>;
export type MeasurementActivity = z.infer<typeof phs231MeasurementActivitySchema>;

export function speedBounds(input: MeasurementInputs) {
  const p = measurementInputsSchema.parse(input);
  return {
    central: p.distance / p.time,
    lower: (p.distance - p.distanceUncertainty) / (p.time + p.timeUncertainty),
    upper: (p.distance + p.distanceUncertainty) / (p.time - p.timeUncertainty),
  };
}
