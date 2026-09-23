import { z } from "zod";
import catalogData from "@/content/catalog.json";
import resourceData from "@/content/resources.json";

const safeUrl = z.url().refine(value => new URL(value).protocol === "https:");
const courseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), code: z.string(), title: z.string(),
  credits: z.number().positive().nullable(), group: z.enum(["prerequisite", "major", "refresher"]),
  kind: z.enum(["lecture", "lab", "capstone", "refresher"]), subject: z.string(), summary: z.string(),
  status: z.literal("planned"), preparation: z.array(z.string()), resourceIds: z.array(z.string()),
  sourceNote: z.string(), modules: z.array(z.never()),
});
const resourceSchema = z.object({
  id: z.string(), title: z.string(), url: safeUrl,
  additionalLinks: z.array(z.object({ title: z.string(), url: safeUrl })),
  provider: z.string(), kind: z.enum(["Textbook", "Course", "Tool", "Reference"]),
  courseIds: z.array(z.string()), summary: z.string(), note: z.string(),
  usage: z.literal("link-only"), review: z.literal("candidate"),
});
export const catalog = z.object({
  version: z.string(), checkedAt: z.iso.date(), source: safeUrl, creditUnit: z.literal("semester"),
  status: z.literal("provisional"), courses: z.array(courseSchema),
}).parse(catalogData);
export const courses = catalog.courses;
export const resources = z.array(resourceSchema).parse(resourceData);
export type Course = z.infer<typeof courseSchema>;
export type Resource = z.infer<typeof resourceSchema>;
export const subjects = [...new Set(courses.map(course => course.subject))];
export const courseById = (id: string) => courses.find(course => course.id === id);
export const resourcesForCourse = (id: string) => resources.filter(resource => resource.courseIds.includes(id));
export const groupLabels = { prerequisite: "Prerequisite", major: "Major course", refresher: "Optional refresher" };

export function filterCourses(query: string, group = "all", subject = "all") {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return courses.filter(course => (group === "all" || course.group === group)
    && (subject === "all" || course.subject === subject)
    && words.every(word => `${course.code} ${course.title} ${course.subject} ${course.summary}`.toLowerCase().includes(word)));
}
