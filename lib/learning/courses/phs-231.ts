import pack from "@/content/learning-packs/phs-231.json";
import measurement from "@/content/lessons/phs-231/m01-l01.json";
import vectors from "@/content/lessons/phs-231/m01-l02.json";
import motion from "@/content/lessons/phs-231/m02-l01.json";
import frames from "@/content/lessons/phs-231/m02-l02.json";
import { lessonSchema, packSchema } from "../contracts";

export const phs231Pack = packSchema.parse(pack);
export const phs231Lessons = [lessonSchema.parse(measurement), lessonSchema.parse(vectors), lessonSchema.parse(motion), lessonSchema.parse(frames)];
