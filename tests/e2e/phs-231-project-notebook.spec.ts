import { expect,test,type Locator } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { Progress } from "../../lib/progress";
import { projectCriteria,projectSections,projectSnapshot,readProject,startProject,submitProjectRecord } from "../../lib/learning/phs-231-project-records";
import { readStoredProgress,restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m09-l02";
const emptyProgress=():Progress=>({schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[],evidence:[],notes:{}}});
const entries={
  question:"Predict horizontal sensor force over the supplied states. Use rightward x from equilibrium. Before validation, require |r| <= 0.005 N; at T=4 s require |ex| <= .002 m and |ev| <= .01 m/s.",
  model:"Moving body: m=.5 kg, spring k=8 N/m and viscous b=.2 kg/s. Vertical weight and normal balance. F=-kx-bv; sensor y=F+z with z=.04 N. Fixed support, linear spring and no contact changes are assumptions.",
  provenance:"All rows are synthetic imposed (x,v) states, not a time trajectory or physical measurements. The baseline generating law is disclosed. Five calibration states choose the candidate; nine held-out states test it. Round to .01 N.",
  calibration:"The origin reads .04 N. Static readings .36 and -.28 N across .08 m give k=8 N/m and bound .125 N/m for two independent .005 N allowances. Moving outputs .06 and .02 N across .2 m/s give b=.2 kg/s. Static states alone leave b free.",
  validation:"At (.02,.1), y=-.14 N and prediction=-.14 N, r=0. At (.02,-.1), y=-.10 N and prediction=-.10 N, r=0. At (.08,0), y=-.60 N and prediction=-.60 N, r=0. Omitting drag at (.02,.1) gives prediction=-.12 N, r=-.02 N, outside .005 N.",
  numerics:"m=.5 kg, k=8 N/m, b=.2 kg/s, x0=.08 m, v0=0, T=4 s. F0=-.64 N, a0=-1.28 m/s2, E0=.0256 J. All runs complete T with last widths equal h. Columns: method,h(s),ex(m),ev(m/s): semi,.1,.007759961,.037317487; semi,.05,.002661842,.014803777; semi,.025,.001110436,.006433668; midpoint,.1,.004439119,.060263542; midpoint,.05,.001049802,.014643336; midpoint,.025,.000293892,.003601541. Midpoint .025 has E+Dtrap-E0=-.000050537807 J.",
  limitations:"The finest two methods meet both endpoint criteria for the stipulated equation. A small energy residual can hide state error. Exact synthetic inputs and rounding bounds do not bound real model discrepancy or between-node maximum error.",
  revision:"Retain the omitted-drag failure and add the coefficient supported by the moving calibration pair. Check new positive and negative velocities at fixed position, plus independent zero references, to distinguish damping from sensor changes."
};
const fixture=(submitted=false)=>{
  let p=emptyProgress();p.learning.notes={"phs-231":{"m09-l02":"Keep the separate lesson note."},"mth-215":{"m01-l01":"Keep prerequisite notes."}};
  p=startProject(p,projectSnapshot(p.learning.notes["phs-231"]),"12345678-1234-4234-9234-123456789abc","browser-project",new Date("2026-09-24T12:00:00Z"));
  if(submitted){const state=readProject(p.learning.notes["phs-231"]);if(state.kind!=="ready")throw Error("Fixture did not initialize");p=submitProjectRecord(p,projectSnapshot(p.learning.notes["phs-231"]),{...state.active,fields:entries,rubric:{scope:3,calibration:3,validation:2,numerics:2,revision:2},declaration:true},new Date("2026-09-24T12:01:00Z"));}
  return p;
};
const field=(notebook:Locator,key:string)=>notebook.locator(`#phs231-project-${key}`);
const status=(notebook:Locator)=>notebook.getByRole("status",{name:"Project notebook status",exact:true});
const notebookState=async(page:Parameters<typeof readStoredProgress>[0])=>readProject((await readStoredProgress(page)).learning.notes["phs-231"]);
test("project notebook enforces evidence and rubric gates then saves a self-assessed immutable artifact",async({page},info)=>{
  await page.goto(route);const notebook=page.locator("#project-notebook");await notebook.getByRole("button",{name:"Start project notebook",exact:true}).click();await expect(status(notebook)).toContainText("A fresh notebook is saved");
  await notebook.getByRole("button",{name:"Record self-assessed project",exact:true}).click();await expect(status(notebook)).toContainText("question: write at least 40 characters");
  for(const key of projectSections)await field(notebook,key).fill(entries[key]);
  for(const key of projectCriteria)await field(notebook,`rubric-${key}`).selectOption("2");
  await notebook.getByRole("checkbox").check();await notebook.getByRole("button",{name:"Record self-assessed project",exact:true}).click();await expect(status(notebook)).toContainText("at least 12 of 15");
  await field(notebook,"rubric-scope").selectOption("3");await field(notebook,"rubric-calibration").selectOption("3");
  await notebook.getByRole("button",{name:"Save project draft",exact:true}).click();await expect(status(notebook)).toHaveText("Project draft saved.");await expect(notebook.getByText(/saved project changed elsewhere/)).toHaveCount(0);
  await page.reload();for(const key of projectSections)await expect(field(notebook,key)).toHaveValue(entries[key]);await expect(notebook.getByRole("checkbox")).toBeChecked();await expect(notebook.getByTestId("project-score")).toContainText("12 / 15");
  await notebook.getByRole("button",{name:"Record self-assessed project",exact:true}).click();await expect(status(notebook)).toContainText("Project recorded as learner self-assessment");
  await expect(notebook.getByTestId("project-score")).toContainText("evidence and declaration are preserved");
  await expect(field(notebook,"question")).toBeDisabled();await expect(notebook.getByRole("button",{name:"Record self-assessed project",exact:true})).toBeDisabled();
  const saved=await readStoredProgress(page),state=readProject(saved.learning.notes["phs-231"]);expect(state.kind).toBe("ready");if(state.kind!=="ready")throw Error("Missing saved record");
  expect(state.active.fields).toEqual(entries);expect(state.active.completedAt).toBeTruthy();expect(saved.learning.evidence).toEqual([]);
  await page.setViewportSize({width:390,height:844});await notebook.getByTestId("project-status").scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath("project-mobile-saved.png")});await notebook.getByTestId("project-score").scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath("project-mobile-rubric.png")});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test("project revisions preserve the submission and round-trip through real export reset and restore",async({page},info)=>{
  const original=fixture(true);await restoreProgress(page,original);await page.goto(route);const notebook=page.locator("#project-notebook");await expect(field(notebook,"question")).toBeDisabled();
  await notebook.getByRole("button",{name:"Start a revision",exact:true}).click();await expect(status(notebook)).toContainText("Revision saved");await expect(field(notebook,"question")).toBeEnabled();await expect(notebook.getByRole("checkbox")).not.toBeChecked();await expect(field(notebook,"rubric-scope")).toHaveValue("");
  const revised=entries.revision+" Revision: preserve the nonlinear static-fit failure of -0.20 N at x=.08 m and obtain new static magnitudes with an independent sensor-linearity check.";
  await field(notebook,"revision").fill(revised);await notebook.getByRole("button",{name:"Save project draft",exact:true}).click();await expect(status(notebook)).toHaveText("Project draft saved.");
  const waiting=page.waitForEvent("download");await notebook.getByRole("button",{name:"Download this notebook record",exact:true}).click();const file=info.outputPath("project-revision.json");await(await waiting).saveAs(file);const record=JSON.parse(await readFile(file,"utf8"));expect(record.fields.revision).toBe(revised);expect(record.completedAt).toBe(null);
  await notebook.getByText("Saved notebook history (2)",{exact:true}).click();await notebook.getByLabel("Saved project record",{exact:true}).selectOption("12345678-1234-4234-9234-123456789abc");await notebook.getByRole("button",{name:"Open saved project",exact:true}).click();await expect(status(notebook)).toContainText("Saved project opened");await expect(field(notebook,"revision")).toHaveValue(entries.revision);await expect(field(notebook,"revision")).toBeDisabled();
  await page.goto("/settings");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const path=info.outputPath("project-backup.json");await(await download).saveAs(path);const backup=JSON.parse(await readFile(path,"utf8")),before=readProject(backup.learning.notes["phs-231"]);expect(before.kind).toBe("ready");if(before.kind!=="ready")throw Error("Missing exported project");
  expect(before.records).toHaveLength(2);expect(before.records[0].fields).toEqual(entries);expect(before.records[1].fields.revision).toBe(revised);expect(backup.learning.notes["mth-215"]).toEqual(original.learning.notes["mth-215"]);expect(backup.learning.notes["phs-231"]["m09-l02"]).toBe("Keep the separate lesson note.");expect(backup.learning.evidence).toEqual([]);
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();
  await restoreProgress(page,backup);await page.goto(route);expect(await notebookState(page)).toEqual(before);await expect(field(notebook,"revision")).toHaveValue(entries.revision);
  await notebook.getByText("Saved notebook history (2)",{exact:true}).click();await notebook.getByLabel("Saved project record",{exact:true}).selectOption(record.id);await notebook.getByRole("button",{name:"Open saved project",exact:true}).click();await expect(field(notebook,"revision")).toHaveValue(revised);await expect(field(notebook,"revision")).toBeEnabled();
});
test("project multi-tab changes preserve dirty drafts across saves and active-record switches",async({page,context},info)=>{
  await restoreProgress(page,fixture());await page.goto(route);const other=await context.newPage();await other.goto(route);
  const a=page.locator("#project-notebook"),b=other.locator("#project-notebook"),local="Unsaved alternate question: predict signed horizontal force with independently checked sensor corrections.",remote=entries.question;
  await field(b,"question").fill(local);await field(a,"question").fill(remote);await a.getByRole("button",{name:"Save project draft",exact:true}).click();await expect(status(a)).toHaveText("Project draft saved.");
  await expect(b.getByRole("alert")).toContainText("Your on-screen draft is kept");await expect(field(b,"question")).toHaveValue(local);await expect(b.getByRole("button",{name:"Save project draft",exact:true})).toBeDisabled();
  const download=other.waitForEvent("download");await b.getByRole("button",{name:"Download conflicting notebook draft",exact:true}).click();const path=info.outputPath("conflicting-project.json");await(await download).saveAs(path);expect(JSON.parse(await readFile(path,"utf8")).fields.question).toBe(local);
  await b.getByRole("button",{name:"Load saved project",exact:true}).click();await expect(field(b,"question")).toHaveValue(remote);await expect(b.getByRole("alert")).toHaveCount(0);
  await field(b,"question").fill(local+" Preserve this second local version.");
  await a.getByRole("button",{name:"Start another project; retain saved records",exact:true}).click();await expect(status(a)).toContainText("Another notebook is saved");
  await expect(b.getByRole("alert")).toContainText("saved project changed elsewhere");await expect(field(b,"question")).toHaveValue(local+" Preserve this second local version.");
  await b.getByRole("button",{name:"Load saved project",exact:true}).click();await expect(field(b,"question")).toHaveValue("");const state=await notebookState(page);expect(state.kind).toBe("ready");if(state.kind==="ready"){expect(state.records).toHaveLength(2);expect(state.records[0].fields.question).toBe(remote);}
  await other.close();
});
test("unsupported project recovery preserves opaque entries and the original index in an exported backup",async({page},info)=>{
  const progress=emptyProgress(),opaque='{"format":"future-project-v9","activeId":"future"}';progress.learning.notes={"phs-231":{"phs231-project-index":opaque,"phs231-project-future-data":"Preserve this unsupported research record.","m09-l02":"Ordinary notes remain separate."}};
  await restoreProgress(page,progress);await page.goto(route);const notebook=page.locator("#project-notebook");await expect(notebook.getByRole("alert")).toContainText("unsupported or unreadable");
  await notebook.getByRole("button",{name:"Start fresh and preserve existing entries",exact:true}).click();await expect(status(notebook)).toContainText("A fresh notebook is saved");await expect(field(notebook,"question")).toHaveValue("");
  await page.goto("/settings");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const path=info.outputPath("preserved-project.json");await(await download).saveAs(path);const saved=JSON.parse(await readFile(path,"utf8")),notes=saved.learning.notes["phs-231"];
  expect(notes["phs231-project-future-data"]).toBe(progress.learning.notes["phs-231"]["phs231-project-future-data"]);expect(Object.entries(notes).find(([key])=>key.endsWith("-recovered-index"))?.[1]).toBe(opaque);expect(notes["m09-l02"]).toBe("Ordinary notes remain separate.");expect(readProject(notes).kind).toBe("ready");expect(saved.learning.evidence).toEqual([]);
});
test("a failed project write keeps the draft exportable and does not claim saved completion",async({page},info)=>{
  await restoreProgress(page,fixture());await page.goto(route);const notebook=page.locator("#project-notebook");await field(notebook,"question").fill(entries.question);
  await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){IDBObjectStore.prototype.put=put;throw new DOMException("Simulated full storage","QuotaExceededError");};});
  await notebook.getByRole("button",{name:"Save project draft",exact:true}).click();await expect(status(notebook)).toContainText("could not be saved");await expect(field(notebook,"question")).toHaveValue(entries.question);
  const state=await notebookState(page);expect(state.kind).toBe("ready");if(state.kind==="ready"){expect(state.active.fields.question).toBe("");expect(state.active.completedAt).toBe(null);}
  const download=page.waitForEvent("download");await notebook.getByRole("button",{name:"Download this notebook record",exact:true}).click();const path=info.outputPath("unsaved-project.json");await(await download).saveAs(path);expect(JSON.parse(await readFile(path,"utf8")).fields.question).toBe(entries.question);
});
