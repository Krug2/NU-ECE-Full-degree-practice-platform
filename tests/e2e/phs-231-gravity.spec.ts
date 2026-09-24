import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m04-l02";

test("gravity investigation compares separate exterior orbits and distinguishes gravity from apparent weight",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto(route);const guided=page.locator("#guided");
  for(const [label,value] of [["Orbital center distance (m)","8"],["Gravitational acceleration magnitude (m/s²)","9/8"],["Circular speed (m/s)","sqrt(9)"],["Orbital period (s)","16*pi/3"],["Ideal support-force reading (N)","0"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByLabel("Gravity becomes zero beyond the surface",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("which is nonzero");
  await guided.getByLabel("The cabin and occupant fall together under nonzero gravity",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check orbital ratios",exact:true});
  const predict=async(values:string[])=>{
    for(const [i,label] of ["Predicted field-strength ratio","Predicted circular-speed ratio","Predicted period ratio","Predicted signed total-energy ratio"].entries())await lab.getByLabel(label,{exact:true}).fill(values[i]);
    await check.focus();await check.press("Enter");
  };
  await predict(["1/16","1/2","8","1/4"]);await expect(lab.getByRole("status")).toContainText("All four orbital ratios agree");
  await expect(lab.getByRole("row",{name:"Center distance 8 32 m",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"Gravitational acceleration 2 0.125 m/s²",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"Total circular energy -24 -6 J",exact:true})).toBeVisible();
  for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const){
    await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await lab.screenshot({path:testInfo.outputPath(`gravity-${name}.png`)});
    await lab.getByRole("img").scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`gravity-${name}-viewport.png`)});
  }
  const ratio=lab.getByRole("button",{name:"Radius ratio 2",exact:true});await ratio.focus();await ratio.press("Enter");
  await predict(["1/4","1/sqrt(2)","2sqrt(2)","1/2"]);await expect(lab.getByRole("status")).toContainText("All four orbital ratios agree");
  await lab.getByLabel("Test mass (kg)",{exact:true}).fill("6");await check.click();
  await expect(lab.getByRole("row",{name:"Gravitational force magnitude 12 3 N",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"Total circular energy -48 -24 J",exact:true})).toBeVisible();
  await lab.getByLabel("Source parameter μ (m³/s²)",{exact:true}).fill("512");await check.click();
  await expect(lab.getByRole("status")).toContainText("All four orbital ratios agree");
  await expect(lab.getByRole("row",{name:"Total circular energy -192 -96 J",exact:true})).toBeVisible();
  await lab.getByRole("button",{name:"Radius ratio 0.5",exact:true}).click();await predict(["4","sqrt(2)","1/(2sqrt(2))","2"]);
  await expect(lab.getByRole("status")).toContainText("All four orbital ratios agree");await expect(lab).toContainText("lower circular orbit has a more negative total energy");
  await lab.getByLabel("Source radius R (m)",{exact:true}).fill("5");await check.click();await expect(lab.getByRole("status")).toContainText("exterior formulas do not describe an interior orbit");
  await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByRole("button",{name:"Reset orbits",exact:true}).click();await predict(["1/16","sqrt(-1)","8","1/4"]);
  await expect(lab.getByRole("status")).toContainText("ratios must be real");
  await lab.getByLabel("Test mass (kg)",{exact:true}).fill("");await check.click();await expect(lab.getByRole("status")).toContainText("empty input is not zero");
  await lab.getByRole("button",{name:"Reset orbits",exact:true}).click();await lab.getByLabel("Comparison-to-reference radius ratio",{exact:true}).press("ArrowUp");
  await expect(lab.getByLabel("Comparison-to-reference radius ratio",{exact:true})).toHaveValue("4.25");await page.reload();await expect(lab.getByLabel("Comparison-to-reference radius ratio",{exact:true})).toHaveValue("4");
  expect(errors).toEqual([]);
});

test("gravity checkpoints retain exact periods, vector sums, and energy reasoning through reload and backup restoration",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m04-l02.json",import.meta.url),"utf8"));
  const attempt=createAttempt(lessonSchema.parse(data),"checkpoint","gravity-boundaries");
  await restoreProgress(page,{schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();const practice=page.locator("#practice");
  for(const [index,q] of attempt.questions.entries()){
    const p=q.parameters;let answers:Record<string,string>;
    if(index===0)answers={speed:`sqrt(${p.mu}/${p.r})`,period:`${2*p.r}*pi/${p.v}`,field:`${p.mu}/${p.r*p.r}`};
    else if(index===1){
      const x=p.sx*p.muA/(p.a*p.a),y=p.sy*p.muB/(p.b*p.b);
      answers={x:String(x),y:String(y),magnitude:`sqrt(${x*x+y*y})`,force:`sqrt(${p.m*p.m*(x*x+y*y)})`};
    }else if(index===2){
      const energy=p.mu*p.numerator/(4*p.r)-p.mu/p.r;
      answers={energy:String(energy),radius:`${-p.mu}/(${energy})`};
    }else answers={axis:String((p.peri+p.apo)/2),eccentricity:`(${p.apo}-${p.peri})/(${p.apo}+${p.peri})`,period:`${p.peri+p.apo}*pi/${p.v}`,speed:`${p.apo}/${p.peri}`};
    for(const field of q.fields){
      if(field.kind==="choice")throw Error("This checkpoint fixture expects calculated fields.");
      await practice.getByLabel(`${field.label}${field.unit?` (${field.unit})`:""}`,{exact:true}).fill(answers[field.id]);
    }
    if(index===0){await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByLabel("Orbital period (s)",{exact:true})).toHaveValue(answers.period);}
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const path=testInfo.outputPath("gravity-backup.json");await(await downloading).saveAs(path);const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m04-l02",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();await restoreProgress(page,backup);
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
