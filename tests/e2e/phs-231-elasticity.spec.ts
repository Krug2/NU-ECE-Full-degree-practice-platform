import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m08-l02";
const predict=async(lab:Locator,answers:string[],decision="admitted")=>{
  await lab.getByLabel("Predicted peak range decision",{exact:true}).selectOption(decision);
  for(const [i,answer] of answers.entries())await lab.locator(`#phs231-elastic-prediction-${i}`).fill(answer);
  const check=lab.getByRole("button",{name:"Check elastic account",exact:true});await check.focus();await check.press("Enter");
};
const value=(region:Locator,name:string)=>region.getByRole("row").filter({has:region.page().getByRole("rowheader",{name,exact:true})}).getByRole("cell").first();
const selected=(lab:Locator)=>lab.getByRole("region",{name:"Selected elastic account",exact:true});
const preset=async(lab:Locator,name:string)=>{
  const details=lab.locator("details").filter({has:lab.page().getByText("Load prepared elastic comparisons",{exact:true})});
  if(!await details.evaluate(el=>(el as HTMLDetailsElement).open))await details.locator("summary").click();
  await lab.getByRole("button",{name,exact:true}).click();
};

for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const)test(`elasticity ${name} diagrams, tables, and keyboard controls are accessible`,async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});await page.goto(route);const lab=page.locator("#investigate");
  await predict(lab,["50","1/2000","1","1/10"]);await expect(lab.getByRole("status")).toContainText("All five predictions agree");
  await lab.getByText("Complete loading and unloading table",{exact:true}).click();
  const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const [i,figure]of ["shape","load","response"].entries()){await lab.getByRole("img").nth(i).scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`elasticity-${name}-${figure}.png`)});}
  const table=lab.getByRole("region",{name:"Complete elastic path table",exact:true});await expect(table.getByRole("row")).toHaveCount(82);
  if(name==="mobile"){await table.scrollIntoViewIfNeeded();await table.focus();await table.press("ArrowRight");await expect.poll(()=>table.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await table.press("ArrowDown");await expect.poll(()=>table.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);await expect(table.getByRole("columnheader",{name:"Stress (MPa)",exact:true})).toBeVisible();await page.screenshot({path:testInfo.outputPath("elasticity-mobile-table.png")});}
  const stage=lab.getByLabel("Loading-stage sample",{exact:true});await stage.focus();await stage.press("Home");await expect(value(selected(lab),"Stored energy")).toHaveText("0");await stage.press("ArrowRight");await expect(value(selected(lab),"Signed axial force")).toHaveText("5");await expect(value(selected(lab),"Engineering axial strain")).toHaveText("0.0000125");await stage.press("End");await expect(value(selected(lab),"Signed extension")).toHaveText("0");expect(errors).toEqual([]);
});

test("elasticity guided feedback rejects extrapolation and checks the supplied stress bound",async({page})=>{
  await page.goto(route);const guided=page.locator("#guided"),names=["Demanded tensile stress (MPa)","Effective admitted stress cap (MPa)","Largest admitted tensile force (N)","Extension at the admitted force limit (mm)"];
  for(const [i,label]of names.entries())await guided.getByLabel(label,{exact:true}).fill(["150","100","200","1"][i]);
  await guided.getByLabel("Extension is 1.5 mm because the extrapolated strain is below 0.002",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Both conditions must hold");
  await guided.getByLabel("Extension is established because 150 MPa is far below the 100 GPa modulus",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("not a strength or proportional-limit rating");
  await guided.getByLabel("Actual extension is not established because the stress cap is exceeded",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate");await predict(lab,["100","1/1000","2","1/5"]);await expect(lab.getByRole("status")).toContainText("Revisit peak stress, peak strain, peak deformation, peak energy");
  await predict(lab,["100/2","1/2000","2/2","1/10"]);await expect(lab.getByRole("status")).toContainText("All five predictions agree");
  const account=selected(lab);await expect(value(account,"Stored energy density")).toHaveText("12500");await expect(value(account,"Net incremental work from stage 0")).toHaveText("0.1");expect(Math.abs(Number(await value(account,"Energy minus work residual").innerText()))).toBeLessThan(1e-12);
});

test("elasticity distinguishes fixed force, fixed extension, length, compression, and zero load",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate");
  for(const [name,answers]of [
    ["Double area at fixed force",["25","1/4000",".5",".05"]],
    ["Double area at fixed extension",["50","1/2000","1",".2"]],
    ["Double gauge length",["50","1/2000","2",".2"]],
    ["Signed compression",["-50","-1/2000","-1",".1"]],
    ["Zero axial load",["0","0","0","0"]],
  ] as const){
    await preset(lab,name);await predict(lab,[...answers]);await expect(lab.getByRole("status")).toContainText("All five predictions agree");
    await expect(value(selected(lab),"Signed extension")).toHaveText(String(Number(answers[2])));
    await expect(value(selected(lab),"Stored energy")).toHaveText(String(Number(answers[3])));
  }
  await expect(lab.getByRole("img").last()).toHaveAccessibleName(/Zero-load trial/);await expect(lab.getByText("Only the origin is sampled",{exact:true})).toBeVisible();
});

test("elasticity shear and bulk modes preserve units, signs, work, and unknown overloads",async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.goto(route);const lab=page.locator("#investigate");
  await lab.getByLabel("Deformation mode",{exact:true}).selectOption("shear");await predict(lab,["2",".0025","50",".003"]);await expect(lab.getByRole("status")).toContainText("All five predictions agree");
  await expect(value(selected(lab),"Signed face shift")).toHaveText("50");await expect(value(selected(lab),"Stored energy density")).toHaveText("2500");
  await lab.getByRole("img").first().scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath("elasticity-mobile-shear.png")});
  await lab.getByLabel("Peak signed tangential force (N)",{exact:true}).fill("-120");await predict(lab,["-2","-.0025","-50",".003"]);await expect(lab.getByRole("status")).toContainText("All five predictions agree");
  await preset(lab,"Bulk example");await predict(lab,["4","-.002","-1","2"]);await expect(lab.getByRole("status")).toContainText("All five predictions agree");
  await expect(value(selected(lab),"Volume change")).toHaveText("-1");await expect(value(selected(lab),"Stored energy")).toHaveText("2");await expect(value(selected(lab),"Net incremental work from stage 0")).toHaveText("2");
  await lab.getByRole("img").first().scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath("elasticity-mobile-bulk.png")});await lab.getByRole("img").last().scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath("elasticity-mobile-bulk-response.png")});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const slider=lab.getByLabel("Loading-stage sample",{exact:true});await slider.focus();await slider.press("End");await expect(value(selected(lab),"Volume change")).toHaveText("0");
  await preset(lab,"Beyond bulk limit");await predict(lab,["12"],"outside");await expect(lab.getByRole("status")).toContainText("Both predictions agree");
  await lab.getByRole("button",{name:"Inspect loading limit",exact:true}).click();await expect(value(selected(lab),"Hydrostatic pressure increase")).toHaveText("10");await expect(value(selected(lab),"Volume change")).toHaveText("-2.5");await expect(value(selected(lab),"Stored energy")).toHaveText("12.5");
  await slider.focus();await slider.press("End");await expect(value(selected(lab),"Pressure increase")).toHaveText("0");await expect(value(selected(lab),"Volume change")).toHaveText("Not established");
});

test("elasticity retains loading history after crossing either supplied limit",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate");
  await preset(lab,"Exact stress limit");await predict(lab,["100",".001","2",".4"]);await expect(lab.getByRole("status")).toContainText("All five predictions agree");await expect(lab.getByText("Admitted at a supplied limit.",{exact:true})).toBeVisible();
  const slider=lab.getByLabel("Loading-stage sample",{exact:true});await slider.focus();await slider.press("End");await expect(value(selected(lab),"Signed extension")).toHaveText("0");
  await preset(lab,"Beyond stress limit");await predict(lab,["125",".00125","2.5",".625"]);await expect(lab.getByRole("status")).toContainText("Revisit peak strain, peak deformation, peak energy, range decision");await expect(value(selected(lab),"Signed extension")).toHaveText("Not established");await expect(lab.getByRole("img")).toHaveCount(2);
  await predict(lab,["125"],"outside");await expect(lab.getByRole("status")).toContainText("Both predictions agree");
  await lab.getByRole("button",{name:"Inspect loading limit",exact:true}).click();await expect(value(selected(lab),"Signed axial force")).toHaveText("400");await expect(value(selected(lab),"Signed extension")).toHaveText("2");await expect(value(selected(lab),"Stored energy")).toHaveText("0.4");await expect(lab.getByRole("img")).toHaveCount(3);
  await lab.getByRole("button",{name:"Inspect return to load range",exact:true}).click();await expect(value(selected(lab),"Signed axial force")).toHaveText("400");await expect(value(selected(lab),"Signed extension")).toHaveText("Not established");
  await slider.focus();await slider.press("End");await expect(value(selected(lab),"Signed axial force")).toHaveText("0");await expect(value(selected(lab),"Stored energy")).toHaveText("Not established");
  await preset(lab,"Strain limit first");await predict(lab,["50"],"outside");await expect(lab.getByRole("status")).toContainText("Both predictions agree");await lab.getByRole("button",{name:"Inspect loading limit",exact:true}).click();await expect(value(selected(lab),"Signed axial force")).toHaveText("160");await expect(value(selected(lab),"Signed extension")).toHaveText("0.8");await expect(value(selected(lab),"Stored energy")).toHaveText("0.064");
});

test("elasticity rejects incomplete, invalid, nonfinite, and complex predictions without stale results",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check elastic account",exact:true});
  await check.click();await expect(lab.getByRole("status")).toContainText("Predict the peak stress and range decision");
  await predict(lab,["50","1/2000","1",".1"]);await lab.getByLabel("Original cross-sectional area (mm²)",{exact:true}).fill("");await check.click();await expect(lab.getByRole("status")).toContainText("empty input is not zero");await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByLabel("Original cross-sectional area (mm²)",{exact:true}).fill("0");await check.click();await expect(lab.getByRole("status")).toContainText("finite model inputs");
  await lab.getByLabel("Original cross-sectional area (mm²)",{exact:true}).fill("4");
  await predict(lab,["sqrt(-1)","1/2000","1",".1"]);await expect(lab.getByRole("status")).toContainText("must be real");
  await predict(lab,["1e999","1/2000","1",".1"]);await expect(lab.getByRole("status")).toContainText("finite real");await expect(lab.getByRole("img")).toHaveCount(0);
  await predict(lab,["50"],"outside");await expect(lab.getByRole("status")).toContainText("Revisit range decision");
  await lab.getByRole("button",{name:"Reset elasticity investigation",exact:true}).click();await expect(lab.getByLabel("Predicted peak range decision",{exact:true})).toHaveValue("");await expect(lab.locator("#phs231-elastic-prediction-0")).toHaveValue("");
  const length=lab.getByLabel("Original gauge length (m)",{exact:true});await length.focus();await length.press("ArrowUp");await expect(length).toHaveValue("2.01");
  await lab.getByLabel("Deformation mode",{exact:true}).selectOption("bulk");await lab.getByLabel("Peak pressure increase (MPa)",{exact:true}).fill("-1");await check.click();await expect(lab.getByRole("status")).toContainText("bulk pressure increase cannot be negative");
});

test("elasticity checkpoint resumes independently derived answers and restores real evidence and notes backups",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m08-l02.json",import.meta.url),"utf8")),attempt=createAttempt(lessonSchema.parse(data),"checkpoint","elasticity-evidence");
  await restoreProgress(page,{schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();const practice=page.locator("#practice");
  for(const [index,q]of attempt.questions.entries()){
    const p=q.parameters;let answers:Record<string,string>;
    if(index===0){
      const extension=`(${p.F}/${p.A})/(1000*${p.E})*(${p.L2}/2)*1000`;
      answers={stress:`${p.F}/${p.A}`,strain:`${p.F}/(${p.A}*1000*${p.E})`,extension,stiffness:`(${p.E}*${p.A})/(${p.L2}/2)`,energy:`(${p.F})*(${extension})/2000`};
    }else if(index===1){
      const strain=`(${p.F}/${p.A})/(${p.G10}*100)`,shift=`(${strain})*${p.h}*1000`;
      answers={stress:`${p.F}/${p.A}`,strain,shift,energy:`(${p.F})*(${shift})/2000000`};
    }else if(index===2){
      const strain=`-${p.p}/(1000*${p.K})`,volume=`(${strain})*${p.V}`;
      answers={strain,volume,final:`${p.V}+(${volume})`,compressibility:`1/(${p.K}*1000000000)`,energy:`-${p.p}*(${volume})/2`};
    }else{
      const limit=Math.min(p.stressLimit,p.E*p.strainNum);
      answers={stress:`${p.F}/${p.A}`,force:String(p.A*limit),extension:`${limit}/(1000*${p.E})*${p.L}*1000`,model:Math.abs(p.F/p.A)<=limit?"admitted":"unknown"};
    }
    for(const f of q.fields){
      if(f.kind==="choice"){const option=f.options.find(o=>o.id===answers[f.id]);if(!option)throw Error("Missing independently derived decision");await practice.getByLabel(option.label,{exact:true}).check();}
      else await practice.getByLabel(`${f.label}${f.unit?` (${f.unit})`:""}`,{exact:true}).fill(answers[f.id]);
    }
    if(index===1){
      await expect(practice.getByText("Saved in this browser.",{exact:true})).toBeVisible();await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
      for(const f of q.fields)if(f.kind!=="choice")await expect(practice.getByLabel(`${f.label}${f.unit?` (${f.unit})`:""}`,{exact:true})).toHaveValue(answers[f.id]);
    }
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  const note="The 200 N baseline gives 50 MPa, 500 microstrain, 1 mm and 0.1 J. Double area at fixed force halves extension and energy; holding 1 mm instead requires 400 N and 0.2 J. Bulk compression has negative volume change and positive incremental work. A 500 N axial excursion exceeds the 400 N admitted limit, so final zero load does not establish zero permanent set.";
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true}).fill(note);await page.getByRole("button",{name:"Save lesson notes",exact:true}).click();await expect(page.getByText("Lesson notes saved.",{exact:true})).toBeVisible();
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const path=testInfo.outputPath("elasticity-backup.json");await(await downloading).saveAs(path);const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m08-l02",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true})).toHaveValue(note);
});

