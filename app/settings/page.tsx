"use client";

import { useState,type ChangeEvent,type FormEvent } from "react";
import { backupByteLimit,backupLimitLabel,emptyProgress,parseBackup,type Progress } from "@/lib/progress";
import { attemptLimit } from "@/lib/learning/attempts";
import { downloadBackup,getStudySnapshot,loadSavedProgress,replaceProgress,retryProgressSave,reviewProgressReplacement,saveProgress,useStudy } from "@/lib/study-store";
import type { ReplacementCheck } from "@/lib/progress-repository";
import { useStudyDraft } from "@/lib/use-study-draft";
import { Icon,PageHeading } from "@/components/ui";

export default function SettingsPage(){
  const {data,ready,locked,dirty,saving}=useStudy();
  const name=useStudyDraft(data.profile.displayName,"profile-name"),hours=useStudyDraft(String(data.profile.weeklyHours),"profile-hours");
  const [message,setMessage]=useState(""),[backupMessage,setBackupMessage]=useState("");
  const [pending,setPending]=useState<{data:Progress;expected:ReplacementCheck}|null>(null);
  const [confirmReset,setConfirmReset]=useState<ReplacementCheck|null>(null),[confirmDiscard,setConfirmDiscard]=useState(false);
  const [working,setWorking]=useState(false),[profileSaving,setProfileSaving]=useState(false);
  const saveProfile=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();const values=new FormData(event.currentTarget);
    const profile={displayName:String(values.get("displayName")||"").trim(),weeklyHours:Number(values.get("weeklyHours"))};
    setProfileSaving(true);setMessage("Saving preferences...");
    const saved=await saveProgress(current=>({...current,profile}));
    setProfileSaving(false);setMessage(saved?"Preferences saved.":"Could not save preferences. Check your entries and browser storage.");
  };
  const readFile=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.currentTarget.files?.[0];event.currentTarget.value="";setPending(null);setBackupMessage("");
    if(!file)return;setWorking(true);
    try{
      if(file.size>backupByteLimit)throw new Error(`Choose a backup no larger than ${backupLimitLabel}.`);
      const data=parseBackup(await file.text()),expected=await reviewProgressReplacement();
      setPending({data,expected});
    }catch(error){setBackupMessage(error instanceof Error?error.message:"This backup could not be opened.");}
    finally{setWorking(false);}
  };
  const restore=async()=>{
    if(!pending)return;setWorking(true);
    const saved=await replaceProgress(pending.data,pending.expected);
    setWorking(false);setPending(null);
    setBackupMessage(saved?"Backup restored. Your plan, notes, bookmarks, and study history are ready.":getStudySnapshot().issue+" Import the backup again to review it before another attempt.");
  };
  const beginReset=async()=>{
    setWorking(true);
    try{setConfirmReset(await reviewProgressReplacement());}
    catch(error){setBackupMessage(error instanceof Error?error.message:"Saved progress could not be reviewed.");}
    finally{setWorking(false);}
  };
  const reset=async()=>{
    if(!confirmReset)return;setWorking(true);
    const saved=await replaceProgress(emptyProgress(),confirmReset);
    setConfirmReset(null);setWorking(false);
    setBackupMessage(saved?"Local progress has been reset.":getStudySnapshot().issue);
  };
  const exportProgress=async()=>{
    setWorking(true);
    try{await downloadBackup();setBackupMessage("Your progress export is ready to download.");}
    catch(error){setBackupMessage(error instanceof Error?error.message:"The export could not be created.");}
    finally{setWorking(false);}
  };
  const retry=async()=>{
    setWorking(true);const saved=await retryProgressSave();setWorking(false);
    setBackupMessage(saved?"Your unsaved change has now been saved.":getStudySnapshot().issue);
  };
  const discard=async()=>{
    setWorking(true);const loaded=await loadSavedProgress();setWorking(false);setConfirmDiscard(false);
    setBackupMessage(loaded?"Loaded the saved progress. The unsaved change was discarded.":getStudySnapshot().issue);
  };
  const busy=working||saving;
  return <>
    <PageHeading eyebrow="Make this space yours" title="A few personal preferences.">Set a realistic study goal and keep a copy of the progress that matters to you.</PageHeading>
    <div className="two-columns"><div className="stack">
      <section className="panel"><h2>Your study preferences</h2>{ready?<form onSubmit={saveProfile}><div className="field"><label htmlFor="display-name">What should we call you? <span className="muted">(optional)</span></label><input id="display-name" name="displayName" autoComplete="given-name" value={name.value} onChange={event=>name.setValue(event.target.value)} maxLength={60} placeholder="Your first name" disabled={locked}/></div><div className="field"><label htmlFor="weekly-hours">Weekly study goal</label><input id="weekly-hours" name="weeklyHours" type="number" min="0.5" max="60" step="0.5" value={hours.value} onChange={event=>hours.setValue(event.target.value)} required disabled={locked}/><small>Hours per week. You can adjust this at any time.</small></div><button className="button" disabled={locked||profileSaving}>{profileSaving?"Saving preferences...":"Save preferences"}</button><p className="form-status" role="status">{message}</p>{(name.changed||hours.changed)&&<div className="notice warning" role="status"><p>Saved preferences changed while you were editing. Your draft has been kept.</p><button type="button" className="button secondary" onClick={()=>{name.loadSaved();hours.loadSaved();}}>Load saved preferences</button></div>}</form>:<p className="loading">Loading your preferences...</p>}</section>
      <section className="panel"><h2>Keep your progress with you</h2><p className="muted">Export your preferences, plan, course and lesson notes, bookmarks, study sessions, saved attempts, and checkpoint evidence. Import the backup into another browser when you need to move.</p><button className="button secondary" disabled={!ready||working} onClick={exportProgress}><Icon name="download" size={17}/>Export progress</button>
        {dirty&&<div className="notice warning section-space"><strong>An unsaved change needs recovery.</strong><p>Export keeps the unsaved change. Retrying saves it only if the saved version has not changed in another tab.</p><div className="form-actions"><button className="button" disabled={busy} onClick={retry}>Retry saving</button><button className="button secondary" disabled={busy} onClick={()=>setConfirmDiscard(true)}>Load saved progress</button></div>{confirmDiscard&&<div className="section-space"><p>Discard the unsaved change kept for export and load the saved version? Export first if you want to keep that change.</p><div className="form-actions"><button className="button danger" disabled={busy} onClick={discard}>Discard unsaved change</button><button className="button secondary" disabled={busy} onClick={()=>setConfirmDiscard(false)}>Keep unsaved change</button></div></div>}</div>}
        <div className="field section-space"><label htmlFor="progress-backup">Import a progress backup</label><input id="progress-backup" type="file" accept=".json,application/json" onChange={readFile} disabled={!ready||busy}/><small>Choose an ECE Study JSON export, up to {backupLimitLabel}. You can review it before replacing anything.</small></div>
        {ready&&<p className="muted">{data.learning.attempts.length.toLocaleString("en-US")} of {attemptLimit.toLocaleString("en-US")} saved attempts. Questions and notes share the {backupLimitLabel} backup allowance. After exporting, you can remove older attempt details from a lesson&apos;s history while keeping its demonstrated-objective evidence.</p>}
        {pending&&<div className="notice warning"><strong>Review this backup</strong><p>{pending.data.plan.length} planned courses, {pending.data.bookmarks.length} bookmarks, {Object.keys(pending.data.notes).length} course notes, and {pending.data.sessions.length} study sessions.</p><p>{pending.data.learning.attempts.length} saved attempts, {pending.data.learning.evidence.length} checkpoint evidence records, and {Object.values(pending.data.learning.notes).reduce((count,notes)=>count+Object.keys(notes).length,0)} lesson notes.</p><p>Restoring replaces the progress currently saved in this browser. Export the current version first if you want to keep it. A change in another tab requires a new review.</p><div className="form-actions"><button className="button" disabled={busy} onClick={restore}>Replace with this backup</button><button className="button secondary" disabled={busy} onClick={()=>setPending(null)}>Cancel import</button></div></div>}
        <p className="form-status" role="status">{backupMessage}</p>
      </section>
      <section className="panel"><h2>Start fresh</h2><p className="muted">Clear this app&apos;s saved plan, notes, preferences, bookmarks, and study history in this browser.</p>{confirmReset?<div className="notice warning"><p><strong>Reset all local progress?</strong> Export a backup first if you want to keep it. This cannot be undone without a backup.</p><div className="form-actions"><button className="button danger" disabled={busy} onClick={reset}>Confirm reset</button><button className="button secondary" disabled={busy} onClick={()=>setConfirmReset(null)}>Keep my progress</button></div></div>:<button className="button secondary" disabled={!ready||busy} onClick={beginReset}>Reset local progress</button>}</section>
    </div><div className="stack">
      <section className="panel"><span className="eyebrow">Your data, your space</span><h2>Saved in this browser.</h2><p className="muted">No account is needed. This version keeps your progress on this device, with no automatic sync between browsers.</p><p className="muted">Clearing browser data or using a temporary browsing session may remove your progress. Regular exports give you a copy to keep.</p><div className="notice">Your notes and study history stay private to this browser. The app does not upload transcripts or make transfer-credit decisions.</div></section>
      <section className="panel"><h2>One course at a time</h2><p className="muted">Each course has its own planning, building, and review phase so coverage grows deliberately.</p><p className="muted">More lessons, assessments, and course-completion records will become available as those learning packs are released.</p><span className="pill">Free learning access</span></section>
    </div></div>
  </>;
}
