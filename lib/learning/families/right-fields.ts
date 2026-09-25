import type { AnswerField } from "../contracts";

export const rightBase = (familyId: string, id: string) => ({ id, familyId, familyVersion: 1, courseId: "mth-215", objectiveId: "m06-l02", critical: true });
export const exactLength = (id: string, label: string, expected: string, unit = ""): AnswerField => ({
  id, label, kind: "exact", expected, unit, help: "Keep this answer exact. Use fractions and sqrt(number); equivalent radical forms are accepted.",
});
export const measured = (id: string, label: string, expected: number, unit: string): AnswerField => ({
  id, label, kind: "numeric", expected, unit, absoluteTolerance: unit === "degrees" ? .05 : .005, relativeTolerance: 0,
  help: unit === "degrees" ? "Enter degrees to the nearest 0.1 degree. Tolerance: 0.05 degree." : "Round the final answer to the nearest 0.01 of the stated unit. Tolerance: 0.005. Retain intermediate precision.",
});
export const choose = (id: string, label: string, correct: string, options: [string, string, string][]): AnswerField => ({
  id, label, kind: "choice", correct, help: "", options: options.map(([id, label, feedback]) => ({ id, label, feedback })),
});
