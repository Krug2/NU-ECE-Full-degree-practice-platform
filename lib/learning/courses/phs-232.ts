import pack from "@/content/learning-packs/phs-232.json";
import harmonic from "@/content/lessons/phs-232/m01-l01.json";
import energy from "@/content/lessons/phs-232/m01-l02.json";
import damping from "@/content/lessons/phs-232/m01-l03.json";
import driven from "@/content/lessons/phs-232/m01-l04.json";
import travelingWave from "@/content/lessons/phs-232/m02-l01.json";
import { lessonSchema, packSchema } from "../contracts";

export const phs232Pack = packSchema.parse(pack);
export const phs232Lessons = [lessonSchema.parse(harmonic), lessonSchema.parse(energy), lessonSchema.parse(damping), lessonSchema.parse(driven), lessonSchema.parse(travelingWave)];
