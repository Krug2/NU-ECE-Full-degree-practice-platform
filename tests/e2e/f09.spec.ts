import { expect,test,type Locator,type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import type { Question } from "../../lib/learning/contracts";
import { refresherAnswers } from "../refresher-answers";
const lessons=[1,2,3,4].map(n=>JSON.parse(readFileSync(new URL(`../../content/lessons/f09/m01-l0${n}.json`,import.meta.url),"utf8")));
async function fill(area:Locator,values:Record<string,string>){for(const [label,value]of Object.entries(values))await area.getByLabel(label,{exact:true}).fill(value);}
async function choose(area:Locator,label:string,value:string){await area.getByRole("group",{name:label,exact:true}).locator(`input[value="${value}"]`).check();}
async function check(area:Locator){const b=area.getByRole("button",{name:"Check prediction",exact:true});await b.focus();await b.press("Enter");}
async function correct(area:Locator){await expect(area.getByRole("status")).toContainText("Correct.");}
async function guided(page:Page,n:number){const area=page.locator("#guided"),q=lessons[n-1].guided.question as Question,a=refresherAnswers(q);for(const f of q.fields)if(f.kind==="choice")await choose(area,f.label,f.correct);else await area.getByLabel(f.label+(f.unit?` (${f.unit})`:""),{exact:true}).fill(a[f.id]);await area.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(area.locator(".answer-feedback")).toContainText("Correct.");}
async function accessible(page:Page){await page.setViewportSize({width:390,height:844});const r=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(r.violations.map(v=>v.id)).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
test("F09 rectangular activity distinguishes products from sums and accepts exact i notation",async({page},info)=>{
 await page.goto("/courses/f09/lessons/m01-l01");await guided(page,1);const area=page.locator("#investigate");
 await check(area);await expect(area.getByRole("status")).toContainText("Enter an answer first");
 await fill(area,{"Predicted complex result":"2-2i","Result real part":"3","Result imaginary part":"-1"});await check(area);await expect(area.getByRole("status")).toContainText("Review this reasoning");
 await fill(area,{"Predicted complex result":"3-i"});await check(area);await correct(area);
 const op=area.getByLabel("Complex operation",{exact:true});await op.focus();await op.press("End");await op.press("Tab");await expect(op).toHaveValue("multiply");await expect(area.getByRole("img")).toHaveCount(0);
 await fill(area,{"Predicted complex result":"4-3j","Result real part":"4","Result imaginary part":"-3"});await check(area);await expect(area.getByRole("img")).toHaveCount(0);
 await fill(area,{"Predicted complex result":"4-3i"});await check(area);await correct(area);await accessible(page);await area.screenshot({path:info.outputPath("f09-arithmetic-mobile.png")});
});
test("F09 conjugate activity checks division and rejects a zero denominator",async({page},info)=>{
 await page.goto("/courses/f09/lessons/m01-l02");await guided(page,2);const area=page.locator("#investigate");
 await fill(area,{"Denominator conjugate":"1+i","Denominator squared magnitude":"2","Predicted quotient":"(1+5i)/2"});await check(area);await correct(area);
 await area.getByLabel("Denominator real part",{exact:true}).selectOption("0");await area.getByLabel("Denominator imaginary part",{exact:true}).selectOption("0");await expect(area.getByRole("alert")).toContainText("undefined");
 await area.getByLabel("Denominator imaginary part",{exact:true}).selectOption("2");await fill(area,{"Denominator conjugate":"-2i","Denominator squared magnitude":"4","Predicted quotient":"1-3i/2"});await check(area);await correct(area);await accessible(page);await area.screenshot({path:info.outputPath("f09-conjugate-mobile.png")});
});
test("F09 polar activity keeps degree controls and principal radian arguments distinct",async({page},info)=>{
 await page.goto("/courses/f09/lessons/m01-l03");await guided(page,3);const area=page.locator("#investigate");
 await fill(area,{"Predicted rectangular value":"-sqrt(3)+i","Principal radian argument (radians)":"5*pi/6"});await check(area);await correct(area);
 await area.getByLabel("Displayed angle in degrees",{exact:true}).selectOption("-180");await fill(area,{"Predicted rectangular value":"-2","Principal radian argument (radians)":"-pi"});await check(area);await expect(area.getByRole("status")).toContainText("Review this reasoning");
 await fill(area,{"Principal radian argument (radians)":"pi"});await check(area);await correct(area);
 await area.getByLabel("Polar radius",{exact:true}).selectOption("0");await fill(area,{"Predicted rectangular value":"0"});await area.getByRole("radio",{name:"No; zero has no unique direction",exact:true}).check();await check(area);await correct(area);await accessible(page);await area.screenshot({path:info.outputPath("f09-polar-zero-mobile.png")});
});
test("F09 roots activity requires every distinct root and treats zero separately",async({page},info)=>{
 await page.goto("/courses/f09/lessons/m01-l04");await guided(page,4);const area=page.locator("#investigate");
 await fill(area,{"Predicted complete root set":"2","Number of distinct roots":"3"});await check(area);await expect(area.getByRole("status")).toContainText("Review this reasoning");
 await fill(area,{"Predicted complete root set":"-1-sqrt(3)i, 2, -1+sqrt(3)i"});await check(area);await correct(area);
 await area.getByLabel("Root order",{exact:true}).selectOption("4");await area.getByLabel("Real target sign",{exact:true}).selectOption("negative");await fill(area,{"Predicted complete root set":"sqrt(2)+sqrt(2)i,-sqrt(2)+sqrt(2)i,-sqrt(2)-sqrt(2)i,sqrt(2)-sqrt(2)i","Number of distinct roots":"4"});await check(area);await correct(area);await accessible(page);await area.screenshot({path:info.outputPath("f09-roots-mobile.png")});
 await area.getByLabel("Root radius",{exact:true}).selectOption("0");await fill(area,{"Predicted complete root set":"0","Number of distinct roots":"1"});await check(area);await correct(area);
 await area.getByRole("button",{name:"Retry prediction",exact:true}).click();await expect(area.getByLabel("Predicted complete root set",{exact:true})).toHaveValue("");await expect(area.getByRole("img")).toHaveCount(0);
});


