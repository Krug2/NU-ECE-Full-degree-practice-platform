import { expect,test,type Locator,type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import type { Question } from "../../lib/learning/contracts";
import { refresherAnswers } from "../refresher-answers";
const lessons=[1,2,3,4,5].map(n=>JSON.parse(readFileSync(new URL(`../../content/lessons/f08/m01-l0${n}.json`,import.meta.url),"utf8")));
async function fill(area:Locator,values:Record<string,string>){for(const [label,value]of Object.entries(values))await area.getByLabel(label,{exact:true}).fill(value);}
async function choose(area:Locator,label:string,value:string){await area.getByRole("group",{name:label,exact:true}).locator(`input[value="${value}"]`).check();}
async function check(area:Locator){const b=area.getByRole("button",{name:"Check prediction",exact:true});await b.focus();await b.press("Enter");}
async function correct(area:Locator){await expect(area.getByRole("status")).toContainText("Correct.");}
async function guided(page:Page,n:number){const area=page.locator("#guided"),q=lessons[n-1].guided.question as Question,a=refresherAnswers(q);for(const f of q.fields)if(f.kind==="choice")await choose(area,f.label,f.correct);else await area.getByLabel(f.label+(f.unit?` (${f.unit})`:""),{exact:true}).fill(a[f.id]);await area.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(area.locator(".answer-feedback")).toContainText("Correct.");}
async function accessible(page:Page){await page.setViewportSize({width:390,height:844});const r=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(r.violations.map(v=>v.id)).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
test("F08 limits distinguish branch approaches from a changed point",async({page},info)=>{
 await page.goto("/courses/f08/lessons/m01-l01");await guided(page,1);const area=page.locator("#investigate");
 await check(area);await expect(area.getByRole("status")).toContainText("Enter an answer first");
 await fill(area,{"Predicted left-hand limit":"-2","Predicted right-hand limit":"2"});await choose(area,"Finite two-sided limit?","yes");await choose(area,"Continuous at the junction?","no");await check(area);await expect(area.getByRole("status")).toContainText("Review this reasoning");
 await fill(area,{"Predicted left-hand limit":"2"});await check(area);await correct(area);await expect(area.getByRole("img").locator('circle[fill="white"]')).toHaveCount(2);
 const point=area.getByLabel("Assigned point value",{exact:true});await point.focus();await point.press("Home");for(let i=0;i<5;i++)await point.press("ArrowDown");await point.press("Tab");await expect(point).toHaveValue("2");await expect(area.getByRole("img")).toHaveCount(0);
 await fill(area,{"Predicted left-hand limit":"2","Predicted right-hand limit":"2"});await choose(area,"Finite two-sided limit?","yes");await choose(area,"Continuous at the junction?","yes");await check(area);await correct(area);
 await area.getByLabel("Right approach value",{exact:true}).selectOption("3");await fill(area,{"Predicted left-hand limit":"2","Predicted right-hand limit":"3"});await choose(area,"Finite two-sided limit?","no");await choose(area,"Continuous at the junction?","no");await check(area);await correct(area);await accessible(page);await area.screenshot({path:info.outputPath("f08-limit-mobile.png")});
});
test("F08 secants retain the nonzero increment condition",async({page},info)=>{
 await page.goto("/courses/f08/lessons/m01-l02");await guided(page,2);const area=page.locator("#investigate");
 await fill(area,{"Predicted secant slope":"5/2","Predicted tangent slope":"2"});await check(area);await correct(area);
 await area.getByLabel("Increment h",{exact:true}).selectOption("0");await expect(area.getByRole("alert")).toContainText("nonzero");
 await area.getByLabel("Increment h",{exact:true}).selectOption("-0.1");await fill(area,{"Predicted secant slope":"1/0","Predicted tangent slope":"2"});await check(area);await expect(area.getByRole("status")).toContainText("Division by zero");await expect(area.getByRole("img")).toHaveCount(0);
 await area.getByLabel("Quadratic coefficient",{exact:true}).selectOption("-2");await fill(area,{"Predicted secant slope":"-19/5","Predicted tangent slope":"-4"});await check(area);await correct(area);await accessible(page);await area.screenshot({path:info.outputPath("f08-secant-mobile.png")});
});
test("F08 chain activity includes negative and zero inner slopes",async({page},info)=>{
 await page.goto("/courses/f08/lessons/m01-l03");await guided(page,3);const area=page.locator("#investigate");
 await fill(area,{"Inner value":"3","Outer derivative at the inner value":"6","Inner derivative":"2","Composite derivative":"12"});await check(area);await correct(area);
 await area.getByLabel("Inner slope",{exact:true}).selectOption("-2");await fill(area,{"Inner value":"-1","Outer derivative at the inner value":"-2","Inner derivative":"-2","Composite derivative":"4"});await check(area);await correct(area);
 await area.getByLabel("Inner slope",{exact:true}).selectOption("0");await fill(area,{"Inner value":"1","Outer derivative at the inner value":"2","Inner derivative":"0","Composite derivative":"0"});await check(area);await correct(area);await accessible(page);await area.screenshot({path:info.outputPath("f08-chain-mobile.png")});
});
test("F08 accumulation separates cancellation, distance, and average velocity",async({page},info)=>{
 await page.goto("/courses/f08/lessons/m01-l04");await guided(page,4);const area=page.locator("#investigate");
 await fill(area,{"Net displacement (m)":"0","Total distance (m)":"12","Average velocity (m/s)":"0"});await check(area);await correct(area);
 await area.getByLabel("First duration in seconds",{exact:true}).selectOption("4");await fill(area,{"Net displacement (m)":"6","Total distance (m)":"18","Average velocity (m/s)":"6/7"});await check(area);await correct(area);await accessible(page);await area.screenshot({path:info.outputPath("f08-accumulation-mobile.png")});
 await area.getByLabel("First velocity in metres per second",{exact:true}).selectOption("0");await area.getByLabel("Second velocity in metres per second",{exact:true}).selectOption("0");await fill(area,{"Net displacement (m)":"0","Total distance (m)":"0","Average velocity (m/s)":"0"});await check(area);await correct(area);await expect(area.getByRole("img")).toContainText("1");await expect(area.getByRole("row",{name:"Total distance 0 m",exact:true})).toBeVisible();
});
test("F08 initial data selects a constant without changing the derivative",async({page},info)=>{
 await page.goto("/courses/f08/lessons/m01-l05");await guided(page,5);const area=page.locator("#investigate");
 await fill(area,{"Required constant C":"1","Value at the second input":"13"});await choose(area,"What does changing C do to the derivative?","same");await check(area);await correct(area);
 await area.getByLabel("Initial function value",{exact:true}).selectOption("-1");await fill(area,{"Required constant C":"-3","Value at the second input":"9"});await choose(area,"What does changing C do to the derivative?","same");await check(area);await correct(area);
 await area.getByRole("button",{name:"Retry prediction",exact:true}).click();await expect(area.getByLabel("Required constant C",{exact:true})).toHaveValue("");await expect(area.getByRole("img")).toHaveCount(0);
 await fill(area,{"Required constant C":"-3","Value at the second input":"9"});await choose(area,"What does changing C do to the derivative?","same");await check(area);await correct(area);await accessible(page);await area.screenshot({path:info.outputPath("f08-initial-mobile.png")});
});
