import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const route="/courses/phs-231/lessons/m02-l02";

test("moving observers change coordinates and speed while preserving inertial acceleration",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto(route);
  const guided=page.locator("#guided");
  for(const [label,value] of [["Relative velocity x (m/s)","3"],["Relative velocity y (m/s)","-3"],["Relative velocity z (m/s)","2"],["Relative speed (m/s)","sqrt(88)/2"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByLabel("It becomes (-2,1,0) by subtracting the observer velocity",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("mixes acceleration and velocity units");
  await guided.getByLabel("It remains (0,2,-1) m/s² because the observer velocity is constant",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check frame predictions",exact:true});
  const predict=async(values:string[])=>{
    for(const [i,axis] of ["x","y","z"].entries())await lab.getByLabel(`Predicted relative velocity ${axis} (m/s)`,{exact:true}).fill(values[i]);
    await lab.getByLabel("Acceleration compared with the ground frame",{exact:true}).selectOption("same");
    await check.focus();await check.press("Enter");
  };
  await predict(["1","6","-3"]);
  await expect(lab.getByRole("status")).toContainText("predictions agree");
  await expect(lab.getByRole("row",{name:"Relative position (m) 3 6 -3",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"Acceleration in either frame (m/s²) 0 2 0",exact:true})).toBeVisible();
  for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const) {
    await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await lab.screenshot({path:testInfo.outputPath(`frames-${name}.png`)});
    await lab.getByRole("img").scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`frames-${name}-viewport.png`)});
  }
  for(const [axis,value] of [["x","3"],["y","-5"],["z","7"]])await lab.getByLabel(`Observer origin ${axis} (m)`,{exact:true}).fill(value);
  await check.click();await expect(lab.getByRole("status")).toContainText("predictions agree");
  await expect(lab.getByRole("row",{name:"Relative position (m) 0 11 -10",exact:true})).toBeVisible();
  for(const [axis,value] of [["x","3"],["y","5"],["z","-2"]])await lab.getByLabel(`Observer velocity ${axis} (m/s)`,{exact:true}).fill(value);
  await predict(["0","0","0"]);
  await expect(lab).toContainText("moving-frame speed is 0 m/s");
  await expect(lab.getByRole("row",{name:"Acceleration in either frame (m/s²) 0 2 0",exact:true})).toBeVisible();
  await lab.getByLabel("Observation time (s)",{exact:true}).press("ArrowUp");
  await expect(lab.getByLabel("Observation time (s)",{exact:true})).toHaveValue("2.5");
  await predict(["0","1","0"]);await expect(lab.getByRole("status")).toContainText("predictions agree");
  await lab.getByLabel("Observation time (s)",{exact:true}).fill("-1");await check.click();
  await expect(lab.getByRole("status")).toContainText("time must be from 0 to 10 s");
  await expect(lab.getByRole("table")).toHaveCount(0);
  await lab.getByLabel("Observer velocity x (m/s)",{exact:true}).fill("");await check.click();
  await expect(lab.getByRole("status")).toContainText("empty input is not zero");
  expect(errors).toEqual([]);
});

test("frame practice preserves independent component drafts and hints on reload",async({page})=>{
  await page.goto(route);await page.getByRole("button",{name:"Start practice",exact:true}).click();
  const practice=page.locator("#practice");
  await practice.getByLabel("Velocity x (m/s)",{exact:true}).fill("2/3");
  await practice.getByLabel("Velocity y (m/s)",{exact:true}).fill("-4");
  await practice.getByLabel("Velocity z (m/s)",{exact:true}).fill("sqrt(8)");
  await practice.getByRole("button",{name:"Show a hint (0/3)",exact:true}).click();
  const prompt=await practice.locator(".question-prompt").textContent();await page.reload();
  await expect(practice.getByLabel("Velocity x (m/s)",{exact:true})).toHaveValue("2/3");
  await expect(practice.getByLabel("Velocity y (m/s)",{exact:true})).toHaveValue("-4");
  await expect(practice.getByLabel("Velocity z (m/s)",{exact:true})).toHaveValue("sqrt(8)");
  await expect(practice.getByRole("button",{name:"Show a hint (1/3)",exact:true})).toBeVisible();
  expect(await practice.locator(".question-prompt").textContent()).toBe(prompt);
});
