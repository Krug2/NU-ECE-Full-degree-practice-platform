import { expect,test,type Locator,type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import type { Question } from "../../lib/learning/contracts";
import { refresherAnswers } from "../refresher-answers";
const lessons=[1,2,3,4].map(n=>JSON.parse(readFileSync(new URL(`../../content/lessons/f10/m01-l0${n}.json`,import.meta.url),"utf8")));
async function fill(area:Locator,values:Record<string,string>){for(const [label,value]of Object.entries(values))await area.getByLabel(label,{exact:true}).fill(value);}
async function choose(area:Locator,label:string,value:string){await area.getByRole("group",{name:label,exact:true}).locator(`input[value="${value}"]`).check();}
async function check(area:Locator){const b=area.getByRole("button",{name:"Check prediction",exact:true});await b.focus();await b.press("Enter");}
async function correct(area:Locator){await expect(area.getByRole("status")).toContainText("Correct.");}
async function guided(page:Page,n:number){const area=page.locator("#guided"),q=lessons[n-1].guided.question as Question,a=refresherAnswers(q);for(const f of q.fields)if(f.kind==="choice")await choose(area,f.label,f.correct);else await area.getByLabel(f.label+(f.unit?` (${f.unit})`:""),{exact:true}).fill(a[f.id]);await area.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(area.locator(".answer-feedback")).toContainText("Correct.");}
async function accessible(page:Page){await page.setViewportSize({width:390,height:844});const r=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(r.violations.map(v=>v.id)).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
async function finishTrace(area:Locator){const next=area.getByRole("button",{name:"Next trace step",exact:true});while(await next.isEnabled()){await next.focus();await next.press("Enter");}}
test("F10 state tracing preserves code indentation and keyboard branch changes",async({page},info)=>{
 await page.goto("/courses/f10/lessons/m01-l01");await guided(page,1);const area=page.locator("#investigate");
 await expect(area.locator(".learning-code-block")).toContainText("    result = y * 2");
 await check(area);await expect(area.getByRole("status")).toContainText("Enter an answer first");
 await fill(area,{"Predicted y":"4","Predicted result":"6"});await choose(area,"Selected branch","if");await check(area);await expect(area.getByRole("status")).toContainText("Review this reasoning");
 await fill(area,{"Predicted result":"8"});await check(area);await correct(area);await finishTrace(area);await expect(area.getByRole("region",{name:"Program trace table",exact:true})).toContainText("result = 8");
 const threshold=area.getByLabel("Decision threshold",{exact:true});await threshold.focus();await threshold.press("End");await threshold.press("Tab");await expect(threshold).toHaveValue("5");await expect(area.getByRole("button",{name:"Next trace step",exact:true})).toHaveCount(0);
 await fill(area,{"Predicted y":"4","Predicted result":"3"});await choose(area,"Selected branch","else");await check(area);await correct(area);await finishTrace(area);await accessible(page);await area.screenshot({path:info.outputPath("f10-state-mobile.png")});
});
test("F10 list traversal records every iteration and the empty case",async({page},info)=>{
 await page.goto("/courses/f10/lessons/m01-l02");await guided(page,2);const area=page.locator("#investigate");
 await fill(area,{"Predicted total":"6","Predicted count":"2"});await check(area);await correct(area);await finishTrace(area);await expect(area.getByRole("region",{name:"Program trace table",exact:true})).toContainText("total = 6; count = 2");await accessible(page);await area.screenshot({path:info.outputPath("f10-loop-mobile.png")});
 await area.getByLabel("List case",{exact:true}).selectOption("empty");await fill(area,{"Predicted total":"0","Predicted count":"0"});await check(area);await correct(area);await finishTrace(area);await expect(area.getByRole("region",{name:"Program trace table",exact:true})).toContainText("empty list never enters");
});
test("F10 function tracing separates caller data from a copied list",async({page},info)=>{
 await page.goto("/courses/f10/lessons/m01-l03");await guided(page,3);const area=page.locator("#investigate");
 await fill(area,{"Predicted return":"5","Predicted original[0]":"5"});await check(area);await correct(area);await finishTrace(area);
 await area.getByLabel("List handling",{exact:true}).selectOption("copy");await fill(area,{"Predicted return":"5","Predicted original[0]":"2"});await check(area);await correct(area);await finishTrace(area);await expect(area.getByRole("region",{name:"Program trace table",exact:true})).toContainText("original[0] = 2");await accessible(page);await area.screenshot({path:info.outputPath("f10-function-mobile.png")});
 await area.getByRole("button",{name:"Retry prediction",exact:true}).click();await expect(area.getByLabel("Predicted return",{exact:true})).toHaveValue("");await expect(area.getByRole("region",{name:"Program trace table",exact:true})).toHaveCount(0);
});
test("F10 debugging exposes counterexamples and checks a targeted repair",async({page},info)=>{
 await page.goto("/courses/f10/lessons/m01-l04");await guided(page,4);const area=page.locator("#investigate");
 await fill(area,{"Predicted returned sum":"invalid"});await choose(area,"Will all five displayed boundary tests pass?","no");await check(area);await expect(area.getByRole("region",{name:"Program trace table",exact:true})).toHaveCount(0);
 await fill(area,{"Predicted returned sum":"1"});await check(area);await correct(area);await finishTrace(area);await expect(area.getByRole("region",{name:"Boundary test results",exact:true})).toContainText("Fail");
 await area.getByLabel("Proposed repair",{exact:true}).selectOption("visit-all");await fill(area,{"Predicted returned sum":"5"});await choose(area,"Will all five displayed boundary tests pass?","yes");await check(area);await correct(area);await finishTrace(area);await expect(area.getByRole("region",{name:"Boundary test results",exact:true})).not.toContainText("Fail");await accessible(page);await area.screenshot({path:info.outputPath("f10-debug-mobile.png")});
 await area.getByLabel("Fault",{exact:true}).selectOption("reset");await fill(area,{"Predicted returned sum":"4"});await choose(area,"Will all five displayed boundary tests pass?","no");await check(area);await correct(area);
});
