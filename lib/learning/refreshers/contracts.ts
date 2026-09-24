import { z } from "zod";
import { slotSchema } from "../contracts";

const key = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
export const refresherPathSchema = z.object({
  courseId: key, version: z.number().int().positive(),
  quickRoute: z.string().min(1), fullRoute: z.string().min(1),
  diagnostic: z.array(slotSchema).min(4).max(16),
  recall: z.array(slotSchema).length(4),
  targets: z.record(key, key),
  support: z.array(z.object({ courseId: key, reason: z.string().min(1) }).strict()).min(1),
  escalation: z.object({ courseId: key, text: z.string().min(1) }).strict(),
}).strict();
export type RefresherPath = z.infer<typeof refresherPathSchema>;
