import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m05-l01";

test("work investigation connects signed area, kinetic energy, and power with accessible controls",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.goto(route);
  const guided=page.locator("#guided");
  for(const [label,value] of [["Net work (J)","(4+10)*3/2"],["Final kinetic energy (J)","25"],["Final speed (m/s)","sqrt(25)"],["Instantaneous net power at the endpoint (W)","10*5"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByLabel("Any nonnegative endpoint energy always proves arrival",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("can hide an earlier turn or asymptotic limit");
  await guided.getByLabel("Positive initial speed and positive force throughout the interval",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check work and motion",exact:true});
  await lab.getByLabel("Predicted formal work to L (J)",{exact:true}).fill("(4+10)*3/2");
  await lab.getByLabel("Predicted candidate kinetic energy at L (J)",{exact:true}).fill("4+21");
  await lab.getByLabel("Predicted forward-motion outcome",{exact:true}).selectOption("reachable");
  await check.focus();await check.press("Enter");await expect(lab.getByRole("status")).toContainText("All three predictions agree");
  await expect(lab).toContainText("Speed at L: 5 m/s");
  await lab.getByText("Inspect the position, work, and power table",{exact:true}).click();
  await expect(lab.getByRole("row",{name:"3 10 21 25 5 50",exact:true})).toBeVisible();
  await lab.getByText("Inspect the position, work, and power table",{exact:true}).click();
  for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const){
    await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await lab.screenshot({path:testInfo.outputPath(`work-${name}.png`)});
    await lab.getByRole("img").last().scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`work-${name}-viewport.png`)});
  }
  await lab.getByLabel("Constant force angle from +x (degrees)",{exact:true}).fill("90");
  await lab.getByLabel("Along-guide force slope B (N/m)",{exact:true}).fill("0");
  await lab.getByLabel("Predicted formal work to L (J)",{exact:true}).fill("0");
  await lab.getByLabel("Predicted candidate kinetic energy at L (J)",{exact:true}).fill("4");
  await check.click();await expect(lab.getByRole("status")).toContainText("All three predictions agree");await expect(lab).toContainText("Speed at L: 2 m/s");
  await lab.getByRole("button",{name:"Reset work model",exact:true}).click();
  await lab.getByLabel("Proposed endpoint L (m)",{exact:true}).press("ArrowUp");await expect(lab.getByLabel("Proposed endpoint L (m)",{exact:true})).toHaveValue("3.1");
  await page.reload();await expect(lab.getByLabel("Proposed endpoint L (m)",{exact:true})).toHaveValue("3");expect(errors).toEqual([]);
});

test("work model rejects inaccessible branches and distinguishes finite turns from asymptotic equilibrium",async({page},testInfo)=>{
  await page.goto(route);const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check work and motion",exact:true});
  const predict=async(work:string,kinetic:string,outcome:string)=>{
    await lab.getByLabel("Predicted formal work to L (J)",{exact:true}).fill(work);await lab.getByLabel("Predicted candidate kinetic energy at L (J)",{exact:true}).fill(kinetic);
    await lab.getByLabel("Predicted forward-motion outcome",{exact:true}).selectOption(outcome);await check.click();
  };
  await lab.getByRole("button",{name:"Finite stop",exact:true}).click();await predict("-12","-3","turns");
  await expect(lab.getByRole("status")).toContainText("All three predictions agree");await expect(lab).toContainText("turns at x=3 m before the proposed endpoint");
  await expect(lab).toContainText("No realized endpoint speed");
  await lab.getByLabel("Proposed endpoint L (m)",{exact:true}).fill("3");await predict("-9","0","turn-at-end");
  await expect(lab.getByRole("status")).toContainText("All three predictions agree");await expect(lab).toContainText("Speed at L: 0 m/s");
  await lab.getByRole("button",{name:"Energy barrier",exact:true}).click();await predict("0","9","reachable");
  await expect(lab.getByRole("status")).toContainText("Revisit forward-motion outcome");await expect(lab).toContainText("turns at x=1.354249 m");
  await lab.getByText("Inspect the position, work, and power table",{exact:true}).click();
  await expect(lab.getByRole("row",{name:"8 8 0 9 Unavailable Unavailable",exact:true})).toBeVisible();
  await lab.getByRole("button",{name:"Asymptotic limit",exact:true}).click();await predict("0","9","asymptotic");
  await expect(lab.getByRole("status")).toContainText("All three predictions agree");await expect(lab).toContainText("does not reach it in finite time");
  await lab.getByText("Inspect the position, work, and power table",{exact:true}).click();
  await expect(lab.getByRole("row",{name:"3 0 -9 0 Unavailable Unavailable",exact:true})).toBeVisible();
  await lab.getByText("Inspect the position, work, and power table",{exact:true}).click();
  await page.setViewportSize({width:390,height:844});await lab.screenshot({path:testInfo.outputPath("work-asymptotic-mobile.png")});
  await lab.getByRole("button",{name:"Exact rest",exact:true}).click();await predict("9","9","no-forward-start");
  await expect(lab.getByRole("status")).toContainText("All three predictions agree");await expect(lab).toContainText("remains at rest");
  await lab.getByLabel("Initial forward speed (m/s)",{exact:true}).fill("0.001");await check.click();
  await expect(lab.getByRole("status")).toContainText("at least 0.01 m/s");await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByRole("button",{name:"Reset work model",exact:true}).click();await predict("sqrt(-1)","25","reachable");
  await expect(lab.getByRole("status")).toContainText("must be real numbers");await lab.getByLabel("Mass (kg)",{exact:true}).fill("");await check.click();
  await expect(lab.getByRole("status")).toContainText("empty input is not zero");
});

test("work checkpoints preserve independently calculated path and barrier answers through reload and backup restoration",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m05-l01.json",import.meta.url),"utf8"));
  const attempt=createAttempt(lessonSchema.parse(data),"checkpoint","work-path-barriers");
  await restoreProgress(page,{schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();const practice=page.locator("#practice");
  for(const [index,q] of attempt.questions.entries()){
    const p=q.parameters;let answers:Record<string,string>;
    if(index===0){const w=p.fx*p.dx+p.fy*p.dy+p.fz*p.dz;answers={work:String(w),reverse:String(-w)};}
    else if(index===1){
      const a=p.a+p.b*p.x0,b=p.a+p.b*p.x1;
      answers={work:`(${a}+${b})*(${p.x1}-(${p.x0}))/2`,mean:`(${a}+${b})/2`};
    }else if(index===2){
      const midpoint=p.c*p.height/4*p.length,last=p.c*p.height*p.length;
      answers={curved:`(4*${midpoint}+${last})/6`,straight:`${last}/2`,meaning:"depends"};
    }else{
      const minimum=p.k*p.sign*p.d*p.d;
      answers={kinetic:String(p.k*p.b*p.b+minimum),boundary:minimum>0?"none":String(p.b-(minimum<0?p.d:0)),motion:minimum>0?"pass":minimum<0?"turn":"limit"};
    }
    for(const field of q.fields){
      if(field.kind==="choice"){
        const selected=field.options.find(option=>option.id===answers[field.id]);if(!selected)throw Error("Missing independent choice");
        await practice.getByLabel(selected.label,{exact:true}).check();
      }else await practice.getByLabel(`${field.label}${field.unit?` (${field.unit})`:""}`,{exact:true}).fill(answers[field.id]);
    }
    if(index===1){await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByLabel("Signed force work (J)",{exact:true})).toHaveValue(answers.work);}
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true}).fill("A positive endpoint energy can lie beyond a first turning point or an asymptotic equilibrium.");
  await page.getByRole("button",{name:"Save lesson notes",exact:true}).click();await expect(page.getByText("Lesson notes saved.",{exact:true})).toBeVisible();
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const path=testInfo.outputPath("work-backup.json");await(await downloading).saveAs(path);const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m05-l01",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();await restoreProgress(page,backup);
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true})).toHaveValue("A positive endpoint energy can lie beyond a first turning point or an asymptotic equilibrium.");
});
