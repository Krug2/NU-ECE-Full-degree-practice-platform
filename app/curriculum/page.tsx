import { Suspense } from "react";
import { CurriculumBrowser } from "@/components/curriculum-browser";

export const metadata = { title: "Curriculum" };
export default function CurriculumPage() {
  return <Suspense fallback={<p className="loading">Opening the curriculum...</p>}><CurriculumBrowser /></Suspense>;
}
