import { expect,test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type { Progress } from "../../lib/progress";
import { lessonSchema } from "../../lib/learning/contracts";
import { createAttempt } from "../../lib/learning/attempts";
import { restoreProgress } from "./progress";

declare global {interface Window {historyWrites:{store:string;key:IDBValidKey|undefined}[]}}
test("imports a large history and saves answers without rewriting unrelated attempts",async({page},testInfo)=>{
  test.setTimeout(120_000);
  const data:Progress={schemaVersion:2,profile:{displayName:"History fixture",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[],evidence:[],notes:{}}};
  const ids=[...Array.from({length:6},(_,i)=>`b0${i+1}`),...Array.from({length:2},(_,m)=>Array.from({length:4},(_,l)=>`m0${m+1}-l0${l+1}`)).flat()];
  const lessons=await Promise.all(ids.map(async id=>lessonSchema.parse(JSON.parse(await readFile(`content/lessons/mth-215/${id}.json`,"utf8")))));
  for(let round=0;round<60;round++)for(const lesson of lessons)for(const mode of ["practice","checkpoint"] as const){
    const attempt=createAttempt(lesson,mode,"capacity-"+round+"-"+lesson.id+"-"+mode);
    attempt.status="abandoned";data.learning.attempts.push(attempt);
  }
  const target=data.learning.attempts.findLast(attempt=>attempt.lessonId==="b01"&&attempt.mode==="practice")!;
  target.status="active";
  const question=target.questions[0],field=question.fields[0];
  if(field.kind!=="rational")throw new Error("The capacity fixture requires an exact-number answer.");
  const bytes=Buffer.byteLength(JSON.stringify(data,null,2));expect(bytes).toBeGreaterThan(30_000_000);
  await page.addInitScript(()=>{
    window.historyWrites=[];const put=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(value,key){window.historyWrites.push({store:this.name,key});return put.call(this,value,key);};
  });
  await restoreProgress(page,data);
  await page.goto("/courses/mth-215/lessons/b01");
  const input=page.locator("#practice").getByLabel(field.label+(field.unit?" ("+field.unit+")":""),{exact:true});
  await expect(input).toBeVisible();await page.evaluate(()=>{window.historyWrites=[];});
  const started=Date.now();await input.pressSequentially("1234567890");
  await expect(page.locator("#practice .attempt-session .form-status")).toHaveText("Saved in this browser.");
  const elapsedMs=Date.now()-started,writes=await page.evaluate(()=>window.historyWrites.filter(write=>write.store==="attempts"));
  expect(writes.length).toBeGreaterThan(0);expect(writes.length).toBeLessThanOrEqual(10);
  expect(writes.every(write=>write.key===target.id)).toBe(true);
  await page.reload();await expect(input).toHaveValue("1234567890");
  await page.goto("/settings");const download=page.waitForEvent("download");
  await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const output=testInfo.outputPath("large-progress.json");await(await download).saveAs(output);
  const restored:Progress=JSON.parse(await readFile(output,"utf8"));
  expect(restored.learning.attempts).toHaveLength(data.learning.attempts.length);
  const saved=restored.learning.attempts.find(attempt=>attempt.id===target.id)!;
  expect(saved.questions).toEqual(target.questions);expect(saved.responses[question.id][field.id]).toBe("1234567890");
  const fingerprints=(progress:Progress)=>progress.learning.attempts.filter(attempt=>attempt.id!==target.id).map(attempt=>({id:attempt.id,hash:createHash("sha256").update(JSON.stringify(attempt)).digest("hex")}));
  expect(fingerprints(restored)).toEqual(fingerprints(data));
  await restoreProgress(page,restored);
  await page.goto("/courses/mth-215/lessons/b01");await expect(input).toHaveValue("1234567890");
  await testInfo.attach("history-metrics",{body:JSON.stringify({attempts:data.learning.attempts.length,questions:data.learning.attempts.reduce((count,attempt)=>count+attempt.questions.length,0),bytes,elapsedMs,attemptWrites:writes.length}),contentType:"application/json"});
});
