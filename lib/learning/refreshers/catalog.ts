import pack from "@/content/learning-packs/f01.json";
import l01 from "@/content/lessons/f01/m01-l01.json";
import l02 from "@/content/lessons/f01/m01-l02.json";
import l03 from "@/content/lessons/f01/m01-l03.json";
import l04 from "@/content/lessons/f01/m01-l04.json";
import path from "@/content/refresher-paths/f01.json";
import { lessonSchema, packSchema } from "../contracts";
import { refresherPathSchema } from "./contracts";

export const refresherPacks = [packSchema.parse(pack)];
export const refresherLessons = [l01, l02, l03, l04].map(data => lessonSchema.parse(data));
export const refresherPaths = [refresherPathSchema.parse(path)];
export const refresherPath = (courseId: string) => refresherPaths.find(path => path.courseId === courseId);
