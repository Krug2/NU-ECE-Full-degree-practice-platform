import { expect,test,type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { lessonSchema,type AnswerField } from "../../lib/learning/contracts";
import { createAttempt } from "../../lib/learning/attempts";
import { formatIntervals } from "../../lib/learning/intervals";
import { readStoredProgress,restoreProgress } from "./progress";

const route="/courses/mth-215/lessons/m04-l03";
const cases=[
  {k:"3/2",factor:"2",output:"12",target:"12",algebraic:"8",allowed:"8"},
  {k:"24",factor:"1/2",output:"4",target:"4",algebraic:"6",allowed:"6"},
  {k:"72",factor:"1/4",output:"2",target:"2",algebraic:"-6,6",allowed:"6"},
  {k:"5/2",factor:"6",output:"90",target:"30",algebraic:"4",allowed:"4"},
  {k:"3",factor:"1/2",output:"3",target:"12",algebraic:"8",allowed:"8"},
  {k:"6",factor:"2",output:"24",target:"48",algebraic:"-4,4",allowed:"4"},
];
async function calibrate(activity:Locator,index:number){
  await activity.getByLabel("Variation example",{exact:true}).selectOption(String(index));
  await activity.getByLabel("Predicted variation constant k",{exact:true}).fill(cases[index].k);
  await activity.getByRole("button",{name:"Check variation constant",exact:true}).click();
  await expect(activity.locator(".variation-calibration-status")).toContainText("The constant is correct");
}
async function predict(activity:Locator,factor:string,output:string,status="inside"){
  await activity.getByLabel("Predicted output multiplier",{exact:true}).fill(factor);
  await activity.getByLabel("Predicted changed output (V)",{exact:true}).fill(output);
  await activity.getByLabel("Predicted status of the changed inputs",{exact:true}).selectOption(status);
  await activity.getByRole("button",{name:"Check variation predictions",exact:true}).click();
}
async function solve(activity:Locator,algebraic:string,allowed:string){
  await activity.getByLabel("All real algebraic x candidates",{exact:true}).fill(algebraic);
  await activity.getByLabel("Allowed x inputs in the operating window",{exact:true}).fill(allowed);
  await activity.getByRole("button",{name:"Check target inputs",exact:true}).click();
}
test("variation predictions distinguish calibration, scaling, domains, and complete target sets without assisted evidence",async({page})=>{
  test.setTimeout(180_000);const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/courses/mth-215/lessons/m04-l02");await page.getByRole("link",{name:"Next: Variation and rational models",exact:true}).click();
  const guided=page.locator("#guided"),activity=page.locator("#investigate");
  for(const [label,value] of [["Variation constant k","6"],["Combined output multiplier","2"],["Response at x = 4 and z = 6","16"],["All real x candidates for y = 18 with z = 3","3"],["Physically allowed x candidates","3"],["Original excluded z inputs","0"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Review this reasoning");
  await guided.getByLabel("All real x candidates for y = 18 with z = 3",{exact:true}).fill("-3,3");await guided.getByLabel("Original excluded z inputs",{exact:true}).fill("empty");
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Review this reasoning");
  await guided.getByLabel("Original excluded z inputs",{exact:true}).fill("0");await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await activity.getByLabel("Predicted variation constant k",{exact:true}).fill("2");await activity.getByRole("button",{name:"Check variation constant",exact:true}).click();
  await expect(activity.locator(".variation-calibration-status")).toContainText("Recheck");await expect(activity.getByRole("button",{name:"Check variation predictions",exact:true})).toHaveCount(0);
  await calibrate(activity,2);await activity.getByRole("button",{name:"Check variation predictions",exact:true}).click();await expect(activity.locator(".variation-forward-status")).toContainText("Predict the multiplier");
  await predict(activity,"1/2","2");await expect(activity.locator(".variation-forward-status")).toContainText("Review the output multiplier");
  await predict(activity,"1/4","4");await expect(activity.locator(".variation-forward-status")).toContainText("The multiplier is correct");
  await predict(activity,"1/4","2");await expect(activity.locator(".variation-forward-status")).toContainText("All three predictions are correct");
  await activity.getByLabel("Changed x input (m)",{exact:true}).fill("24");await expect(activity.locator(".variation-forward-result")).toHaveCount(0);
  await predict(activity,"1/64","1/8");await expect(activity.locator(".variation-forward-status")).toContainText("The numerical predictions are correct");
  await predict(activity,"1/64","1/8","outside");await expect(activity.locator(".variation-forward-status")).toContainText("All three predictions are correct");await expect(activity.locator(".variation-forward-result")).toContainText("not a validated operating prediction");await expect(activity.locator(".variation-changed-point")).toHaveCount(0);
  await activity.getByLabel("Changed x input (m)",{exact:true}).fill("i");await activity.getByRole("button",{name:"Check variation predictions",exact:true}).click();await expect(activity.locator(".variation-forward-status")).toContainText("Use an exact rational number");await expect(activity.locator(".variation-forward-result")).toHaveCount(0);
  await activity.getByLabel("Changed x input (m)",{exact:true}).fill("0");await predict(activity,"undefined","undefined","undefined");await expect(activity.locator(".variation-forward-status")).toContainText("All three predictions are correct");await expect(activity.locator(".variation-forward-result")).toContainText("Zero is excluded");
  await solve(activity,"6","6");await expect(activity.locator(".variation-target-status")).toContainText("Keep every real algebraic candidate");
  await solve(activity,"-6,6","-6,6");await expect(activity.locator(".variation-target-status")).toContainText("Apply the positive operating window");
  await solve(activity,"-6,6","6");await expect(activity.locator(".variation-target-status")).toContainText("Both target sets are correct");
  await activity.getByLabel("Target response (V)",{exact:true}).fill("1/2");await solve(activity,"-12,12","12");await expect(activity.locator(".variation-target-status")).toContainText("Both target sets are correct");
  await activity.getByLabel("Target response (V)",{exact:true}).fill("1/8");await solve(activity,"-24,24","24");await expect(activity.locator(".variation-target-status")).toContainText("Apply the positive operating window");
  await solve(activity,"-24,24","empty");await expect(activity.locator(".variation-target-status")).toContainText("Both target sets are correct");
  await activity.getByLabel("Target response (V)",{exact:true}).fill("0");await solve(activity,"empty","empty");await expect(activity.locator(".variation-target-status")).toContainText("Both target sets are correct");
  await calibrate(activity,5);await activity.getByLabel("Changed z input (s)",{exact:true}).fill("2");await predict(activity,(8/Math.cbrt(2)).toPrecision(7),(96/Math.cbrt(2)).toPrecision(7));
  await expect(activity.locator(".variation-forward-status")).toContainText("All three predictions are correct");await expect(activity.getByRole("region",{name:"Variation value comparison",exact:true})).toContainText("approximately");
  await solve(activity,"-4,4","4");await expect(activity.locator(".variation-target-status")).toContainText("Both target sets are correct");
  await activity.getByLabel("Predicted variation constant k",{exact:true}).fill("1");await expect(activity.locator(".variation-target-result")).toHaveCount(0);await expect(activity.locator(".variation-forward-result")).toHaveCount(0);
  expect((await readStoredProgress(page)).learning.evidence).toEqual([]);await expect(page.locator(".katex-error")).toHaveCount(0);expect(errors).toEqual([]);
});
test("all six variation investigations support exact tables, mobile graphs, keyboard controls, and reset",async({page},testInfo)=>{
  test.setTimeout(180_000);await page.goto(route);const activity=page.locator("#investigate");
  for(let i=0;i<cases.length;i++){
    const item=cases[i];await calibrate(activity,i);await predict(activity,item.factor,item.output);await expect(activity.locator(".variation-forward-status")).toContainText("All three predictions are correct");
    await expect(activity.getByRole("region",{name:"Variation value comparison",exact:true}).getByRole("row")).toHaveCount(3);
    await expect(activity.locator(".variation-changed-point")).toHaveCount(1);await expect(activity.getByLabel("Target response (V)",{exact:true})).toHaveValue(item.target);
    await solve(activity,item.algebraic,item.allowed);await expect(activity.locator(".variation-target-status")).toContainText("Both target sets are correct");
    const baseline=await activity.locator(".variation-baseline-curve").getAttribute("points"),changed=await activity.locator(".variation-changed-curve").getAttribute("points");
    if(i<3)expect(changed).toBe(baseline);else expect(changed).not.toBe(baseline);
  }
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await activity.locator(".function-figure").screenshot({path:testInfo.outputPath("variation-mobile.png")});
  const table=activity.getByRole("region",{name:"Variation value comparison",exact:true});await table.focus();await expect(table).toBeFocused();const button=activity.getByRole("button",{name:"Check variation predictions",exact:true});await button.focus();await button.press("Enter");await expect(activity.locator(".variation-forward-status")).toContainText("All three predictions are correct");
  await activity.getByRole("button",{name:"Reset variation investigation",exact:true}).click();await expect(activity.locator(".variation-forward-result")).toHaveCount(0);await expect(activity.locator(".variation-target-result")).toHaveCount(0);await expect(activity.getByLabel("Variation example",{exact:true})).toHaveValue("0");await expect(activity.getByLabel("Predicted variation constant k",{exact:true})).toHaveValue("");
  await page.getByRole("button",{name:"Start practice",exact:true}).click();await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 32");
});
const answer=(field:AnswerField):string=>{
  if(field.kind==="choice")return field.correct;
  if(field.kind==="roots")return field.expected.join(",")||"empty";
  if(field.kind==="intervals")return formatIntervals(field.expected);
  if(field.kind==="rational")return field.expected;
  throw new Error("Unexpected variation field");
};
const label=(field:AnswerField)=>field.label+("unit" in field&&field.unit?" ("+field.unit+")":"");
test("a lost algebraic branch blocks evidence and fractional coefficients survive reload and backup",async({page},testInfo)=>{
  test.setTimeout(180_000);const lesson=lessonSchema.parse(JSON.parse(await readFile("content/lessons/mth-215/m04-l03.json","utf8"))),variants=["unit-change","target-input","root-power","units"];
  const attempt=createAttempt({...lesson,checkpoint:lesson.checkpoint.map((slot,i)=>({...slot,variant:variants[i]}))},"checkpoint","variation-browser");
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}},fraction=attempt.questions[0].fields.find(field=>field.kind==="rational"&&field.expected.includes("/"))!;
  expect(fraction).toBeDefined();
  async function submit(missBranch:boolean){
    await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
    for(let i=0;i<attempt.questions.length;i++){
      for(const field of attempt.questions[i].fields){
        if(field.kind==="choice")await page.locator("#practice").getByRole("group",{name:field.label,exact:true}).locator('input[value="'+field.correct+'"]').check();
        else await page.locator("#practice").getByLabel(label(field),{exact:true}).fill(missBranch&&i===1&&field.id==="algebraic"&&field.kind==="roots"?field.expected[1]:answer(field));
      }
      if(!missBranch&&i===0){await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(page.locator("#practice").getByLabel(label(fraction),{exact:true})).toHaveValue(answer(fraction));}
      await page.getByRole("button",{name:i===3?"Submit checkpoint":"Next question",exact:true}).click();
    }
  }
  await restoreProgress(page,data);await submit(true);await expect(page.getByRole("heading",{name:"Keep working on this objective",exact:true})).toBeVisible();await expect(page.locator(".attempt-results")).toContainText("3 of 4 correct");expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
  await restoreProgress(page,data);await submit(false);await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const file=testInfo.outputPath("variation-progress.json");await(await download).saveAs(file);
  const backup=JSON.parse(await readFile(file,"utf8"));expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence).toHaveLength(1);
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
