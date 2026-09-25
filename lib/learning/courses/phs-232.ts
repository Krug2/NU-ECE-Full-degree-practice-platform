import pack from "@/content/learning-packs/phs-232.json";
import harmonic from "@/content/lessons/phs-232/m01-l01.json";
import energy from "@/content/lessons/phs-232/m01-l02.json";
import { lessonSchema, packSchema } from "../contracts";

export const phs232Pack = packSchema.parse(pack);
export const phs232Lessons = [lessonSchema.parse(harmonic), lessonSchema.parse(energy)];
