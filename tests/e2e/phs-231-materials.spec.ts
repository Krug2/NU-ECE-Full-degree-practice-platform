import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m08-l03";
const predict=async(lab:Locator,answers:string[],decision="unfractured")=>{
  await lab.getByLabel("Predicted fracture decision",{exact:true}).selectOption(decision);
  for(const [i,answer] of answers.entries())await lab.locator(`#phs231-material-prediction-${i}`).fill(answer);
  const check=lab.getByRole("button",{name:"Check material account",exact:true});await check.focus();await check.press("Enter");
};
const value=(region:Locator,name:string)=>region.getByRole("row").filter({has:region.page().getByRole("rowheader",{name,exact:true})}).getByRole("cell").first();
const selected=(lab:Locator)=>lab.getByRole("region",{name:"Selected material account",exact:true});
const preset=async(lab:Locator,name:string)=>{
  const details=lab.locator("details").filter({has:lab.page().getByText("Load prepared material comparisons",{exact:true})});
  if(!await details.evaluate(el=>(el as HTMLDetailsElement).open))await details.locator("summary").click();
  await lab.getByRole("button",{name,exact:true}).click();
};
const baseline=["1400/9","14000/9","31/45","1/225","49/405"];

for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const)test(`materials ${name} complete lesson and open equivalent tables pass accessibility checks`,async({page})=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});await page.goto(route);const lab=page.locator("#investigate");
  await predict(lab,baseline);await expect(lab.getByRole("status")).toContainText("All six predictions agree");
  await lab.getByText("Complete material path table",{exact:true}).click();
  const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const)test(`materials ${name} diagrams, keyboard states, tables, and reload are usable`,async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});await page.goto(route);const lab=page.locator("#investigate");
  await predict(lab,baseline);await expect(lab.getByRole("status")).toContainText("All six predictions agree");
  await lab.getByText("Complete material path table",{exact:true}).click();
  for(const [i,figure]of ["shape","curve","work"].entries()){await lab.getByRole("img").nth(i).scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`materials-${name}-${figure}.png`)});}
  const table=lab.getByRole("region",{name:"Complete material path table",exact:true});await expect(table.getByRole("row")).toHaveCount(83);
  if(name==="mobile"){await table.scrollIntoViewIfNeeded();await table.focus();await table.press("ArrowRight");await expect.poll(()=>table.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await table.press("ArrowDown");await expect.poll(()=>table.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);await expect(table.getByRole("columnheader",{name:"Stress (MPa)",exact:true})).toBeVisible();await page.screenshot({path:testInfo.outputPath("materials-mobile-table.png")});}
  const stage=lab.getByLabel("Material-stage sample",{exact:true});await stage.focus();await stage.press("Home");await expect(value(selected(lab),"Connected engineering strain")).toHaveText("0");
  await stage.press("ArrowRight");await expect(value(selected(lab),"Connected engineering strain")).toHaveText("0.00015");await expect(value(selected(lab),"Connected tensile force")).toHaveText("150");
  await stage.press("End");await expect(value(selected(lab),"Connected engineering stress")).toHaveText("0");expect(Number(await value(selected(lab),"Connected extension").innerText())).toBeCloseTo(4/9,8);expect(Number(await value(selected(lab),"Net work delivered").innerText())).toBeCloseTo(46/81,8);
  await page.reload();await expect(lab.getByLabel("Predicted fracture decision",{exact:true})).toHaveValue("");await expect(lab.getByRole("img")).toHaveCount(0);expect(errors).toEqual([]);
});

test("materials guided work distinguishes fracture history, maximum stress, and thermal claims",async({page})=>{
  await page.goto(route);const guided=page.locator("#guided");
  for(const [label,answer]of [["Largest reached engineering stress (MPa)","200"],["Last connected engineering stress (MPa)","150"],["Last connected engineering strain (1)","1/50"],["Input work through fracture (J)","63/20"]])await guided.getByLabel(label,{exact:true}).fill(answer);
  await guided.getByLabel("Final specimen strain is zero because the controller target is zero",{exact:true}).check();await guided.getByLabel("Exactly 3.15 J became heat",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("A controller command is not a specimen measurement");await expect(guided.locator(".answer-feedback")).toContainText("does not determine the thermal partition");
  await guided.getByLabel("Connected final strain and returned work are not established",{exact:true}).check();await guided.getByLabel("Input work through the documented endpoint; its thermal partition is unknown",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate");await predict(lab,["600","6000","1.8","0","1.8"]);await expect(lab.getByRole("status")).toContainText("Revisit largest reached stress, last documented force, input work, residual strain, returned work");
  await predict(lab,baseline);await expect(lab.getByRole("status")).toContainText("All six predictions agree");expect(Number(await value(selected(lab),"Work account residual").innerText())).toBeLessThan(1e-12);
  await lab.getByRole("button",{name:"Inspect supplied yield",exact:true}).click();await expect(value(selected(lab),"Connected engineering stress")).toHaveText("100");await expect(value(selected(lab),"Cumulative loading work")).toHaveText("0.05");
});

test("materials geometry changes force and total work without changing the material curve",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate");
  for(const [name,answers,force,extension]of [
    ["Double original area",["1400/9","28000/9","62/45","1/225","98/405"],28000/9,.6],
    ["Double gauge length",["1400/9","14000/9","62/45","1/225","98/405"],14000/9,1.2],
  ] as const){
    await preset(lab,name);await predict(lab,[...answers]);await expect(lab.getByRole("status")).toContainText("All six predictions agree");
    expect(Number(await value(selected(lab),"Connected tensile force").innerText())).toBeCloseTo(force,5);await expect(value(selected(lab),"Connected extension")).toHaveText(String(extension));
    expect(Number(await value(selected(lab),"Cumulative loading work density").innerText())).toBeCloseTo(31/45,8);
  }
});

test("materials zero, subyield, exact yield, and plastic plateau preserve the supplied unloading history",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate");
  for(const [name,answers,residual]of [
    ["Zero loading",["0","0","0","0","0"],0],
    ["Subyield loading",["50","500","1/80","0","1/80"],0],
    ["Exact supplied yield",["100","1000","1/20","0","1/20"],0],
    ["Perfect plastic plateau",["100","1000","11/20","1/200","1/20"],.005],
  ] as const){
    await preset(lab,name);await predict(lab,[...answers]);await expect(lab.getByRole("status")).toContainText("All six predictions agree");
    const stage=lab.getByLabel("Material-stage sample",{exact:true});await stage.focus();await stage.press("End");await expect(value(selected(lab),"Connected engineering strain")).toHaveText(String(residual));await expect(value(selected(lab),"Connected tensile force")).toHaveText("0");
  }
  await expect(lab.getByText(/through the strain interval \[0.001, 0.02\]/)).toBeVisible();
});

test("materials follows the descending displacement branch without equating maximum and final stress",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate");
  await preset(lab,"End of hardening");await predict(lab,["200","2000","7/5","1/125","1/5"]);await expect(lab.getByRole("status")).toContainText("All six predictions agree");
  await preset(lab,"Descending branch");await predict(lab,["200","1750","187/80","53/4000","49/320"]);await expect(lab.getByRole("status")).toContainText("All six predictions agree");
  await expect(value(selected(lab),"Connected engineering stress")).toHaveText("175");await lab.getByRole("button",{name:"Inspect end of hardening",exact:true}).click();await expect(value(selected(lab),"Connected engineering stress")).toHaveText("200");
  await lab.getByRole("button",{name:"Inspect residual state",exact:true}).click();await expect(value(selected(lab),"Connected engineering strain")).toHaveText("0.01325");await expect(value(selected(lab),"Connected extension")).toHaveText("1.325");expect(Number(await value(selected(lab),"Net work delivered").innerText())).toBeCloseTo(187/80-49/320,8);
});

test("materials exact and beyond fracture stop the connected record and do not invent unloading",async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await page.goto(route);const lab=page.locator("#investigate");
  for(const name of ["Exact fracture","Beyond fracture"]){
    await preset(lab,name);await predict(lab,["200","1500","63/20"],"fractured");await expect(lab.getByRole("status")).toContainText("All four predictions agree");await expect(lab.locator("#phs231-material-prediction-3")).toBeDisabled();
    if(name==="Beyond fracture"){await expect(value(selected(lab),"Connected engineering strain")).toHaveText("Not established");await expect(lab.getByRole("img")).toHaveCount(2);}
    await lab.getByRole("button",{name:"Inspect fracture endpoint",exact:true}).click();await expect(value(selected(lab),"Connected engineering strain")).toHaveText("0.02");await expect(value(selected(lab),"Connected tensile force")).toHaveText("1500");await expect(value(selected(lab),"Cumulative loading work")).toHaveText("3.15");await expect(value(selected(lab),"Work recoverable by the supplied law")).toHaveText("Not established");
    const stage=lab.getByLabel("Material-stage sample",{exact:true});await stage.focus();await stage.press("End");await expect(value(selected(lab),"Controller strain target")).toHaveText("0");await expect(value(selected(lab),"Connected tensile force")).toHaveText("Not established");await expect(value(selected(lab),"Returned work")).toHaveText("Not established");
  }
  await lab.getByRole("img").last().scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath("materials-mobile-fractured-work.png")});
  await preset(lab,"Same modulus brittle fracture");await predict(lab,["200","2000","1/5"],"fractured");await expect(lab.getByRole("status")).toContainText("All four predictions agree");await expect(value(selected(lab),"Connected engineering strain")).toHaveText("0.002");await expect(value(selected(lab),"Cumulative loading work")).toHaveText("0.2");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("materials rejects empty, invalid-order, nonfinite, and complex predictions and resets stale output",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check material account",exact:true});
  await check.click();await expect(lab.getByRole("status")).toContainText("Predict the largest reached stress");
  await predict(lab,baseline);await lab.getByLabel("Original cross-sectional area (mm²)",{exact:true}).fill("");await check.click();await expect(lab.getByRole("status")).toContainText("empty input is not zero");await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByLabel("Original cross-sectional area (mm²)",{exact:true}).fill("0");await check.click();await expect(lab.getByRole("status")).toContainText("finite inputs within the printed ranges");
  await preset(lab,"Plastic baseline");await lab.getByLabel("End-of-hardening strain",{exact:true}).fill(".0005");await predict(lab,baseline);await expect(lab.getByRole("status")).toContainText("yield strain < hardening strain < fracture strain");
  await preset(lab,"Plastic baseline");await predict(lab,["sqrt(-1)",...baseline.slice(1)]);await expect(lab.getByRole("status")).toContainText("must be real numbers");
  await predict(lab,["1e999",...baseline.slice(1)]);await expect(lab.getByRole("status")).toContainText("finite real numbers");await expect(lab.getByRole("img")).toHaveCount(0);
  await predict(lab,baseline.slice(0,3),"fractured");await expect(lab.getByRole("status")).toContainText("Revisit fracture decision");
  await lab.getByRole("button",{name:"Reset material investigation",exact:true}).click();await expect(lab.getByLabel("Predicted fracture decision",{exact:true})).toHaveValue("");await expect(lab.locator("#phs231-material-prediction-0")).toHaveValue("");
  const length=lab.getByLabel("Original gauge length (mm)",{exact:true});await length.focus();await length.press("ArrowUp");await expect(length).toHaveValue("101");
  await lab.getByLabel("Synthetic material record",{exact:true}).selectOption("brittle");await lab.getByLabel("Initial modulus E (GPa)",{exact:true}).fill("1");await lab.getByLabel("Documented fracture stress (MPa)",{exact:true}).fill("1000");await check.click();await expect(lab.getByRole("status")).toContainText("brittle fracture strain must not exceed 0.5");
});

test("materials independently solved checkpoint resumes and restores actual question, evidence, and note backups",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m08-l03.json",import.meta.url),"utf8")),attempt=createAttempt(lessonSchema.parse(data),"checkpoint","materials-evidence");
  await restoreProgress(page,{schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();const practice=page.locator("#practice");
  for(const [index,q]of attempt.questions.entries()){
    const p=q.parameters;let answers:Record<string,string>;
    if(index===0){
      answers={modulus:String(p.E),yield:String(p.S),ultimate:String(Math.max(p.S,p.u*p.S,p.t*p.S/2)),last:`${p.t*p.S}/2`,percent:`${p.hf*p.S}/${10*p.E}`,endpoint:p.documented?"fracture":"unknown"};
    }else if(index===1){
      const a=6+(p.u-1)*p.r,b=6+(p.hy-1)*p.r,stress=`${a*p.S}/6`,residual=`(${b*p.S}-${a*p.S})/${6000*p.E}`,returned=`(${a*p.S})^2/${72000*p.E}`;
      const inputNum=(36+(p.hy-1)*p.r*(12+(p.u-1)*p.r))*p.S*p.S;
      answers={stress,residual,extension:`(${b*p.S}-${a*p.S})*${p.L}/${6000*p.E}`,returned,unreturned:`(${inputNum}-${a*a*p.S*p.S})/${72000*p.E}`,energy:"account"};
    }else if(index===2){
      const first=p.S*p.S,second=(1+p.u)*(p.hy-1)*p.S*p.S,third=(2*p.u+p.t)*(p.hf-p.hy)*p.S*p.S,total=2*first+2*second+third;
      answers={first:`${first}/${2000*p.E}`,second:`${second}/${2000*p.E}`,third:`${third}/${4000*p.E}`,total:`${total}/${4000*p.E}`,work:`${total*p.A*p.L}/${4000000*p.E}`,meaning:"work"};
    }else{
      const low=p.Ynum/10*(p.sigma-p.dSigma)*Math.sqrt(Math.PI*p.aLow/1000),high=p.Ynum/10*(p.sigma+p.dSigma)*Math.sqrt(Math.PI*p.aHigh/1000);
      answers={lower:low.toFixed(8),upper:high.toFixed(8),margin:(p.Kc-high).toFixed(8),set:high<p.Kc?"all":low>=p.Kc?"none":"mixed",inspection:"bound"};
    }
    for(const f of q.fields){
      if(f.kind==="choice"){const option=f.options.find(o=>o.id===answers[f.id]);if(!option)throw Error("Missing independently derived decision");await practice.getByLabel(option.label,{exact:true}).check();}
      else await practice.getByLabel(`${f.label}${f.unit?` (${f.unit})`:""}`,{exact:true}).fill(answers[f.id]);
    }
    if(index===1){
      await expect(practice.getByText("Saved in this browser.",{exact:true})).toBeVisible();await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
      for(const f of q.fields){
        if(f.kind==="choice"){const option=f.options.find(o=>o.id===answers[f.id])!;await expect(practice.getByLabel(option.label,{exact:true})).toBeChecked();}
        else await expect(practice.getByLabel(`${f.label}${f.unit?` (${f.unit})`:""}`,{exact:true})).toHaveValue(answers[f.id]);
      }
    }
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  const note="Reference E=100 GPa, maximum=200 MPa, fracture=150 MPa at 2% strain. Baseline input=31/45 J, returned=49/405 J, residual strain=1/225 with the supplied unload line. Complete work to fracture=3.15 J, versus 0.2 J for the equal-E brittle record. The 175 MPa inverse has strains 0.00775 and 0.015. After fracture, a zero controller target establishes neither connected strain nor returned work. Nonreturned work is not automatically heat.";
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true}).fill(note);await page.getByRole("button",{name:"Save lesson notes",exact:true}).click();await expect(page.getByText("Lesson notes saved.",{exact:true})).toBeVisible();
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const path=testInfo.outputPath("materials-backup.json");await(await downloading).saveAs(path);const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m08-l03",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true})).toHaveValue(note);
});
