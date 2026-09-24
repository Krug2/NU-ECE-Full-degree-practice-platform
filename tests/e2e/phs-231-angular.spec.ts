import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m07-l02";
const predictionLabels=["Predicted final angular velocity (rad/s)","Predicted final angular momentum (kg m²/s)","Predicted motor work (J)","Predicted radial actuator work (J)"];
const predict=async(lab:Locator,answers:string[])=>{
  for(const [i,label] of predictionLabels.entries())await lab.getByLabel(label,{exact:true}).fill(answers[i]);
  const check=lab.getByRole("button",{name:"Check angular accounts",exact:true});await check.focus();await check.press("Enter");
};
const rowValue=(region:Locator,name:string)=>region.getByRole("row").filter({has:region.page().getByRole("rowheader",{name,exact:true})}).getByRole("cell").first();

test("angular instruction distinguishes work sources and includes radial energy in accessible keyboard snapshots",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.goto(route);
  const guided=page.locator("#guided");
  const labels=["Trial A final angular velocity (rad/s)","Trial A radial actuator work (J)","Trial B motor work (J)","Trial B radial actuator work (J)"];
  for(const [i,label] of labels.entries())await guided.getByLabel(label,{exact:true}).fill(["2","0","0","0"][i]);
  await guided.getByLabel("Trial A keeps kinetic energy constant because angular momentum is conserved",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("At fixed nonzero L");
  for(const [i,label] of labels.entries())await guided.getByLabel(label,{exact:true}).fill(["4","6","-6","3"][i]);
  await guided.getByLabel("Include both work sources and radial kinetic energy during the move",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate");await predict(lab,["2","3","0","0"]);await expect(lab.getByRole("status")).toContainText("Revisit final angular velocity, final angular momentum");
  await predict(lab,["4","6","0","6"]);await expect(lab.getByRole("status")).toContainText("All four predictions agree");
  const comparison=lab.getByRole("region",{name:"Angular endpoint comparison",exact:true});
  await expect(comparison.getByRole("row",{name:"Conserved L 1.5 4 6 12 0 6 0",exact:true})).toBeVisible();
  await expect(comparison.getByRole("row",{name:"Fixed ω 1.5 2 3 3 -6 3 -3",exact:true})).toBeVisible();
  const slider=lab.getByLabel("Snapshot sample (0 to 80)",{exact:true}),motion=lab.getByRole("region",{name:"Selected angular state",exact:true}),energy=lab.getByRole("region",{name:"Selected angular work ledger",exact:true});
  await slider.focus();await slider.press("Home");await expect(slider).toHaveValue("0");await expect(rowValue(motion,"Radius")).toHaveText("1");await expect(rowValue(energy,"Total kinetic energy")).toHaveText("6");await slider.press("ArrowRight");await expect(slider).toHaveValue("1");
  for(let i=1;i<40;i++)await slider.press("ArrowRight");
  await expect(rowValue(motion,"Radius")).toHaveText("0.75");await expect(rowValue(motion,"Outward radial velocity")).toHaveText("-0.46875");
  await expect(rowValue(motion,"Angular velocity")).toHaveText(String(Number((48/17).toFixed(6))));
  await expect(rowValue(energy,"Radial kinetic energy")).toHaveText(String(Number((225/1024).toFixed(6))));
  await expect(rowValue(energy,"Outward radial force per mass")).toHaveText(String(Number((-1728/289).toFixed(6))));
  await expect(rowValue(energy,"Combined radial actuator power")).toHaveText(String(Number((1620/289).toFixed(6))));
  await expect(lab).toContainText("body-frame drawing shows mass placement");
  await lab.getByText("Complete angular motion table",{exact:true}).click();await lab.getByText("Complete angular energy and work table",{exact:true}).click();
  for(const name of ["Complete angular motion table","Complete angular energy and work table"])await expect(lab.getByRole("region",{name,exact:true}).getByRole("row")).toHaveCount(82);
  for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const){
    await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await lab.getByRole("img").first().scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`angular-${name}-distribution.png`)});
    await lab.getByRole("img").nth(1).scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`angular-${name}-energy.png`)});
  }
  await comparison.scrollIntoViewIfNeeded();await comparison.focus();await comparison.press("ArrowRight");await expect.poll(()=>comparison.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await page.screenshot({path:testInfo.outputPath("angular-comparison-mobile.png")});
  await page.reload();await expect(lab.getByLabel("Initial radius (m)",{exact:true})).toHaveValue("1");await expect(lab.getByRole("img")).toHaveCount(0);expect(errors).toEqual([]);
});

test("angular trials compare control modes, duration, zero spin, unchanged radii, extreme valid values, and invalid answers",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check angular accounts",exact:true});
  await lab.getByRole("button",{name:"Inward with fixed speed",exact:true}).click();await predict(lab,["2","3","-6","3"]);await expect(lab.getByRole("status")).toContainText("All four predictions agree");
  await expect(lab).toContainText("The motor changes L to hold ω fixed");
  const slider=lab.getByLabel("Snapshot sample (0 to 80)",{exact:true}),energy=lab.getByRole("region",{name:"Selected angular work ledger",exact:true});
  await slider.focus();await slider.press("Home");for(let i=0;i<40;i++)await slider.press("ArrowRight");
  await expect(rowValue(energy,"Motor axial torque")).toHaveText("-2.8125");await expect(rowValue(energy,"Motor power on system")).toHaveText("-5.625");await expect(rowValue(energy,"Combined radial actuator power")).toHaveText("2.8125");
  await lab.getByRole("button",{name:"Outward with conserved L",exact:true}).click();await predict(lab,["1","3","0","-3/2"]);await expect(lab.getByRole("status")).toContainText("All four predictions agree");
  await lab.getByRole("button",{name:"Negative initial spin",exact:true}).click();await predict(lab,["-4","-6","0","6"]);await expect(lab.getByRole("status")).toContainText("All four predictions agree");
  await lab.getByRole("button",{name:"Slower inward move",exact:true}).click();await predict(lab,["4","6","0","6"]);await slider.focus();await slider.press("Home");for(let i=0;i<40;i++)await slider.press("ArrowRight");
  await expect(rowValue(energy,"Radial kinetic energy")).toHaveText(String(Number((225/4096).toFixed(6))));
  await lab.getByRole("button",{name:"No initial spin",exact:true}).click();await predict(lab,["0","0","0","0"]);await expect(lab).toContainText("Radial kinetic energy appears during the move and returns to zero");
  await slider.focus();await slider.press("Home");for(let i=0;i<40;i++)await slider.press("ArrowRight");await expect(rowValue(energy,"Total kinetic energy")).toHaveText(String(Number((225/1024).toFixed(6))));
  await lab.getByRole("button",{name:"Unchanged radii",exact:true}).click();await predict(lab,["2","6","0","0"]);await expect(lab).toContainText("nonzero radial constraint forces can maintain circular motion");await expect(rowValue(energy,"Outward radial force per mass")).toHaveText("-4");
  await lab.getByRole("button",{name:"Inward with conserved L",exact:true}).click();
  for(const [label,value] of [["Base disk inertia (kg m²)","0.1"],["Each sliding mass (kg)","5"],["Initial radius (m)","3"],["Final radius (m)","0.1"],["Initial angular velocity (rad/s)","10"],["Move duration (s)","0.2"]])await lab.getByLabel(label,{exact:true}).fill(value);
  const I0=.1+2*5*9,If=.1+2*5*.01,L=I0*10,w=L/If,work=If*w*w/2-I0*100/2;
  await predict(lab,[w.toPrecision(12),L.toPrecision(12),"0",work.toExponential(10)]);await expect(lab.getByRole("status")).toContainText("All four predictions agree");
  await lab.getByLabel("Base disk inertia (kg m²)",{exact:true}).fill("0");await check.click();await expect(lab.getByRole("status")).toContainText("must be positive");await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByLabel("Base disk inertia (kg m²)",{exact:true}).fill("");await check.click();await expect(lab.getByRole("status")).toContainText("empty input is not zero");
  await lab.getByRole("button",{name:"Inward with conserved L",exact:true}).click();await lab.getByLabel(predictionLabels[0],{exact:true}).fill("sqrt(-1)");await check.click();await expect(lab.getByRole("status")).toContainText("must be real");
  await lab.getByLabel(predictionLabels[0],{exact:true}).fill("1e999");await check.click();await expect(lab.getByRole("status")).toContainText("finite real");
  await lab.getByRole("button",{name:"Reset angular investigation",exact:true}).click();await check.click();await expect(lab.getByRole("status")).toContainText("Predict final angular velocity");
  const radius=lab.getByLabel("Initial radius (m)",{exact:true});await radius.focus();await radius.press("ArrowUp");await expect(radius).toHaveValue("1.1");
  const mode=lab.getByLabel("Angular constraint",{exact:true});await mode.focus();await mode.press("ArrowDown");await expect(mode).toHaveValue("speed");await expect(lab.getByRole("img")).toHaveCount(0);
});

test("angular checkpoint answers, accessibility decisions, and notes survive confirmed save, reload, and backup restore",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m07-l02.json",import.meta.url),"utf8")),attempt=createAttempt(lessonSchema.parse(data),"checkpoint","angular-evidence");
  await restoreProgress(page,{schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();const practice=page.locator("#practice");
  for(const [index,q] of attempt.questions.entries()){
    const p=q.parameters;let answers:Record<string,string>;
    if(index===0){
      const r=[p.x-p.ax,p.y-p.ay,p.z-p.az],v=[p.px,p.py,p.pz],L=[r[1]*v[2]-r[2]*v[1],r[2]*v[0]-r[0]*v[2],r[0]*v[1]-r[1]*v[0]];
      answers={"old-z":String(p.x*p.py-p.y*p.px),x:String(L[0]),y:String(L[1]),z:String(L[2]),rule:"subtract"};
    }else if(index===1){
      const I=p.inertia+p.mass*p.radius*p.radius,L=p.inertia*p.omega+p.mass*p.radius*p.vy;
      answers={omega:`${L}/${I}`,loss:`${p.inertia*p.omega*p.omega+p.mass*(p.vx*p.vx+p.vy*p.vy)}/2-${L*L}/(2*${I})`,jx:String(-p.mass*p.vx),jy:`${p.mass}*(${p.radius*L}/${I}-(${p.vy}))`,balance:"axial"};
    }else if(index===2){
      const twiceWork=2*p.a*p.angle-p.b*p.angle*p.angle,twiceK=p.inertia*p.omega*p.omega+twiceWork;
      answers={work:`${twiceWork}/2`,energy:`${twiceK}/2`,omega:twiceK<0?"none":`sqrt(${twiceK}/${p.inertia})`,meaning:twiceK<0?"blocked":twiceK===0?"turn":"pass"};
    }else{
      const dI=2*p.mass*(p.r1*p.r1-p.r0*p.r0),work=dI*p.omega*p.omega;
      answers={momentum:String(dI*p.omega),motor:String(work),radial:String(-work/2),kinetic:String(work/2),rule:"both"};
    }
    for(const f of q.fields){
      if(f.kind==="choice"){const option=f.options.find(o=>o.id===answers[f.id]);if(!option)throw Error("Missing independent interpretation");await practice.getByLabel(option.label,{exact:true}).check();}
      else await practice.getByLabel(`${f.label}${f.unit?` (${f.unit})`:""}`,{exact:true}).fill(answers[f.id]);
    }
    if(index===0){
      await expect(practice.getByText("Saved in this browser.",{exact:true})).toBeVisible();await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
      for(const f of q.fields)if(f.kind!=="choice")await expect(practice.getByLabel(`${f.label}${f.unit?` (${f.unit})`:""}`,{exact:true})).toHaveValue(answers[f.id]);
      await expect(practice.getByLabel("L about O prime equals L about O minus a cross p",{exact:true})).toBeChecked();
    }
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  const note="Name the origin and mechanical system first. Zero axial torque conserves L; radial actuation can still supply work. Fixed speed requires Idot omega motor torque.";
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true}).fill(note);await page.getByRole("button",{name:"Save lesson notes",exact:true}).click();await expect(page.getByText("Lesson notes saved.",{exact:true})).toBeVisible();
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const path=testInfo.outputPath("angular-backup.json");await(await downloading).saveAs(path);const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m07-l02",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true})).toHaveValue(note);
});

