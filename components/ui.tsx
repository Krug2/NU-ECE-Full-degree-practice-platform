import Link from "next/link";
import type { Course } from "@/lib/catalog";
import { groupLabels } from "@/lib/catalog";

const paths = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  book: "M3 4h6c2 0 3 1 3 2v15c0-2-2-3-4-3H3z M21 4h-6c-2 0-3 1-3 2v15c0-2 2-3 4-3h5z",
  list: "M9 5h12 M9 12h12 M9 19h12 M3 5h1 M3 12h1 M3 19h1",
  bookmark: "M6 3h12v18l-6-4-6 4z",
  settings: "M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6",
  arrow: "M4 12h16 M14 6l6 6-6 6",
  back: "M20 12H4 M10 6l-6 6 6 6",
  up: "M12 20V4 M6 10l6-6 6 6",
  down: "M12 4v16 M6 14l6 6 6-6",
  plus: "M12 5v14 M5 12h14",
  check: "M5 12l4 4L19 6",
  close: "M6 6l12 12 M18 6L6 18",
  search: "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16 M17 17l4 4",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2",
  external: "M14 3h7v7 M10 14L21 3 M9 3H3v18h18v-6",
  spark: "M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z",
  download: "M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4",
  menu: "M3 6h18 M3 12h18 M3 18h18",
  lab: "M9 3h6 M10 3v6L4 19q-1 2 2 2h12q3 0 2-2L14 9V3 M7 15h10",
};

export function Icon({ name, size = 20, className = "" }: { name: keyof typeof paths; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}><path d={paths[name]} /></svg>;
}

export function PageHeading({ eyebrow, title, children, action }: { eyebrow: string; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return <header className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{children && <p>{children}</p>}</div>{action}</header>;
}

export function CourseCard({ course, selected, onToggle, disabled = false }: { course: Course; selected: boolean; onToggle: () => void; disabled?: boolean }) {
  return <article className={`course-card subject-${course.subject.toLowerCase().split(" ")[0]}`}>
    <div className="course-card-meta"><span className="course-code">{course.code}</span><span className="status-dot">Planning ahead</span></div>
    <Link href={`/courses/${course.id}`} className="course-title"><h3>{course.title}</h3></Link>
    <p>{course.summary}</p>
    <div className="course-card-bottom"><span>{groupLabels[course.group]}{course.credits !== null && ` · ${course.credits} cr.`}</span><button className={`icon-button ${selected ? "selected" : ""}`} onClick={onToggle} disabled={disabled} aria-label={`${selected ? "Remove" : "Add"} ${course.code} ${selected ? "from" : "to"} my plan`} aria-pressed={selected}><Icon name={selected ? "check" : "plus"} size={18} /></button></div>
  </article>;
}

export function EmptyState({ title, children, action, icon = "book" }: { title: string; children: React.ReactNode; action?: React.ReactNode; icon?: keyof typeof paths }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name={icon} size={26} /></span><h3>{title}</h3><p>{children}</p>{action}</div>;
}
