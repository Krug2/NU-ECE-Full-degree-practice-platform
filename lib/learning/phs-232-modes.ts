import { z } from "zod";
import { superpositionInputSchema, reflectionInputSchema } from "./phs-232-superposition";
import { standingModeInputSchema } from "./phs-232-standing-modes";
import { coupledModeInputSchema } from "./phs-232-coupled-modes";

export const phs232ModesActivitySchema = z.object({
  kind: z.literal("phs232-modes"), prompt: z.string().min(1).max(6000),
  initial: z.object({ superposition: superpositionInputSchema, reflection: reflectionInputSchema, standing: standingModeInputSchema, coupled: coupledModeInputSchema }).strict(),
}).strict();
export type ModesActivity = z.infer<typeof phs232ModesActivitySchema>;
