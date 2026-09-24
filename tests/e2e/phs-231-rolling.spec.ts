import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m07-l03";
const predictionLabels=["Predicted required static friction (N)","Predicted static capacity (N)","Predicted actual initial center acceleration (m/s²)","Predicted actual initial angular acceleration (rad/s²)"];
const predict=async(lab:Locator,answers:string[])=>{
  for(const [i,label] of predictionLabels.entries())await lab.getByLabel(label,{exact:true}).fill(answers[i]);
  const check=lab.getByRole("button",{name:"Check rolling account",exact:true});await check.focus();await check.press("Enter");
};
const rowValue=(region:Locator,name:string)=>region.getByRole("row").filter({has:region.page().getByRole("rowheader",{name,exact:true})}).getByRole("cell").first();
const numberText=(n:number)=>String(Number(n.toFixed(6)));

for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const)test(`rolling ${name} diagrams, complete tables, and keyboard scrolling remain accessible`,async({page},testInfo)=>{
  await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});await page.goto(route);const lab=page.locator("#investigate");
  await predict(lab,["-4","24/5","4","8"]);const slider=lab.getByLabel("Rolling snapshot sample",{exact:true});await slider.focus();for(let i=0;i<20;i++)await slider.press("ArrowRight");
  for(const title of ["Compare three inertia ratios","Complete rolling motion table","Complete rolling energy table"])await lab.getByText(title,{exact:true}).click();
  const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await lab.getByRole("img").first().scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`rolling-${name}-point.png`)});
  await lab.getByRole("img").nth(1).scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`rolling-${name}-velocities.png`)});
  if(name==="mobile"){
    const compare=lab.getByRole("region",{name:"Rolling inertia comparison",exact:true});await compare.scrollIntoViewIfNeeded();await compare.focus();await compare.press("ArrowRight");await expect.poll(()=>compare.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await page.screenshot({path:testInfo.outputPath("rolling-comparison-mobile.png")});
  }
});


test("rolling instruction checks traction before constraints and offers equivalent keyboard motion and energy evidence",async({page})=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.goto(route);
  const guided=page.locator("#guided");
  const labels=["Required signed static friction (N)","Available static-friction magnitude (N)","Actual initial center acceleration (m/s²)","Actual initial angular acceleration (rad/s²)"];
  for(const [i,label] of labels.entries())await guided.getByLabel(label,{exact:true}).fill(["-4","16/5","4","8"][i]);
  await guided.getByLabel("It rolls with a=4 because a round disk must satisfy a=R alpha",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Round geometry does not supply the contact force");
  for(const [i,label] of labels.entries())await guided.getByLabel(label,{exact:true}).fill(["-4","16/5","26/5","16/5"][i]);
  await guided.getByLabel("Static demand fails; use kinetic friction and allow a different value of R alpha",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate");await predict(lab,["-4.8","4.8","4","8"]);await expect(lab.getByRole("status")).toContainText("Revisit required static friction");
  await predict(lab,["-4","24/5","4","8"]);await expect(lab.getByRole("status")).toContainText("All four predictions agree");
  const slider=lab.getByLabel("Rolling snapshot sample",{exact:true}),motion=lab.getByRole("region",{name:"Selected rolling motion",exact:true}),energy=lab.getByRole("region",{name:"Selected rolling energy",exact:true});
  await slider.focus();await slider.press("Home");await expect(slider).toHaveValue("0");await expect(rowValue(motion,"Signed contact friction")).toHaveText("-4");
  await slider.press("ArrowRight");await expect(slider).toHaveValue("1");await slider.press("End");await expect(slider).toHaveValue("80");
  await expect(rowValue(motion,"Center displacement")).toHaveText("8");await expect(rowValue(motion,"Center velocity")).toHaveText("8");await expect(rowValue(motion,"Clockwise angular velocity")).toHaveText("16");
  await expect(rowValue(energy,"Translational kinetic energy")).toHaveText("64");await expect(rowValue(energy,"Rotational kinetic energy")).toHaveText("32");await expect(rowValue(energy,"Gravity work")).toHaveText("96");await expect(rowValue(energy,"Thermal conversion")).toHaveText("0");
  await lab.getByText("Compare three inertia ratios",{exact:true}).click();
  const compare=lab.getByRole("region",{name:"Rolling inertia comparison",exact:true});
  await expect(compare.getByRole("row",{name:"Thin hoop 1 -6 No 4.4 Sliding",exact:true})).toBeVisible();
  await expect(compare.getByRole("row",{name:"Disk or cylinder 0.5 -4 Yes 4 No slip",exact:true})).toBeVisible();
  for(const name of ["Complete rolling motion table","Complete rolling energy table"]){await lab.getByText(name,{exact:true}).click();await expect(lab.getByRole("region",{name,exact:true}).getByRole("row")).toHaveCount(82);}
  await slider.focus();await slider.press("Home");for(let i=0;i<20;i++)await slider.press("ArrowRight");
  await expect(rowValue(motion,"Center displacement")).toHaveText("0.5");
  const marked=lab.getByRole("region",{name:"Marked rolling point",exact:true});
  await expect(marked.getByRole("cell").nth(0)).toHaveText(`(${numberText(.5-.5*Math.sin(1))}, ${numberText(.5-.5*Math.cos(1))})`);
  await page.reload();await expect(lab.getByLabel("Incline rise divided by run",{exact:true})).toHaveValue("0.75");await expect(lab.getByRole("img")).toHaveCount(0);expect(errors).toEqual([]);
});

for(const group of ["transitions","loading"] as const)test(`rolling ${group} trials resolve contact events and friction direction`,async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate");
  const cases:[string,string[],string,string][]=[
    ["Insufficient traction",["-4","16/5","26/5","16/5"],"10.4","11.52"],
    ["Slide into rolling",["0","6","-2","8"],"2","3"],
    ["Overspin into rolling",["0","6","2","-8"],"2","12"],
    ["Rolling uphill",["-4","24/5","4","8"],"5","0"],
    ["Hub force on level",["-2","6","2","4"],"4","0"],
    ["Drive couple on level",["4","6","2","4"],"4","0"],
    ["Slip reverses",["3","2","-5","2"],numberText(-19/6),"1.125"],
    ["Frictionless incline",["-4","0","6","0"],"12","0"],
    ["Frictionless compatible rolling",["0","0","0","0"],"2","0"],
  ];
  const motion=lab.getByRole("region",{name:"Selected rolling motion",exact:true}),energy=lab.getByRole("region",{name:"Selected rolling energy",exact:true}),slider=lab.getByLabel("Rolling snapshot sample",{exact:true});
  for(const [name,answers,endV,heat] of cases.filter(([name])=>["Slide into rolling","Overspin into rolling","Slip reverses"].includes(name)===(group==="transitions"))){
    await lab.getByRole("button",{name,exact:true}).click();await predict(lab,answers);await expect(lab.getByRole("status")).toContainText("All four predictions agree");
    await slider.focus();await slider.press("End");await expect(rowValue(motion,"Center velocity")).toHaveText(endV);await expect(rowValue(energy,"Thermal conversion")).toHaveText(heat);
    if(name==="Slide into rolling"||name==="Overspin into rolling"){
      await expect(lab).toContainText("Initial velocity mismatch still requires a sliding phase");await lab.getByRole("button",{name:"Inspect transition 1",exact:true}).click();
      await expect(rowValue(motion,"Center velocity")).toHaveText("2");await expect(rowValue(motion,"Clockwise angular velocity")).toHaveText("4");await expect(rowValue(motion,"Signed contact friction")).toHaveText("0");
      await expect(rowValue(motion,"Center displacement")).toHaveText(name==="Slide into rolling"?"1.25":"1");
    }
    if(name==="Slip reverses"){
      await expect(lab).toContainText("Slip reverses without sustained rolling");await lab.getByRole("button",{name:"Inspect transition 1",exact:true}).click();
      await expect(rowValue(motion,"Center velocity")).toHaveText(numberText(1/6));await expect(rowValue(motion,"Signed contact friction")).toHaveText("1");await expect(rowValue(motion,"Contact slip velocity")).toHaveText("0");
      await lab.getByText("Complete rolling motion table",{exact:true}).click();await expect(lab.getByRole("region",{name:"Complete rolling motion table",exact:true}).getByRole("row")).toHaveCount(83);
    }
  }
});

test("rolling boundaries retain endpoint events and reject unsupported constraints and invalid inputs",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate"),motion=lab.getByRole("region",{name:"Selected rolling motion",exact:true}),slider=lab.getByLabel("Rolling snapshot sample",{exact:true});
  await lab.getByRole("button",{name:"Slide into rolling",exact:true}).click();await lab.getByLabel("Trial duration (s)",{exact:true}).fill("0.5");await predict(lab,["0","6","-2","8"]);await expect(lab).toContainText("This event is at the trial endpoint");
  await lab.getByLabel("Trial duration (s)",{exact:true}).fill("0.4");await predict(lab,["0","6","-2","8"]);await expect(lab.getByRole("button",{name:"Inspect transition 1",exact:true})).toHaveCount(0);await slider.press("End");await expect(rowValue(motion,"Contact slip velocity")).toHaveText("0.6");
  await lab.getByRole("button",{name:"Passive rolling ramp",exact:true}).click();await lab.getByLabel("Static friction coefficient",{exact:true}).fill("0.25");await predict(lab,["-4","4","4","8"]);await expect(lab).toContainText("The static demand is within capacity.");
  await lab.getByLabel("Static friction coefficient",{exact:true}).fill("0.249");await predict(lab,["-4","3.984","4.4","6.4"]);await expect(lab).toContainText("The static demand exceeds capacity.");
  const check=lab.getByRole("button",{name:"Check rolling account",exact:true});
  await lab.getByLabel("Kinetic friction coefficient",{exact:true}).fill("0.3");await check.click();await expect(lab.getByRole("status")).toContainText("kinetic coefficient no greater");await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByRole("button",{name:"Passive rolling ramp",exact:true}).click();await lab.getByLabel("Body mass (kg)",{exact:true}).fill("");await check.click();await expect(lab.getByRole("status")).toContainText("empty input is not zero");
  await lab.getByRole("button",{name:"Passive rolling ramp",exact:true}).click();await lab.getByLabel(predictionLabels[0],{exact:true}).fill("sqrt(-1)");await check.click();await expect(lab.getByRole("status")).toContainText("must be real");
  await lab.getByLabel(predictionLabels[0],{exact:true}).fill("1e999");await check.click();await expect(lab.getByRole("status")).toContainText("finite real");
  await lab.getByRole("button",{name:"Reset rolling investigation",exact:true}).click();await check.click();await expect(lab.getByRole("status")).toContainText("Predict required static friction");
  const radius=lab.getByLabel("Contact radius (m)",{exact:true});await radius.focus();await radius.press("ArrowUp");await expect(radius).toHaveValue("0.55");
});

test("rolling checkpoint preserves independent answers, contact decisions, and notes through reload and backup",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m07-l03.json",import.meta.url),"utf8")),attempt=createAttempt(lessonSchema.parse(data),"checkpoint","rolling-evidence");
  await restoreProgress(page,{schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();const practice=page.locator("#practice");
  for(const [index,q] of attempt.questions.entries()){
    const p=q.parameters,sum=p.B+p.D;let answers:Record<string,string>;
    if(index===0){
      answers={vx:`${p.v}+(${2*p.v}/${p.r})*(${p.ny*p.r}/2)`,vy:`-(${2*p.v}/${p.r})*(${p.nx*p.r}/2)`,ax:`${p.a}+(${2*p.a}/${p.r})*(${p.ny*p.r}/2)-(${2*p.v}/${p.r})^2*(${p.nx*p.r}/2)`,ay:`-(${2*p.a}/${p.r})*(${p.nx*p.r}/2)-(${2*p.v}/${p.r})^2*(${p.ny*p.r}/2)`};
    }else if(index===1){
      answers={minimum:`(1-1/(1+${p.B}/${p.D}))*${p.S}/${p.N}`,friction:`${p.mass}*(10*${p.S}/${p.C}/(1+${p.B}/${p.D})-10*${p.S}/${p.C})`,margin:`${p.margin}/20*(${10*p.mass*p.N}/${p.C})`,regime:p.margin>=0?"feasible":"fails"};
    }else if(index===2){
      answers={time:`(${p.speed}-${p.speed*p.D}/${sum})/${p.k}`,velocity:`${p.speed}/(1+${p.B}/${p.D})`,omega:`${p.speed}/(1+${p.B}/${p.D})*2/${p.r}`,heat:`${p.mass*p.speed*p.speed}/2-${p.mass}/2*(${p.speed*p.D}/${sum})^2-${p.mass*p.B*p.r*p.r}/${8*p.D}*(${2*p.speed*p.D}/${sum*p.r})^2`,after:"zero"};
    }else{
      const u=p.v-p.rim,f=u===0?p.staticForce:-Math.sign(u)*p.mass*p.k;
      answers={slip:String(u),translation:String(f*p.v),rotation:`-(${f})*(${p.r}/2)*(${2*p.rim}/${p.r})`,total:`${f}*(${p.v}-(${p.rim}))`,heat:`-(${f})*(${p.v}-(${p.rim}))`};
    }
    for(const f of q.fields){
      if(f.kind==="choice"){const option=f.options.find(o=>o.id===answers[f.id]);if(!option)throw Error("Missing independent contact decision");await practice.getByLabel(option.label,{exact:true}).check();}
      else await practice.getByLabel(`${f.label}${f.unit?` (${f.unit})`:""}`,{exact:true}).fill(answers[f.id]);
    }
    if(index===1){
      await expect(practice.getByText("Saved in this browser.",{exact:true})).toBeVisible();await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
      for(const f of q.fields){
        if(f.kind==="choice"){const option=f.options.find(o=>o.id===answers[f.id]);if(!option)throw Error("Missing saved decision");await expect(practice.getByLabel(option.label,{exact:true})).toBeChecked();}
        else await expect(practice.getByLabel(`${f.label}${f.unit?` (${f.unit})`:""}`,{exact:true})).toHaveValue(answers[f.id]);
      }
    }
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  const note="Solve static demand before imposing rolling. For the disk that starts with v=3 and no spin, kinetic friction dissipates 3 J before catching rolling at 0.5 s. A zero-slip instant alone does not prove sufficient traction.";
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true}).fill(note);await page.getByRole("button",{name:"Save lesson notes",exact:true}).click();await expect(page.getByText("Lesson notes saved.",{exact:true})).toBeVisible();
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const path=testInfo.outputPath("rolling-backup.json");await(await downloading).saveAs(path);const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m07-l03",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true})).toHaveValue(note);
});
