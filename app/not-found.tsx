import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function NotFound() {
  return <EmptyState title="This page isn't in the map" action={<Link className="button" href="/curriculum">Explore the curriculum</Link>}>The address may have changed. Your saved study plan is still available.</EmptyState>;
}
