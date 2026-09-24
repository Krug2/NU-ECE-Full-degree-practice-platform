import { z } from "zod";
import { lessonSchema, slotSchema } from "../contracts";

const key = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
export const lessonAdaptersSchema = z.object({
  courseId: key, moduleId: key, version: z.number().int().positive(),
  lessons: z.array(z.object({
    id: key, sourceId: key, title: z.string().min(1), requires: z.array(key),
    why: z.string().min(1), recall: z.array(z.string().min(1)).min(2),
    estimatedMinutes: z.number().int().positive(), retrieval: z.string().min(1),
    readings: lessonSchema.shape.readings, checkpoint: z.array(slotSchema).length(4).optional(),
    sourceReview: z.object({ courseId: key, lessonId: key, version: z.number().int().positive(), checkedAt: z.iso.date() }).strict(),
  }).strict()).min(1),
}).strict();

export function adaptRefresherLessons(data: unknown, sources: Record<string, unknown>) {
  const adapters = lessonAdaptersSchema.parse(data);
  const family = (id: string) => id.replace(/^mth-/, adapters.courseId+"-");
  return adapters.lessons.map(descriptor => {
    const source = lessonSchema.parse(sources[descriptor.sourceId]);
    if (source.courseId !== descriptor.sourceReview.courseId || source.id !== descriptor.sourceReview.lessonId || source.version !== descriptor.sourceReview.version) throw new Error("Review changed source content before adapting it");
    const prerequisites = descriptor.requires.map(id => {
      const required = adapters.lessons.find(item => item.id === id);
      if (!required) throw new Error("Unmapped refresher prerequisite");
      return { label: required.title, lessonId: id };
    });
    return lessonSchema.parse({
      ...source, id: descriptor.id, courseId: adapters.courseId, moduleId: adapters.moduleId, version: adapters.version,
      title: descriptor.title, why: descriptor.why, estimatedMinutes: descriptor.estimatedMinutes, prerequisites,
      sections: [{ heading: "Quick recall", paragraphs: descriptor.recall }, ...source.sections],
      guided: { ...source.guided, question: { ...source.guided.question, id: adapters.courseId+"-"+descriptor.id+"-guided", familyId: "guided-"+adapters.courseId+"-"+descriptor.id, courseId: adapters.courseId, objectiveId: descriptor.id } },
      practice: source.practice.map(slot => ({ ...slot, familyId: family(slot.familyId) })),
      checkpoint: descriptor.checkpoint ?? source.checkpoint.map(slot => ({ ...slot, familyId: family(slot.familyId) })),
      retrieval: descriptor.retrieval, readings: descriptor.readings,
    });
  });
}
