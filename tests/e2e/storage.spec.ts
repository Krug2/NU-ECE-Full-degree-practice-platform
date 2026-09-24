import { expect,test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress,readStoredProgress } from "./progress";

const legacyKey="ece-study:progress:v1";
const legacy={schemaVersion:1,profile:{displayName:"Returning learner",weeklyHours:8},plan:["mth-215"],bookmarks:["R01"],notes:{"mth-215":"Keep the original note"},confidence:{"mth-215":"refresh"},sessions:[]};
test("migrates legacy progress once, preserves the original, and saves later changes in the database",async({page})=>{
  await page.addInitScript(({key,text})=>localStorage.setItem(key,text),{key:legacyKey,text:JSON.stringify(legacy)});
  await page.goto("/courses/mth-215");
  await expect(page.getByLabel("Course notes",{exact:true})).toHaveValue(legacy.notes["mth-215"]);
  await page.getByLabel("Course notes",{exact:true}).fill("A newer saved note");
  await page.getByRole("button",{name:"Save notes",exact:true}).click();
  await expect(page.getByText("Notes saved in this browser.",{exact:true})).toBeVisible();
  expect(await page.evaluate(key=>localStorage.getItem(key),legacyKey)).toBe(JSON.stringify(legacy));
  await page.reload();await expect(page.getByLabel("Course notes",{exact:true})).toHaveValue("A newer saved note");
  const saved=await readStoredProgress(page);
  expect(saved).toMatchObject({...legacy,schemaVersion:2,notes:{"mth-215":"A newer saved note"},learning:{attempts:[],evidence:[],notes:{}}});
});

test("exports corrupt legacy data unchanged before an explicit reset",async({page},testInfo)=>{
  await page.addInitScript(key=>localStorage.setItem(key,"{broken backup"),legacyKey);
  await page.goto("/settings");
  await expect(page.locator(".storage-notice")).toContainText("could not be migrated");
  const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const file=testInfo.outputPath("recovery.json");await(await download).saveAs(file);
  expect(await readFile(file,"utf8")).toBe("{broken backup");
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();
  await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();
  expect(await page.evaluate(key=>localStorage.getItem(key),legacyKey)).toBe("{broken backup");
  await page.reload();
  await expect(page.getByLabel("Weekly study goal",{exact:true})).toHaveValue("5");
  await expect(page.locator(".storage-notice")).toHaveCount(0);
});

test("a backup restore and a reset both refuse changes made after their review",async({page,context})=>{
  await page.goto("/settings");
  await page.getByLabel("Import a progress backup",{exact:true}).setInputFiles({name:"legacy.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(legacy))});
  await expect(page.getByText("Review this backup",{exact:true})).toBeVisible();
  const other=await context.newPage();await other.goto("/courses/f01");
  await other.getByRole("button",{name:"Add to my plan",exact:true}).click();
  await expect(other.getByRole("button",{name:"Added to my plan",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Replace with this backup",exact:true}).click();
  await expect(page.locator(".storage-notice")).toContainText("changed after you reviewed");
  expect((await readStoredProgress(page)).plan).toEqual(["f01"]);
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();
  await other.goto("/courses/f02");await other.getByRole("button",{name:"Add to my plan",exact:true}).click();
  await expect(other.getByRole("button",{name:"Added to my plan",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await expect(page.locator(".storage-notice")).toContainText("changed after you reviewed");
  expect((await readStoredProgress(page)).plan).toEqual(["f01","f02"]);await other.close();
});

test("an aborted checkpoint submission keeps answers recoverable without showing saved evidence",async({page},testInfo)=>{
  const lesson=lessonSchema.parse(JSON.parse(await readFile("content/lessons/mth-215/m01-l01.json","utf8")));
  const attempt=createAttempt(lesson,"checkpoint","aborted-checkpoint");attempt.position=3;
  for(const question of attempt.questions)attempt.responses[question.id]=Object.fromEntries(question.fields.map(field=>[field.id,field.kind==="choice"?field.correct:String(field.expected)]));
  const progress={...legacy,schemaVersion:2,learning:{attempts:[attempt],evidence:[],notes:{}}};
  await restoreProgress(page,progress);await page.goto("/courses/mth-215/lessons/m01-l01");
  await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await page.evaluate(()=>{
    const put=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(value,key){
      IDBObjectStore.prototype.put=put;const request=put.call(this,value,key);
      request.addEventListener("success",()=>this.transaction.abort(),{once:true});return request;
    };
  });
  await page.getByRole("button",{name:"Submit checkpoint",exact:true}).click();
  await expect(page.getByText("Your latest draft has not been saved.",{exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toHaveCount(0);
  const saved=await readStoredProgress(page);
  expect(saved.learning.evidence).toHaveLength(0);expect(saved.learning.attempts[0].status).toBe("active");
  const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export draft",exact:true}).click();
  const file=testInfo.outputPath("checkpoint-draft.json");await(await download).saveAs(file);
  const draft=JSON.parse(await readFile(file,"utf8"));
  expect(draft.learning.attempts.at(-1)).toMatchObject({mode:"practice",status:"active",responses:attempt.responses,questions:attempt.questions});
  expect(draft.learning.evidence).toHaveLength(0);
  await page.getByRole("link",{name:"Open backup and recovery settings",exact:true}).click();
  await page.getByRole("button",{name:"Retry saving",exact:true}).click();
  await expect(page.getByText("Your unsaved change has now been saved.",{exact:true})).toBeVisible();
  expect((await readStoredProgress(page)).learning.evidence).toHaveLength(1);
  await page.goto("/courses/mth-215/lessons/m01-l01");
  await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});

test("database denial still allows an untouched legacy backup to be exported",async({page},testInfo)=>{
  await page.addInitScript(({key,data})=>{
    localStorage.setItem(key,JSON.stringify(data));Object.defineProperty(window,"indexedDB",{value:undefined});
  },{key:legacyKey,data:legacy});
  await page.goto("/settings");await expect(page.locator(".storage-notice")).toContainText("does not provide progress storage");
  await expect(page.getByRole("button",{name:"Save preferences",exact:true})).toBeDisabled();
  const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const file=testInfo.outputPath("legacy-recovery.json");await(await download).saveAs(file);
  expect(JSON.parse(await readFile(file,"utf8"))).toEqual(legacy);
});

test("preference updates preserve an unfinished name in another tab",async({page,context})=>{
  await page.goto("/settings");const other=await context.newPage();await other.goto("/settings");
  await page.getByLabel("What should we call you?",{exact:false}).fill("My unfinished name");
  await other.getByLabel("What should we call you?",{exact:false}).fill("Saved elsewhere");
  await other.getByLabel("Weekly study goal",{exact:true}).fill("9");
  await other.getByRole("button",{name:"Save preferences",exact:true}).click();
  await expect(page.getByText("Saved preferences changed while you were editing. Your draft has been kept.",{exact:true})).toBeVisible();
  await expect(page.getByLabel("What should we call you?",{exact:false})).toHaveValue("My unfinished name");
  await expect(page.getByLabel("Weekly study goal",{exact:true})).toHaveValue("9");
  await page.getByRole("button",{name:"Load saved preferences",exact:true}).click();
  await expect(page.getByLabel("What should we call you?",{exact:false})).toHaveValue("Saved elsewhere");
  await other.close();
});
