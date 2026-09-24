import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m03-l01";

test("force inventories distinguish support, contact loss, and different recipients with accessible controls",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto(route);
  const guided=page.locator("#guided");
  for(const [label,value] of [["Normal force (N)","30"],["Horizontal acceleration (m/s²)","4"],["Vertical acceleration (m/s²)","0"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByLabel("Earth's downward force on the cart",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("same recipient but a different agent");
  await guided.getByLabel("Normal force (N)",{exact:true}).fill("30-6");
  await guided.getByLabel("The cart's force (-12,-6) N on the actuator",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check force predictions",exact:true});
  const predict=async(values:string[],state:string)=>{
    for(const [i,label] of ["Predicted normal force (N)","Predicted horizontal acceleration (m/s²)","Predicted vertical acceleration (m/s²)"].entries())await lab.getByLabel(label,{exact:true}).fill(values[i]);
    await lab.getByLabel("Predicted contact state",{exact:true}).selectOption(state);
    await check.focus();await check.press("Enter");
  };
  await predict(["12","3","0"],"supported");
  await expect(lab.getByRole("status")).toContainText("predictions agree");
  await expect(lab.getByRole("row",{name:"Earth on cart 0 -20",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"Floor on cart 0 12",exact:true})).toBeVisible();
  await expect(lab.getByRole("img")).toHaveAccessibleName(/The net force is a sum, not an additional arrow/);
  for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const) {
    await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await lab.screenshot({path:testInfo.outputPath(`forces-${name}.png`)});
    await lab.getByRole("img").scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`forces-${name}-viewport.png`)});
  }
  await lab.getByLabel("Applied upward force (N)",{exact:true}).fill("20");await predict(["0","3","0"],"threshold");
  await expect(lab.getByRole("status")).toContainText("predictions agree");
  await lab.getByLabel("Applied upward force (N)",{exact:true}).fill("25");await predict(["0","3","5/2"],"separating");
  await expect(lab.getByRole("status")).toContainText("predictions agree");
  await expect(lab).toContainText("would require a normal force of -5 N");
  await lab.getByLabel("Applied upward force (N)",{exact:true}).fill("8");
  await lab.getByLabel("Cart initially touches the floor").focus();await lab.getByLabel("Cart initially touches the floor").press("Space");
  await expect(lab.getByLabel("Cart initially touches the floor")).not.toBeChecked();
  await predict(["0","3","-6"],"free");await expect(lab.getByRole("status")).toContainText("predictions agree");
  await lab.getByLabel("Cart mass (kg)",{exact:true}).fill("0");await check.click();
  await expect(lab.getByRole("status")).toContainText("Use mass from 0.1 to 20");
  await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByLabel("Cart mass (kg)",{exact:true}).fill("");await check.click();
  await expect(lab.getByRole("status")).toContainText("empty input is not zero");
  await lab.getByRole("button",{name:"Reset forces",exact:true}).click();
  await lab.getByLabel("Applied horizontal force (N)",{exact:true}).press("ArrowUp");
  await expect(lab.getByLabel("Applied horizontal force (N)",{exact:true})).toHaveValue("6.1");
  await page.reload();await expect(lab.getByLabel("Applied horizontal force (N)",{exact:true})).toHaveValue("6");
  expect(errors).toEqual([]);
});

test("force checkpoints retain exact incline answers, contact reasoning, and evidence through backup restoration",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m03-l01.json",import.meta.url),"utf8"));
  const attempt=createAttempt(lessonSchema.parse(data),"checkpoint","force-constraints");
  await restoreProgress(page,{schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  const practice=page.locator("#practice");
  for(const [index,q] of attempt.questions.entries()) {
    const p=q.parameters;let answers:Record<string,string>;
    if(index===0)answers={x:`(${p.fx}+${p.gx})/${p.mass}`,y:`(${p.fy}+${p.gy})/${p.mass}`,z:`(${p.fz}+${p.gz})/${p.mass}`};
    else if(index===1)answers={acceleration:p.angle===30?`${p.k}-5`:`${p.k}-5*sqrt(3)`,normal:p.angle===30?`${p.mass}*sqrt(75)`:`${5*p.mass}`};
    else if(index===2){const needed=p.mass*p.g-p.fy;answers={normal:String(Math.max(0,needed)),ay:needed>=0?"0":`${-needed}/${p.mass}`,contact:needed>0?"supported":needed===0?"threshold":"separating"};}
    else answers={x:String(-p.fx),y:String(-p.fy),z:String(-p.fz),diagram:"different-body"};
    for(const field of q.fields) {
      if(field.kind==="choice")await practice.locator(`input[value="${answers[field.id]}"]`).check();
      else await practice.getByLabel(`${field.label}${field.unit?` (${field.unit})`:""}`,{exact:true}).fill(answers[field.id]);
    }
    if(index===1){await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByLabel("Normal force (N)",{exact:true})).toHaveValue(answers.normal);}
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const path=testInfo.outputPath("force-backup.json");await(await downloading).saveAs(path);
  const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);
  expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m03-l01",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
