import pack from "@/content/learning-packs/f01.json";
import l01 from "@/content/lessons/f01/m01-l01.json";
import l02 from "@/content/lessons/f01/m01-l02.json";
import l03 from "@/content/lessons/f01/m01-l03.json";
import l04 from "@/content/lessons/f01/m01-l04.json";
import path from "@/content/refresher-paths/f01.json";
import algebraPack from "@/content/learning-packs/f02.json";
import algebraPath from "@/content/refresher-paths/f02.json";
import { f02Lessons } from "./f02";
import { lessonSchema, packSchema } from "../contracts";
import { refresherPathSchema } from "./contracts";

export const refresherPacks = [packSchema.parse(pack), packSchema.parse(algebraPack)];
export const refresherLessons = [...[l01, l02, l03, l04].map(data => lessonSchema.parse(data)), ...f02Lessons];
export const refresherPaths = [refresherPathSchema.parse(path), refresherPathSchema.parse(algebraPath)];
export const refresherPath = (courseId: string) => refresherPaths.find(path => path.courseId === courseId);
