import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m04-l01";

test("circular investigation distinguishes direction, changing speed, and failed contact with keyboard access",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto(route);const guided=page.locator("#guided");
  for(const [label,value] of [["Requested inward radial acceleration (m/s²)","5"],["Required inward normal (N)","-10"],["Actual normal (N)","0"],["Actual downward acceleration (m/s²)","10"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByLabel("Set normal to zero but retain the circular acceleration of 5 m/s²",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("violates force balance");
  await guided.getByLabel("The body loses contact; the requested circle is infeasible",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check circular predictions",exact:true});
  const predict=async(values:string[],contact:string)=>{
    for(const [i,label] of ["Predicted inward radial acceleration (m/s²)","Predicted requested total acceleration (m/s²)","Predicted required inward normal force (N)"].entries())await lab.getByLabel(label,{exact:true}).fill(values[i]);
    await lab.getByLabel("Predicted contact feasibility",{exact:true}).selectOption(contact);
    await check.focus();await check.press("Enter");
  };
  await predict(["18","sqrt(18^2+2^2)","18"],"supported");
  await expect(lab.getByRole("status")).toContainText("predictions agree");
  await expect(lab.getByRole("row",{name:"Velocity 0 6 m/s",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"Requested circular acceleration -18 2 m/s²",exact:true})).toBeVisible();
  for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const){
    await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await lab.screenshot({path:testInfo.outputPath(`circular-${name}.png`)});
    await lab.getByRole("img").scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`circular-${name}-viewport.png`)});
  }
  await lab.getByLabel("Clockwise velocity",{exact:true}).focus();await lab.getByLabel("Clockwise velocity",{exact:true}).press("Space");
  await predict(["18","2sqrt(82)","18"],"supported");await expect(lab).toContainText("Instantaneous speed change: -2 m/s²");
  const top=lab.getByRole("button",{name:"At top (90°)",exact:true});await top.focus();await top.press("Enter");
  await lab.getByLabel("Speed (m/s)",{exact:true}).fill("4");await predict(["8","sqrt(68)","-2"],"lost");
  await expect(lab.getByRole("status")).toContainText("predictions agree");
  await expect(lab.getByRole("row",{name:"Requested circular acceleration -2 -8 m/s²",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"Acceleration from available forces -2 -10 m/s²",exact:true})).toBeVisible();
  await expect(lab).toContainText("cannot continue on the requested circle");
  await lab.getByRole("img").scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath("circular-contact-loss.png")});
  await lab.getByLabel("Speed (m/s)",{exact:true}).fill(String(Math.sqrt(20)));await predict(["10","sqrt(104)","0"],"threshold");
  await expect(lab.getByRole("status")).toContainText("predictions agree");await expect(lab).toContainText("does not establish later contact");
  await lab.getByRole("button",{name:"At right (0°)",exact:true}).click();await lab.getByLabel("Speed (m/s)",{exact:true}).fill("0");await predict(["0","2","0"],"threshold");
  await expect(lab.getByRole("status")).toContainText("predictions agree");await expect(lab).toContainText("two-sided derivative of speed is not assigned");
  await lab.getByLabel("Radius (m)",{exact:true}).fill("11");await lab.getByLabel("Speed (m/s)",{exact:true}).fill("7");
  await lab.getByLabel("Signed counterclockwise tangential acceleration (m/s²)",{exact:true}).fill("8");
  await predict(["49/11","sqrt((49/11)^2+8^2)","49/11"],"supported");await expect(lab.getByRole("status")).toContainText("predictions agree");
  await lab.getByLabel("Predicted requested total acceleration (m/s²)",{exact:true}).fill("sqrt(-1)");await check.click();
  await expect(lab.getByRole("status")).toContainText("must be real");await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByLabel("Radius (m)",{exact:true}).fill("0");await check.click();await expect(lab.getByRole("status")).toContainText("positive radius");
  await lab.getByLabel("Mass (kg)",{exact:true}).fill("");await check.click();await expect(lab.getByRole("status")).toContainText("empty input is not zero");
  await lab.getByRole("button",{name:"Reset circle",exact:true}).click();await lab.getByLabel("Radius (m)",{exact:true}).press("ArrowUp");
  await expect(lab.getByLabel("Radius (m)",{exact:true})).toHaveValue("2.1");await page.reload();await expect(lab.getByLabel("Radius (m)",{exact:true})).toHaveValue("2");
  expect(errors).toEqual([]);
});

test("circular checkpoints restore exact vector and contact answers through reload and an exported backup",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m04-l01.json",import.meta.url),"utf8"));
  const attempt=createAttempt(lessonSchema.parse(data),"checkpoint","circular-boundaries");
  await restoreProgress(page,{schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();const practice=page.locator("#practice");
  for(const [index,q] of attempt.questions.entries()){
    const p=q.parameters;let answers:Record<string,string>;
    if(index===0){
      const x=p.radius*Math.round(Math.cos(p.angle*Math.PI/180)),y=p.radius*Math.round(Math.sin(p.angle*Math.PI/180));
      answers={vx:String(-p.omega*y),vy:String(p.omega*x),ax:String(-p.omega*p.omega*x-p.alpha*y),ay:String(-p.omega*p.omega*y+p.alpha*x)};
    }else if(index===1)answers={radial:`${p.speed*p.speed}/${p.radius}`,total:`sqrt((${p.speed*p.speed}/${p.radius})^2+(${p.tangential})^2)`,rate:String(p.direction*p.tangential)};
    else if(index===2){
      const required=p.mass*p.radial-p.mass*p.g;
      answers={required:String(required),actual:String(Math.max(0,required)),contact:required<0?"lost":"possible"};
    }else answers={normal:`${p.mass*p.g}/(${p.cosNumerator}/5)`,speed:`sqrt(${p.radius*p.g*p.sinNumerator}/${p.cosNumerator})`};
    for(const field of q.fields){
      if(field.kind==="choice")await practice.locator(`input[value="${answers[field.id]}"]`).check();
      else await practice.getByLabel(`${field.label}${field.unit?` (${field.unit})`:""}`,{exact:true}).fill(answers[field.id]);
    }
    if(index===1){await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByLabel("Total acceleration magnitude (m/s²)",{exact:true})).toHaveValue(answers.total);}
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const path=testInfo.outputPath("circular-backup.json");await(await downloading).saveAs(path);const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m04-l01",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();await restoreProgress(page,backup);
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});

