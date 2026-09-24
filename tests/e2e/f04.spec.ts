import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function fields(area:Locator,answers:Record<string,string>){for(const [label,value]of Object.entries(answers))await area.getByLabel(label,{exact:true}).fill(value);}
async function check(area:Locator){const button=area.getByRole("button",{name:"Check prediction",exact:true});await button.focus();await button.press("Enter");}
async function accessible(page:Page){const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(result.violations.map(v=>v.id)).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
async function guided(area:Locator){await area.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(area.locator(".answer-feedback")).toContainText("Correct.");}

test("F04 triangle prediction repairs calculator mode and preserves ratios under scale",async({page})=>{
  await page.goto("/courses/f04/lessons/m01-l01");
  const work=page.locator("#guided"),activity=page.locator("#investigate");
  await fields(work,{"Hypotenuse BC (cm)":"10","Sine of theta":"4/5"});await guided(work);
  await activity.getByLabel("Predicted sine value",{exact:true}).fill("1/2");
  const evaluate=activity.getByRole("button",{name:"Evaluate sine input",exact:true});await evaluate.focus();await evaluate.press("Enter");
  await expect(activity.getByRole("status")).toContainText("prediction is correct");
  await activity.getByLabel("Calculator angle mode",{exact:true}).selectOption("radians");
  await evaluate.click();await expect(activity.getByText("The entered angle differs from the target.",{exact:false})).toBeVisible();
  await activity.getByRole("button",{name:"Use target angle in this mode",exact:true}).click();
  await expect(activity.getByLabel("Angle entered into sine",{exact:true})).toHaveValue("pi/6");
  await evaluate.click();await expect(activity.getByRole("status")).toContainText("prediction is correct");
  await activity.getByLabel("Hypotenuse (cm)",{exact:true}).fill("20");await evaluate.click();
  await expect(activity.getByRole("status")).toContainText("prediction is correct");
});
test("F04 unit circle preserves coterminal coordinates and exposes zero denominators",async({page},testInfo)=>{
  await page.goto("/courses/f04/lessons/m01-l02");
  const work=page.locator("#guided"),activity=page.locator("#investigate");
  await fields(work,{Sine:"1/2",Cosine:"-sqrt(3)/2",Tangent:"-1/sqrt(3)","Arc length (m)":"5*pi"});await guided(work);
  await check(activity);await expect(activity.getByRole("status")).toContainText("Enter an answer first");
  await fields(activity,{"Predicted sine":"1/2","Predicted cosine":"sqrt(3)/2"});await check(activity);
  await expect(activity.getByRole("status")).toContainText("Review this reasoning");
  await fields(activity,{"Predicted cosine":"-sqrt(3)/2"});await check(activity);
  await expect(activity.getByRole("status")).toContainText("Correct.");
  await expect(activity.getByRole("img")).toHaveAccessibleName(/150 degrees/);
  await activity.getByLabel("Base angle (degrees)",{exact:true}).selectOption("90");
  await activity.getByLabel("Additional signed whole turns",{exact:true}).selectOption("-1");
  await expect(activity.getByRole("img")).toHaveCount(0);
  await fields(activity,{"Predicted sine":"1","Predicted cosine":"0"});await check(activity);
  await expect(activity.getByRole("status")).toContainText("Correct.");
  await expect(activity.getByRole("img")).toHaveAccessibleName(/-270 degrees/);
  await expect(activity.getByRole("row",{name:"tan Undefined: denominator is zero",exact:true})).toBeVisible();
  await expect(activity.getByRole("row",{name:"cot 0",exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});await accessible(page);
  await activity.screenshot({path:testInfo.outputPath("f04-circle-mobile.png")});
});
test("F04 wave predictions handle signed multipliers and exact phase anchors",async({page},testInfo)=>{
  await page.goto("/courses/f04/lessons/m01-l03");
  const work=page.locator("#guided"),activity=page.locator("#investigate");
  await fields(work,{Amplitude:"2","Period (rad)":"2*pi/3","Written shift (rad)":"-pi/6","Principal inverse-sine value (rad)":"pi/6"});await guided(work);
  await fields(activity,{"Predicted amplitude":"3","Predicted period (rad)":"pi","Predicted output at x = h":"1"});await check(activity);
  await expect(activity.getByRole("status")).toContainText("Correct.");
  await expect(activity.getByRole("row",{name:"pi/2 -2",exact:true})).toBeVisible();
  await activity.getByLabel("Signed input multiplier B",{exact:true}).selectOption("-2");
  await fields(activity,{"Predicted amplitude":"3","Predicted period (rad)":"pi","Predicted output at x = h":"1"});await check(activity);
  await expect(activity.getByRole("row",{name:"pi/2 4",exact:true})).toBeVisible();
  await activity.getByLabel("Wave function",{exact:true}).selectOption("cos");
  await fields(activity,{"Predicted amplitude":"3","Predicted period (rad)":"-pi","Predicted output at x = h":"-2"});await check(activity);
  await expect(activity.getByRole("status")).toContainText("Review this reasoning");
  await fields(activity,{"Predicted period (rad)":"pi"});await check(activity);
  await expect(activity.getByRole("status")).toContainText("Correct.");
  await expect(activity.getByRole("row",{name:"pi/4 -2",exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});await accessible(page);
  await activity.screenshot({path:testInfo.outputPath("f04-wave-mobile.png")});
});
test("F04 equation investigation distinguishes missing roots, endpoints, empty sets and invalid input",async({page},testInfo)=>{
  await page.goto("/courses/f04/lessons/m01-l04");
  const work=page.locator("#guided"),activity=page.locator("#investigate");
  await fields(work,{"Every solution (degrees)":"270,90,240,120"});
  await work.getByRole("radio",{name:"Cosine can be zero, and those inputs solve the original product",exact:true}).check();await guided(work);
  await fields(activity,{"Predicted complete solution set (degrees)":"30"});await check(activity);
  await expect(activity.getByRole("status")).toContainText("Include every requested value");
  await fields(activity,{"Predicted complete solution set (degrees)":"150,30"});await check(activity);
  await expect(activity.getByRole("status")).toContainText("Correct.");
  await activity.getByLabel("Target ratio",{exact:true}).selectOption("0");
  await fields(activity,{"Predicted complete solution set (degrees)":"0,180"});await check(activity);
  await expect(activity.getByRole("status")).toContainText("Correct.");
  await activity.getByLabel("Upper endpoint at 360 degrees",{exact:true}).selectOption("closed");
  await fields(activity,{"Predicted complete solution set (degrees)":"0,180,360"});await check(activity);
  await expect(activity.getByRole("status")).toContainText("Correct.");
  await activity.getByLabel("Target ratio",{exact:true}).selectOption("2");
  await fields(activity,{"Predicted complete solution set (degrees)":"1/0"});await check(activity);
  await expect(activity.getByRole("img")).toHaveCount(0);
  await fields(activity,{"Predicted complete solution set (degrees)":"none"});await check(activity);
  await expect(activity.getByRole("status")).toContainText("Correct.");
  await expect(activity.getByText("The solution set is empty.",{exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});await accessible(page);
  await activity.screenshot({path:testInfo.outputPath("f04-equations-mobile.png")});
});
