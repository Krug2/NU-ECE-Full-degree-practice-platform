import { expect,test,type Locator,type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import type { Question } from "../../lib/learning/contracts";
import { refresherAnswers } from "../refresher-answers";
const lessons=[1,2,3,4,5].map(n=>JSON.parse(readFileSync(new URL(`../../content/lessons/f06/m01-l0${n}.json`,import.meta.url),"utf8")));
async function fill(area:Locator,values:Record<string,string>){for(const [label,value]of Object.entries(values))await area.getByLabel(label,{exact:true}).fill(value);}
async function choose(area:Locator,label:string,value:string){await area.getByRole("group",{name:label,exact:true}).locator(`input[value="${value}"]`).check();}
async function check(area:Locator){const b=area.getByRole("button",{name:"Check prediction",exact:true});await b.focus();await b.press("Enter");}
async function correct(area:Locator){await expect(area.getByRole("status")).toContainText("Correct.");}
async function guided(page:Page,n:number){const area=page.locator("#guided"),q=lessons[n-1].guided.question as Question,a=refresherAnswers(q);for(const f of q.fields)if(f.kind==="choice")await choose(area,f.label,f.correct);else await area.getByLabel(f.label+(f.unit?` (${f.unit})`:""),{exact:true}).fill(a[f.id]);await area.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(area.locator(".answer-feedback")).toContainText("Correct.");}
async function accessible(page:Page){await page.setViewportSize({width:390,height:844});const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(result.violations.map(v=>v.id)).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
test("F06 prefix activity preserves signs and distinguishes milli from mega",async({page},info)=>{
 await page.goto("/courses/f06/lessons/m01-l01");await guided(page,1);const area=page.locator("#investigate");
 await check(area);await expect(area.getByRole("status")).toContainText("Enter an answer first");
 await fill(area,{"Predicted converted value":"2500","Predicted exponent in the numerical factor 10^n":"-3"});await check(area);await expect(area.getByRole("status")).toContainText("Review this reasoning");
 await fill(area,{"Predicted converted value":"1/400"});await check(area);await correct(area);
 await area.getByLabel("Source prefix",{exact:true}).selectOption("6");await area.getByLabel("Target prefix",{exact:true}).selectOption("-3");await area.getByLabel("Original numerical value",{exact:true}).fill("-1");await expect(area.getByRole("table")).toHaveCount(0);
 await fill(area,{"Predicted converted value":"-1000000000","Predicted exponent in the numerical factor 10^n":"9"});await check(area);await correct(area);await accessible(page);await area.screenshot({path:info.outputPath("f06-prefix-mobile.png")});
});
test("F06 powered conversions change the whole factor and handle inverse units",async({page},info)=>{
 await page.goto("/courses/f06/lessons/m01-l02");await guided(page,2);const area=page.locator("#investigate");
 await fill(area,{"Predicted converted value":"1/400000","Predicted full factor exponent":"-6"});await check(area);await correct(area);
 await area.getByLabel("Source prefix",{exact:true}).selectOption("-2");const power=area.getByLabel("Power of the length unit",{exact:true});await power.focus();await power.press("Home");await power.press("Tab");await expect(power).toHaveValue("-1");
 await fill(area,{"Predicted converted value":"250","Predicted full factor exponent":"2"});await check(area);await correct(area);await accessible(page);await area.screenshot({path:info.outputPath("f06-conversion-mobile.png")});
});
test("F06 dimensional activity checks powers without claiming a coefficient is proven",async({page},info)=>{
 await page.goto("/courses/f06/lessons/m01-l03");await guided(page,3);const area=page.locator("#investigate");
 await fill(area,{"Predicted length exponent":"1","Predicted time exponent":"0"});await choose(area,"Does it have displacement dimensions?","yes");await check(area);await correct(area);
 await area.getByLabel("Dimensionless coefficient",{exact:true}).selectOption("5");await fill(area,{"Predicted length exponent":"1","Predicted time exponent":"0"});await choose(area,"Does it have displacement dimensions?","yes");await check(area);await correct(area);
 await area.getByLabel("Power of velocity",{exact:true}).selectOption("2");await fill(area,{"Predicted length exponent":"2","Predicted time exponent":"-1"});await choose(area,"Does it have displacement dimensions?","no");await check(area);await correct(area);await accessible(page);await area.screenshot({path:info.outputPath("f06-dimensions-mobile.png")});
});
test("F06 rounding activity retains trailing zeros, negative ties, and invalid-input feedback",async({page},info)=>{
 await page.goto("/courses/f06/lessons/m01-l04");await guided(page,4);const area=page.locator("#investigate");
 await fill(area,{"Predicted rounded numerical value":"10"});await choose(area,"Predicted written report","right");await check(area);await correct(area);await expect(area.getByRole("row",{name:"Reported value 10.00",exact:true})).toBeVisible();
 await area.getByLabel("Original decimal report",{exact:true}).fill("-1.235");await area.getByLabel("Rounding rule",{exact:true}).selectOption("places");await area.getByLabel("Number of figures or places",{exact:true}).selectOption("2");
 await fill(area,{"Predicted rounded numerical value":"-1.24"});await choose(area,"Predicted written report","right");await check(area);await correct(area);await accessible(page);await area.screenshot({path:info.outputPath("f06-rounding-mobile.png")});
 await area.getByLabel("Original decimal report",{exact:true}).fill("0");await area.getByLabel("Rounding rule",{exact:true}).selectOption("figures");await expect(area.getByRole("alert")).toContainText("zero");
 await area.getByLabel("Original decimal report",{exact:true}).fill("1/0");await expect(area.getByRole("alert")).toBeVisible();
});
test("F06 bound activity includes endpoints and separates a rounding contribution from an additional bound",async({page},info)=>{
 await page.goto("/courses/f06/lessons/m01-l05");await guided(page,5);const area=page.locator("#investigate");
 await fill(area,{"Predicted conservative output bounds (V)":"[1.175,1.225]"});await choose(area,"Predicted reference compatibility","yes");await check(area);await correct(area);
 await area.getByLabel("Displayed voltage",{exact:true}).fill("0");await area.getByLabel("Display resolution in volts",{exact:true}).selectOption("0.1");await area.getByLabel("Additional stated bound in volts",{exact:true}).selectOption("0");await area.getByLabel("Reference voltage",{exact:true}).fill("0.1");
 await fill(area,{"Predicted conservative output bounds (V)":"[-0.05,0.05]"});await choose(area,"Predicted reference compatibility","no");await check(area);await correct(area);
 await area.getByLabel("Reference voltage",{exact:true}).fill("0.05");await fill(area,{"Predicted conservative output bounds (V)":"[-0.05,0.05]"});await choose(area,"Predicted reference compatibility","yes");await check(area);await correct(area);await accessible(page);await area.screenshot({path:info.outputPath("f06-bounds-mobile.png")});
 await area.getByLabel("Displayed voltage",{exact:true}).fill("1/0");await expect(area.getByRole("alert")).toBeVisible();
});
