import mathematics from "@/content/learning-packs/mth-215.json";
import mechanics from "@/content/learning-packs/phs-231.json";
import physicsTwo from "@/content/learning-packs/phs-232.json";
import { refresherReleaseStatus } from "./refreshers/availability";

const degreePacks = [mathematics, mechanics, physicsTwo];
export type LearningPathStatus = "planned" | "building" | "preview" | "reviewed";

export function learningPathStatus(courseId: string): LearningPathStatus {
  const status = degreePacks.find(pack => pack.courseId === courseId)?.status ?? refresherReleaseStatus(courseId);
  return status === "building" || status === "preview" || status === "reviewed" ? status : "planned";
}

export function learningPathLabel(courseId: string) {
  return { planned: "Planning ahead", building: "Lessons in development", preview: "Available preview", reviewed: "Subject reviewed" }[learningPathStatus(courseId)];
}

export function learningPathReleased(courseId: string) {
  return ["preview", "reviewed"].includes(learningPathStatus(courseId));
}
