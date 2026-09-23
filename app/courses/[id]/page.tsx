import { notFound } from "next/navigation";
import { courses, courseById } from "@/lib/catalog";
import { CourseWorkspace } from "@/components/course-workspace";
import { learningPack, lessons } from "@/lib/learning/catalog";

export function generateStaticParams() { return courses.map(course => ({ id: course.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: courseById(id)?.title ?? "Course not found" };
}
export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = courseById(id);
  if (!course) notFound();
  const pack=learningPack(id);
  const lessonVersions=Object.fromEntries(lessons.filter(lesson=>lesson.courseId===id).map(lesson=>[lesson.id,lesson.version]));
  return <CourseWorkspace course={course} pack={pack} lessonVersions={lessonVersions} />;
}
