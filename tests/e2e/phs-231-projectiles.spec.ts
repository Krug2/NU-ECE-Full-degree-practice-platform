import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m02-l03";

test("projectile predictions retain signs, stop at ground contact, and expose the apex state",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto(route);
  const guided=page.locator("#guided");
  for(const [label,value] of [["Future flight time (s)","-1"],["Horizontal displacement (m)","-12"],["Vertical impact velocity (m/s)","20"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByLabel("The entire velocity and acceleration are zero",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Only vertical velocity is zero");
  await guided.getByLabel("Future flight time (s)",{exact:true}).fill("3");
  await guided.getByLabel("Vertical impact velocity (m/s)",{exact:true}).fill("-20");
  await guided.getByLabel("Velocity is (-4,0) m/s and acceleration remains (0,-10) m/s²",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check flight predictions",exact:true});
  const predict=async(values:string[])=>{
    for(const [i,label] of ["Predicted flight time (s)","Predicted horizontal displacement (m)","Predicted maximum height (m)","Predicted vertical impact velocity (m/s)"].entries())await lab.getByLabel(label,{exact:true}).fill(values[i]);
    await check.focus();await check.press("Enter");
  };
  await predict(["2","12","45/4","-15"]);
  await expect(lab.getByRole("status")).toContainText("All four predictions agree");
  await expect(lab.getByRole("row",{name:"0.5 3 11.25 6 0",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"2 12 0 6 -15",exact:true})).toBeVisible();
  for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const) {
    await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await lab.screenshot({path:testInfo.outputPath(`projectiles-${name}.png`)});
    await lab.getByRole("img").scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`projectiles-${name}-viewport.png`)});
  }
  await lab.getByLabel("Initial horizontal velocity (m/s)",{exact:true}).fill("12");await predict(["2","24","11.25","-15"]);
  await expect(lab.getByRole("status")).toContainText("All four predictions agree");
  await lab.getByLabel("Launch height (m)",{exact:true}).fill("0");await lab.getByLabel("Initial horizontal velocity (m/s)",{exact:true}).fill("0");await lab.getByLabel("Initial vertical velocity (m/s)",{exact:true}).fill("10");
  await predict(["2","0","5","-10"]);
  await expect(lab.getByRole("row",{name:"1 0 5 0 0",exact:true})).toBeVisible();
  await lab.getByLabel("Initial horizontal velocity (m/s)",{exact:true}).fill("4");await lab.getByLabel("Initial vertical velocity (m/s)",{exact:true}).fill("-2");
  await predict(["0","0","0","-2"]);
  await expect(lab.getByRole("status")).toContainText("All four predictions agree");
  await expect(lab).toContainText("There is no positive airborne interval");
  await expect(lab.getByRole("row")).toHaveCount(2);
  await lab.getByLabel("Downward gravity magnitude (m/s²)",{exact:true}).fill("0");await check.click();
  await expect(lab.getByRole("status")).toContainText("positive downward g from 1 to 20");
  await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByLabel("Launch height (m)",{exact:true}).fill("");await check.click();
  await expect(lab.getByRole("status")).toContainText("empty input is not zero");
  await lab.getByRole("button",{name:"Reset flight",exact:true}).click();await lab.getByLabel("Initial horizontal velocity (m/s)",{exact:true}).press("ArrowUp");
  await expect(lab.getByLabel("Initial horizontal velocity (m/s)",{exact:true})).toHaveValue("6.1");
  expect(errors).toEqual([]);
});

test("projectile checkpoints preserve algebraic root sets and admissible events through backup restoration",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m02-l03.json",import.meta.url),"utf8"));
  const attempt=createAttempt(lessonSchema.parse(data),"checkpoint","projectile-events");
  await restoreProgress(page,{schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  const practice=page.locator("#practice");
  for(const [index,q] of attempt.questions.entries()) {
    const p=q.parameters;let answers:Record<string,string>;
    if(index===0||index===1) {
      const T=Math.round((p.vy+Math.sqrt(p.vy*p.vy+2*p.g*p.h))/p.g);
      answers=index===0?{time:String(T),displacement:String(p.vx*T),vy:String(p.vy-p.g*T)}:{roots:`${-2*p.h}/(${p.g}*${T}), ${T}`,time:String(T)};
    } else if(index===2)answers={vx:String(p.vx),vy:"0",speed:String(Math.abs(p.vx)),ay:String(-p.g)};
    else {const D=p.vertical*p.vertical-2*p.g*(p.target-p.height);answers={times:D<0?"none":D===0?String(p.vertical/p.g):`${(p.vertical-Math.sqrt(D))/p.g}, ${(p.vertical+Math.sqrt(D))/p.g}`,meaning:D<0?"unreachable":D===0?"touch":"two"};}
    for(const field of q.fields) {
      if(field.kind==="choice")await practice.locator(`input[value="${answers[field.id]}"]`).check();
      else await practice.getByLabel(`${field.label}${field.unit?` (${field.unit})`:""}`,{exact:true}).fill(answers[field.id]);
    }
    if(index===1){
      await expect(practice.getByText("Saved in this browser.",{exact:true})).toBeVisible();
      await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
      await expect(practice.getByLabel("All algebraic roots (s)",{exact:true})).toHaveValue(answers.roots);
      await expect(practice.getByLabel("Physical future impact time (s)",{exact:true})).toHaveValue(answers.time);
    }
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const path=testInfo.outputPath("projectile-backup.json");await(await downloading).saveAs(path);
  const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);
  expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m02-l03",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
