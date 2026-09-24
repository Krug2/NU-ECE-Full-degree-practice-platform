import packData from "@/content/learning-packs/mth-215.json";
import numberBridge from "@/content/lessons/mth-215/b01.json";
import powerBridge from "@/content/lessons/mth-215/b02.json";
import factoringBridge from "@/content/lessons/mth-215/b03.json";
import fractionBridge from "@/content/lessons/mth-215/b04.json";
import coordinateBridge from "@/content/lessons/mth-215/b05.json";
import triangleBridge from "@/content/lessons/mth-215/b06.json";
import linearLesson from "@/content/lessons/mth-215/m01-l01.json";
import inequalityLesson from "@/content/lessons/mth-215/m01-l02.json";
import quadraticLesson from "@/content/lessons/mth-215/m01-l03.json";
import restrictionLesson from "@/content/lessons/mth-215/m01-l04.json";
import functionLesson from "@/content/lessons/mth-215/m02-l01.json";
import transformationLesson from "@/content/lessons/mth-215/m02-l02.json";
import compositionLesson from "@/content/lessons/mth-215/m02-l03.json";
import calibrationLesson from "@/content/lessons/mth-215/m02-l04.json";
import { lessonSchema, packSchema } from "./contracts";
import { availableFamilyIds } from "./generate";
import { refresherPacks, refresherLessons } from "./refreshers/catalog";

export const learningPacks = [packSchema.parse(packData), ...refresherPacks];
export const lessons = [lessonSchema.parse(numberBridge),lessonSchema.parse(powerBridge),lessonSchema.parse(factoringBridge),lessonSchema.parse(fractionBridge),lessonSchema.parse(coordinateBridge),lessonSchema.parse(triangleBridge),lessonSchema.parse(linearLesson),lessonSchema.parse(inequalityLesson),lessonSchema.parse(quadraticLesson),lessonSchema.parse(restrictionLesson),lessonSchema.parse(functionLesson),lessonSchema.parse(transformationLesson),lessonSchema.parse(compositionLesson),lessonSchema.parse(calibrationLesson)];
lessons.push(...refresherLessons);
export const learningPack = (courseId: string) => learningPacks.find(pack => pack.courseId === courseId);
export const lessonById = (courseId: string, lessonId: string) => lessons.find(lesson => lesson.courseId === courseId && lesson.id === lessonId);

for (const lesson of lessons) {
  const pack = learningPack(lesson.courseId);
  const entry = lesson.moduleId === "foundations" ? pack?.bridges.find(item=>item.id===lesson.id) : pack?.modules.find(item => item.id === lesson.moduleId)?.lessons.find(item => item.id === lesson.id);
  if (!entry || entry.objective !== lesson.objective) throw new Error(`Unmapped objective: ${lesson.id}`);
  for (const slot of [...lesson.practice, ...lesson.checkpoint]) if (!availableFamilyIds.has(slot.familyId)) throw new Error(`Unavailable family: ${slot.familyId}`);
}
for (const pack of learningPacks) {
  if (pack.status !== "building" && [...pack.bridges,...pack.modules.flatMap(item=>item.lessons)].some(lesson=>!lessonById(pack.courseId,lesson.id))) throw new Error(`Incomplete pack: ${pack.courseId}`);
}
