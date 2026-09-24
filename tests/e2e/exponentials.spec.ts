import { expect,test,type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { lessonSchema,type AnswerField } from "../../lib/learning/contracts";
import { createAttempt } from "../../lib/learning/attempts";
import { formatIntervals } from "../../lib/learning/intervals";
import { readStoredProgress,restoreProgress } from "./progress";

const route="/courses/mth-215/lessons/m05-l01";
const cases=[
  {first:"3",second:"9/2",factor:"3/2",exponential:"81/4",linear:"15"},
  {first:"-24",second:"-12",factor:"1/2",exponential:"6",linear:"-24"},
  {first:"30",second:"120",factor:"4",exponential:"640",linear:"100"},
  {first:"3",second:"6",factor:"2",exponential:"28",linear:"16"},
  {first:"-2",second:"-4",factor:"2",exponential:"-11",linear:"-3"},
  {first:String(12/Math.E-12),second:String(12/Math.E**2-12/Math.E),factor:String(1/Math.E),exponential:String(2+12/Math.E**3),linear:String(36/Math.E-22)},
];
async function pattern(activity:Locator,first:string,second:string,factor:string,kind="exponential"){
  for(const [label,value] of [["Predicted first difference (V)",first],["Predicted second difference (V)",second],["Predicted deviation factor",factor]])await activity.getByLabel(label,{exact:true}).fill(value);
  await activity.getByLabel("Predicted pattern",{exact:true}).selectOption(kind);await activity.getByRole("button",{name:"Check pattern predictions",exact:true}).click();
}
async function predict(activity:Locator,exponential:string,linear:string){
  await activity.getByLabel("Predicted exponential response (V)",{exact:true}).fill(exponential);await activity.getByLabel("Predicted linear response (V)",{exact:true}).fill(linear);await activity.getByRole("button",{name:"Check response predictions",exact:true}).click();
}
test("exponential investigation checks the baseline, time interval, fractional inputs and calculator precision without evidence",async({page})=>{
  test.setTimeout(180_000);const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/courses/mth-215/lessons/m04-l04");await page.getByRole("link",{name:"Next: Exponential functions and growth factors",exact:true}).click();const guided=page.locator("#guided"),activity=page.locator("#investigate");
  for(const [label,value] of [["Deviation multiplier per two-second step","2"],["Initial deviation from the baseline (V)","3"],["Initial exponential response (V)","7"],["Exponential response at 6 s (V)","28"],["Linear response at 6 s (V)","16"],["Full exponential output range (V)","[4,inf)"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByRole("group",{name:"Exponential model",exact:true}).locator('input[value="seconds"]').check();await guided.getByRole("group",{name:"What do the finite records establish?",exact:true}).locator('input[value="consistent"]').check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Review this reasoning");
  await guided.getByRole("group",{name:"Exponential model",exact:true}).locator('input[value="step"]').check();await guided.getByLabel("Full exponential output range (V)",{exact:true}).fill("(4,inf)");await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await activity.getByLabel("Exponential example",{exact:true}).selectOption("3");await pattern(activity,"3","6","10/7");await expect(activity.locator(".exponential-pattern-status")).toContainText("Review the factor");await expect(activity.getByRole("button",{name:"Check response predictions",exact:true})).toHaveCount(0);
  await pattern(activity,"3","6","2","linear");await expect(activity.locator(".exponential-pattern-status")).toContainText("differences change");await pattern(activity,"3","6","2");await predict(activity,"28","19");await expect(activity.locator(".exponential-response-status")).toContainText("Review the linear prediction");await predict(activity,"28","16");await expect(activity.locator(".exponential-response-status")).toContainText("Both predictions are correct");
  await activity.getByLabel("Observation step (s)",{exact:true}).fill("1/2");await expect(activity.locator(".exponential-result")).toHaveCount(0);await expect(activity.getByLabel("Predicted first difference (V)",{exact:true})).toHaveValue("");
  await pattern(activity,"-3+3*sqrt(2)","6-3*sqrt(2)","sqrt(8)/2");await expect(activity.locator(".exponential-pattern-status")).toContainText("All pattern predictions are correct");await predict(activity,"28","-11+18*sqrt(2)");await expect(activity.locator(".exponential-response-status")).toContainText("Both predictions are correct");
  await activity.getByLabel("Prediction input x (s)",{exact:true}).fill("-1");await predict(activity,"11/2","13-6*sqrt(2)");await expect(activity.locator(".exponential-response-status")).toContainText("Both predictions are correct");
  await activity.getByLabel("Prediction input x (s)",{exact:true}).fill("13");await predict(activity,"0","0");await expect(activity.locator(".exponential-result")).toHaveCount(0);await expect(activity.locator(".exponential-response-status")).toContainText("not the function's domain");
  await activity.getByLabel("Observation step (s)",{exact:true}).fill("0");await expect(activity.getByRole("region",{name:"Observed exponential records",exact:true})).toHaveCount(0);await expect(activity).toContainText("Use an observation step from 1/4 to 4 seconds");
  await activity.getByLabel("Calculator exponent z",{exact:true}).fill("1/5");await activity.getByLabel("Calculator scale a",{exact:true}).fill("100");await activity.getByLabel("Calculator baseline k",{exact:true}).fill("-100");await activity.getByRole("button",{name:"Calculate natural exponential",exact:true}).click();await expect(activity.locator(".exponential-calculator-result")).toContainText("22.140275816017");
  await activity.getByLabel("Calculator exponent z",{exact:true}).fill("1000");await activity.getByLabel("Calculator scale a",{exact:true}).fill("1");await activity.getByLabel("Calculator baseline k",{exact:true}).fill("0");await activity.getByRole("button",{name:"Calculate natural exponential",exact:true}).click();await expect(activity.locator(".exponential-calculator-status")).toContainText("mathematically finite, not undefined");
  await activity.getByLabel("Calculator exponent z",{exact:true}).fill("-1000");await activity.getByRole("button",{name:"Calculate natural exponential",exact:true}).click();await expect(activity.locator(".exponential-calculator-status")).toContainText("not become exactly zero");
  await activity.getByLabel("Calculator exponent z",{exact:true}).fill("1/0");await activity.getByRole("button",{name:"Calculate natural exponential",exact:true}).click();await expect(activity.locator(".exponential-calculator-result")).toHaveCount(0);await expect(activity.locator(".exponential-calculator-status")).toContainText("Division by zero");
  expect((await readStoredProgress(page)).learning.evidence).toEqual([]);await expect(page.locator(".katex-error")).toHaveCount(0);expect(errors).toEqual([]);
});
test("six exponential cases provide shared plots, accessible tables, keyboard controls and mobile reset",async({page},testInfo)=>{
  test.setTimeout(180_000);await page.goto(route);const activity=page.locator("#investigate");
  for(let i=0;i<cases.length;i++){
    const item=cases[i];await activity.getByLabel("Exponential example",{exact:true}).selectOption(String(i));await pattern(activity,item.first,item.second,item.factor);await expect(activity.locator(".exponential-pattern-status")).toContainText("All pattern predictions are correct");await predict(activity,item.exponential,item.linear);await expect(activity.locator(".exponential-response-status")).toContainText("Both predictions are correct");
    await expect(activity.getByRole("region",{name:"Observed exponential records",exact:true}).getByRole("row")).toHaveCount(4);await expect(activity.getByRole("region",{name:"Exponential and linear predictions",exact:true}).getByRole("row")).toHaveCount(2);
    const curved=(await activity.locator(".exponential-curve").getAttribute("points"))!.split(" ").map(pair=>pair.split(",").map(Number)),linear=(await activity.locator(".exponential-linear-curve").getAttribute("points"))!.split(" ").map(pair=>pair.split(",").map(Number));
    expect(curved.map(point=>point[0])).toEqual(linear.map(point=>point[0]));expect(curved[0][1]).toBeCloseTo(linear[0][1],10);expect(curved.at(-1)![1]).not.toBeCloseTo(linear.at(-1)![1],2);
  }
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);expect(page.frames()).toHaveLength(1);const audit=await new AxeBuilder({page}).setLegacyMode().withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await activity.locator(".exponential-figure").screenshot({path:testInfo.outputPath("exponential-mobile.png")});
  const table=activity.getByRole("region",{name:"Exponential and linear predictions",exact:true});await table.focus();await expect(table).toBeFocused();const button=activity.getByRole("button",{name:"Check response predictions",exact:true});await button.focus();await button.press("Enter");await expect(activity.locator(".exponential-response-status")).toContainText("Both predictions are correct");
  await activity.getByRole("button",{name:"Reset exponential investigation",exact:true}).click();await expect(activity.locator(".exponential-result")).toHaveCount(0);await expect(activity.getByLabel("Exponential example",{exact:true})).toHaveValue("0");await expect(activity.getByLabel("Observation step (s)",{exact:true})).toHaveValue("1");await expect(activity.getByLabel("Predicted first difference (V)",{exact:true})).toHaveValue("");await expect(activity.getByLabel("Calculator exponent z",{exact:true})).toHaveValue("");
  await page.getByRole("button",{name:"Start practice",exact:true}).click();await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 33");
});
const answer=(field:AnswerField):string=>{
  if(field.kind==="choice")return field.correct;
  if(field.kind==="intervals")return formatIntervals(field.expected);
  if(field.kind==="rational"||field.kind==="exact")return "("+field.expected+")+0";
  if(field.kind==="numeric")return field.expected.toFixed(6);
  throw new Error("Unexpected exponential field");
};
const label=(field:AnswerField)=>field.label+("unit" in field&&field.unit?" ("+field.unit+")":"");
test("closed operating endpoints are critical and exact and decimal answers survive reload and backup",async({page},testInfo)=>{
  test.setTimeout(180_000);const lesson=lessonSchema.parse(JSON.parse(await readFile("content/lessons/mth-215/m05-l01.json","utf8"))),variants=["step-model","continuous-rate","y-intercept","operating-window"],template={...lesson,checkpoint:lesson.checkpoint.map((slot,i)=>({...slot,variant:variants[i]}))};
  const attempt=Array.from({length:60},(_,i)=>createAttempt(template,"checkpoint","exponential-browser-"+i)).find(a=>a.questions[2].fields.some(field=>field.kind==="exact"&&field.expected.includes("sqrt")))!;expect(attempt).toBeDefined();
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  async function submit(missEndpoints:boolean){
    await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
    for(let i=0;i<attempt.questions.length;i++){
      for(const field of attempt.questions[i].fields){
        if(field.kind==="choice")await page.locator("#practice").getByRole("group",{name:field.label,exact:true}).locator('input[value="'+field.correct+'"]').check();
        else await page.locator("#practice").getByLabel(label(field),{exact:true}).fill(missEndpoints&&i===3&&field.id==="operating-range"?answer(field).replace(/^\[/,"(").replace(/\]$/,")"):answer(field));
      }
      if(!missEndpoints&&i<3){
        await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
        for(const field of attempt.questions[i].fields)if(field.kind!=="choice")await expect(page.locator("#practice").getByLabel(label(field),{exact:true})).toHaveValue(answer(field));
      }
      await page.getByRole("button",{name:i===3?"Submit checkpoint":"Next question",exact:true}).click();
    }
  }
  await restoreProgress(page,data);await submit(true);await expect(page.getByRole("heading",{name:"Keep working on this objective",exact:true})).toBeVisible();await expect(page.locator(".attempt-results")).toContainText("3 of 4 correct");expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
  await restoreProgress(page,data);await submit(false);await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const file=testInfo.outputPath("exponential-progress.json");await(await download).saveAs(file);
  const backup=JSON.parse(await readFile(file,"utf8"));expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence).toHaveLength(1);for(const q of attempt.questions)for(const field of q.fields)expect(backup.learning.attempts[0].responses[q.id][field.id]).toBe(answer(field));
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
