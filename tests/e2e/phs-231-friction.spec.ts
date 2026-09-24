import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m03-l02";

test("friction changes at onset and follows relative sliding while remaining keyboard and mobile accessible",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto(route);const guided=page.locator("#guided");
  for(const [label,value] of [["Signed table friction (N)","-12"],["Shared acceleration (m/s²)","2"],["Rope tension (N)","8"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByLabel("Use 12 N static friction because it is the largest available force",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Static capacity is not an automatic force");
  await guided.getByLabel("Signed table friction (N)",{exact:true}).fill("-4");
  await guided.getByLabel("Use 4 N kinetic friction opposite the stated relative sliding",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check friction predictions",exact:true});
  const predict=async(values:string[],regime:string)=>{
    for(const [i,label] of ["Predicted normal force (N)","Predicted signed friction (N)","Predicted horizontal acceleration (m/s²)"].entries())await lab.getByLabel(label,{exact:true}).fill(values[i]);
    await lab.getByLabel("Predicted friction regime",{exact:true}).selectOption(regime);await check.focus();await check.press("Enter");
  };
  await predict(["20","-6","0"],"sticking");await expect(lab.getByRole("status")).toContainText("predictions agree");
  await expect(lab.getByRole("row",{name:"10 -10 0 At the static threshold; sticking is still possible.",exact:true})).toBeVisible();
  await expect(lab.getByRole("img")).toHaveAccessibleName(/Static capacity 10 N/);
  for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const){
    await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await lab.screenshot({path:testInfo.outputPath(`friction-${name}.png`)});
    await lab.getByRole("img").scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`friction-${name}-viewport.png`)});
  }
  await lab.getByLabel("Applied horizontal force (N)",{exact:true}).fill("10");await predict(["20","-10","0"],"threshold");
  await expect(lab.getByRole("status")).toContainText("predictions agree");
  await lab.getByLabel("Applied horizontal force (N)",{exact:true}).fill("12");await predict(["20","-6","3"],"onset");
  await expect(lab.getByRole("status")).toContainText("predictions agree");
  await lab.getByLabel("Applied horizontal force (N)",{exact:true}).fill("4");
  await lab.getByLabel("Velocity relative to floor (m/s)",{exact:true}).fill("-1");await predict(["20","6","5"],"sliding");
  await expect(lab.getByRole("status")).toContainText("predictions agree");
  await lab.getByLabel("Velocity relative to floor (m/s)",{exact:true}).fill("1");await predict(["20","-6","-1"],"sliding");
  await expect(lab.getByRole("status")).toContainText("predictions agree");
  await expect(lab).toContainText("If the block reaches zero velocity, test sticking again");
  await lab.getByLabel("Applied upward force (N)",{exact:true}).fill("25");await predict(["0","0","2"],"detached");
  await expect(lab.getByRole("status")).toContainText("predictions agree");
  await expect(lab).toContainText("upward acceleration is 2.5 m/s²");
  await lab.getByLabel("Kinetic coefficient",{exact:true}).fill("0.6");await check.click();
  await expect(lab.getByRole("status")).toContainText("kinetic coefficient ≤ static coefficient");
  await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByLabel("Mass (kg)",{exact:true}).fill("");await check.click();
  await expect(lab.getByRole("status")).toContainText("empty value is not zero");
  await lab.getByRole("button",{name:"Reset friction",exact:true}).click();
  await lab.getByLabel("Static coefficient",{exact:true}).press("ArrowUp");await expect(lab.getByLabel("Static coefficient",{exact:true})).toHaveValue("0.55");
  await page.reload();await expect(lab.getByLabel("Static coefficient",{exact:true})).toHaveValue("0.5");
  expect(errors).toEqual([]);
});

test("friction checkpoints preserve signed coupled equations and feasibility decisions through reload and backup",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m03-l02.json",import.meta.url),"utf8"));
  const attempt=createAttempt(lessonSchema.parse(data),"checkpoint","friction-constraints");
  await restoreProgress(page,{schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();const practice=page.locator("#practice");
  for(const [index,q] of attempt.questions.entries()){
    const p=q.parameters;let answers:Record<string,string>;
    if(index===0)answers={limit:String(Math.abs(p.force)),friction:String(-p.force),acceleration:"0",regime:"stick"};
    else if(index===1){const friction=-p.direction*p.k*p.mass;answers={friction:String(friction),acceleration:`(${p.force}+${friction})/${p.mass}`,regime:"slide"};}
    else if(index===2)answers={acceleration:`(${p.other*p.g}-${p.mass*p.g})/(${p.mass}+${p.other})`,tension:`${p.mass}*(${p.g}+(${p.other*p.g}-${p.mass*p.g})/(${p.mass}+${p.other}))`};
    else answers={required:String(p.other*p.g),limit:String(p.mass*p.s),possible:p.other*p.g<=p.mass*p.s?"yes":"no"};
    for(const field of q.fields){
      if(field.kind==="choice")await practice.locator(`input[value="${answers[field.id]}"]`).check();
      else await practice.getByLabel(`${field.label}${field.unit?` (${field.unit})`:""}`,{exact:true}).fill(answers[field.id]);
    }
    if(index===2){await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByLabel("Common tension (N)",{exact:true})).toHaveValue(answers.tension);}
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const path=testInfo.outputPath("friction-backup.json");await(await downloading).saveAs(path);const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);
  expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m03-l02",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();await restoreProgress(page,backup);
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
