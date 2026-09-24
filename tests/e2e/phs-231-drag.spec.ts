import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m03-l03";

test("drag transients preserve signs, time scales, and the zero-drag limit with accessible charts and tables",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto(route);const guided=page.locator("#guided");
  for(const [label,value] of [["Selected terminal velocity (m/s)","20"],["Time constant (s)","2"],["Velocity after 2 s (m/s)","12.642"],["Acceleration after 2 s (m/s²)","3.679"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByLabel("Terminal velocity is reached exactly after one time constant",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("about 36.8% of the initial difference remains");
  await guided.getByLabel("Weight and drag balance at a nonzero constant downward velocity",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check drag predictions",exact:true});
  const predict=async(values:string[])=>{
    for(const [i,label] of ["Predicted selected terminal velocity (m/s)","Predicted time constant (s)","Predicted final velocity (m/s)","Predicted final acceleration (m/s²)"].entries())await lab.getByLabel(label,{exact:true}).fill(values[i]);
    await check.focus();await check.press("Enter");
  };
  await predict(["20","2","17.293","1.353"]);await expect(lab.getByRole("status")).toContainText("All four drag predictions agree");
  await expect(lab.getByRole("row",{name:"2 1 14.715178 12.642411 3.678794 -12.642411",exact:true})).toBeVisible();
  await expect(lab.getByRole("img")).toHaveCount(2);
  for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const){
    await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await lab.screenshot({path:testInfo.outputPath(`drag-${name}.png`)});
    await lab.getByRole("img").first().scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`drag-${name}-viewport.png`)});
  }
  await lab.getByLabel("Initial downward velocity (m/s)",{exact:true}).fill("30");
  await predict(["20","2","21.353353","-0.676676"]);await expect(lab.getByRole("status")).toContainText("All four drag predictions agree");
  await lab.getByLabel("Initial downward velocity (m/s)",{exact:true}).fill("-10");
  await predict(["20","2","15.939942","2.030029"]);await expect(lab.getByRole("status")).toContainText("All four drag predictions agree");
  await expect(lab).toContainText("reverses direction at 0.81093 s");
  await lab.getByLabel("Linear drag coefficient (kg/s)",{exact:true}).fill("0");
  await predict(["none","none","30","10"]);await expect(lab.getByRole("status")).toContainText("All four drag predictions agree");
  await expect(lab).toContainText("no finite terminal velocity is approached");
  await lab.getByLabel("Downward gravity magnitude (m/s²)",{exact:true}).fill("0");
  await predict(["none","none","-10","0"]);await expect(lab.getByRole("status")).toContainText("All four drag predictions agree");
  await expect(lab).toContainText("Every constant initial velocity is an equilibrium");
  await lab.getByLabel("Linear drag coefficient (kg/s)",{exact:true}).fill("0.001");await check.click();
  await expect(lab.getByRole("status")).toContainText("zero or between 0.01 and 10");
  await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByLabel("Mass (kg)",{exact:true}).fill("");await check.click();
  await expect(lab.getByRole("status")).toContainText("empty input is not zero");
  await lab.getByRole("button",{name:"Reset drag",exact:true}).click();
  await lab.getByLabel("Linear drag coefficient (kg/s)",{exact:true}).press("ArrowUp");
  await expect(lab.getByLabel("Linear drag coefficient (kg/s)",{exact:true})).toHaveValue("1.01");
  await page.reload();await expect(lab.getByLabel("Linear drag coefficient (kg/s)",{exact:true})).toHaveValue("1");
  expect(errors).toEqual([]);
});

test("drag checkpoints preserve numerical transients, exact radicals, and model checks through backup restoration",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m03-l03.json",import.meta.url),"utf8"));
  const attempt=createAttempt(lessonSchema.parse(data),"checkpoint","drag-boundaries");
  await restoreProgress(page,{schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();const practice=page.locator("#practice");
  for(const [index,q] of attempt.questions.entries()){
    const p=q.parameters;let answers:Record<string,string>;
    if(index===0){
      let v=p.v0;const h=p.time/4096,f=(value:number)=>p.g-p.b*value/p.mass;
      for(let i=0;i<4096;i++){const a=f(v),b=f(v+h*a/2),c=f(v+h*b/2),d=f(v+h*c);v+=h*(a+2*b+2*c+d)/6;}
      answers={velocity:v.toFixed(6),acceleration:f(v).toFixed(6)};
    }else if(index===1)answers={velocity:String(p.v0+p.g*p.time),position:`(${2*p.v0}+${p.g*p.time})*${p.time}/2`,limit:"none"};
    else if(index===2)answers={terminal:`sqrt(${p.mass*p.g})/sqrt(${p.c})`,drag:String(p.c*p.speed*p.speed)};
    else{
      const initial=p.mass*p.g/p.b+p.D,derivative=-p.rateNumerator*p.D/p.tau,required=p.g-p.b*initial/p.mass;
      answers={initial:String(initial),derivative:`${-p.rateNumerator*p.D}/${p.tau}`,validity:Math.abs(derivative-required)>1e-10?"equation":initial===0?"valid":"initial"};
    }
    for(const field of q.fields){
      if(field.kind==="choice")await practice.locator(`input[value="${answers[field.id]}"]`).check();
      else await practice.getByLabel(`${field.label}${field.unit?` (${field.unit})`:""}`,{exact:true}).fill(answers[field.id]);
    }
    if(index===0){await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByLabel("Velocity at the stated time (m/s)",{exact:true})).toHaveValue(answers.velocity);}
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const path=testInfo.outputPath("drag-backup.json");await(await downloading).saveAs(path);const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);
  expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m03-l03",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();await restoreProgress(page,backup);
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
