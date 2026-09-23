import { notFound } from "next/navigation";
import { courses, courseById } from "@/lib/catalog";
import { CourseWorkspace } from "@/components/course-workspace";

export function generateStaticParams() { return courses.map(course => ({ id: course.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: courseById(id)?.title ?? "Course not found" };
}
export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = courseById(id);
  if (!course) notFound();
  return <CourseWorkspace course={course} />;
}
