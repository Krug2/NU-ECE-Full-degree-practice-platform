import { notFound } from "next/navigation";
import { courses, courseById } from "@/lib/catalog";
import { CourseWorkspace } from "@/components/course-workspace";
import { learningPack, lessons } from "@/lib/learning/catalog";
import { refresherPath } from "@/lib/learning/refreshers/catalog";
import { RefresherWorkspace } from "@/components/learning/refresher-workspace";
import { practicalPack,practicalPath,practicalLessons } from "@/lib/learning/refreshers/practical-catalog";
import { PracticalWorkspace } from "@/components/learning/practical-workspace";

export function generateStaticParams() { return courses.map(course => ({ id: course.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: courseById(id)?.title ?? "Course not found" };
}
export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = courseById(id);
  if (!course) notFound();
  const practical=practicalPack(id),practicalRoute=practicalPath(id);
  if(practical&&practicalRoute)return <PracticalWorkspace course={course} pack={practical} path={practicalRoute} lessons={practicalLessons.filter(l=>l.courseId===id)}/>;
  const pack=learningPack(id);
  const lessonVersions=Object.fromEntries(lessons.filter(lesson=>lesson.courseId===id).map(lesson=>[lesson.id,lesson.version]));
  const path=refresherPath(id);
  if(course.group==="refresher"&&pack&&path) return <RefresherWorkspace course={course} pack={pack} path={path} versions={lessonVersions}/>;
  return <CourseWorkspace course={course} pack={pack} lessonVersions={lessonVersions} />;
}
