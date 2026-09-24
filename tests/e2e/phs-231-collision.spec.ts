import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m06-l02";

test("collision investigation retains tangent motion and provides keyboard CM-frame diagrams with equivalent ledgers",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.goto(route);
  const guided=page.locator("#guided");
  for(const [label,value] of [["Final A velocity x (m/s)","-1/2"],["Final A velocity y (m/s)","1"],["Final B velocity x (m/s)","2"],["Final B velocity y (m/s)","-1"],["Kinetic-energy loss (J)","45/4"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByLabel("Multiply both velocity vectors by minus e",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("invent tangential impulse");
  await guided.getByLabel("Only normal components change; tangential components stay fixed",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check collision account",exact:true});
  for(const [index,value] of ["-1/2","1","2","-1","45/4"].entries())await lab.locator(`#phs231-collision-prediction-${index}`).fill(value);
  await lab.getByLabel("Predicted contact state",{exact:true}).selectOption("impact");await check.focus();await check.press("Enter");
  await expect(lab.getByRole("status")).toContainText("All six predictions agree");
  await expect(lab.getByRole("row",{name:"Total momentum (5, -1) (5, -1) kg m/s",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"Total kinetic energy 20 8.75 J",exact:true})).toBeVisible();
  await expect(lab.getByRole("row",{name:"Relative kinetic energy 17.4 6.15 J",exact:true})).toBeVisible();
  const cm=lab.getByLabel("Show velocity diagrams in the CM frame",{exact:true});await cm.focus();await cm.press("Space");await expect(cm).toBeChecked();
  await expect(lab.getByRole("img").first()).toHaveAccessibleName(/Before the modeled event, velocity vectors in the CM frame/);
  await expect(lab.getByRole("row",{name:"A (4, 1) (-0.5, 1) (3, 1.2) (-1.5, 1.2)",exact:true})).toBeVisible();
  for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const){
    await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await lab.screenshot({path:testInfo.outputPath(`collision-${name}.png`)});await lab.getByRole("img").first().scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`collision-${name}-viewport.png`)});
  }
  const table=lab.getByRole("region",{name:"Collision velocity table; scroll horizontally if needed",exact:true});await table.focus();await table.press("ArrowRight");await expect(table).toBeFocused();
  await lab.getByRole("button",{name:"Reset collision model",exact:true}).click();await lab.getByLabel("Mass A (kg)",{exact:true}).press("ArrowUp");await expect(lab.getByLabel("Mass A (kg)",{exact:true})).toHaveValue("2.1");
  await page.reload();await expect(lab.getByLabel("Mass A (kg)",{exact:true})).toHaveValue("2");await expect(cm).toHaveCount(0);expect(errors).toEqual([]);
});

test("collision models distinguish smooth zero restitution, full sticking, rotated contact, and non-approach",async({page},testInfo)=>{
  await page.goto(route);const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check collision account",exact:true});
  const predict=async(values:string[],event="impact")=>{for(const [index,value] of values.entries())await lab.locator(`#phs231-collision-prediction-${index}`).fill(value);await lab.getByLabel("Predicted contact state",{exact:true}).selectOption(event);await check.click();};
  await lab.getByRole("button",{name:"Zero restitution",exact:true}).click();await predict(["1","1","1","-1","15"]);await expect(lab.getByRole("status")).toContainText("All six predictions agree");
  await expect(lab).toContainText("only the relative normal velocity is removed");await expect(lab.getByRole("row",{name:"Total kinetic energy 20 5 J",exact:true})).toBeVisible();
  await lab.getByText("Compare restitution and full sticking",{exact:true}).click();await expect(lab.getByRole("row",{name:"Full sticking (1, -0.2) (1, -0.2) 2.6 17.4",exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});await lab.screenshot({path:testInfo.outputPath("collision-comparison-mobile.png")});
  await lab.getByRole("button",{name:"Full sticking",exact:true}).click();await predict(["1","-1/5","1","-1/5","87/5"]);await expect(lab.getByRole("status")).toContainText("All six predictions agree");
  await expect(lab.getByLabel("Normal restitution e (smooth model only)",{exact:true})).toBeDisabled();await expect(lab.getByRole("row",{name:"Relative kinetic energy 17.4 0 J",exact:true})).toBeVisible();
  await lab.getByRole("button",{name:"Elastic impact",exact:true}).click();await predict(["-2","1","3","-1","0"]);await expect(lab.getByRole("status")).toContainText("All six predictions agree");await expect(lab.getByRole("row",{name:"Total kinetic energy 20 20 J",exact:true})).toBeVisible();
  await lab.getByRole("button",{name:"Rotated contact",exact:true}).click();await predict(["379/250","-289/125","82/125","151/125","4761/500"]);await expect(lab.getByRole("status")).toContainText("All six predictions agree");
  await expect(lab).toContainText("Signed normal approach speed: 4.6 m/s");await expect(lab.getByRole("row",{name:"Total kinetic energy 20 10.478 J",exact:true})).toBeVisible();
  await lab.getByRole("button",{name:"Separating contact",exact:true}).click();await predict(["-1","1","4","-1","0"],"no-impact");await expect(lab.getByRole("status")).toContainText("All six predictions agree");await expect(lab).toContainText("No impulsive update");
  await lab.getByRole("button",{name:"Default impact",exact:true}).click();await lab.getByLabel("Initial A velocity x (m/s)",{exact:true}).fill("-1");await predict(["-1","1","-1","-1","0"],"no-impact");await expect(lab.getByRole("status")).toContainText("All six predictions agree");await expect(lab).toContainText("Signed normal approach speed: 0 m/s");
  await lab.getByLabel("Normal restitution e (smooth model only)",{exact:true}).fill("1.1");await check.click();await expect(lab.getByRole("status")).toContainText("passive restitution from 0 to 1");await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByRole("button",{name:"Default impact",exact:true}).click();await predict(["sqrt(-1)","1","2","-1","45/4"]);await expect(lab.getByRole("status")).toContainText("must be real numbers");
  await lab.getByLabel("Mass B (kg)",{exact:true}).fill("0");await check.click();await expect(lab.getByRole("status")).toContainText("positive masses");await lab.getByLabel("Mass B (kg)",{exact:true}).fill("");await check.click();await expect(lab.getByRole("status")).toContainText("empty input is not zero");
});

test("collision checkpoint resumes complete vectors and restores fragmentation, staged motion, and physical audit evidence",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m06-l02.json",import.meta.url),"utf8")),attempt=createAttempt(lessonSchema.parse(data),"checkpoint","collision-physical-audit");
  await restoreProgress(page,{schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();const practice=page.locator("#practice");
  for(const [index,q] of attempt.questions.entries()){
    const p=q.parameters,M=p.mA+p.mB;let answers:Record<string,string>;
    if(index===0){
      const D=20*M,g=p.an-p.bn,j=(4+p.e)*p.mA*p.mB*g;
      const a=[4*M*(p.an*p.nx-p.at*p.ny)-j/p.mA*p.nx,4*M*(p.an*p.ny+p.at*p.nx)-j/p.mA*p.ny],b=[4*M*(p.bn*p.nx-p.bt*p.ny)+j/p.mB*p.nx,4*M*(p.bn*p.ny+p.bt*p.nx)+j/p.mB*p.ny];
      const twiceInitial=p.mA*(p.an*p.an+p.at*p.at)+p.mB*(p.bn*p.bn+p.bt*p.bt),loss=twiceInitial*D*D-p.mA*(a[0]*a[0]+a[1]*a[1])-p.mB*(b[0]*b[0]+b[1]*b[1]);
      answers={ax:`${a[0]}/${D}`,ay:`${a[1]}/${D}`,bx:`${b[0]}/${D}`,by:`${b[1]}/${D}`,loss:`${loss}/${2*D*D}`,tangent:"unchanged"};
    }else if(index===1){
      const total=M+p.mC,U=[p.ux,p.uy,p.uz],a=[p.ux+p.ax,p.uy+p.ay,p.uz+p.az],b=[p.ux+p.bx,p.uy+p.by,p.uz+p.bz];
      const third=U.map((u,i)=>total*u-p.mA*a[i]-p.mB*b[i]),squared=(v:number[])=>v.reduce((s,x)=>s+x*x,0);
      const fixed=p.mA*squared(a)+p.mB*squared(b)-total*squared(U);
      answers={x:`${third[0]}/${p.mC}`,y:`${third[1]}/${p.mC}`,z:`${third[2]}/${p.mC}`,gain:`${fixed*p.mC+squared(third)}/${2*p.mC}`,source:"internal"};
    }else if(index===2){
      const mass=p.payload+p.bob,u=`${mass}/${p.payload}*sqrt(${p.speed*p.speed})`;
      answers={after:`sqrt(20*${p.speed*p.speed}/20)`,incoming:u,loss:`${mass*mass*p.speed*p.speed}/${2*p.payload}-${mass*p.speed*p.speed}/2`,stages:"separate"};
    }else{
      const dp=p.mA*p.A+p.mB*p.B-p.den*(p.mA*p.a+p.mB*p.b),dk=p.mA*p.A*p.A+p.mB*p.B*p.B-p.den*p.den*(p.mA*p.a*p.a+p.mB*p.b*p.b);
      answers={momentum:`${dp}/${p.den}`,kinetic:`${dk}/${2*p.den*p.den}`,audit:dp!==0?"momentum":p.B<p.A?"approach":dk>0?"release":dk<0?"inelastic":"elastic"};
    }
    for(const field of q.fields){
      if(field.kind==="choice"){const option=field.options.find(o=>o.id===answers[field.id]);if(!option)throw Error("Missing independent choice");await practice.getByLabel(option.label,{exact:true}).check();}
      else await practice.getByLabel(`${field.label}${field.unit?` (${field.unit})`:""}`,{exact:true}).fill(answers[field.id]);
    }
    if(index===0){await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByLabel("Final A velocity x (m/s)",{exact:true})).toHaveValue(answers.ax);}
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  const note="Smooth e=0 removes normal relative motion, while full sticking needs a tangential interaction. Audit momentum, kinetic energy, and outgoing contact direction separately.";
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true}).fill(note);await page.getByRole("button",{name:"Save lesson notes",exact:true}).click();await expect(page.getByText("Lesson notes saved.",{exact:true})).toBeVisible();
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const path=testInfo.outputPath("collision-backup.json");await(await downloading).saveAs(path);const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m06-l02",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();await restoreProgress(page,backup);
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true})).toHaveValue(note);
});
