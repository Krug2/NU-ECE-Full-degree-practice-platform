import { expect, it } from "vitest";
import { lessonSchema } from "../lib/learning/contracts";
import existing from "../content/lessons/mth-215/m01-l01.json";

it("preserves same-course references and permits explicit cross-course preparation", () => {
  const old = lessonSchema.parse(existing);
  expect(old.prerequisites).toEqual(existing.prerequisites);
  const lesson = lessonSchema.parse({ ...existing, prerequisites: [
    { label: "Available algebra", courseId: "mth-215", lessonId: "b05" },
    { label: "Calculus preparation", courseId: "csc-208", note: "Course under construction; use the linked free reading for now." },
  ] });
  expect(lesson.prerequisites[0].lessonId).toBe("b05");
  expect(lesson.prerequisites[1].lessonId).toBeUndefined();
  expect(lessonSchema.safeParse({ ...existing, prerequisites: [{ label: "Missing destination" }] }).success).toBe(false);
});
