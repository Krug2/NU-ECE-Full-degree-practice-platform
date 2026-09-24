import { expect,test,type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { questionSchema } from "../../lib/learning/contracts";
import { attemptSchema } from "../../lib/learning/attempts";
import { readStoredProgress,restoreProgress } from "./progress";

const route="/courses/mth-215/lessons/m05-l02";
const fields=[
  {id:"value",kind:"logarithmic",label:"Exact real solution",expected:"(ln(7)/ln(2)-1)/2"},
  {id:"value",kind:"logarithmic",label:"Exact real solution",expected:"e^2-3"},
  {id:"roots",kind:"logarithmic-roots",label:"Complete exact real solution set",expected:["ln(2)","ln(3)"]},
  {id:"roots",kind:"logarithmic-roots",label:"Complete exact real solution set",expected:[]},
];
const prompts=["Solve $2^{2x+1}=7$ over the real numbers.","Solve $\\ln(x+3)=2$ over the real numbers.","Solve $e^{2x}-5e^x+6=0$ over the real numbers.","Solve $e^x=-2$ over the real numbers."];
const questions=fields.map((field,i)=>questionSchema.parse({id:"q"+(i+1),familyId:"mth-log-format",familyVersion:1,courseId:"mth-215",objectiveId:"m05-l02",category:"procedural",critical:true,prompt:prompts[i],fields:[field],hints:["Keep the answer exact.","Use a reversible transformation on the original domain.","Include every real solution."],explanation:["The complete real solution set retains the original domain and exact expressions."],answerSummary:i===0?"x=(ln(7)/ln(2)-1)/2":i===1?"x=e^2-3":i===2?"x=ln(2) or x=ln(3)":"No real solutions."}));
const attempt=attemptSchema.parse({id:"8418bc09-c873-4e8a-aa35-a3f8c693564c",courseId:"mth-215",lessonId:"m05-l02",lessonVersion:1,mode:"checkpoint",status:"active",revision:0,seed:"exact-logarithm-format",startedAt:"2026-09-24T12:00:00.000Z",submittedAt:null,position:0,questions,responses:{},hints:{}});
const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
const padding="+0.0000000000000000000000000000".repeat(4);
const answers=["ln(7/2)/ln(4)","exp(2)-3",`log(e,2)${padding}; ln(3)${padding}`,"none"];
async function openCheckpoint(page:Page){await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();}
async function fill(page:Page,index:number,value:string){await page.locator("#practice").getByLabel(fields[index].label,{exact:true}).fill(value);}

test("a decimal substitute cannot pass an exact logarithmic checkpoint",async({page})=>{
  test.setTimeout(120_000);await restoreProgress(page,data);await openCheckpoint(page);
  await expect(page.locator("#practice")).toContainText("Equivalent supported forms are accepted");
  for(let i=0;i<4;i++){
    await fill(page,i,i===0?String((Math.log2(7)-1)/2):answers[i]);
    await page.getByRole("button",{name:i===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(page.getByRole("heading",{name:"Keep working on this objective",exact:true})).toBeVisible();
  await expect(page.locator(".attempt-results")).toContainText("3 of 4 correct");
  await page.getByText("Question 1: Review",{exact:true}).click();await expect(page.locator(".result-item").first().locator(".answer-feedback")).toBeVisible();
  await expect(page.locator(".attempt-results")).toContainText("a rounded decimal does not replace an exact answer");
  expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
});
test("complete exact expressions remain editable and survive reload, mobile use and backup",async({page},testInfo)=>{
  test.setTimeout(180_000);const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  expect(answers[2].length).toBeGreaterThan(200);expect(answers[2].length).toBeLessThan(500);
  await restoreProgress(page,data);await openCheckpoint(page);
  for(let i=0;i<4;i++){
    const field=page.locator("#practice").getByLabel(fields[i].label,{exact:true});
    await expect(field).toHaveAttribute("maxlength",i<2?"200":"500");await fill(page,i,answers[i]);
    await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");
    if(i===0||i===2){await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(page.locator("#practice").getByLabel(fields[i].label,{exact:true})).toHaveValue(answers[i]);}
    if(i===2){
      await page.setViewportSize({width:390,height:844});
      const audit=await new AxeBuilder({page}).include("#practice").withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations).toEqual([]);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    const button=page.getByRole("button",{name:i===3?"Submit checkpoint":"Next question",exact:true});await button.focus();await button.press("Enter");
  }
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const file=testInfo.outputPath("logarithmic-answer-progress.json");await(await download).saveAs(file);
  const backup=JSON.parse(await readFile(file,"utf8"));expect(backup.learning.attempts[0].questions).toEqual(questions);expect(backup.learning.evidence).toHaveLength(1);
  for(let i=0;i<4;i++)expect(backup.learning.attempts[0].responses[questions[i].id][fields[i].id]).toBe(answers[i]);
  await restoreProgress(page,backup);await openCheckpoint(page);await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();expect(errors).toEqual([]);
});
