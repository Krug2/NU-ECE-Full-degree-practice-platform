import { expect,test,type Locator,type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import type { Question } from "../../lib/learning/contracts";
import { refresherAnswers } from "../refresher-answers";
const lessons=[1,2,3,4,5].map(n=>JSON.parse(readFileSync(new URL(`../../content/lessons/f07/m01-l0${n}.json`,import.meta.url),"utf8")));
async function fill(area:Locator,values:Record<string,string>){for(const [label,value]of Object.entries(values))await area.getByLabel(label,{exact:true}).fill(value);}
async function choose(area:Locator,label:string,value:string){await area.getByRole("group",{name:label,exact:true}).locator(`input[value="${value}"]`).check();}
async function check(area:Locator){const b=area.getByRole("button",{name:"Check prediction",exact:true});await b.focus();await b.press("Enter");}
async function correct(area:Locator){await expect(area.getByRole("status")).toContainText("Correct.");}
async function guided(page:Page,n:number){const area=page.locator("#guided"),q=lessons[n-1].guided.question as Question,a=refresherAnswers(q);for(const f of q.fields)if(f.kind==="choice")await choose(area,f.label,f.correct);else await area.getByLabel(f.label+(f.unit?` (${f.unit})`:""),{exact:true}).fill(a[f.id]);await area.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(area.locator(".answer-feedback")).toContainText("Correct.");}
async function accessible(page:Page){await page.setViewportSize({width:390,height:844});const r=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(r.violations.map(v=>v.id)).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
test("F07 endpoint activity predicts translated arrows and resets changed inputs",async({page},info)=>{
 await page.goto("/courses/f07/lessons/m01-l01");await guided(page,1);const area=page.locator("#investigate");
 await check(area);await expect(area.getByRole("status")).toContainText("Enter an answer first");
 await fill(area,{"x component (m)":"-2","y component (m)":"5","Displacement magnitude (m)":"sqrt(29)"});await check(area);await expect(area.getByRole("status")).toContainText("Review this reasoning");
 await fill(area,{"x component (m)":"2"});await check(area);await correct(area);
 await area.getByLabel("Initial x",{exact:true}).selectOption("0");await area.getByLabel("Terminal x",{exact:true}).selectOption("2");await expect(area.getByRole("img")).toHaveCount(0);
 await fill(area,{"x component (m)":"2","y component (m)":"5","Displacement magnitude (m)":"sqrt(29)"});await check(area);await correct(area);await accessible(page);await area.screenshot({path:info.outputPath("f07-components-mobile.png")});
});
test("F07 addition activity handles negative scaling and exact cancellation",async({page},info)=>{
 await page.goto("/courses/f07/lessons/m01-l02");await guided(page,2);const area=page.locator("#investigate");
 await fill(area,{"x component (m)":"4","y component (m)":"4","Result magnitude (m)":"4*sqrt(2)"});await check(area);await correct(area);
 await area.getByLabel("Scalar multiplying u",{exact:true}).selectOption("-1");await fill(area,{"x component (m)":"-2","y component (m)":"-4","Result magnitude (m)":"2*sqrt(5)"});await check(area);await correct(area);
 await area.getByLabel("Scalar multiplying u",{exact:true}).selectOption("1");await area.getByLabel("Vector v x",{exact:true}).selectOption("-3");await area.getByLabel("Vector v y",{exact:true}).selectOption("-4");await fill(area,{"x component (m)":"0","y component (m)":"0","Result magnitude (m)":"0"});await check(area);await correct(area);await accessible(page);await expect(area.getByRole("img").locator("path[marker-end]")).toHaveCount(2);await expect(area.getByRole("img")).toContainText("result (zero vector)");await area.screenshot({path:info.outputPath("f07-addition-mobile.png")});
});
test("F07 projection activity separates target reversal from a zero-target error",async({page},info)=>{
 await page.goto("/courses/f07/lessons/m01-l03");await guided(page,3);const area=page.locator("#investigate");
 await fill(area,{"Predicted dot product":"3","Predicted projection x component":"3","Predicted projection y component":"0"});await check(area);await correct(area);
 await area.getByLabel("Vector v x",{exact:true}).selectOption("-1");await fill(area,{"Predicted dot product":"-3","Predicted projection x component":"3","Predicted projection y component":"0"});await check(area);await correct(area);
 await area.getByLabel("Vector v x",{exact:true}).selectOption("0");await expect(area.getByRole("alert")).toContainText("zero vector");
 await area.getByLabel("Vector v x",{exact:true}).selectOption("1");await area.getByLabel("Vector v y",{exact:true}).selectOption("2");await fill(area,{"Predicted dot product":"11","Predicted projection x component":"11/5","Predicted projection y component":"22/5"});await check(area);await correct(area);await accessible(page);await area.screenshot({path:info.outputPath("f07-projection-mobile.png")});
});
test("F07 cross activity reverses orientation and preserves nonnegative area",async({page},info)=>{
 await page.goto("/courses/f07/lessons/m01-l04");await guided(page,4);const area=page.locator("#investigate");
 await fill(area,{"Signed normal z component (m^2)":"-4","Triangle area (m^2)":"2"});await check(area);await correct(area);
 const order=area.getByLabel("Cross-product order",{exact:true});await order.focus();await order.press("End");await order.press("Tab");await expect(order).toHaveValue("v cross u");
 await fill(area,{"Signed normal z component (m^2)":"4","Triangle area (m^2)":"2"});await check(area);await correct(area);
 await area.getByLabel("Vector v x",{exact:true}).selectOption("3");await area.getByLabel("Vector v y",{exact:true}).selectOption("4");await fill(area,{"Signed normal z component (m^2)":"0","Triangle area (m^2)":"0"});await check(area);await correct(area);await expect(area.getByRole("row",{name:"Normal orientation Zero; no unique normal",exact:true})).toBeVisible();await accessible(page);await area.screenshot({path:info.outputPath("f07-cross-mobile.png")});
});
test("F07 coordinate activity distinguishes horizontal projection, height, and axial ambiguity",async({page},info)=>{
 await page.goto("/courses/f07/lessons/m01-l05");await guided(page,5);const area=page.locator("#investigate");
 await fill(area,{"Cartesian x coordinate (m)":"sqrt(3)","Cartesian y coordinate (m)":"1","Cartesian z coordinate (m)":"1"});await choose(area,"Unique azimuth for this point?","yes");await check(area);await correct(area);
 await area.getByLabel("Cylindrical radius in metres",{exact:true}).selectOption("0");await fill(area,{"Cartesian x coordinate (m)":"0","Cartesian y coordinate (m)":"0","Cartesian z coordinate (m)":"1"});await choose(area,"Unique azimuth for this point?","no");await check(area);await correct(area);
 await area.getByLabel("Cylindrical radius in metres",{exact:true}).selectOption("2");await area.getByLabel("Azimuth in degrees",{exact:true}).selectOption("360");await area.getByLabel("Height in metres",{exact:true}).selectOption("-2");await fill(area,{"Cartesian x coordinate (m)":"2","Cartesian y coordinate (m)":"0","Cartesian z coordinate (m)":"-2"});await choose(area,"Unique azimuth for this point?","yes");await check(area);await correct(area);await accessible(page);await area.screenshot({path:info.outputPath("f07-coordinates-mobile.png")});
});
