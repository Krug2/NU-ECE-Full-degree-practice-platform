import packData from "@/content/learning-packs/mth-215.json";
import linearLesson from "@/content/lessons/mth-215/m01-l01.json";
import inequalityLesson from "@/content/lessons/mth-215/m01-l02.json";
import { lessonSchema, packSchema } from "./contracts";
import { availableFamilyIds } from "./generate";

export const learningPacks = [packSchema.parse(packData)];
export const lessons = [lessonSchema.parse(linearLesson),lessonSchema.parse(inequalityLesson)];
export const learningPack = (courseId: string) => learningPacks.find(pack => pack.courseId === courseId);
export const lessonById = (courseId: string, lessonId: string) => lessons.find(lesson => lesson.courseId === courseId && lesson.id === lessonId);

for (const lesson of lessons) {
  const pack = learningPack(lesson.courseId);
  const entry = pack?.modules.find(item => item.id === lesson.moduleId)?.lessons.find(item => item.id === lesson.id);
  if (!entry || entry.objective !== lesson.objective) throw new Error(`Unmapped objective: ${lesson.id}`);
  for (const slot of [...lesson.practice, ...lesson.checkpoint]) if (!availableFamilyIds.has(slot.familyId)) throw new Error(`Unavailable family: ${slot.familyId}`);
}
for (const pack of learningPacks) {
  if (pack.status !== "building" && pack.modules.some(item => item.lessons.some(lesson => !lessonById(pack.courseId,lesson.id)))) throw new Error(`Incomplete pack: ${pack.courseId}`);
}
