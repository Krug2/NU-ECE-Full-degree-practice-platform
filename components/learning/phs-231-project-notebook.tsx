"use client";

import Link from "next/link";
import { useEffect,useState } from "react";
import { saveProgress,useStudy } from "@/lib/study-store";
import { useStudyDraft } from "@/lib/use-study-draft";
import type { Progress } from "@/lib/progress";
import { activateProject,projectCriteria,projectReadiness,projectRecordSchema,projectSnapshot,readProject,reviseProject,saveProjectRecord,startProject,submitProjectRecord,type ProjectRecord } from "@/lib/learning/phs-231-project-records";

const fields=[
  ["question","Question and acceptance rule","State the quantity to predict, coordinate sign, operating range and tolerance before using validation results. Define the moving body and system boundary."],
  ["model","Mechanical model and assumptions","Write the signed force law, known mass, spring and drag terms, equilibrium origin, sensor equation, units and conditions under which the model may fail."],
  ["provenance","Data provenance and procedure","Label each record simulated or physically observed. Identify dataset, calibration and held-out rows, rounding rule, procedure and any unavailable physical evidence."],
  ["calibration","Calibration and parameter evidence","Include numerical zero and slope calculations with units, a bound, and what the chosen states can or cannot identify. Explain how common offset, scale error or drift enters."],
  ["validation","Held-out residuals and comparison","Include numeric observed and predicted values, signed residuals, declared bounds and compatibility decisions for at least three held-out states. Compare one omitted-effect or drift case."],
  ["numerics","Numerical prediction and energy evidence","Include an independently derived initial state, at least six common-endpoint refinement rows, position and velocity errors, actual final widths, and an energy account with units. Identify incomplete runs."],
  ["limitations","Error budget and limits","Separate discretization, measurement and model contributions. Apply the predeclared rule, state an untested condition and avoid treating a compatible interval or synthetic fit as physical validation."],
  ["revision","Revision and next observation","Record a corrected prediction or model choice, the evidence for the change, and one specific new observation that would distinguish competing explanations."],
] as const;
const rubricLabels={scope:"Claim, boundary, units and provenance",calibration:"Calibration, uncertainty and identifiability",validation:"Held-out residuals and controlled comparison",numerics:"Independent mechanics, refinement and energy",revision:"Reproducibility, limitations and revision"};
const levels=["Missing or unsupported","Partial, with a material error or missing assumption","Substantially justified; a specific smaller gap remains","Complete, reproducible reasoning with checks and limits"];
const levelChoices=["Missing evidence","Material gap","Smaller gap","Complete and checked"];
const fromDraft=(s:string)=>{try{const result=projectRecordSchema.safeParse(JSON.parse(s));return result.success?result.data:null;}catch{return null;}};
const download=(record:ProjectRecord)=>{
  const blob=new Blob([JSON.stringify(record,null,2)+"\n"],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`phs231-project-${record.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
export function Phs231ProjectNotebook(){
  const {data,ready,locked}=useStudy(),notes=data.learning.notes["phs-231"]??{},state=readProject(notes),stored=state.kind==="ready"?JSON.stringify(state.active):"",expected=projectSnapshot(notes),draft=useStudyDraft(stored,"phs231-project-notebook"),record=fromDraft(draft.value);
  const [message,setMessage]=useState(""),[saving,setSaving]=useState(false),[historyId,setHistoryId]=useState("");
  const dirty=!!record&&draft.value!==stored,blocked=!ready||locked||saving||draft.changed,submitted=!!record?.completedAt,check=record?projectReadiness(record):null;
  useEffect(()=>{
    if(!dirty)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);
  },[dirty]);
  const edit=(change:Partial<Pick<ProjectRecord,"fields"|"rubric"|"declaration">>)=>{if(record&&!submitted){draft.setValue(JSON.stringify({...record,...change}));setMessage("Notebook draft changed. Save before leaving.");}};
  const persist=async(action:(current:Progress)=>Progress,success:string)=>{
    if(blocked)return;
    setSaving(true);
    try{
      let written:ProjectRecord|null=null;
      const saved=await saveProgress(current=>{const next=action(current),s=readProject(next.learning.notes["phs-231"]);if(s.kind==="ready")written=s.active;return next;});
      if(saved){if(written)draft.setValue(JSON.stringify(written));setMessage(success);setHistoryId("");}
      else setMessage("The notebook could not be saved. Your on-screen draft is kept; check the storage notice or download it.");
    }catch(error){setMessage(error instanceof Error?error.message:"The notebook could not be saved.");}finally{setSaving(false);}
  };
  const history=state.kind==="ready"?(state.records.find(r=>r.id===historyId)??state.active):null;
  const submit=()=>{
    if(!record||!check||blocked||submitted)return;
    if(check.missing.length){setMessage(check.missing.join(" "));return;}
    if(!check.meetsTarget){setMessage("The proposed self-assessment target is at least 12 of 15 with no zero. Keep the draft, identify gaps, and revise before recording completion.");return;}
    void persist(current=>submitProjectRecord(current,expected,record),"Project recorded as learner self-assessment. Its artifact is preserved; no automatic course-mastery evidence was added.");
  };
  return <section className="section-space" id="project-notebook"><h3>Mechanical validation notebook</h3>
    <p>Build a reproducible project record, then assess it against the five criteria. The application checks required entries and the stated score rule; you judge the reasoning. A self-assessed project is not independent subject review, a physical experiment, or automatic course mastery.</p>
    <p>Save before leaving this page. <Link className="text-link" href="/settings">Export progress in Settings</Link> includes the notebook, all saved versions, and ordinary lesson notes. Downloading an individual record preserves that artifact for inspection; use the full progress backup to restore the application.</p>
    {state.kind==="invalid"&&<p className="notice warning" role="alert">{state.message} Starting fresh preserves existing entries and the unsupported index in the progress backup.</p>}
    {state.kind!=="ready"?<button className="button" disabled={blocked} onClick={()=>persist(current=>startProject(current,expected,crypto.randomUUID(),crypto.randomUUID()),"A fresh notebook is saved. Existing entries, if any, remain in the progress backup.")}>{state.kind==="invalid"?"Start fresh and preserve existing entries":"Start project notebook"}</button>:record&&<>
      <p className="notice" data-testid="project-status"><strong>{submitted?"Project recorded (self-assessed)":"Project draft"}</strong>. Created {new Date(record.createdAt).toLocaleString()}. {submitted?"The recorded artifact is preserved. Start a revision to change it.":dirty?"There are unsaved notebook changes.":"This version is saved in this browser."}</p>
      <fieldset disabled={blocked||submitted} style={{border:0,padding:0,margin:0,minWidth:0}} aria-label="Project notebook fields">
        {fields.map(([id,label,help])=><div className="field" key={id}><label htmlFor={`phs231-project-${id}`}>{label}</label><textarea id={`phs231-project-${id}`} rows={7} maxLength={3000} value={record.fields[id]} onChange={event=>edit({fields:{...record.fields,[id]:event.target.value}})} aria-describedby={`phs231-project-${id}-help`}/><small id={`phs231-project-${id}-help`}>{help} Use 40–3000 characters. {["calibration","validation","numerics"].includes(id)&&"Include numerical evidence."}</small></div>)}
        <fieldset className="phs231-predictions"><legend>Assess the quality of your evidence</legend><p>Choose 0–3 for every criterion. The proposed target is at least 12 of 15 with no zero. These are self-study defaults, not an official NU grading policy. A score reflects your judgment and does not establish that the writing is correct.</p>
          <ol start={0}>{levels.map((text,index)=><li key={index}>{text}.</li>)}</ol>
          {projectCriteria.map(key=><div className="field" key={key}><label htmlFor={`phs231-project-rubric-${key}`}>{rubricLabels[key]}</label><select id={`phs231-project-rubric-${key}`} value={record.rubric[key]??""} onChange={event=>{const rubric={...record.rubric};if(event.target.value==="")delete rubric[key];else rubric[key]=Number(event.target.value);edit({rubric});}}><option value="">Choose a self-assessment</option>{levelChoices.map((text,index)=><option key={index} value={index}>{index}: {text}</option>)}</select></div>)}
          <p data-testid="project-score">Self-assessed score: {check!.score} / 15. {submitted?"This recorded self-assessment meets the proposed target; its evidence and declaration are preserved.":check!.meetsTarget?"The score meets the proposed target. Include all required evidence and the declaration before recording it.":"Identify the gaps and revise before recording completion."}</p>
          <label className="checkbox-label"><input type="checkbox" style={{width:"auto"}} checked={record.declaration} onChange={event=>edit({declaration:event.target.checked})}/> I have checked the evidence against the criteria, distinguished simulated from physical evidence, and understand that this is my self-assessment.</label>
        </fieldset>
        <div className="form-actions"><button className="button secondary" onClick={()=>persist(current=>saveProjectRecord(current,expected,record),"Project draft saved.")}>Save project draft</button><button className="button" onClick={submit}>Record self-assessed project</button></div>
      </fieldset>
      <div className="form-actions section-space"><button className="button secondary" onClick={()=>download(record)}>Download this notebook record</button>{submitted&&<button className="button" disabled={blocked||dirty} onClick={()=>persist(current=>reviseProject(current,expected,crypto.randomUUID()),"Revision saved. The submitted artifact is preserved, and the new revision needs its own self-assessment.")}>Start a revision</button>}<button className="button secondary" disabled={blocked||dirty} onClick={()=>persist(current=>startProject(current,expected,crypto.randomUUID(),crypto.randomUUID()),"Another notebook is saved. Earlier drafts and submitted records remain in history.")}>Start another project; retain saved records</button></div>
      {dirty&&<p className="muted">Save the draft before starting or opening another record. Downloading it also preserves a separate copy of the on-screen work.</p>}
      <details className="section-space"><summary>Saved notebook history ({state.records.length})</summary><div className="field"><label htmlFor="phs231-project-history">Saved project record</label><select id="phs231-project-history" value={history!.id} onChange={event=>setHistoryId(event.target.value)}>{state.records.map((r,i)=><option key={r.id} value={r.id}>{i+1}: {r.completedAt?"Self-assessed submission":"Draft"} · {new Date(r.updatedAt).toLocaleString()}</option>)}</select></div>
        {history&&<><p>{history.completedAt?"Recorded with a learner self-assessment":"Saved draft"}; {history.id===state.active.id?"currently active":"preserved in notebook history"}.</p><dl>{fields.map(([id,label])=><div key={id}><dt><strong>{label}</strong></dt><dd style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{history.fields[id]||"No saved entry."}</dd></div>)}</dl><p>Saved self-assessed score: {projectReadiness(history).score} / 15. A draft score is not recorded completion.</p><div className="form-actions"><button className="button secondary" onClick={()=>download(history)}>Download saved record</button><button className="button secondary" disabled={blocked||dirty||history.id===state.active.id} onClick={()=>persist(current=>activateProject(current,expected,history.id),"Saved project opened. Submitted artifacts remain read-only; drafts can be resumed.")}>Open saved project</button></div></>}
      </details>
    </>}
    {draft.changed&&<div className="notice warning" role="alert"><p>The saved project changed elsewhere. Your on-screen draft is kept. Download it before loading the saved version if you need both; loading replaces only this on-screen draft.</p>{record&&<button className="button secondary" onClick={()=>download(record)}>Download conflicting notebook draft</button>}<button className="button secondary" onClick={()=>{draft.loadSaved();setMessage("The saved project is loaded.");}}>Load saved project</button></div>}
    <p role="status" className="form-status" aria-label="Project notebook status">{message}</p>
  </section>;
}
