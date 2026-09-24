import { expect, it } from "vitest";
import { courses } from "../lib/catalog";
import { learningPacks } from "../lib/learning/catalog";
import { practicalPacks } from "../lib/learning/refreshers/practical-catalog";
import { learningPathLabel, learningPathReleased, learningPathStatus } from "../lib/learning/availability";

it("keeps the lightweight availability registry aligned with every registered learning pack", () => {
  const packs = [...learningPacks, ...practicalPacks];
  for (const course of courses) {
    const pack = packs.find(item => item.courseId === course.id);
    expect(learningPathStatus(course.id), course.id).toBe(pack?.status ?? "planned");
    expect(learningPathReleased(course.id), course.id).toBe(pack?.status === "preview" || pack?.status === "reviewed");
  }
});

it("distinguishes authored lessons, previews and unavailable curriculum entries", () => {
  expect(learningPathLabel("mth-215")).toBe("Lessons in development");
  expect(learningPathLabel("f02")).toBe("Available preview");
  expect(learningPathLabel("phs-232")).toBe("Lessons in development");
  expect(learningPathLabel("csc-310")).toBe("Planning ahead");
  expect(learningPathStatus("missing-course")).toBe("planned");
  expect(learningPathReleased("missing-course")).toBe(false);
});
