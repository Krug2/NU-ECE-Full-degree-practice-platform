import { expect,test,type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { lessonSchema,type AnswerField } from "../../lib/learning/contracts";
import { formatLogarithmicIntervals } from "../../lib/learning/logarithmic-intervals";
import { createAttempt } from "../../lib/learning/attempts";
import { readStoredProgress,restoreProgress } from "./progress";

const route="/courses/mth-215/lessons/m05-l04";
const cases=[
  {baseline:"0",direction:"decreasing",range:"[12exp(-4),12]",equality:"one",equation:"[3ln(4),3ln(4)]",times:"[3ln(4),12]",sample:"5",predecessor:"4",least:"attained",reason:"crossing"},
  {baseline:"0",direction:"decreasing",range:"[12exp(-4),12]",equality:"one",equation:"[3ln(4),3ln(4)]",times:"(3ln(4),12]",sample:"5",predecessor:"4",least:"open",reason:"crossing"},
  {baseline:"9",direction:"increasing",range:"[3,9-6exp(-6)]",equality:"one",equation:"[2ln(3),2ln(3)]",times:"[2ln(3),12]",sample:"3",predecessor:"2",least:"attained",reason:"crossing"},
  {baseline:"0",direction:"increasing",range:"[2,2exp(3)]",equality:"none",equation:"[-4ln(2),-4ln(2)]",times:"[0,12]",sample:"0",predecessor:"none",least:"attained",reason:"crossing"},
  {baseline:"0",direction:"decreasing",range:"[1/8,8]",equality:"one",equation:"[6,6]",times:"[6,12]",sample:"6",predecessor:"4",least:"attained",reason:"crossing"},
  {baseline:"0",direction:"constant",range:"[4,4]",equality:"all",equation:"R",times:"[0,12]",sample:"0",predecessor:"none",least:"attained",reason:"constant"},
];
type Case=typeof cases[number];
async function predict(activity:Locator,item:Case){
  await activity.getByLabel("Predicted supplied baseline L (V)",{exact:true}).fill(item.baseline);
  await activity.getByLabel("Predicted output direction",{exact:true}).selectOption(item.direction);
  await activity.getByLabel("Predicted exact operating range (V)",{exact:true}).fill(item.range);
  await activity.getByLabel("Predicted equality within the operating interval",{exact:true}).selectOption(item.equality);
  await activity.getByRole("button",{name:"Check model predictions",exact:true}).click();
}
async function solve(activity:Locator,item:Case){
  await activity.getByLabel("Unrestricted equality time set",{exact:true}).fill(item.equation);
  await activity.getByLabel("Complete requested time set within operation",{exact:true}).fill(item.times);
  await activity.getByLabel("First valid sampled time (s), or none",{exact:true}).fill(item.sample);
  await activity.getByLabel("Immediately preceding scheduled time (s), or none",{exact:true}).fill(item.predecessor);
  await activity.getByRole("button",{name:"Check threshold solutions",exact:true}).click();
}
async function explain(activity:Locator,item:Case){
  await activity.getByLabel("Does the continuous solution set have a least time?",{exact:true}).selectOption(item.least);
  await activity.getByLabel("What justifies the condition in this case?",{exact:true}).selectOption(item.reason);
  await activity.getByRole("button",{name:"Check threshold explanation",exact:true}).click();
}
const answer=(field:AnswerField):string=>{
  if(field.kind==="choice")return field.correct;
  if(field.kind==="logarithmic-intervals")return formatLogarithmicIntervals(field.expected);
  if(field.kind==="logarithmic-roots")return field.expected.join(";")||"none";
  if(field.kind==="numeric")return field.expected.toFixed(4);
  if(field.kind==="rational"||field.kind==="logarithmic")return field.expected;
  throw new Error("Unexpected modeling answer format: "+field.kind);
};
async function fillField(container:Locator,field:AnswerField,value=answer(field)){
  if(field.kind==="choice")await container.getByRole("group",{name:field.label,exact:true}).locator('input[value="'+value+'"]').check();
  else await container.getByLabel(field.label+(field.unit?" ("+field.unit+")":""),{exact:true}).fill(value);
}

test("guided work and operating controls preserve exact boundaries and clear stale results",async({page})=>{
  test.setTimeout(180_000);await page.goto(route);
  await expect(page.locator("#read > section")).toHaveCount(22);await expect(page.locator(".worked-example")).toHaveCount(50);await expect(page.locator(".katex-error")).toHaveCount(0);
  const lesson=lessonSchema.parse(JSON.parse(await readFile("content/lessons/mth-215/m05-l04.json","utf8"))),guided=page.locator("#guided"),activity=page.locator("#investigate");
  for(const field of lesson.guided.question.fields)await fillField(guided,field,field.id==="crossing"?"4.1589":answer(field));
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Review this reasoning");
  await guided.getByLabel("Exact equality time for V = 4 (s)",{exact:true}).fill("6ln(2)");
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await predict(activity,{...cases[0],range:"(0,12]"});await expect(activity.locator(".model-prediction-status")).toContainText("endpoints");await expect(activity.getByLabel("Unrestricted equality time set",{exact:true})).toHaveCount(0);
  await predict(activity,cases[0]);await solve(activity,{...cases[0],times:"[4.1589,12]",sample:"4"});await expect(activity.locator(".model-solution-status")).toContainText("exact boundaries");await expect(activity.locator(".model-results")).toHaveCount(0);
  await solve(activity,cases[0]);await explain(activity,{...cases[0],reason:"pixels"});await expect(activity.locator(".model-explanation-status")).toContainText("Rounded plot pixels");
  await explain(activity,cases[0]);await expect(activity.locator(".model-explanation-status")).toContainText("Correct.");
  await activity.getByLabel("Target voltage (V)",{exact:true}).fill("");await expect(activity.locator(".model-control-status")).not.toHaveText("");await expect(activity.locator(".model-results")).toHaveCount(0);
  await activity.getByLabel("Target voltage (V)",{exact:true}).fill("0");
  const unreachable={...cases[0],equality:"none",equation:"empty",times:"empty",sample:"none",predecessor:"none",least:"empty",reason:"range"};
  await predict(activity,unreachable);await solve(activity,unreachable);await explain(activity,unreachable);await expect(activity.locator(".model-explanation-status")).toContainText("Correct.");
  await activity.getByRole("button",{name:"Reset selected model",exact:true}).click();await expect(activity.getByLabel("Target voltage (V)",{exact:true})).toHaveValue("3");await expect(activity.locator(".model-results")).toHaveCount(0);
  await activity.getByLabel("Target voltage (V)",{exact:true}).fill("12");
  const initial={...cases[0],equation:"[0,0]",times:"[0,12]",sample:"0",predecessor:"none"};
  await predict(activity,initial);await solve(activity,initial);await explain(activity,initial);await expect(activity.locator(".model-explanation-status")).toContainText("Correct.");
  await activity.getByLabel("Requested condition",{exact:true}).selectOption("<");
  const strictInitial={...initial,times:"(0,12]",sample:"1",predecessor:"0",least:"open"};
  await predict(activity,strictInitial);await solve(activity,strictInitial);await explain(activity,strictInitial);await expect(activity.locator(".model-explanation-status")).toContainText("Correct.");
  await activity.getByLabel("Model investigation case",{exact:true}).selectOption("4");await activity.getByLabel("Requested condition",{exact:true}).selectOption("<");
  const strictSample={...cases[4],times:"(6,12]",sample:"8",predecessor:"6",least:"open"};
  await predict(activity,strictSample);await solve(activity,{...strictSample,sample:"6"});await expect(activity.locator(".model-results")).toHaveCount(0);await solve(activity,strictSample);await explain(activity,strictSample);await expect(activity.locator(".model-explanation-status")).toContainText("Correct.");
  await activity.getByRole("button",{name:"Reset selected model",exact:true}).click();await expect(activity.getByLabel("Model investigation case",{exact:true})).toHaveValue("4");await expect(activity.getByLabel("Requested condition",{exact:true})).toHaveValue("<=");
  await activity.getByLabel("Operating horizon (s)",{exact:true}).fill("6");await activity.getByLabel("Include the final operating time",{exact:true}).uncheck();
  const excluded={...cases[4],range:"(1,8]",equality:"none",times:"empty",sample:"none",predecessor:"none",least:"empty"};
  await predict(activity,excluded);await solve(activity,excluded);await explain(activity,excluded);await expect(activity.locator(".model-results")).toContainText("Outside operation");
  await activity.getByLabel("Signed rate k (1/s)",{exact:true}).fill("3");await expect(activity.locator(".model-control-status")).toContainText("from -2 to 2");await expect(activity.locator(".model-results")).toHaveCount(0);
  expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
});

test("all six models support keyboard operation, equivalent tables and accessible narrow layouts",async({page},testInfo)=>{
  test.setTimeout(180_000);const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.goto(route);const activity=page.locator("#investigate");
  for(let index=0;index<cases.length;index++){
    await activity.getByLabel("Model investigation case",{exact:true}).selectOption(String(index));await predict(activity,cases[index]);await solve(activity,cases[index]);await explain(activity,cases[index]);
    await expect(activity.locator(".model-explanation-status")).toContainText("Correct.");await expect(activity.getByRole("img",{name:/^Supplied voltage model and threshold/})).toBeVisible();
    const table=activity.getByRole("region",{name:"Exact model values and operating threshold decisions",exact:true});await expect(table.getByRole("row")).toHaveCount([9,9,8,6,7,6][index]);await table.focus();await expect(table).toBeFocused();
  }
  await activity.getByLabel("Model investigation case",{exact:true}).selectOption("2");await predict(activity,cases[2]);await solve(activity,cases[2]);await explain(activity,cases[2]);
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);const audit=await new AxeBuilder({page}).setLegacyMode().withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await activity.locator(".model-figure").scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath("modeling-mobile.png")});
  const selector=activity.getByLabel("Model investigation case",{exact:true});await selector.focus();await selector.press("ArrowDown");await expect(selector).toHaveValue("3");await expect(activity.getByLabel("Predicted supplied baseline L (V)",{exact:true})).toHaveValue("");
  await selector.press("Tab");await expect(activity.locator(".model-lab > .display-equation")).toBeFocused();await page.keyboard.press("Tab");await expect(activity.getByLabel("Target voltage (V)",{exact:true})).toBeFocused();
  const reset=activity.getByRole("button",{name:"Reset selected model",exact:true});await reset.focus();await reset.press("Enter");await expect(selector).toHaveValue("3");
  expect(errors).toEqual([]);
});

test("the fitting tool checks observations, retains inputs and explains its loss without awarding evidence",async({page},testInfo)=>{
  test.setTimeout(180_000);const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.goto(route);const fit=page.locator(".model-fitting-tool");
  await fit.getByRole("button",{name:"Fit observations",exact:true}).click();await expect(fit.locator(".model-fit-result")).toBeVisible();
  const table=fit.getByRole("region",{name:"Observed voltages, fitted voltages and residuals",exact:true}),rows=table.locator("tbody tr"),amplitude=Math.cbrt(2);
  for(let index=0;index<3;index++){
    const cells=rows.nth(index).locator("td"),observed=[1,4,4][index],fitted=amplitude*2**index;
    expect(Number(await cells.nth(1).innerText())).toBeCloseTo(fitted,6);expect(Number(await cells.nth(2).innerText())).toBeCloseTo(observed-fitted,6);expect(Number(await cells.nth(3).innerText())).toBeCloseTo(Math.log(observed/fitted),7);
  }
  const before=await rows.allTextContents();await fit.getByLabel("Positive reference voltage (V)",{exact:true}).fill("10");await expect(fit.locator(".model-fit-result")).toHaveCount(0);await fit.getByRole("button",{name:"Fit observations",exact:true}).click();expect(await rows.allTextContents()).toEqual(before);
  await fit.getByLabel("Which squared errors does this fit minimize?",{exact:true}).selectOption("original");await fit.getByLabel("Does a good fit prove continued physical behavior?",{exact:true}).selectOption("yes");await fit.getByRole("button",{name:"Check fitting explanation",exact:true}).click();await expect(fit.locator(".model-fit-explanation")).toContainText("transformed space");
  await fit.getByLabel("Which squared errors does this fit minimize?",{exact:true}).selectOption("logs");await fit.getByRole("button",{name:"Check fitting explanation",exact:true}).click();await expect(fit.locator(".model-fit-explanation")).toContainText("finite data set");
  await fit.getByLabel("Does a good fit prove continued physical behavior?",{exact:true}).selectOption("no");await fit.getByRole("button",{name:"Check fitting explanation",exact:true}).click();await expect(fit.locator(".model-fit-explanation")).toContainText("Correct.");
  for(const value of ["0","-1"]){
    await fit.getByLabel("Voltage 1 (V)",{exact:true}).fill(value);await expect(fit.locator(".model-fit-result")).toHaveCount(0);await fit.getByRole("button",{name:"Fit observations",exact:true}).click();await expect(fit.locator(".model-fit-status")).toContainText("strictly positive");await expect(fit.getByLabel("Voltage 1 (V)",{exact:true})).toHaveValue(value);
  }
  await fit.getByRole("button",{name:"Reset fitting data",exact:true}).click();
  await fit.getByLabel("Time 2 (s)",{exact:true}).fill("0");await fit.getByLabel("Time 3 (s)",{exact:true}).fill("0");await fit.getByRole("button",{name:"Fit observations",exact:true}).click();await expect(fit.locator(".model-fit-status")).toContainText("distinct observation times");
  await fit.getByRole("button",{name:"Reset fitting data",exact:true}).click();
  for(let index=4;index<=6;index++){await fit.getByRole("button",{name:"Add observation",exact:true}).click();await expect(fit.getByLabel("Time "+index+" (s)",{exact:true})).toBeFocused();await fit.getByLabel("Time "+index+" (s)",{exact:true}).fill(String(index));await fit.getByLabel("Voltage "+index+" (V)",{exact:true}).fill("4");}
  await expect(fit.getByRole("button",{name:"Add observation",exact:true})).toBeDisabled();await fit.getByRole("button",{name:"Fit observations",exact:true}).click();await expect(rows).toHaveCount(6);
  await fit.getByRole("button",{name:"Remove observation 2",exact:true}).click();await expect(fit.getByLabel("Time 2 (s)",{exact:true})).toBeFocused();await expect(fit.locator(".model-fit-result")).toHaveCount(0);
  await fit.getByRole("button",{name:"Reset fitting data",exact:true}).click();await expect(fit.getByRole("button",{name:"Remove observation 1",exact:true})).toBeDisabled();
  for(let index=1;index<=3;index++)await fit.getByLabel("Voltage "+index+" (V)",{exact:true}).fill("7");
  await fit.getByRole("button",{name:"Fit observations",exact:true}).click();await expect(fit.locator(".model-fit-result")).toContainText("constant member");
  await page.setViewportSize({width:390,height:844});const audit=await new AxeBuilder({page}).setLegacyMode().withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await table.focus();await expect(table).toBeFocused();await fit.locator(".model-fit-result").scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath("model-fit-mobile.png")});
  const notes=page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true});await notes.fill("The logarithmic fit and the error measured in volts answer different questions.");await page.getByRole("button",{name:"Save lesson notes",exact:true}).click();await expect(page.getByText("Lesson notes saved.",{exact:true})).toBeVisible();await page.reload();await expect(notes).toHaveValue("The logarithmic fit and the error measured in volts answer different questions.");
  await page.getByRole("button",{name:"Start practice",exact:true}).click();await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 36");await page.locator("#practice").getByRole("button",{name:"Show a hint (0/3)",exact:true}).click();await expect(page.locator("#practice").getByRole("button",{name:"Show a hint (1/3)",exact:true})).toBeVisible();
  expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);expect(errors).toEqual([]);
});

test("four critical modeling families preserve saved answers, checkpoints and backups",async({page},testInfo)=>{
  test.setTimeout(180_000);const lesson=lessonSchema.parse(JSON.parse(await readFile("content/lessons/mth-215/m05-l04.json","utf8"))),attempt=createAttempt(lesson,"checkpoint","modeling-browser-checkpoint"),data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  async function submit(wrong:boolean){
    await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
    await expect(page.locator("#practice").getByRole("button",{name:/Show a hint/})).toHaveCount(0);
    for(let index=0;index<attempt.questions.length;index++){
      const question=attempt.questions[index];
      for(const [position,field] of question.fields.entries()){
        const incorrect=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:"999991";
        await fillField(page.locator("#practice"),field,wrong&&index===0&&position===0?incorrect:answer(field));
      }
      if(!wrong&&index<3){
        await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
        for(const field of question.fields)if(field.kind!=="choice")await expect(page.locator("#practice").getByLabel(field.label+(field.unit?" ("+field.unit+")":""),{exact:true})).toHaveValue(answer(field));
      }
      await page.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
    }
  }
  await restoreProgress(page,data);await submit(true);await expect(page.getByRole("heading",{name:"Keep working on this objective",exact:true})).toBeVisible();await expect(page.locator(".attempt-results")).toContainText("3 of 4 correct");expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
  await restoreProgress(page,data);await submit(false);await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const file=testInfo.outputPath("modeling-progress.json");await(await download).saveAs(file);
  const backup=JSON.parse(await readFile(file,"utf8"));expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence).toHaveLength(1);
  for(const question of attempt.questions)for(const field of question.fields)expect(backup.learning.attempts[0].responses[question.id][field.id]).toBe(answer(field));
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
