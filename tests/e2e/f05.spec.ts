import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import type { Question } from "../../lib/learning/contracts";
import { refresherAnswers } from "../refresher-answers";
const lessons=[1,2,3,4,5].map(n=>JSON.parse(readFileSync(new URL(`../../content/lessons/f05/m01-l0${n}.json`,import.meta.url),"utf8")));
async function fields(area:Locator,answers:Record<string,string>){for(const [label,value]of Object.entries(answers))await area.getByLabel(label,{exact:true}).fill(value);}
async function selectChoice(area:Locator,label:string,value:string){await area.getByRole("group",{name:label,exact:true}).locator(`input[value="${value}"]`).check();}
async function check(area:Locator){const button=area.getByRole("button",{name:"Check prediction",exact:true});await button.focus();await button.press("Enter");}
async function correct(area:Locator){await expect(area.getByRole("status")).toContainText("Correct.");}
async function guided(page:Page,n:number){
  const area=page.locator("#guided"),question=lessons[n-1].guided.question as Question,answers=refresherAnswers(question);
  for(const f of question.fields)if(f.kind==="choice")await selectChoice(area,f.label,f.correct);else await area.getByLabel(f.label+(f.unit?` (${f.unit})`:""),{exact:true}).fill(answers[f.id]);
  const button=area.getByRole("button",{name:"Check guided work",exact:true});await button.focus();await button.press("Enter");
  await expect(area.locator(".answer-feedback")).toContainText("Correct.");
}
async function accessible(page:Page){await page.setViewportSize({width:390,height:844});const r=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(r.violations.map(v=>v.id)).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
test("F05 exponential prediction distinguishes a linear continuation and resets changed models",async({page},info)=>{
  await page.goto("/courses/f05/lessons/m01-l01");await guided(page,1);const area=page.locator("#investigate");
  await check(area);await expect(area.getByRole("status")).toContainText("Enter an answer first");
  await fields(area,{"Predicted exponential output at n = 2":"9","Predicted horizontal asymptote":"0"});await check(area);await expect(area.getByRole("status")).toContainText("Review this reasoning");
  await fields(area,{"Predicted exponential output at n = 2":"12"});await check(area);await correct(area);
  await expect(area.getByRole("row",{name:"2 12 9",exact:true})).toBeVisible();
  await area.getByLabel("Per-step factor b",{exact:true}).selectOption("0.5");await area.getByLabel("Vertical offset",{exact:true}).selectOption("3");
  await expect(area.getByRole("img")).toHaveCount(0);
  await fields(area,{"Predicted exponential output at n = 2":"15/4","Predicted horizontal asymptote":"3"});await check(area);await correct(area);
  await accessible(page);await area.screenshot({path:info.outputPath("f05-growth-mobile.png")});
});
test("F05 logarithmic inverse accepts negative outputs and rejects invalid bases and arguments",async({page},info)=>{
  await page.goto("/courses/f05/lessons/m01-l02");await guided(page,2);const area=page.locator("#investigate");
  await fields(area,{"Predicted logarithm value":"3"});await selectChoice(area,"Coordinates on the inverse logarithm graph","swap");await check(area);await correct(area);
  await area.getByLabel("Logarithm argument",{exact:true}).fill("1/8");
  await fields(area,{"Predicted logarithm value":"-3"});await selectChoice(area,"Coordinates on the inverse logarithm graph","swap");await check(area);await correct(area);
  await expect(area.getByRole("row",{name:"Logarithm 0.125 -3.000000",exact:true})).toBeVisible();
  await area.getByLabel("Logarithm argument",{exact:true}).fill("0");await expect(area.getByRole("alert")).toContainText("positive");
  await area.getByLabel("Logarithm argument",{exact:true}).fill("8");await area.getByLabel("Logarithm base",{exact:true}).selectOption("1");await expect(area.getByRole("alert")).toContainText("cannot be one");
  await area.getByLabel("Logarithm base",{exact:true}).selectOption("2");await area.getByLabel("Logarithm argument",{exact:true}).fill("ln(2)");await expect(area.getByRole("alert")).toBeVisible();
  await area.getByLabel("Logarithm argument",{exact:true}).fill("8");await fields(area,{"Predicted logarithm value":"3"});await selectChoice(area,"Coordinates on the inverse logarithm graph","swap");await check(area);
  await accessible(page);await area.screenshot({path:info.outputPath("f05-inverse-mobile.png")});
});
test("F05 rule investigation distinguishes a coincident sample from an identity and preserves negative inputs",async({page},info)=>{
  await page.goto("/courses/f05/lessons/m01-l03");await guided(page,3);const area=page.locator("#investigate");
  await area.getByLabel("Proposed logarithm rule",{exact:true}).selectOption("sum");
  await selectChoice(area,"Does this identity preserve the full stated domain and values?","no");await selectChoice(area,"Is the proposed right side defined at this sample?","yes");
  await fields(area,{"Predicted left side minus right side":"0"});await check(area);await correct(area);
  await area.getByLabel("Sample x",{exact:true}).selectOption("1");await area.getByLabel("Sample y",{exact:true}).selectOption("1");
  await selectChoice(area,"Does this identity preserve the full stated domain and values?","no");await selectChoice(area,"Is the proposed right side defined at this sample?","yes");
  await fields(area,{"Predicted left side minus right side":"0.693"});await check(area);await correct(area);
  await area.getByLabel("Proposed logarithm rule",{exact:true}).selectOption("square-plain");await area.getByLabel("Sample x",{exact:true}).selectOption("-3");
  await selectChoice(area,"Does this identity preserve the full stated domain and values?","no");await selectChoice(area,"Is the proposed right side defined at this sample?","no");await check(area);await correct(area);
  await expect(area.getByRole("row",{name:"Proposed right side Undefined in the reals",exact:true})).toBeVisible();
  await area.getByLabel("Proposed logarithm rule",{exact:true}).selectOption("square-absolute");
  await selectChoice(area,"Does this identity preserve the full stated domain and values?","yes");await selectChoice(area,"Is the proposed right side defined at this sample?","yes");
  await fields(area,{"Predicted left side minus right side":"0"});await check(area);await correct(area);
  await accessible(page);await area.screenshot({path:info.outputPath("f05-rules-mobile.png")});
  await area.getByLabel("Sample x",{exact:true}).selectOption("0");await expect(area.getByRole("alert")).toContainText("x != 0");
});
test("F05 decay exploration distinguishes positive, initial, zero and past-only targets",async({page},info)=>{
  await page.goto("/courses/f05/lessons/m01-l04");await guided(page,4);const area=page.locator("#investigate");
  await selectChoice(area,"Predicted threshold classification","finite");await fields(area,{"Predicted threshold time (s)":"4.159"});await check(area);await correct(area);
  await area.getByLabel("Target fraction of initial voltage",{exact:true}).selectOption("1");
  await selectChoice(area,"Predicted threshold classification","finite");await fields(area,{"Predicted threshold time (s)":"0"});await check(area);await correct(area);
  for(const target of ["0","2"]){await area.getByLabel("Target fraction of initial voltage",{exact:true}).selectOption(target);await selectChoice(area,"Predicted threshold classification","never");await check(area);await correct(area);await expect(area.getByLabel("Predicted threshold time (s)",{exact:true})).toHaveCount(0);}
  await accessible(page);await area.screenshot({path:info.outputPath("f05-decay-mobile.png")});
});
test("F05 decibel investigation compares actual powers when resistances change",async({page},info)=>{
  await page.goto("/courses/f05/lessons/m01-l05");await guided(page,5);const area=page.locator("#investigate");
  await fields(area,{"Predicted power ratio":"2","Predicted power level or gain (dB)":"3.010"});await check(area);await correct(area);
  const mode=area.getByLabel("Comparison type",{exact:true});await mode.focus();await mode.press("Home");await mode.press("ArrowDown");await mode.press("Tab");await expect(mode).toHaveValue("voltage");
  await fields(area,{"Predicted power ratio":"2","Predicted power level or gain (dB)":"6.021"});await check(area);await expect(area.getByRole("status")).toContainText("Review this reasoning");
  await fields(area,{"Predicted power level or gain (dB)":"3.010"});await check(area);await correct(area);
  await expect(area.getByRole("row",{name:"Output power 0.040000 W",exact:true})).toBeVisible();
  await area.getByLabel("Output resistance in ohms",{exact:true}).selectOption("50");
  await fields(area,{"Predicted power ratio":"4","Predicted power level or gain (dB)":"6.021"});await check(area);await correct(area);
  await accessible(page);await area.screenshot({path:info.outputPath("f05-decibels-mobile.png")});
});
