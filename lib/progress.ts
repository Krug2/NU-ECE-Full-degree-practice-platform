import { z } from "zod";
import { courses, resources } from "./catalog";

const courseIds = new Set(courses.map(course => course.id));
const resourceIds = new Set(resources.map(resource => resource.id));
const courseId = z.string().refine(id => courseIds.has(id), "Unknown course");
const unique = (items: string[]) => new Set(items).size === items.length;
export const confidenceOptions = { new: "New to me", refresh: "Needs a refresher", comfortable: "Feels familiar" };
export const progressSchema = z.object({
  schemaVersion: z.literal(1),
  profile: z.object({ displayName: z.string().max(60), weeklyHours: z.number().min(.5).max(60) }).strict(),
  plan: z.array(courseId).max(44).refine(unique, "Duplicate courses"),
  bookmarks: z.array(z.string().refine(id => resourceIds.has(id), "Unknown resource")).max(46).refine(unique, "Duplicate bookmarks"),
  notes: z.record(courseId, z.string().max(5000)),
  confidence: z.record(courseId, z.enum(["new", "refresh", "comfortable"])),
  sessions: z.array(z.object({
    id: z.uuid(), courseId, minutes: z.number().int().min(1).max(480),
    at: z.iso.datetime(), note: z.string().max(300),
  }).strict()).max(5000).refine(items => unique(items.map(item => item.id)), "Duplicate sessions"),
}).strict();

export type Progress = z.infer<typeof progressSchema>;
export type Confidence = keyof typeof confidenceOptions;
export const emptyProgress = (): Progress => ({ schemaVersion: 1, profile: { displayName: "", weeklyHours: 5 }, plan: [], bookmarks: [], notes: {}, confidence: {}, sessions: [] });

export function parseBackup(text: string): Progress {
  if (new TextEncoder().encode(text).length > 1_000_000) throw new Error("Choose a progress backup smaller than 1 MB.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("This file is not valid JSON. Choose an ECE Study progress export."); }
  const result = progressSchema.safeParse(value);
  if (!result.success) throw new Error("This backup has an unsupported version or invalid progress. Your current data has not changed.");
  return result.data;
}

export function moveCourse(plan: string[], id: string, direction: -1 | 1): string[] {
  const from = plan.indexOf(id), to = from + direction;
  if (from < 0 || to < 0 || to >= plan.length) return plan;
  const reordered = [...plan];
  [reordered[from], reordered[to]] = [reordered[to], reordered[from]];
  return reordered;
}

export function weekSummary(sessions: Progress["sessions"], now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start); date.setDate(start.getDate() + index);
    const end = new Date(date); end.setDate(date.getDate() + 1);
    const minutes = sessions.filter(session => new Date(session.at) >= date && new Date(session.at) < end && new Date(session.at) <= now).reduce((sum,session) => sum + session.minutes, 0);
    return { label: date.toLocaleDateString("en-US", { weekday: "short" }), minutes };
  });
  return { days, minutes: days.reduce((sum,day) => sum + day.minutes, 0) };
}
