import { Suspense } from "react";
import { ResourceLibrary } from "@/components/resource-library";

export const metadata = { title: "Resources" };
export default function ResourcesPage() {
  return <Suspense fallback={<p className="loading">Opening the resource library...</p>}><ResourceLibrary /></Suspense>;
}
