import { expect,test,type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { lessonSchema,type AnswerField } from "../../lib/learning/contracts";
import { createAttempt } from "../../lib/learning/attempts";
import { formatIntervals } from "../../lib/learning/intervals";
import { readStoredProgress,restoreProgress } from "./progress";

const route="/courses/mth-215/lessons/m04-l02";
async function partition(activity:Locator,critical:string){await activity.getByLabel("All critical inputs",{exact:true}).fill(critical);await activity.getByRole("button",{name:"Check critical inputs",exact:true}).click();}
async function trial(activity:Locator,i:number,input:string,sign:string){
  await activity.getByLabel("Test input for interval "+i,{exact:true}).fill(input);await activity.getByLabel("Predicted sign for interval "+i,{exact:true}).selectOption(sign);await activity.getByRole("button",{name:"Check interval "+i,exact:true}).click();
}
const cases=[
  {critical:"-2,1",inputs:["-3","0","2"],signs:["negative","positive","positive"],selected:[0],boundaries:["include","include"],solution:"(-inf,-2] U [1,1]"},
  {critical:"-1,2",inputs:["-2","0","3"],signs:["positive","negative","positive"],selected:[0,2],boundaries:["exclude","include"],solution:"(-inf,-1) U [2,inf)"},
  {critical:"-2,1",inputs:["-3","0","2"],signs:["positive","negative","positive"],selected:[0,2],boundaries:["exclude","exclude"],solution:"(-inf,-2) U (1,inf)"},
  {critical:"1",inputs:["0","2"],signs:["negative","negative"],selected:[0,1],boundaries:["exclude"],solution:"(-inf,1) U (1,inf)"},
  {critical:"-sqrt(2),sqrt(2)",inputs:["-2","0","2"],signs:["positive","negative","positive"],selected:[1],boundaries:["include","include"],solution:"[-sqrt(2),sqrt(2)]"},
  {critical:"1",inputs:["0","2"],signs:["negative","positive"],selected:[1],boundaries:["exclude"],solution:"(1,inf)"},
];
async function finishCase(activity:Locator,index:number){
  const item=cases[index];await activity.getByLabel("Sign chart example",{exact:true}).selectOption(String(index));await partition(activity,item.critical);
  for(let i=0;i<item.inputs.length;i++)await trial(activity,i+1,item.inputs[i],item.signs[i]);
  const intervals=activity.getByRole("group",{name:"Include every qualifying open interval",exact:true}).getByRole("checkbox");
  for(const i of item.selected)await intervals.nth(i).check();
  const decisions=activity.getByRole("region",{name:"Critical input decisions",exact:true}).getByRole("combobox");for(let i=0;i<item.boundaries.length;i++)await decisions.nth(i).selectOption(item.boundaries[i]);
  await activity.getByLabel("Complete solution in interval notation",{exact:true}).fill(item.solution);await activity.getByRole("button",{name:"Check complete solution",exact:true}).click();
  await expect(activity.locator(".sign-chart-status")).toContainText("The complete solution is correct");
}
test("sign chart requires complete partitions, interior tests, and an isolated zero without awarding assisted evidence",async({page})=>{
  test.setTimeout(120_000);const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/courses/mth-215/lessons/m04-l01");await page.getByRole("link",{name:"Next: Polynomial and rational inequalities",exact:true}).click();
  const guided=page.locator("#guided"),activity=page.locator("#investigate");
  for(const [label,value] of [["Complete inequality solution","[-2,1] U (3,inf)"],["All distinct critical inputs","-2,1,3"],["All original excluded inputs","1,3"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByRole("group",{name:"Include the canceled input x = 1?",exact:true}).getByRole("radio",{name:"No",exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Review this reasoning");
  await guided.getByLabel("Complete inequality solution",{exact:true}).fill("[-2,1) U (3,inf)");await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await partition(activity,"-2");await expect(activity.locator(".sign-chart-status")).toContainText("Find every");await expect(activity.locator(".sign-interval-trial")).toHaveCount(0);
  await partition(activity,"1,-2");await expect(activity.locator(".sign-interval-trial")).toHaveCount(3);
  await trial(activity,1,"-2","negative");await expect(activity.locator(".sign-interval-trial").nth(0)).toContainText("strictly inside");
  await trial(activity,1,"i","negative");await expect(activity.locator(".sign-interval-trial").nth(0).getByRole("status")).not.toHaveText("");
  await trial(activity,1,"-3","positive");await expect(activity.locator(".sign-interval-trial").nth(0)).toContainText("Revise the sign prediction");
  await trial(activity,1,"-3","negative");await trial(activity,2,"-sqrt(2)","positive");await trial(activity,3,"2","positive");
  await activity.getByRole("group",{name:"Include every qualifying open interval",exact:true}).getByRole("checkbox").first().check();
  await activity.getByLabel("At x = -2",{exact:true}).selectOption("include");await activity.getByLabel("At x = 1",{exact:true}).selectOption("exclude");
  await activity.getByLabel("Complete solution in interval notation",{exact:true}).fill("(-inf,-2]");await activity.getByRole("button",{name:"Check complete solution",exact:true}).click();await expect(activity.locator(".sign-chart-status")).toContainText("isolated allowed zero");
  await activity.getByLabel("At x = 1",{exact:true}).selectOption("include");await activity.getByRole("button",{name:"Check complete solution",exact:true}).click();await expect(activity.locator(".sign-chart-status")).toContainText("does not yet match");
  await activity.getByLabel("Complete solution in interval notation",{exact:true}).fill("(-inf,-2] U [1,1]");await activity.getByRole("button",{name:"Check complete solution",exact:true}).click();await expect(activity.locator(".sign-chart-result")).toBeVisible();
  await activity.getByLabel("Test input for interval 2",{exact:true}).fill("0");await expect(activity.locator(".sign-chart-result")).toHaveCount(0);await expect(activity.getByRole("button",{name:"Check complete solution",exact:true})).toHaveCount(0);
  await activity.getByLabel("Inequality relation",{exact:true}).selectOption("lt");await expect(activity.locator(".sign-interval-trial")).toHaveCount(0);await expect(activity.getByLabel("All critical inputs",{exact:true})).toHaveValue("");
  expect((await readStoredProgress(page)).learning.evidence).toEqual([]);await expect(page.locator(".katex-error")).toHaveCount(0);expect(errors).toEqual([]);
});
test("all six sign charts support exact solutions, relation changes, mobile and keyboard access",async({page},testInfo)=>{
  test.setTimeout(180_000);await page.goto(route);const activity=page.locator("#investigate");
  for(let i=0;i<cases.length;i++){
    await finishCase(activity,i);await expect(activity.locator(".sign-selected-interval")).toHaveCount(cases[i].selected.length);await expect(activity.locator(".sign-included")).toHaveCount(cases[i].boundaries.filter(value=>value==="include").length);
  }
  await finishCase(activity,4);
  await activity.getByLabel("Inequality relation",{exact:true}).selectOption("gt");await partition(activity,cases[4].critical);
  for(let i=0;i<3;i++)await trial(activity,i+1,cases[4].inputs[i],cases[4].signs[i]);
  const checks=activity.getByRole("group",{name:"Include every qualifying open interval",exact:true}).getByRole("checkbox");await checks.nth(0).check();await checks.nth(2).check();
  const decisions=activity.getByRole("region",{name:"Critical input decisions",exact:true}).getByRole("combobox");await decisions.nth(0).selectOption("exclude");await decisions.nth(1).selectOption("exclude");
  await activity.getByLabel("Complete solution in interval notation",{exact:true}).fill("(-inf,-sqrt(8)/2) U (sqrt(8)/2,inf)");await activity.getByRole("button",{name:"Check complete solution",exact:true}).click();await expect(activity.locator(".sign-chart-status")).toContainText("The complete solution is correct");
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){await page.setViewportSize(viewport);const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await activity.locator(".sign-chart-figure").screenshot({path:testInfo.outputPath("sign-chart-mobile.png")});
  const table=activity.getByRole("region",{name:"Critical input decisions",exact:true});await table.focus();await expect(table).toBeFocused();const button=activity.getByRole("button",{name:"Check complete solution",exact:true});await button.focus();await button.press("Enter");await expect(activity.locator(".sign-chart-status")).toContainText("The complete solution is correct");
  await activity.getByRole("button",{name:"Reset sign chart",exact:true}).click();await expect(activity.locator(".sign-chart-result")).toHaveCount(0);await expect(activity.getByLabel("Sign chart example",{exact:true})).toHaveValue("0");
  await page.getByRole("button",{name:"Start practice",exact:true}).click();await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 36");
});
const answer=(field:AnswerField):string=>{
  if(field.kind==="choice")return field.correct;
  if(field.kind==="roots")return field.expected.join(",")||"empty";
  if(field.kind==="intervals")return formatIntervals(field.expected);
  if(field.kind==="polynomial"||field.kind==="rational")return field.expected;
  throw new Error("Unexpected sign-chart field");
};
test("a lost exclusion blocks checkpoint evidence and exact radical intervals survive reload and backup",async({page},testInfo)=>{
  test.setTimeout(120_000);const lesson=lessonSchema.parse(JSON.parse(await readFile("content/lessons/mth-215/m04-l02.json","utf8"))),variants=["irrational","canceled-hole","crossing-hole","model-domain"];
  const attempt=createAttempt({...lesson,checkpoint:lesson.checkpoint.map((slot,i)=>({...slot,variant:variants[i]}))},"checkpoint","sign-chart-browser");
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}},interval=attempt.questions[0].fields[0];
  expect(answer(interval)).toContain("sqrt");
  async function submit(missDomain:boolean){
    await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
    for(let i=0;i<attempt.questions.length;i++){
      for(const field of attempt.questions[i].fields){
        if(field.kind==="choice")await page.locator("#practice").getByRole("group",{name:field.label,exact:true}).locator('input[value="'+field.correct+'"]').check();
        else await page.locator("#practice").getByLabel(field.label+(field.unit?" ("+field.unit+")":""),{exact:true}).fill(missDomain&&i===1&&field.id==="excluded"?"empty":answer(field));
      }
      if(!missDomain&&i===0){await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(page.locator("#practice").getByLabel(interval.label,{exact:true})).toHaveValue(answer(interval));}
      await page.getByRole("button",{name:i===3?"Submit checkpoint":"Next question",exact:true}).click();
    }
  }
  await restoreProgress(page,data);await submit(true);await expect(page.getByRole("heading",{name:"Keep working on this objective",exact:true})).toBeVisible();await expect(page.locator(".attempt-results")).toContainText("3 of 4 correct");expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
  await restoreProgress(page,data);await submit(false);await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const file=testInfo.outputPath("sign-chart-progress.json");await(await download).saveAs(file);
  const backup=JSON.parse(await readFile(file,"utf8"));expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence).toHaveLength(1);
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
