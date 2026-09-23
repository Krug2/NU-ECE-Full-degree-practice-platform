"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStudy } from "@/lib/study-store";
import { Icon } from "./ui";
import "./shell.css";

const links = [
  { href: "/", label: "Overview", icon: "grid" },
  { href: "/curriculum", label: "Curriculum", icon: "book" },
  { href: "/plan", label: "My study plan", icon: "list" },
  { href: "/resources", label: "Resource library", icon: "bookmark" },
  { href: "/settings", label: "Settings", icon: "settings" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const open = menuFor === pathname;
  const { data, issue } = useStudy();
  const active = links.find(link => link.href === pathname) ?? links[1];
  return <>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className={`sidebar ${open ? "is-open" : ""}`}>
      <Link href="/" className="brand" aria-label="ECE Study home"><span className="brand-mark"><Icon name="grid" size={23} /></span><span><strong>ECE Study</strong><small>Room to understand.</small></span></Link>
      <button className="menu-button icon-button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="workspace-navigation" onClick={() => setMenuFor(open ? null : pathname)}><Icon name={open ? "close" : "menu"} /></button>
      <div className="sidebar-content" id="workspace-navigation"><span className="nav-caption">Your workspace</span><nav aria-label="Main navigation">{links.map(link => { const current = pathname === link.href || (link.href === "/curriculum" && pathname.startsWith("/courses/")); return <Link key={link.href} href={link.href} aria-current={current ? "page" : undefined} onClick={() => setMenuFor(null)}><Icon name={link.icon} size={19} /><span>{link.label}</span>{link.href === "/plan" && data.plan.length > 0 && <small>{data.plan.length}</small>}</Link>; })}</nav><div className="sidebar-note"><span className="eyebrow">One course at a time</span><p>Build your understanding.<br />Make the pace your own.</p><Link href="/curriculum?group=refresher" onClick={() => setMenuFor(null)}>Find a refresher <Icon name="arrow" size={14} /></Link></div><div className="sidebar-bottom"><span className="local-dot" /> Progress stays in this browser<Link href="/settings" onClick={() => setMenuFor(null)}>Manage your backup <Icon name="external" size={12} /></Link></div></div>
    </aside>
    <div className="workspace"><header className="topbar"><div><span className="breadcrumb">My learning space</span><span className="breadcrumb-slash">/</span><span>{active.label}</span></div><Link href="/settings" className="learner-chip"><span className="avatar">{data.profile.displayName.trim().slice(0,1).toUpperCase() || "L"}</span><span>{data.profile.displayName || "Independent learner"}</span></Link></header><main id="main-content" className="main-content" tabIndex={-1}>{issue && <div className="notice warning storage-notice" role="alert">{issue} <Link href="/settings">Open backup and recovery settings</Link>.</div>}{children}</main><footer className="app-footer"><span>A free, independent companion to NU&apos;s ECE curriculum.</span><span>Learn with intention. Build with understanding.</span></footer></div>
  </>;
}
