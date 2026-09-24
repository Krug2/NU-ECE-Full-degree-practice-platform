import type { LearningPack } from "../contracts";
import type { LearningProgress, AssessmentSource } from "../attempts";
import { gradeQuestion } from "../grading";
import type { RefresherPath } from "./contracts";

export function refresherAssessment(path: RefresherPath, mode: "diagnostic" | "recall"): AssessmentSource {
  return { id: mode, courseId: path.courseId, version: path.version, practice: path.diagnostic, checkpoint: path.recall };
}

export function refresherStatus(pack: LearningPack, path: RefresherPath, versions: Record<string, number>, progress: LearningProgress, now = new Date()) {
  return pack.modules.flatMap(module => module.lessons).map(lesson => {
    const evidence = progress.evidence.find(item => item.courseId === pack.courseId && item.lessonId === lesson.id && item.lessonVersion === versions[lesson.id]);
    const probes = progress.attempts
      .filter(attempt => attempt.courseId === pack.courseId && attempt.status === "submitted" && attempt.lessonVersion === (attempt.lessonId === lesson.id ? versions[lesson.id] : path.version))
      .flatMap(attempt => attempt.questions.filter(question => attempt.lessonId === lesson.id || path.targets[question.familyId] === lesson.id).map(question => ({
        at: attempt.submittedAt!, missed: !gradeQuestion(question, attempt.responses[question.id] ?? {}).correct,
        assisted: attempt.mode === "practice" || (attempt.hints[question.id] ?? 0) > 0,
      })));
    const latest = probes.reduce<string | undefined>((date, probe) => !date || probe.at > date ? probe.at : date, undefined);
    const current = probes.filter(probe => probe.at === latest);
    const recentMiss = probes.some(probe => probe.missed && (!evidence || probe.at > evidence.demonstratedAt));
    const due = !!evidence && new Date(evidence.nextReviewAt).getTime() <= now.getTime();
    const state = recentMiss ? "review" : evidence ? due ? "due" : "demonstrated" : current.length ? "practice" : "untested";
    const message = {
      review: "A missed answer has no later independent lesson check. Review the explanation and try a fresh checkpoint.",
      due: "Independent evidence is saved. A delayed retrieval check is due.",
      demonstrated: "Independent lesson evidence is saved for this content version.",
      practice: "The sampled answers were correct. Practice and a short screen do not demonstrate the whole objective.",
      untested: "No submitted evidence yet. Choose a lesson or use the diagnostic to find a starting point.",
    }[state];
    return { ...lesson, state, message, evidence, available: !!versions[lesson.id] };
  });
}
