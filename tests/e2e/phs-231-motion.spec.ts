import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m02-l01";

test("motion graphs teach signed areas and distinguish an interior reversal from an endpoint stop",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/courses/phs-231/lessons/m01-l02");
  await page.getByRole("link",{name:"Next: Position, velocity, acceleration, and graphs",exact:true}).click();
  await expect(page.getByRole("link",{name:"Rates of change and linear calibration",exact:true})).toHaveAttribute("href","/courses/mth-215/lessons/m02-l04");
  const guided=page.locator("#guided");
  for(const [label,value] of [["Displacement (m)","3"],["Distance (m)","3"],["Final position (m)","1"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByLabel("Speed shrinks because acceleration is negative",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Their matching signs make the magnitude of velocity grow");
  await guided.getByLabel("Distance (m)",{exact:true}).fill("5");
  await guided.getByLabel("Speed grows because velocity and acceleration are both negative",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check motion predictions",exact:true});
  const predict=async(values:string[],reverses:string)=>{
    for(const [i,label] of ["Predicted displacement (m)","Predicted distance (m)","Predicted final velocity (m/s)"].entries())await lab.getByLabel(label,{exact:true}).fill(values[i]);
    await lab.getByLabel("Direction reverses strictly inside the interval",{exact:true}).selectOption(reverses);
    await check.focus();await check.press("Enter");
  };
  await predict(["5","13","-4"],"yes");
  await expect(lab.getByRole("status")).toContainText("All endpoint and reversal predictions agree");
  await expect(lab.getByRole("row",{name:"3 16 0 -2",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"3 to 5 -4 4",exact:true})).toBeVisible();
  await expect(lab.getByRole("img")).toHaveCount(3);
  for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const) {
    await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await lab.screenshot({path:testInfo.outputPath(`motion-${name}.png`)});
    await lab.getByRole("img").first().scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`motion-${name}-viewport.png`)});
  }
  await lab.getByLabel("Initial position (m)",{exact:true}).fill("100");await check.click();
  await expect(lab.getByRole("status")).toContainText("All endpoint and reversal predictions agree");
  await expect(lab.getByRole("row",{name:"3 109 0 -2",exact:true})).toBeVisible();
  await lab.getByLabel("Duration (s)",{exact:true}).fill("3");await predict(["9","9","0"],"no");
  await expect(lab.getByRole("status")).toContainText("All endpoint and reversal predictions agree");
  await expect(lab).toContainText("A stop at an endpoint does not establish a reversal");
  await lab.getByLabel("Initial velocity (m/s)",{exact:true}).fill("-2");await lab.getByLabel("Acceleration (m/s²)",{exact:true}).fill("0");
  await predict(["-6","6","-2"],"no");
  await expect(lab.getByRole("status")).toContainText("All endpoint and reversal predictions agree");
  await lab.getByLabel("Duration (s)",{exact:true}).fill("0");await check.click();
  await expect(lab.getByRole("status")).toContainText("duration from 0.1 to 20 s");
  await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByLabel("Duration (s)",{exact:true}).fill("");await check.click();
  await expect(lab.getByRole("status")).toContainText("empty input is not zero");
  await lab.getByRole("button",{name:"Reset motion",exact:true}).click();
  await lab.getByLabel("Initial velocity (m/s)",{exact:true}).press("ArrowUp");
  await expect(lab.getByLabel("Initial velocity (m/s)",{exact:true})).toHaveValue("6.1");
  expect(errors).toEqual([]);
});

test("a motion checkpoint grades independent calculus answers and survives export and restoration",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m02-l01.json",import.meta.url),"utf8"));
  const attempt=createAttempt(lessonSchema.parse(data),"checkpoint","motion-browser-fixture");
  const backup={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  await restoreProgress(page,backup);
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  const practice=page.locator("#practice");
  for(const [index,q] of attempt.questions.entries()) {
    const p=q.parameters;let answers:Record<string,string>;
    if(index===0) {
      const x=(t:number)=>p.x0+p.u*t+p.b*t*t+p.c*t*t*t;
      answers={velocity:String((x(p.T+1)-x(p.T-1))/2-p.c),acceleration:String(x(p.T+1)-2*x(p.T)+x(p.T-1))};
    } else if(index===1) {
      const v=(t:number)=>p.u+(p.a0+(p.a0+p.j*t))*t/2;
      answers={velocity:String(v(p.T)),position:String(p.x0+p.T*(v(0)+4*v(p.T/2)+v(p.T))/6)};
    } else if(index===2) {
      const vf=p.initial+p.a*p.end,turn=p.end*Math.abs(p.initial)/(Math.abs(p.initial)+Math.abs(vf));
      const a=p.initial*turn/2,b=vf*(p.end-turn)/2;
      answers={turn:String(turn),displacement:String(a+b),distance:String(Math.abs(a)+Math.abs(b))};
    } else {const rate=Math.round((Math.abs(p.v+p.a*.0001)-Math.abs(p.v))/.0001);answers={trend:rate>0?"increasing":"decreasing",rate:String(rate)};}
    for(const field of q.fields) {
      if(field.kind==="choice")await practice.locator(`input[value="${answers[field.id]}"]`).check();
      else await practice.getByLabel(`${field.label}${field.unit?` (${field.unit})`:""}`,{exact:true}).fill(answers[field.id]);
    }
    if(index===1) {await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByLabel("Final position (m)",{exact:true})).toHaveValue(answers.position);}
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const path=testInfo.outputPath("motion-backup.json");await(await downloading).saveAs(path);
  const exported=JSON.parse(await readFile(path,"utf8"));expect(exported.learning.attempts[0].questions).toEqual(attempt.questions);
  expect(exported.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m02-l01",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await page.getByLabel("Import a progress backup",{exact:true}).setInputFiles(path);await page.getByRole("button",{name:"Replace with this backup",exact:true}).click();
  await expect(page.getByText(/^Backup restored\./)).toBeVisible();
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
