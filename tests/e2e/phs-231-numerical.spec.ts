import { expect,test,type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m09-l01";
const predict=async(lab:Locator,values:string[],sign="negative")=>{
  for(const [i,value]of values.entries())await lab.locator(`#phs231-numerical-prediction-${i}`).fill(value);
  await lab.getByLabel("Predicted first-step mechanical energy change",{exact:true}).selectOption(sign);
  const button=lab.getByRole("button",{name:"Check and compare steps",exact:true});await button.focus();await button.press("Enter");
};
const baseline=["-1.28",".0672","-.128"];
const selected=(lab:Locator)=>lab.getByRole("region",{name:"Selected numerical state",exact:true});
const value=(region:Locator,name:string)=>region.getByRole("row").filter({has:region.page().getByRole("rowheader",{name,exact:true})}).getByRole("cell").first();
const numeric=async(lab:Locator,name:string)=>Number(await value(selected(lab),name).innerText());
const correct=async(lab:Locator)=>expect(lab.getByRole("status")).toContainText("All four predictions agree");
const preset=async(lab:Locator,name:string)=>{
  const details=lab.locator("details").filter({has:lab.page().getByText("Load prepared numerical comparisons",{exact:true})});
  if(!await details.evaluate(el=>(el as HTMLDetailsElement).open))await details.locator("summary").click();
  await lab.getByRole("button",{name,exact:true}).click();
};
for(const [name,viewport]of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const)test(`numerical ${name} complete lesson and open tables pass accessibility`,async({page})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize(viewport);await page.goto(route);const lab=page.locator("#investigate");await predict(lab,baseline);await correct(lab);
  await lab.getByText("Complete numerical path table",{exact:true}).click();
  const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
for(const [name,viewport]of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const)test(`numerical ${name} plots keyboard controls tables and reload are usable`,async({page},info)=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));await page.setViewportSize(viewport);await page.goto(route);const lab=page.locator("#investigate");
  await predict(lab,baseline);await correct(lab);
  for(const [i,kind]of ["position","energy","balance"].entries()){await lab.getByRole("img").nth(i).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`numerical-${name}-${kind}.png`)});}
  const slider=lab.getByLabel("Numerical time sample",{exact:true});await slider.focus();await slider.press("Home");await expect(value(selected(lab),"Numerical position")).toHaveText("0.08");
  await slider.press("ArrowRight");await expect(value(selected(lab),"Numerical position")).toHaveText("0.0672");await slider.press("End");await expect(selected(lab).getByRole("caption")).toHaveText("Computed state and reference at 4 s");
  expect(await numeric(lab,"Analytic position")).toBeCloseTo(.08*Math.cos(16),8);expect(await numeric(lab,"Analytic velocity")).toBeCloseTo(-.32*Math.sin(16),8);
  await lab.getByText("Complete numerical path table",{exact:true}).click();const table=lab.getByRole("region",{name:"Complete numerical path table",exact:true});await expect(table.getByRole("row")).toHaveCount(42);
  if(name==="mobile"){await table.focus();await table.press("ArrowRight");await expect.poll(()=>table.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await table.press("ArrowDown");await expect.poll(()=>table.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);await page.screenshot({path:info.outputPath("numerical-mobile-table.png")});}
  await page.reload();await expect(lab.getByRole("img")).toHaveCount(0);await expect(lab.locator("#phs231-numerical-prediction-0")).toHaveValue("");expect(errors).toEqual([]);
});
test("numerical update order changes the actual state and energy feedback",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate");await predict(lab,["-1.28",".08","-.128"],"positive");
  await expect(lab.getByRole("status")).toContainText("Revisit first-step position, first-step energy change");
  for(const [method,answers,sign,x,energy]of [
    ["explicit",["-1.28",".08","-.128"],"positive",.08,.029696],
    ["semi",baseline,"negative",.0672,.02215936],
    ["midpoint",["-1.28",".0736","-.128"],"positive",.0736,.02576384],
  ] as const){
    await lab.getByLabel("Time-step method",{exact:true}).selectOption(method);await expect(lab.getByRole("img")).toHaveCount(0);await predict(lab,[...answers],sign);await correct(lab);
    expect(await numeric(lab,"Numerical position")).toBeCloseTo(x,10);expect(await numeric(lab,"Numerical mechanical energy")).toBeCloseTo(energy,10);expect(await numeric(lab,"Analytic position")).toBeCloseTo(.08*Math.cos(.4),9);
  }
});
test("numerical clipped widths reach the requested endpoint without relabeling a different state",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate");await preset(lab,"Shortened final step");await predict(lab,["-1.28","-.0352","-.384"],"positive");await correct(lab);
  await lab.getByRole("button",{name:"Inspect last computed step",exact:true}).click();await expect(selected(lab).getByRole("caption")).toHaveText("Computed state and reference at 1 s");expect(await numeric(lab,"Actual preceding step width")).toBeCloseTo(.1,10);
  expect(await numeric(lab,"Analytic position")).toBeCloseTo(.08*Math.cos(4),9);
  await lab.getByLabel("Path to inspect",{exact:true}).selectOption("1");await lab.getByRole("button",{name:"Inspect last computed step",exact:true}).click();expect(await numeric(lab,"Actual preceding step width")).toBeCloseTo(.1,10);
  await preset(lab,"Step longer than record");await predict(lab,["-1.28",".077952","-.0512"]);await correct(lab);await expect(selected(lab).getByRole("caption")).toHaveText("Computed state and reference at 0.04 s");await expect(value(selected(lab),"Actual preceding step width")).toHaveText("0.04");
});
test("numerical paged records and exported CSV preserve every refinement state and its provenance",async({page},info)=>{
  await page.goto(route);const lab=page.locator("#investigate");await lab.getByLabel("Requested base step (s)",{exact:true}).fill(".01");await predict(lab,["-1.28",".079872","-.0128"]);await correct(lab);
  await lab.getByLabel("Path to inspect",{exact:true}).selectOption("2");await lab.getByText("Complete numerical path table",{exact:true}).click();
  const table=lab.getByRole("region",{name:"Complete numerical path table",exact:true});await expect(table.getByRole("row")).toHaveCount(101);
  await lab.getByLabel("State table page",{exact:true}).selectOption("16");await expect(table.getByRole("row")).toHaveCount(2);await expect(table.getByRole("rowheader",{name:"4",exact:true})).toBeVisible();await expect(lab.getByRole("button",{name:"Next state page",exact:true})).toBeDisabled();
  await lab.getByRole("button",{name:"Previous state page",exact:true}).click();await expect(lab.getByLabel("State table page",{exact:true})).toHaveValue("15");
  await lab.getByRole("button",{name:"Inspect first step",exact:true}).click();await lab.getByRole("button",{name:"Show selected table page",exact:true}).click();await expect(lab.getByLabel("State table page",{exact:true})).toHaveValue("0");
  const waiting=page.waitForEvent("download");await lab.getByRole("button",{name:"Download complete numerical CSV",exact:true}).click();const file=info.outputPath("quarter.csv");await(await waiting).saveAs(file);const csv=await readFile(file,"utf8"),lines=csv.trim().split(/\r?\n/),header=lines.findIndex(s=>s.startsWith("time_s,"));
  expect(csv).toContain('"provenance","synthetic numerical solution; analytic reference solves the same supplied model"');expect(csv).toContain('"completed_requested_time",true');
  const rows=lines.slice(header+1).map(s=>s.split(","));expect(rows).toHaveLength(1601);
  for(const [i,row]of rows.entries()){
    const t=Number(row[0]),dt=Number(row[1]),x=Number(row[2]),v=Number(row[3]);expect(Number(row[5])).toBeCloseTo(.08*Math.cos(4*t),11);expect(Number(row[6])).toBeCloseTo(-.32*Math.sin(4*t),11);
    if(i){const previous=rows[i-1],oldX=Number(previous[2]),oldV=Number(previous[3]);expect(t).toBeGreaterThan(Number(previous[0]));expect(v).toBeCloseTo(oldV-16*oldX*dt,11);expect(x).toBeCloseTo(oldX+v*dt,11);}
  }
  expect(Number(rows.at(-1)![0])).toBe(4);
});
test("numerical damping and zero equilibrium retain the analytic reference and undefined relative error",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate");
  await preset(lab,"Critical damping");await predict(lab,baseline);await correct(lab);await expect(lab).toContainText("critically damped");
  await lab.getByRole("button",{name:"Inspect last computed step",exact:true}).click();expect(await numeric(lab,"Analytic position")).toBeCloseTo(.08*17*Math.exp(-16),12);expect(await numeric(lab,"Analytic velocity")).toBeCloseTo(-5.12*Math.exp(-16),12);
  expect(await numeric(lab,"Trapezoid dissipation estimate")).toBeGreaterThan(0);
  await preset(lab,"Overdamped comparison");await predict(lab,baseline);await correct(lab);await expect(lab).toContainText("overdamped");
  const r1=-8+Math.sqrt(48),r2=-8-Math.sqrt(48),C1=-.08*r2/(r1-r2),C2=.08-C1;
  expect(await numeric(lab,"Analytic position")).toBeCloseTo(C1*Math.exp(r1*.1)+C2*Math.exp(r2*.1),9);
  await preset(lab,"Zero equilibrium");await predict(lab,["0","0","0"],"zero");await correct(lab);await expect(value(selected(lab),"Absolute position error divided by reference magnitude")).toHaveText("Unavailable: zero reference");
  await lab.getByRole("button",{name:"Inspect last computed step",exact:true}).click();for(const label of ["Numerical position","Numerical velocity","Numerical mechanical energy","Energy balance residual"])await expect(value(selected(lab),label)).toHaveText("0");
});
test("numerical stability boundary and early stops remain distinct from physical limits",async({page},info)=>{
  await page.goto(route);const lab=page.locator("#investigate");await preset(lab,"Semi stability boundary");await predict(lab,["-1.28","-.24","-.64"],"positive");await correct(lab);await expect(lab).toContainText("This boundary is not generally stable");
  const slider=lab.getByLabel("Numerical time sample",{exact:true});await slider.focus();await slider.press("ArrowRight");await expect(value(selected(lab),"Numerical position")).toHaveText("0.4");await expect(value(selected(lab),"Numerical velocity")).toHaveText("1.28");
  await preset(lab,"Early computational stop");await predict(lab,["-2000","1","-2000"],"positive");await correct(lab);await expect(lab.getByRole("alert")).toContainText("not clipped");await expect(lab.getByRole("region",{name:"Numerical refinement comparison",exact:true})).toContainText("Not reached");
  await lab.getByRole("button",{name:"Inspect last computed step",exact:true}).click();expect(await numeric(lab,"Numerical position")).toBeLessThanOrEqual(1e6);
  const waiting=page.waitForEvent("download");await lab.getByRole("button",{name:"Download complete numerical CSV",exact:true}).click();const path=info.outputPath("stopped.csv");await(await waiting).saveAs(path);const csv=await readFile(path,"utf8");expect(csv).toContain('"completed_requested_time",false');expect(csv).toContain("The path was stopped, not clipped");
  await page.setViewportSize({width:390,height:844});await lab.getByRole("img").first().scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath("numerical-mobile-stopped.png")});
});
test("numerical invalid values and prediction errors cannot leave stale output",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate"),button=lab.getByRole("button",{name:"Check and compare steps",exact:true});await button.click();await expect(lab.getByRole("status")).toContainText("Predict the initial acceleration");
  await predict(lab,baseline);await correct(lab);await lab.getByLabel("Mass (kg)",{exact:true}).fill("");await expect(lab.getByRole("img")).toHaveCount(0);await button.click();await expect(lab.getByRole("status")).toContainText("Complete every model input");
  await lab.getByLabel("Mass (kg)",{exact:true}).fill("-1");await button.click();await expect(lab.getByRole("status")).toContainText("finite inputs within the printed ranges");
  await lab.getByRole("button",{name:"Reset numerical investigation",exact:true}).click();
  for(const [answer,message]of [["1/0","Division by zero"],["sqrt(-1)","real numbers"],["1e309","finite real values"]]){await predict(lab,[answer,".0672","-.128"]);await expect(lab.getByRole("status")).toContainText(message);await expect(lab.getByRole("img")).toHaveCount(0);}
  await lab.getByLabel("Requested base step (s)",{exact:true}).fill(".0001");await button.click();await expect(lab.getByRole("status")).toContainText("at most 2000 base steps");
  await lab.getByRole("button",{name:"Reset numerical investigation",exact:true}).click();await expect(lab.locator("#phs231-numerical-prediction-0")).toHaveValue("");await expect(lab.getByLabel("Predicted first-step mechanical energy change",{exact:true})).toHaveValue("");
});

test("numerical guided work distinguishes the actual algorithm from a physical energy claim",async({page})=>{
  await page.goto(route);const guided=page.locator("#guided");
  for(const [label,answer]of [["Updated position (m)","2/25"],["Updated velocity (m/s)","-16/125"],["Updated mechanical energy (J)","464/15625"],["Trapezoid dissipation estimate (J)","512/3125000"],["Energy balance residual (J)","13312/3125000"]])await guided.getByLabel(label,{exact:true}).fill(answer);
  await guided.getByRole("group",{name:"What does the residual establish?",exact:true}).locator('input[value="source"]').check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("No independent measurement of a source");
  await guided.getByRole("group",{name:"What does the residual establish?",exact:true}).locator('input[value="numerical"]').check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await expect(page.getByRole("link",{name:"Calculus refresher: signed accumulation",exact:true})).toHaveAttribute("href","/courses/f08/lessons/m01-l04");
  await expect(page.getByText("This academic prerequisite course is under construction.",{exact:false})).toBeVisible();
});
test("numerical independent checkpoint resumes and restores real questions evidence and investigation notes",async({page},info)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m09-l01.json",import.meta.url),"utf8")),attempt=createAttempt(lessonSchema.parse(data),"checkpoint","numerical-evidence");
  await restoreProgress(page,{schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();const practice=page.locator("#practice");
  for(const [index,q]of attempt.questions.entries()){
    const p=q.parameters;let answers:Record<string,string>;
    if(index===0){
      const first=p.a*(p.v0+p.v1),second=p.b*(p.v1+p.v2),third=p.c*(p.v2+p.v3),sum=first+second+third;
      answers={first:`${first}/2`,second:`${second}/2`,third:`${third}/2`,displacement:`${sum}/2`,position:`${2*p.x0+sum}/2`,meaning:"displacement"};
    }else if(index===1){
      const sum=p.a*(p.v0+p.v1)+p.b*(p.v1+p.v2),bound=(p.a+p.b)*p.q;
      answers={estimate:`${sum}/2`,bound:`${bound}/20`,lower:`${10*sum-bound}/20`,upper:`${10*sum+bound}/20`,meaning:"bounded"};
    }else if(index===2){
      const force=-p.k*p.X-p.b*p.V,nextX=10*p.X+p.H*p.V;
      answers={acceleration:`${force}/${10*p.m}`,position:`${nextX}/100`,velocity:`${10*p.m*p.V+p.H*force}/${100*p.m}`,force:`${-p.k*nextX}/100`,order:"specified"};
    }else{
      const den=200000*p.m*p.m,E0=1000*p.m*p.m*p.k*p.X*p.X,kinetic=10*p.m*p.H*p.H*p.k*p.k*p.X*p.X,D=p.b*p.H**3*p.k*p.k*p.X*p.X;
      answers={initial:`${E0}/${den}`,final:`${E0+kinetic}/${den}`,dissipation:`${D}/${den}`,residual:`${kinetic+D}/${den}`,claim:"audit"};
    }
    for(const f of q.fields){
      if(f.kind==="choice"){const option=f.options.find(o=>o.id===answers[f.id])!;await practice.getByLabel(option.label,{exact:true}).check();}
      else await practice.getByLabel(`${f.label}${f.unit?` (${f.unit})`:""}`,{exact:true}).fill(answers[f.id]);
    }
    if(index===1){
      await expect(practice.getByText("Saved in this browser.",{exact:true})).toBeVisible();await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
      for(const f of q.fields)if(f.kind==="choice")await expect(practice.getByLabel(f.options.find(o=>o.id===answers[f.id])!.label,{exact:true})).toBeChecked();else await expect(practice.getByLabel(`${f.label}${f.unit?` (${f.unit})`:""}`,{exact:true})).toHaveValue(answers[f.id]);
    }
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  const note="Synthetic baseline m=0.5 kg, k=8 N/m, b=0, x0=0.08 m, v0=0, T=4 s. I independently derived x=0.08*cos(4t), v=-0.32*sin(4t). First-step energies at h=0.1 s: Euler 0.029696 J, velocity-first 0.02215936 J, midpoint 0.02576384 J. Refine h, h/2, h/4 with the same physical endpoint. The semi-implicit bound is strict; q=2 is generally unstable. E+D_trap-E0 audits numerical state and quadrature together. CSV values are simulated, not measured; physical calibration and model discrepancy remain separate.";
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true}).fill(note);await page.getByRole("button",{name:"Save lesson notes",exact:true}).click();await expect(page.getByText("Lesson notes saved.",{exact:true})).toBeVisible();
  await page.goto("/settings");const waiting=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const path=info.outputPath("numerical-backup.json");await(await waiting).saveAs(path);const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m09-l01",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true})).toHaveValue(note);
});
