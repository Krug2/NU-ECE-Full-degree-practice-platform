"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { emptyProgress, parseBackup, type Progress } from "@/lib/progress";
import { downloadBackup, saveProgress, useStudy } from "@/lib/study-store";
import { Icon, PageHeading } from "@/components/ui";

export default function SettingsPage() {
  const { data, ready, locked } = useStudy();
  const [message, setMessage] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [pending, setPending] = useState<Progress | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const saved = saveProgress(current => ({ ...current, profile: { displayName: String(values.get("displayName") || "").trim(), weeklyHours: Number(values.get("weeklyHours")) } }));
    setMessage(saved ? "Preferences saved." : "Could not save preferences. Check your entries and browser storage.");
  };
  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    setPending(null); setBackupMessage("");
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error("Choose a backup smaller than 1 MB.");
      setPending(parseBackup(await file.text()));
    } catch (error) { setBackupMessage(error instanceof Error ? error.message : "This backup could not be opened."); }
  };
  const restore = () => {
    if (!pending) return;
    const saved = saveProgress(() => pending, true);
    setBackupMessage(saved ? "Backup restored. Your plan, notes, bookmarks, and study history are ready." : "Browser storage is unavailable. Export your progress before leaving this page.");
    if (saved) setPending(null);
  };
  const reset = () => {
    const saved = saveProgress(emptyProgress, true);
    setConfirmReset(false);
    setBackupMessage(saved ? "Local progress has been reset." : "Could not persist the reset in browser storage.");
  };
  return <>
    <PageHeading eyebrow="Make this space yours" title="A few personal preferences.">Set a realistic study goal and keep a copy of the progress that matters to you.</PageHeading>
    <div className="two-columns"><div className="stack">
      <section className="panel"><h2>Your study preferences</h2>{ready ? <form key={JSON.stringify(data.profile)} onSubmit={saveProfile}><div className="field"><label htmlFor="display-name">What should we call you? <span className="muted">(optional)</span></label><input id="display-name" name="displayName" autoComplete="given-name" defaultValue={data.profile.displayName} maxLength={60} placeholder="Your first name" disabled={locked} /></div><div className="field"><label htmlFor="weekly-hours">Weekly study goal</label><input id="weekly-hours" name="weeklyHours" type="number" min="0.5" max="60" step="0.5" defaultValue={data.profile.weeklyHours} required disabled={locked} /><small>Hours per week. You can adjust this at any time.</small></div><button className="button" disabled={locked}>Save preferences</button><p className="form-status" role="status">{message}</p></form> : <p className="loading">Loading your preferences...</p>}</section>
      <section className="panel"><h2>Keep your progress with you</h2><p className="muted">Export a backup of your plan, notes, familiarity choices, bookmarks, and study sessions. Import it into another browser when you need to move.</p><button className="button secondary" disabled={!ready} onClick={() => { try { downloadBackup(); setBackupMessage("Your progress export is ready to download."); } catch (error) { setBackupMessage(error instanceof Error ? error.message : "The export could not be created."); } }}><Icon name="download" size={17} />Export progress</button><div className="field section-space"><label htmlFor="progress-backup">Import a progress backup</label><input id="progress-backup" type="file" accept=".json,application/json" onChange={readFile} disabled={!ready} /><small>Choose an ECE Study JSON export, up to 1 MB. You can review it before replacing anything.</small></div>{pending && <div className="notice warning"><strong>Review this backup</strong><p>{pending.plan.length} planned courses, {pending.bookmarks.length} bookmarks, {Object.keys(pending.notes).length} notes, and {pending.sessions.length} study sessions.</p><p>Restoring replaces the progress currently saved in this browser. Export the current version first if you want to keep it.</p><div className="form-actions"><button className="button" onClick={restore}>Replace with this backup</button><button className="button secondary" onClick={() => setPending(null)}>Cancel import</button></div></div>}<p className="form-status" role="status">{backupMessage}</p></section>
      <section className="panel"><h2>Start fresh</h2><p className="muted">Clear this app&apos;s saved plan, notes, preferences, bookmarks, and study history in this browser.</p>{confirmReset ? <div className="notice warning"><p><strong>Reset all local progress?</strong> Export a backup first if you want to keep it. This cannot be undone without a backup.</p><div className="form-actions"><button className="button danger" onClick={reset}>Confirm reset</button><button className="button secondary" onClick={() => setConfirmReset(false)}>Keep my progress</button></div></div> : <button className="button secondary" disabled={!ready} onClick={() => setConfirmReset(true)}>Reset local progress</button>}</section>
    </div><div className="stack">
      <section className="panel"><span className="eyebrow">Your data, your space</span><h2>Saved in this browser.</h2><p className="muted">No account is needed. This version keeps your progress on this device, with no automatic sync between browsers.</p><p className="muted">Clearing browser data or using a temporary browsing session may remove your progress. Regular exports give you a copy to keep.</p><div className="notice">Your notes and study history stay private to this browser. The app does not upload transcripts or make transfer-credit decisions.</div></section>
      <section className="panel"><h2>One course at a time</h2><p className="muted">The foundation is here. Each course will have its own planning, building, and review phase so coverage grows deliberately.</p><p className="muted">Lessons, assessments, and course-completion records will become available as those learning packs are released.</p><span className="pill">Free learning access</span></section>
    </div></div>
  </>;
}
