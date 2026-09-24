import pack from "@/content/learning-packs/phs-231.json";
import measurement from "@/content/lessons/phs-231/m01-l01.json";
import { lessonSchema, packSchema } from "../contracts";

export const phs231Pack = packSchema.parse(pack);
export const phs231Lessons = [lessonSchema.parse(measurement)];
