import { expect,test,type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { questionSchema } from "../../lib/learning/contracts";
import { attemptSchema } from "../../lib/learning/attempts";
import { parseLogarithmicIntervals } from "../../lib/learning/logarithmic-intervals";
import { readStoredProgress,restoreProgress } from "./progress";

const route="/courses/mth-215/lessons/m05-l03";
const sets=["(3*ln(4),inf)","[0,2*ln(3)]","(-inf,ln(2)) U (ln(2),inf)","empty"];
const questions=sets.map((set,index)=>questionSchema.parse({id:"q"+(index+1),familyId:"mth-threshold-format",familyVersion:1,courseId:"mth-215",objectiveId:"m05-l03",category:"application",critical:true,prompt:"Report the complete exact time set and retain every original boundary condition.",fields:[{id:"times",kind:"logarithmic-intervals",label:"Complete exact time set",unit:"s",expected:parseLogarithmicIntervals(set)}],hints:["Keep each boundary exact.","Check whether equality is included.","Keep the whole operating domain and every excluded point."],explanation:["An exact endpoint, its inclusion and every original time restriction are part of the complete set."],answerSummary:set}));
const attempt=attemptSchema.parse({id:"233ea43b-0d87-4fa7-a5be-e909866a6218",courseId:"mth-215",lessonId:"m05-l03",lessonVersion:1,mode:"checkpoint",status:"active",revision:0,seed:"logarithmic-interval-format",startedAt:"2026-09-24T12:00:00.000Z",submittedAt:null,position:0,questions,responses:{},hints:{}});
const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
const padding="+0.0000000000000000000000000000".repeat(4);
const answers=["(6ln(2),inf)","[0,ln(9)]",`(-inf,log(e,2)${padding}) U (ln(2)${padding},inf)`,"none"];
const input=(page:Page)=>page.locator("#practice").getByLabel("Complete exact time set (s)",{exact:true});
async function openCheckpoint(page:Page){await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();}

test("an included strict boundary or a rounded crossing cannot pass an exact interval checkpoint",async({page})=>{
  test.setTimeout(150_000);
  for(const incorrect of ["[6ln(2),inf)",`(${3*Math.log(4)},inf)`]){
    await restoreProgress(page,data);await openCheckpoint(page);
    for(let i=0;i<4;i++){
      await input(page).fill(i===0?incorrect:answers[i]);await page.getByRole("button",{name:i===3?"Submit checkpoint":"Next question",exact:true}).click();
    }
    await expect(page.getByRole("heading",{name:"Keep working on this objective",exact:true})).toBeVisible();await expect(page.locator(".attempt-results")).toContainText("3 of 4 correct");
    await page.getByText("Question 1: Review",{exact:true}).click();await expect(page.locator(".result-item").first().locator(".answer-feedback")).toContainText("rounded boundary changes the set");
    expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
  }
});

test("exact logarithmic intervals remain editable, accessible and durable through reload and backup",async({page},testInfo)=>{
  test.setTimeout(180_000);const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));expect(answers[2].length).toBeGreaterThan(200);expect(answers[2].length).toBeLessThan(500);
  await restoreProgress(page,data);await openCheckpoint(page);
  for(let i=0;i<4;i++){
    await expect(input(page)).toHaveAttribute("maxlength","500");await expect(page.locator("#practice")).toContainText("Keep endpoints exact");await input(page).fill(answers[i]);
    await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");
    if(i===0||i===2){await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(input(page)).toHaveValue(answers[i]);}
    if(i===2){
      await page.setViewportSize({width:390,height:844});const audit=await new AxeBuilder({page}).include("#practice").withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await input(page).focus();await expect(input(page)).toBeFocused();
    }
    const button=page.getByRole("button",{name:i===3?"Submit checkpoint":"Next question",exact:true});await button.focus();await button.press("Enter");
  }
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const file=testInfo.outputPath("logarithmic-interval-progress.json");await(await download).saveAs(file);
  const backup=JSON.parse(await readFile(file,"utf8"));expect(backup.learning.attempts[0].questions).toEqual(questions);expect(backup.learning.evidence).toHaveLength(1);
  for(let i=0;i<4;i++)expect(backup.learning.attempts[0].responses[questions[i].id].times).toBe(answers[i]);
  await restoreProgress(page,backup);await openCheckpoint(page);await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();expect(errors).toEqual([]);
});
