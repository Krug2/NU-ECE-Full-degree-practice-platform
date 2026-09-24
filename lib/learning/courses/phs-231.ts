import pack from "@/content/learning-packs/phs-231.json";
import measurement from "@/content/lessons/phs-231/m01-l01.json";
import vectors from "@/content/lessons/phs-231/m01-l02.json";
import motion from "@/content/lessons/phs-231/m02-l01.json";
import frames from "@/content/lessons/phs-231/m02-l02.json";
import projectiles from "@/content/lessons/phs-231/m02-l03.json";
import forces from "@/content/lessons/phs-231/m03-l01.json";
import friction from "@/content/lessons/phs-231/m03-l02.json";
import drag from "@/content/lessons/phs-231/m03-l03.json";
import { lessonSchema, packSchema } from "../contracts";

export const phs231Pack = packSchema.parse(pack);
export const phs231Lessons = [lessonSchema.parse(measurement), lessonSchema.parse(vectors), lessonSchema.parse(motion), lessonSchema.parse(frames), lessonSchema.parse(projectiles), lessonSchema.parse(forces), lessonSchema.parse(friction), lessonSchema.parse(drag)];
