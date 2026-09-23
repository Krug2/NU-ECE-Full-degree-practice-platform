"use client";

import { useSyncExternalStore } from "react";
import { emptyProgress, parseBackup, progressSchema, type Progress } from "./progress";

const key = "ece-study:progress:v1";
type Snapshot = { data: Progress; ready: boolean; issue: string; locked: boolean };
const initial: Snapshot = { data: emptyProgress(), ready: false, issue: "", locked: false };
let snapshot: Snapshot = initial;
const listeners = new Set<() => void>();

function load(): Snapshot {
  if (snapshot.ready || typeof window === "undefined") return snapshot;
  try {
    const text = window.localStorage.getItem(key);
    snapshot = { data: text ? parseBackup(text) : emptyProgress(), ready: true, issue: "", locked: false };
  } catch (error) {
    snapshot = { data: emptyProgress(), ready: true, issue: error instanceof Error ? error.message : "Browser storage is unavailable.", locked: true };
  }
  return snapshot;
}

const notify = () => listeners.forEach(listener => listener());
const onStorage = (event: StorageEvent) => {
  if (event.key === key || event.key === null) { snapshot = initial; load(); notify(); }
};
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener("storage", onStorage); };
}

export function useStudy() {
  return useSyncExternalStore(subscribe, load, () => initial);
}

export function saveProgress(update: (data: Progress) => Progress, replace = false): boolean {
  const current = load();
  if (current.locked && !replace) return false;
  const result = progressSchema.safeParse(update(current.data));
  if (!result.success) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(result.data));
    snapshot = { data: result.data, ready: true, issue: "", locked: false };
  } catch {
    snapshot = { data: result.data, ready: true, issue: "Browser storage could not save your changes. Export a backup from Settings before closing this page.", locked: false };
  }
  notify();
  return !snapshot.issue;
}

export function toggleCourse(id: string) {
  return saveProgress(data => ({ ...data, plan: data.plan.includes(id) ? data.plan.filter(item => item !== id) : [...data.plan, id] }));
}

export function toggleBookmark(id: string) {
  return saveProgress(data => ({ ...data, bookmarks: data.bookmarks.includes(id) ? data.bookmarks.filter(item => item !== id) : [...data.bookmarks, id] }));
}

export function downloadBackup() {
  const current = load();
  const text = current.locked ? window.localStorage.getItem(key) : JSON.stringify(current.data, null, 2);
  if (!text) throw new Error("There is no stored progress to export.");
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = `ece-study-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
