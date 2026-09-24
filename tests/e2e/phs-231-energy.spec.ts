import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m05-l02";

test("energy investigation distinguishes mechanical and total energy and preserves motion under a reference shift",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.goto(route);
  const guided=page.locator("#guided");
  for(const [label,value] of [["Combined thermal rise (J)","4*.5"],["Final kinetic energy (J)","16+1-6-2"],["Final speed (m/s)","sqrt(9)"],["Modeled total including thermal rise (J)","9+6+2"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByLabel("Mechanical energy alone stays 17 J despite friction",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("would miss the thermal rise");
  await guided.getByLabel("Mechanical energy decreases while the larger insulated total stays constant",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check energy account",exact:true});
  await lab.getByLabel("Predicted path dissipation to L (J)",{exact:true}).fill("2");
  await lab.getByLabel("Predicted candidate kinetic energy at L (J)",{exact:true}).fill("9");
  await lab.getByLabel("Predicted endpoint reachability",{exact:true}).selectOption("reaches");
  await check.focus();await check.press("Enter");await expect(lab.getByRole("status")).toContainText("All three predictions agree");
  await expect(lab.getByRole("row",{name:"Kinetic energy 16 9 J",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"Mechanical energy K+U 17 15 J",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"Modeled total K+U+thermal rise 17 17 J",exact:true})).toBeVisible();
  for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const){
    await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await lab.screenshot({path:testInfo.outputPath(`energy-${name}.png`)});
    await lab.getByRole("img").scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`energy-${name}-viewport.png`)});
  }
  await lab.getByRole("button",{name:"Shift reference",exact:true}).click();await check.click();
  await expect(lab.getByRole("status")).toContainText("All three predictions agree");
  await expect(lab.getByRole("row",{name:"Kinetic energy 16 9 J",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"Combined potential including C -49 -44 J",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"Modeled total K+U+thermal rise -33 -33 J",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"Uphill speed 4 3 m/s",exact:true})).toBeVisible();
  await lab.getByRole("button",{name:"Reset energy model",exact:true}).click();
  await lab.getByLabel("Additive potential reference C (J)",{exact:true}).press("ArrowUp");await expect(lab.getByLabel("Additive potential reference C (J)",{exact:true})).toHaveValue("10");
  await page.reload();await expect(lab.getByLabel("Additive potential reference C (J)",{exact:true})).toHaveValue("0");expect(errors).toEqual([]);
});

test("energy ledger stops at traveled distance and handles friction-free and no-spring limits",async({page},testInfo)=>{
  await page.goto(route);const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check energy account",exact:true});
  const predict=async(thermal:string,kinetic:string,outcome:string)=>{
    await lab.getByLabel("Predicted path dissipation to L (J)",{exact:true}).fill(thermal);await lab.getByLabel("Predicted candidate kinetic energy at L (J)",{exact:true}).fill(kinetic);
    await lab.getByLabel("Predicted endpoint reachability",{exact:true}).selectOption(outcome);await check.click();
  };
  await lab.getByRole("button",{name:"First stop",exact:true}).click();await predict("4","0","stops-at-end");
  await expect(lab.getByRole("status")).toContainText("All three predictions agree");await expect(lab).toContainText("exactly at the requested endpoint");
  await expect(lab.getByRole("row",{name:"Spring potential above unstrained state 1 1 J",exact:true})).toBeVisible();
  await lab.getByRole("button",{name:"Beyond the stop",exact:true}).click();await predict("8","-24","stops-before");
  await expect(lab.getByRole("status")).toContainText("All three predictions agree");await expect(lab).toContainText("before the requested endpoint");
  await expect(lab.getByRole("row",{name:"Combined thermal rise 0 4 J",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"Uphill position 0 1 m",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"Kinetic energy 16 0 J",exact:true})).toBeVisible();
  await lab.getByText("Inspect energies along the reached path",{exact:true}).click();
  await expect(lab.getByRole("row",{name:"1 0 13 4 17 0",exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});await lab.getByText("Inspect energies along the reached path",{exact:true}).click();await lab.screenshot({path:testInfo.outputPath("energy-stopped-mobile.png")});
  await lab.getByRole("button",{name:"No friction",exact:true}).click();await predict("0","11","reaches");
  await expect(lab.getByRole("status")).toContainText("All three predictions agree");await expect(lab.getByRole("row",{name:"Mechanical energy K+U 17 17 J",exact:true})).toBeVisible();
  await lab.getByRole("button",{name:"No spring",exact:true}).click();await predict("2","8","reaches");
  await expect(lab.getByRole("status")).toContainText("All three predictions agree");await expect(lab.getByRole("row",{name:"Modeled total K+U+thermal rise 16 16 J",exact:true})).toBeVisible();
  await lab.getByRole("button",{name:"Free guide",exact:true}).click();await predict("0","16","reaches");
  await expect(lab.getByRole("status")).toContainText("All three predictions agree");await expect(lab.getByRole("row",{name:"Uphill speed 4 4 m/s",exact:true})).toBeVisible();
  await lab.getByLabel("Vertical rise per path length, sin θ",{exact:true}).fill("1");await lab.getByLabel("Kinetic friction coefficient",{exact:true}).fill("1");await predict("0","-24","stops-before");
  await expect(lab.getByRole("status")).toContainText("All three predictions agree");await expect(lab.getByRole("row",{name:"Uphill position 0 0.8 m",exact:true})).toBeVisible();
  await lab.getByLabel("Initial uphill speed (m/s)",{exact:true}).fill("0");await check.click();
  await expect(lab.getByRole("status")).toContainText("must be positive");await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByRole("button",{name:"Reset energy model",exact:true}).click();await predict("sqrt(-1)","9","reaches");await expect(lab.getByRole("status")).toContainText("must be real numbers");
  await lab.getByLabel("Spring stiffness (N/m)",{exact:true}).fill("");await check.click();await expect(lab.getByRole("status")).toContainText("empty input is not zero");
});

test("energy checkpoints retain full ledgers, disconnected regions, and stability answers through reload and backup",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m05-l02.json",import.meta.url),"utf8"));
  const attempt=createAttempt(lessonSchema.parse(data),"checkpoint","energy-ledger-regions");
  await restoreProgress(page,{schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();const practice=page.locator("#practice");
  for(const [index,q] of attempt.questions.entries()){
    const p=q.parameters;let answers:Record<string,string>;
    if(index===0){
      const gravity=`${6*p.mass}*${p.length}/4`,thermal=`${8*p.mass}*${p.coefficient}/10*${p.length}/4`;
      const spring=`${p.stiffness}/2*(${p.length}/4-${p.compression}/2)^2`;
      const kinetic=`${p.mass*p.speed*p.speed}/2+${p.stiffness}/2*(${p.compression}/2)^2-(${spring})-(${gravity})-(${thermal})`;
      answers={gravity,thermal,spring,kinetic,speed:`sqrt(2*(${kinetic})/${p.mass})`};
    }else if(index===1){
      const middle=`${p.useful}/(${p.second}/10)`,input=`(${middle})/(${p.first}/10)`;
      answers={efficiency:`${p.useful}/(${input})`,input,first:`(${input})-(${middle})`,second:`(${middle})-${p.useful}`};
    }else if(index===2){
      const delta=Math.sqrt((p.energy-p.reference)/p.a),inner=p.b*p.b-delta,outer=p.b*p.b+delta;
      answers={boundaries:`-sqrt(${outer}),-sqrt(${inner}),sqrt(${inner}),sqrt(${outer})`,barrier:String(p.a*p.b**4+p.reference),region:"right"};
    }else{
      const U=(x:number)=>p.power===0?p.reference:p.coefficient*(x-p.center)**p.power+p.reference,b=p.center;
      const left=U(b-1)-U(b),right=U(b+1)-U(b),curvature=(-U(b+2)+16*U(b+1)-30*U(b)+16*U(b-1)-U(b-2))/12;
      answers={force:"0",curvature:String(curvature),stability:left>0&&right>0?"stable":left===0&&right===0?"neutral":"unstable"};
    }
    for(const field of q.fields){
      if(field.kind==="choice"){const option=field.options.find(o=>o.id===answers[field.id]);if(!option)throw Error("Missing independent choice");await practice.getByLabel(option.label,{exact:true}).check();}
      else await practice.getByLabel(`${field.label}${field.unit?` (${field.unit})`:""}`,{exact:true}).fill(answers[field.id]);
    }
    if(index===0){await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByLabel("Final kinetic energy (J)",{exact:true})).toHaveValue(answers.kinetic);}
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true}).fill("Reference shifts move U and E together. Friction lowers mechanical energy, and the total ledger includes thermal rise.");
  await page.getByRole("button",{name:"Save lesson notes",exact:true}).click();await expect(page.getByText("Lesson notes saved.",{exact:true})).toBeVisible();
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const path=testInfo.outputPath("energy-backup.json");await(await downloading).saveAs(path);const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m05-l02",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();await restoreProgress(page,backup);
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true})).toHaveValue("Reference shifts move U and E together. Friction lowers mechanical energy, and the total ledger includes thermal rise.");
});

