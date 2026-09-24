import { restoreProgress } from "./progress";
import { expect,test,type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";

const route="/courses/mth-215/lessons/m02-l04";
async function predict(activity:Locator,slope:string,intercept:string,value:string,residual?:string){
  await activity.locator("#calibration-answer-slope").fill(slope);
  await activity.locator("#calibration-answer-intercept").fill(intercept);
  await activity.locator("#calibration-answer-value").fill(value);
  if(residual!==undefined)await activity.locator("#calibration-answer-residual").fill(residual);
  await activity.getByRole("button",{name:"Check calibration",exact:true}).click();
}
test("fits calibration observations, retains exact coordinates, and separates drawing scale from the rate",async({page})=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/courses/mth-215/lessons/m02-l03");
  await page.getByRole("link",{name:"Next: Rates of change and linear calibration",exact:true}).click();
  const guided=page.locator("#guided"),activity=page.locator("#investigate"),status=activity.locator("[role=status]");
  for(const [label,value] of [["Slope (V per degree C)","-3/100"],["Voltage rule (V)","4-3*x/100"],["Predicted voltage at 50 (V)","2.5"],["Observed minus predicted (V)",".1"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByRole("radio",{name:"It meets the inclusive tolerance at this input; further observations are needed to assess the model",exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await activity.getByRole("button",{name:"Check calibration",exact:true}).click();
  await expect(status).toContainText("Enter each prediction");
  await predict(activity,"1/25",".5","1.7","0");
  await expect(status).toContainText("Review the signed output change");
  await predict(activity,"1/50","1/2","17/10","0");
  await expect(status).toContainText("All predictions are correct");
  await expect(activity.locator(".calibration-result")).toContainText("Interpolation");
  const coordinates=await activity.getByRole("table").textContent(),rate=await activity.locator(".calibration-rate").textContent();
  const geometry=await activity.locator(".calibration-figure svg path").last().getAttribute("d");
  await activity.getByLabel("Horizontal span",{exact:true}).selectOption("4");
  await activity.getByLabel("Vertical span",{exact:true}).selectOption("2");
  expect(await activity.locator(".calibration-figure svg path").last().getAttribute("d")).not.toBe(geometry);
  await expect(activity.getByRole("table")).toHaveText(coordinates!);
  await expect(activity.locator(".calibration-rate")).toHaveText(rate!);
  await expect(status).toContainText("All predictions are correct");
  await activity.getByLabel("Calibration A output (V)",{exact:true}).fill("1/4+1/4");
  await expect(activity.locator(".calibration-result")).toHaveCount(0);
  await predict(activity,".02",".5","1.7","0");
  await expect(status).toContainText("All predictions are correct");
  await expect(activity.locator(".katex-error")).toHaveCount(0);
  await expect(activity.getByRole("table").locator("tbody tr").first()).toContainText("A");
  await activity.getByLabel("Calibration B input (degrees C)",{exact:true}).fill("0");
  await predict(activity,"0",".5",".5","0");
  await expect(status).toContainText("Calibration inputs must be distinct");
  await expect(activity.locator(".calibration-result")).toHaveCount(0);
  await activity.getByRole("button",{name:"Reset calibration",exact:true}).click();
  await activity.getByLabel("Operating upper input (degrees C)",{exact:true}).fill("99");
  await predict(activity,".02",".5","1.7","0");
  await expect(status).toContainText("Both calibration inputs must lie within");
  await activity.getByRole("button",{name:"Reset calibration",exact:true}).click();
  await activity.getByLabel("Third observation input (degrees C)",{exact:true}).fill("1/0");
  await predict(activity,".02",".5","1.7","0");
  await expect(status).toContainText("Use an exact rational value");
  await activity.getByRole("button",{name:"Reset calibration",exact:true}).click();
  await expect(activity.getByLabel("Calibration A output (V)",{exact:true})).toHaveValue("1/2");
  expect(errors).toEqual([]);
});
test("compares measured residuals and gives explicit scope feedback for every sensor case",async({page})=>{
  await page.goto(route);const activity=page.locator("#investigate"),status=activity.locator("[role=status]");
  const examples=[
    {index:"0",m:"1/50",b:"1/2",y:"17/10",e:"0"},
    {index:"1",m:"-3/40",b:"19/4",y:"5/2",e:"0"},
    {index:"2",m:"0",b:"2",y:"2",e:"0"},
    {index:"3",m:"1/50",b:"1/2",y:"17/10",e:"3/50"},
    {index:"4",m:"1/50",b:"1/2",y:"7/2",e:"-1/10"},
  ];
  for(const entry of examples){
    await activity.getByLabel("Calibration example",{exact:true}).selectOption(entry.index);
    await predict(activity,entry.m,entry.b,entry.y,entry.e);
    await expect(status).toContainText("All predictions are correct");
    await expect(activity.getByRole("table").locator("tbody tr")).toHaveCount(4);
  }
  await expect(activity.locator(".calibration-result")).toContainText("outside the stated operating interval");
  await expect(activity.locator(".calibration-result")).toContainText("local evidence");
  await activity.getByLabel("Third observation input (degrees C)",{exact:true}).fill("110");
  await activity.getByLabel("Third recorded output (V)",{exact:true}).fill("2.8");
  await predict(activity,"1/50","1/2","2.7",".1");
  await expect(status).toContainText("All predictions are correct");
  await expect(activity.locator(".calibration-result")).toContainText("Extrapolation.");
  await expect(activity.locator(".calibration-result")).toContainText("within the stated operating interval");
});
test("recovers inputs for decreasing rules and reports constant-output inverse outcomes",async({page})=>{
  await page.goto(route);const activity=page.locator("#investigate"),status=activity.locator("[role=status]");
  await activity.getByLabel("Calibration task",{exact:true}).selectOption("inverse");
  await predict(activity,".02",".5","60");
  await expect(status).toContainText("All predictions are correct");
  await expect(activity.locator(".calibration-result")).toContainText("Forward substitution check");
  await activity.getByLabel("Target output (V)",{exact:true}).fill("3");
  await predict(activity,".02",".5","125");
  await expect(status).toContainText("All predictions are correct");
  await expect(activity.locator(".calibration-result")).toContainText("outside the stated operating interval");
  await activity.getByLabel("Calibration example",{exact:true}).selectOption("1");
  await predict(activity,"-3/40","19/4","30");
  await expect(status).toContainText("All predictions are correct");
  await activity.getByLabel("Calibration example",{exact:true}).selectOption("2");
  await predict(activity,"0","2","all");
  await expect(status).toContainText("All predictions are correct");
  await expect(activity.locator(".calibration-result")).toContainText("Every input in the operating interval");
  await expect(activity.getByRole("table")).toHaveCount(0);
  await activity.getByLabel("Target output (V)",{exact:true}).fill("3");
  await predict(activity,"0","2","none");
  await expect(status).toContainText("All predictions are correct");
  await expect(activity.locator(".calibration-result")).toContainText("No input in the operating interval");
  await activity.getByRole("button",{name:"Reset calibration",exact:true}).click();
  await expect(activity.getByLabel("Calibration task",{exact:true})).toHaveValue("forward");
});
test("keeps the calibration graph, keyboard controls, and exact table accessible on mobile",async({page},testInfo)=>{
  await page.goto(route);const activity=page.locator("#investigate");
  await predict(activity,".02",".5","1.7","0");
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    const results=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(results.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await activity.locator(".calibration-figure").screenshot({path:testInfo.outputPath("calibration-mobile.png")});
  const check=activity.getByRole("button",{name:"Check calibration",exact:true});await check.focus();await check.press("Enter");
  await expect(activity.locator("[role=status]")).toContainText("All predictions are correct");
  await page.getByRole("button",{name:"Start practice",exact:true}).click();
  await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 26");
  await page.locator("#practice").getByLabel("First interval average (m/s)",{exact:true}).fill("-3/4");
  await page.reload();
  await expect(page.locator("#practice").getByLabel("First interval average (m/s)",{exact:true})).toHaveValue("-3/4");
});
test("restores calibration checkpoint evidence, exact formulas, and measured-data interpretations",async({page},testInfo)=>{
  const lesson=lessonSchema.parse(JSON.parse(await readFile(new URL("../../content/lessons/mth-215/m02-l04.json",import.meta.url),"utf8")));
  const attempt=createAttempt(lesson,"checkpoint","calibration-browser-fixture");
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  await restoreProgress(page,data);
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  for(let index=0;index<attempt.questions.length;index++){
    for(const field of attempt.questions[index].fields){
      if(field.kind==="choice")await page.locator("#practice").getByRole("group",{name:field.label,exact:true}).locator('input[value="'+field.correct+'"]').check();
      else if(field.kind==="rational"||field.kind==="polynomial")await page.locator("#practice").getByLabel(field.label+(field.unit?" ("+field.unit+")":""),{exact:true}).fill(field.expected);
      else throw new Error("Unexpected calibration checkpoint field");
    }
    await page.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");
  const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const file=testInfo.outputPath("calibration-progress.json");await(await download).saveAs(file);
  const backup=JSON.parse(await readFile(file,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);
  expect(backup.learning.evidence).toHaveLength(1);
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();
  await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await page.getByLabel("Import a progress backup",{exact:true}).setInputFiles(file);
  await page.getByRole("button",{name:"Replace with this backup",exact:true}).click();
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.getByText("Question 4: Correct",{exact:true}).click();
  const restored=page.locator("#practice .result-item").filter({has:page.getByText("Question 4: Correct",{exact:true})});
  await expect(restored).toContainText("Observed minus predicted");
  await expect(restored).toContainText("Supported conclusion");
});
