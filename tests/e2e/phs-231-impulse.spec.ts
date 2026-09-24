import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m06-l01";

test("impulse investigation distinguishes contact from net force and exposes accessible signed vector histories",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.goto(route);
  const guided=page.locator("#guided");
  for(const [label,value] of [["Net vertical impulse (N s)","3"],["Gravity impulse (N s)","-1/2"],["Floor-contact impulse (N s)","7/2"],["Mean floor-contact force (N)","35"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByLabel("The mean floor force is 30 N because net impulse is 3 N s",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("30 N is mean net force");
  await guided.getByLabel("The mean is 35 N; peak force needs a contact history",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check impulse account",exact:true});
  for(const [index,value] of ["4","0","0","2*sqrt(14)"].entries())await lab.locator(`#phs231-impulse-prediction-${index}`).fill(value);
  await check.focus();await check.press("Enter");await expect(lab.getByRole("status")).toContainText("All four predictions agree");
  await expect(lab).toContainText("Final total momentum: (8, 0, 0) kg m/s");await expect(lab).toContainText("CM displacement over the pulse: (5, 2, -1) m");
  await expect(lab.getByRole("row",{name:"Symmetric triangle 7.483315 (5, 2, -1)",exact:true})).toBeVisible();
  await lab.getByText("Inspect force, momentum, and CM motion over time",{exact:true}).click();
  await expect(lab.getByRole("row",{name:"2 (0, 0, 0) (6, -4, 2) (8, 0, 0) (4, 0, 0) (5, 2, -1)",exact:true})).toBeVisible();
  const table=lab.getByRole("region",{name:"Impulse time table; scroll horizontally if needed",exact:true});await table.focus();await table.press("ArrowRight");await expect(table).toBeFocused();
  await lab.getByText("Inspect force, momentum, and CM motion over time",{exact:true}).click();
  await lab.getByLabel("Graph component",{exact:true}).focus();await lab.getByLabel("Graph component",{exact:true}).press("ArrowDown");await expect(lab.getByLabel("Graph component",{exact:true})).toHaveValue("1");
  await expect(lab.getByRole("img").first()).toHaveAccessibleName(/External force \(N\), y-component/);
  for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const){
    await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await lab.screenshot({path:testInfo.outputPath(`impulse-${name}.png`)});
    await lab.getByRole("img").first().scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`impulse-${name}-viewport.png`)});
  }
  await lab.getByRole("button",{name:"Reset impulse model",exact:true}).click();await lab.getByLabel("Pulse duration T (s)",{exact:true}).press("ArrowUp");await expect(lab.getByLabel("Pulse duration T (s)",{exact:true})).toHaveValue("2.01");
  await page.reload();await expect(lab.getByLabel("Pulse duration T (s)",{exact:true})).toHaveValue("2");expect(errors).toEqual([]);
});

test("pulse timing changes displacement while fixed impulse preserves final momentum and zero pulse stays qualified",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check impulse account",exact:true});
  const predict=async(values:string[])=>{for(const [index,value] of values.entries())await lab.locator(`#phs231-impulse-prediction-${index}`).fill(value);await check.click();};
  await lab.getByRole("button",{name:"Earlier impulse",exact:true}).click();await predict(["4","0","0","2*sqrt(14)"]);
  await expect(lab.getByRole("status")).toContainText("All four predictions agree");await expect(lab).toContainText("CM displacement over the pulse: (6, 1.333333, -0.666667) m");
  await lab.getByLabel("Normalized force shape",{exact:true}).selectOption("constant");await predict(["4","0","0","sqrt(14)"]);
  await expect(lab.getByRole("status")).toContainText("All four predictions agree");await expect(lab).toContainText("CM displacement over the pulse: (5, 2, -1) m");
  await lab.getByText("Inspect force, momentum, and CM motion over time",{exact:true}).click();
  await expect(lab.getByRole("row",{name:"2 (3, -2, 1) (6, -4, 2) (8, 0, 0) (4, 0, 0) (5, 2, -1)",exact:true})).toBeVisible();
  await expect(lab).toContainText("force immediately afterward is zero");
  await lab.getByLabel("Normalized force shape",{exact:true}).selectOption("parabola");await predict(["4","0","0","3*sqrt(14)/2"]);await expect(lab.getByRole("status")).toContainText("All four predictions agree");
  await lab.getByRole("button",{name:"Longer pulse",exact:true}).click();await predict(["4","0","0","sqrt(14)"]);await expect(lab.getByRole("status")).toContainText("All four predictions agree");
  await expect(lab).toContainText("CM displacement over the pulse: (10, 4, -2) m");
  await lab.getByRole("button",{name:"Zero pulse",exact:true}).click();await predict(["1","2","-1","0"]);
  await expect(lab.getByRole("status")).toContainText("All four predictions agree");await expect(lab).toContainText("nonzero forces with opposing time areas can also have zero net impulse");
  await expect(lab).toContainText("CM displacement over the pulse: (2, 4, -2) m");
  await lab.getByLabel("Total mass M (kg)",{exact:true}).fill("0");await check.click();await expect(lab.getByRole("status")).toContainText("Use mass 0.1–20 kg");await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByRole("button",{name:"Default pulse",exact:true}).click();await predict(["4","0","0","sqrt(-1)"]);await expect(lab.getByRole("status")).toContainText("must be real numbers");
  await lab.getByLabel("Net external impulse x (N s)",{exact:true}).fill("");await check.click();await expect(lab.getByRole("status")).toContainText("empty input is not zero");
});

test("momentum checkpoints retain signed areas, contact forces, density integrals, and relative energy through reload and backup",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m06-l01.json",import.meta.url),"utf8"));
  const attempt=createAttempt(lessonSchema.parse(data),"checkpoint","impulse-system-boundary");
  await restoreProgress(page,{schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();const practice=page.locator("#practice");
  for(const [index,q] of attempt.questions.entries()){
    const p=q.parameters;let answers:Record<string,string>;
    if(index===0){
      const J=(p.positive*p.a)/2+p.positive*p.b+(p.positive*p.c-p.qNumerator)/2,T=p.a+p.b+p.c;
      answers={impulse:String(J),mean:`${J}/${T}`,velocity:`${p.velocity}+${J}/${p.mass}`};
    }else if(index===1){
      const net=p.mass*(p.outgoing+p.incoming),gravity=-p.mass*p.tenths;
      answers={net:String(net),gravity:String(gravity),contact:String(net-gravity),mean:`${net-gravity}/(${p.tenths}/10)`,peak:"unknown"};
    }else if(index===2){
      const L=p.length,density=(x:number)=>p.density*(1+p.alpha*x/L);
      const mass6=L*(density(0)+4*density(L/2)+density(L)),moment6=L*(4*(L/2)*density(L/2)+L*density(L));
      answers={mass:`${mass6}/6`,moment:`${moment6}/6`,center:`${moment6}/${mass6}`,side:p.alpha===0?"middle":p.alpha>0?"right":"left"};
    }else{
      const M=p.mA+p.mB,P=p.mA*p.a+p.mB*p.b,V=`${P}/${M}`;
      answers={momentum:String(P),velocity:V,total:`${p.mA}/2*(${p.a})^2+${p.mB}/2*(${p.b})^2`,cm:`${M}/2*(${V})^2`,relative:`${p.mA}/2*(${p.a}-(${V}))^2+${p.mB}/2*(${p.b}-(${V}))^2`,boost:"relative"};
    }
    for(const field of q.fields){
      if(field.kind==="choice"){const option=field.options.find(o=>o.id===answers[field.id]);if(!option)throw Error("Missing independent choice");await practice.getByLabel(option.label,{exact:true}).check();}
      else await practice.getByLabel(`${field.label}${field.unit?` (${field.unit})`:""}`,{exact:true}).fill(answers[field.id]);
    }
    if(index===0){await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByLabel("Total signed impulse (N s)",{exact:true})).toHaveValue(answers.impulse);}
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  const note="Impulse fixes the endpoint momentum change. Contact impulse includes the weight correction; a shared boost leaves relative kinetic energy unchanged.";
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true}).fill(note);await page.getByRole("button",{name:"Save lesson notes",exact:true}).click();await expect(page.getByText("Lesson notes saved.",{exact:true})).toBeVisible();
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const path=testInfo.outputPath("impulse-backup.json");await(await downloading).saveAs(path);const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m06-l01",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true})).toHaveValue(note);
});
