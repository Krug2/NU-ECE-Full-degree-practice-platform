import Link from "next/link";
import type { Lesson } from "@/lib/learning/contracts";

export function LessonPreparation({ lesson }: { lesson: Lesson }) {
  if (!lesson.prerequisites.length) return null;
  return <div className="notice"><strong>Suggested review</strong><ul>{lesson.prerequisites.map(item => {
    const courseId = item.courseId ?? lesson.courseId;
    const href = `/courses/${courseId}${item.lessonId ? `/lessons/${item.lessonId}` : ""}`;
    return <li key={href}><Link href={href}>{item.label}</Link>{item.note && <p>{item.note}</p>}</li>;
  })}</ul></div>;
}
