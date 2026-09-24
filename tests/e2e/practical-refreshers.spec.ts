import { expect,test,type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import type { PracticalLesson,PracticalPath } from "../../lib/learning/refreshers/practical-contracts";
import type { LearningPack } from "../../lib/learning/contracts";
import { practicalCase } from "../../lib/learning/refreshers/practical-cases";
import { practicalKey,readPractical } from "../../lib/learning/refreshers/practical-records";
import { readStoredProgress,restoreProgress } from "./progress";
const json=(path:string)=>JSON.parse(readFileSync(new URL("../../content/"+path,import.meta.url),"utf8"));
const practicalPacks:LearningPack[]=["f11","f12"].map(id=>json("learning-packs/"+id+".json"));
const practicalPaths:PracticalPath[]=practicalPacks.map(p=>json("refresher-paths/"+p.courseId+".json"));
const practicalLessons:PracticalLesson[]=practicalPacks.flatMap(p=>p.modules.flatMap(m=>m.lessons.map(l=>json("lessons/"+p.courseId+"/"+l.id+".json"))));
async function snapshot(page:Page,lesson:PracticalLesson){return readPractical((await readStoredProgress(page)).learning.notes[lesson.courseId]?.[practicalKey(lesson.id)],lesson)!;}
async function fillWork(page:Page,lesson:PracticalLesson){
 const record=await snapshot(page,lesson),example=practicalCase(lesson.courseId,lesson.id,record.active.seed);
 for(const [i,field] of lesson.task.fields.entries())await page.getByLabel(field.label,{exact:true}).fill(example.review[i].slice(0,400));
 for(const item of lesson.task.rubric)await page.getByRole("checkbox",{name:item.label,exact:true}).check();
}
for(const pack of practicalPacks){
 const course=pack.courseId,lessons=practicalLessons.filter(l=>l.courseId===course),path=practicalPaths.find(p=>p.courseId===course)!;
 test(`${course}: practical diagnostic, assisted draft, exact resume and independent portfolio backup`,async({page},testInfo)=>{
  test.setTimeout(180_000);const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/curriculum?group=refresher");const card=page.locator("article").filter({has:page.getByRole("heading",{name:pack.title,exact:true})});await expect(card).toContainText(pack.status==="building"?"Planning ahead":"Available preview");await card.getByRole("link",{name:pack.title,exact:true}).click();
  await page.getByLabel("How familiar does this feel?",{exact:true}).selectOption("comfortable");await expect(page.getByTestId("practical-portfolio")).toContainText("will show drafts");
  const diagnostic=page.locator("#diagnostic");await diagnostic.getByRole("button",{name:"Review diagnostic choices",exact:true}).click();await expect(diagnostic.getByRole("status")).toContainText("Choose a response");
  for(const [i,field] of path.diagnostic.fields.entries()){if(field.kind!=="choice")throw Error("Expected choice");await diagnostic.getByRole("group",{name:field.label,exact:true}).locator('input[value="'+(i===0?field.options.find(o=>o.id!==field.correct)!.id:field.correct)+'"]').check();}
  await diagnostic.getByRole("button",{name:"Review diagnostic choices",exact:true}).click();await expect(diagnostic.getByRole("status")).toContainText("review saved");await page.getByRole("link",{name:"Review: "+lessons[0].title,exact:true}).click();
  const guided=page.locator("#guided");await guided.getByLabel("Your guided reasoning",{exact:true}).fill("I will label the requested output, supplied inputs, units, and the assumption before calculating.");await guided.getByRole("button",{name:"Compare guided reasoning",exact:true}).click();await expect(guided.getByRole("status")).toContainText("assisted practice");
  const task=page.locator("#practical-task");await task.getByRole("button",{name:"Start practical task",exact:true}).click();await expect(task.getByTestId("practical-status")).toContainText("independent draft");
  await task.getByRole("button",{name:"Show one possible review (marks this task assisted)",exact:true}).click();await expect(task.getByRole("status")).toContainText("Write a specific attempt");
  await task.getByRole("button",{name:"Record practical completion",exact:true}).click();await expect(task.getByRole("status")).toContainText("needs a specific written explanation");
  await page.getByLabel(lessons[0].task.fields[0].label,{exact:true}).fill("I will define the requested output and keep assumptions separate from supplied data.");await task.getByRole("button",{name:"Save practical draft",exact:true}).click();await expect(task.getByRole("status")).toHaveText("Practical draft saved.");const partial=await snapshot(page,lessons[0]);
  await page.reload();await expect(page.getByLabel(lessons[0].task.fields[0].label,{exact:true})).toHaveValue(partial.active.fields[lessons[0].task.fields[0].id]);expect(await snapshot(page,lessons[0])).toEqual(partial);
  await task.getByRole("button",{name:"Show one possible review (marks this task assisted)",exact:true}).click();await expect(task.getByRole("heading",{name:"One possible review",exact:true})).toBeVisible();await page.reload();expect((await snapshot(page,lessons[0])).active.assisted).toBe(true);
  await fillWork(page,lessons[0]);await task.getByRole("button",{name:"Record practical completion",exact:true}).click();await expect(task.getByTestId("practical-status")).toContainText("Assisted task recorded");const assisted=await snapshot(page,lessons[0]);
  await task.getByRole("button",{name:"Start a fresh task; keep last completed work",exact:true}).click();await expect(task.getByTestId("practical-status")).toContainText("independent draft");const fresh=await snapshot(page,lessons[0]);expect(fresh.active.seed).not.toBe(assisted.active.seed);expect(fresh.completed).toEqual(assisted.completed);expect(fresh.active.fields).toEqual({});
  await page.goto("/courses/"+course);await page.getByRole("link",{name:"Resume "+lessons[0].title,exact:true}).click();expect((await snapshot(page,lessons[0])).active.seed).toBe(fresh.active.seed);
  for(const lesson of lessons){await page.goto(`/courses/${course}/lessons/${lesson.id}`);if(lesson!==lessons[0])await task.getByRole("button",{name:"Start practical task",exact:true}).click();await fillWork(page,lesson);await task.getByRole("button",{name:"Record practical completion",exact:true}).click();await expect(task.getByTestId("practical-status")).toContainText("Independent task recorded");}
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true}).fill("Revisit the assumption with a fresh observation.");await page.getByRole("button",{name:"Save lesson notes",exact:true}).click();await expect(page.getByText("Lesson notes saved.",{exact:true})).toBeVisible();
  await page.goto("/courses/"+course);await expect(page.getByTestId("practical-portfolio")).toContainText("Independent practical portfolio recorded");await page.getByLabel("Reasoning and next steps",{exact:true}).fill("Return for a fresh practical task after a delay.");await page.getByRole("button",{name:"Save refresher notes",exact:true}).click();await expect(page.getByText("Refresher notes saved.",{exact:true})).toBeVisible();
  const saved=await readStoredProgress(page);expect(saved.learning.evidence).toEqual([]);expect(saved.learning.attempts).toEqual([]);expect(saved.sessions).toEqual([]);
  await page.goto("/settings");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const file=testInfo.outputPath("portfolio.json");await(await download).saveAs(file);expect(JSON.parse(await readFile(file,"utf8")).learning.notes).toEqual(saved.learning.notes);
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();await restoreProgress(page,JSON.parse(await readFile(file,"utf8")));await page.goto("/courses/"+course);await expect(page.getByTestId("practical-portfolio")).toContainText("Independent practical portfolio recorded");await expect(page.getByLabel("Reasoning and next steps",{exact:true})).toHaveValue(saved.notes[course]);
  await page.goto(`/courses/${course}/lessons/${lessons.at(-1)!.id}`);await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true})).toHaveValue("Revisit the assumption with a fresh observation.");expect((await readStoredProgress(page)).learning.notes).toEqual(saved.learning.notes);expect(errors).toEqual([]);
 });
 test(`${course}: practical conflicts preserve both saved work and the local draft`,async({page,context})=>{
  const lesson=lessons[0],url=`/courses/${course}/lessons/${lesson.id}`,field=lesson.task.fields[0];await page.goto(url);await page.getByRole("button",{name:"Start practical task",exact:true}).click();await expect(page.getByTestId("practical-status")).toBeVisible();const other=await context.newPage();await other.goto(url);
  await page.getByLabel(field.label,{exact:true}).fill("My local unfinished frame remains recoverable.");await other.getByLabel(field.label,{exact:true}).fill("A different frame was saved in the other tab.");await other.getByRole("button",{name:"Save practical draft",exact:true}).click();await expect(other.getByText("Practical draft saved.",{exact:true})).toBeVisible();
  await expect(page.getByText("The saved record changed elsewhere. Your draft is kept. Load the saved record before saving another change.",{exact:true})).toBeVisible();await expect(page.getByLabel(field.label,{exact:true})).toHaveValue("My local unfinished frame remains recoverable.");await expect(page.getByRole("button",{name:"Save practical draft",exact:true})).toBeDisabled();
  await page.getByRole("button",{name:"Load saved practical record",exact:true}).click();await expect(page.getByLabel(field.label,{exact:true})).toHaveValue("A different frame was saved in the other tab.");await other.close();
 });
 test(`${course}: unreadable practical records are retained when starting fresh`,async({page})=>{
  const lesson=lessons[0],key=practicalKey(lesson.id),progress={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[],evidence:[],notes:{[course]:{[key]:"{unreadable original"}}}};await restoreProgress(page,progress);await page.goto(`/courses/${course}/lessons/${lesson.id}`);await expect(page.locator("#practical-task").getByRole("alert")).toContainText("has been preserved");await page.getByRole("button",{name:"Start practical task",exact:true}).click();await expect(page.getByTestId("practical-status")).toContainText("independent draft");const notes=(await readStoredProgress(page)).learning.notes[course];expect(Object.entries(notes).find(([id])=>id.startsWith(key+"-recovery-"))?.[1]).toBe("{unreadable original");
 });
 test(`${course}: practical pages and forms support keyboard, mobile layout and accessible content`,async({page},testInfo)=>{
  test.setTimeout(180_000);
  for(const route of["/courses/"+course,...lessons.map(l=>`/courses/${course}/lessons/${l.id}`)]){
   await page.goto(route);if(route.includes("/lessons/")){const compare=page.getByRole("button",{name:"Compare guided reasoning",exact:true});await compare.focus();await compare.press("Enter");await expect(page.locator("#guided").getByRole("status")).toContainText("Write a specific explanation");const start=page.getByRole("button",{name:"Start practical task",exact:true});await start.focus();await start.press("Enter");await expect(page.getByTestId("practical-status")).toBeVisible();const checkbox=page.getByRole("checkbox").first();await checkbox.focus();await checkbox.press("Space");await expect(checkbox).toBeChecked();}
   for(const viewport of[{width:1440,height:1000},{width:390,height:844}]){await page.setViewportSize(viewport);const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator(".katex-error")).toHaveCount(0);}
  }
  await page.locator("#practical-task").screenshot({path:testInfo.outputPath(course+"-practical-mobile.png")});await page.goto("/courses/"+course);await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:testInfo.outputPath(course+"-desktop.png"),fullPage:true});
 });
}
