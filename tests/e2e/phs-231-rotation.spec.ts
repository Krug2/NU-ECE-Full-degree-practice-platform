import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m07-l01";
const predictionLabels=["Predicted inertia (kg m²)","Predicted net axial torque (N m)","Predicted angular acceleration (rad/s²)","Predicted final angular velocity (rad/s)"];
const predict=async(lab:Locator,answers:string[])=>{
  for(const [i,label] of predictionLabels.entries())await lab.getByLabel(label,{exact:true}).fill(answers[i]);
  const check=lab.getByRole("button",{name:"Check rotation account",exact:true});await check.focus();await check.press("Enter");
};

test("rotation instruction separates radial force from torque and supports accessible keyboard snapshots and complete tables",async({page},testInfo)=>{
  test.setTimeout(180_000);
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.goto(route);
  const guided=page.locator("#guided");
  for(const [label,value] of [["Total rotor inertia (kg m²)","3"],["Net axial torque (N m)","4"],["Constant angular acceleration (rad/s²)","4/3"],["Final angular velocity (rad/s)","5/3"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByLabel("The radial force adds another 2 N m to the axial torque",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("their cross product is zero");
  for(const [label,value] of [["Total rotor inertia (kg m²)","5/2"],["Net axial torque (N m)","2"],["Constant angular acceleration (rad/s²)","4/5"],["Final angular velocity (rad/s)","3/5"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByLabel("The signed torque remains active, so the rotor reverses during the trial",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate");await predict(lab,["3","4","4/3","5/3"]);await expect(lab.getByRole("status")).toContainText("Revisit inertia, axial torque");
  await predict(lab,["5/2","2","4/5","3/5"]);await expect(lab.getByRole("status")).toContainText("All four predictions agree");
  await expect(lab).toContainText("total angular travel 0.85 rad");await expect(lab).toContainText("t=1.25 s inside the trial");
  const contributions=lab.getByRole("region",{name:"Inertia and axial torque contributions",exact:true});await expect(contributions.getByRole("row",{name:"Point B mB rB² 0.5 kg m²",exact:true})).toBeVisible();
  const points=lab.getByRole("region",{name:"Rotor point state table",exact:true}),a=points.getByRole("row",{name:/^A /});
  await expect(a.getByRole("cell").nth(3)).toHaveText("0.6");await expect(a.getByRole("cell").nth(4)).toHaveText("0.8");await expect(a.getByRole("cell").nth(5)).toHaveText("0.36");
  const slider=lab.getByLabel("Snapshot sample (0 to 40)",{exact:true});await slider.focus();await slider.press("Home");await expect(slider).toHaveValue("0");await expect(a.getByRole("cell").nth(0)).toHaveText("(1, 0)");await expect(a.getByRole("cell").nth(1)).toHaveText("(0, -1)");await expect(a.getByRole("cell").nth(2)).toHaveText("(-1, 0.8)");
  await slider.press("ArrowRight");await expect(slider).toHaveValue("1");await expect(a.getByRole("cell").nth(3)).toHaveText("0.96");await slider.press("End");
  await lab.getByText("Compare separate trials with different point radii",{exact:true}).click();await expect(lab.getByRole("row",{name:"2 7 2 0.285714",exact:true})).toBeVisible();
  await lab.getByText("Inspect the complete time table",{exact:true}).click();await expect(lab.getByRole("row",{name:"1.25 -0.625 0 0.625 0.8 0",exact:true})).toBeVisible();
  for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const){
    await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await lab.screenshot({path:testInfo.outputPath(`rotation-${name}.png`)});
    await lab.getByRole("img").scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`rotation-${name}-viewport.png`)});
  }
  await points.focus();await points.press("ArrowRight");await expect.poll(()=>points.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
  await page.reload();await expect(lab.getByLabel("Disk mass (kg)",{exact:true})).toHaveValue("2");await expect(lab.getByRole("img")).toHaveCount(0);expect(errors).toEqual([]);
});

test("rotation trials distinguish mass scaling, radial loading, steady rotation, initial rest, endpoint stops, and invalid inputs",async({page},testInfo)=>{
  await page.goto(route);const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check rotation account",exact:true});
  await lab.getByRole("button",{name:"Masses farther out",exact:true}).click();await predict(lab,["7","2","2/7","-3/7"]);await expect(lab.getByRole("status")).toContainText("All four predictions agree");await expect(lab).toContainText("Angular velocity has no zero within this trial");
  await lab.getByRole("button",{name:"Radial force only",exact:true}).click();await predict(lab,["5/2","0","0","-1"]);await expect(lab.getByRole("status")).toContainText("All four predictions agree");await expect(lab).toContainText("Zero net torque preserves the initial angular velocity");
  await lab.getByLabel("Radial force component (N)",{exact:true}).fill("-20");await predict(lab,["5/2","0","0","-1"]);await expect(lab.getByRole("status")).toContainText("All four predictions agree");
  await lab.getByRole("button",{name:"Balanced axial torques",exact:true}).click();await predict(lab,["5/2","0","0","-1"]);await expect(lab.getByRole("row",{name:"Tangential drive drive radius × Ft 3 N m",exact:true})).toBeVisible();await expect(lab.getByRole("row",{name:"Additional couple specified signed moment -3 N m",exact:true})).toBeVisible();
  await lab.getByRole("button",{name:"Start from rest",exact:true}).click();await predict(lab,["5/2","2","4/5","8/5"]);await expect(lab).toContainText("The trial starts from rest");
  await lab.getByRole("button",{name:"Default reversal",exact:true}).click();await lab.getByLabel("Trial duration (s)",{exact:true}).fill("1.25");await predict(lab,["5/2","2","4/5","0"]);await expect(lab).toContainText("Angular velocity reaches zero at the final instant");
  await lab.getByRole("button",{name:"Reverse all angular signs",exact:true}).click();await predict(lab,["5/2","-2","-4/5","-3/5"]);await expect(lab.getByRole("status")).toContainText("All four predictions agree");await expect(lab).toContainText("total angular travel 0.85 rad");
  await lab.getByRole("button",{name:"Default reversal",exact:true}).click();await lab.getByLabel("Point mass A (kg)",{exact:true}).fill("0");await lab.getByLabel("Point mass B (kg)",{exact:true}).fill("0");await predict(lab,["1","2","2","3"]);await expect(lab.getByRole("status")).toContainText("All four predictions agree");
  await lab.getByLabel("Disk mass (kg)",{exact:true}).fill("0");await check.click();await expect(lab.getByRole("status")).toContainText("disk must have positive mass");await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByLabel("Disk mass (kg)",{exact:true}).fill("");await check.click();await expect(lab.getByRole("status")).toContainText("empty input is not zero");
  await lab.getByRole("button",{name:"Default reversal",exact:true}).click();await lab.getByLabel("Predicted inertia (kg m²)",{exact:true}).fill("sqrt(-1)");await check.click();await expect(lab.getByRole("status")).toContainText("must be real");
  await lab.getByRole("button",{name:"Reset rotor",exact:true}).click();await lab.getByLabel("Point A radius (m)",{exact:true}).focus();await lab.getByLabel("Point A radius (m)",{exact:true}).press("ArrowUp");await expect(lab.getByLabel("Point A radius (m)",{exact:true})).toHaveValue("1.1");
  await lab.getByRole("button",{name:"Default reversal",exact:true}).click();await predict(lab,["5/2","2","4/5","3/5"]);await page.setViewportSize({width:390,height:844});await lab.getByText("Compare separate trials with different point radii",{exact:true}).click();const table=lab.getByRole("region",{name:"Separate radius trials",exact:true});await table.scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath("rotation-comparison-mobile.png")});
});

test("rotation checkpoints preserve independently derived vectors, composite inertia, inverse model checks, and notes through backup",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m07-l01.json",import.meta.url),"utf8")),attempt=createAttempt(lessonSchema.parse(data),"checkpoint","rotation-evidence");
  await restoreProgress(page,{schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();const practice=page.locator("#practice");
  for(const [index,q] of attempt.questions.entries()){
    const p=q.parameters;let answers:Record<string,string>;
    if(index===0)answers={vx:String(-p.w*p.y),vy:String(p.w*p.x),ax:String(-p.a*p.y-p.w*p.w*p.x),ay:String(p.a*p.x-p.w*p.w*p.y),speed:`sqrt((${-p.w*p.y})^2+(${p.w*p.x})^2)`,rule:"both"};
    else if(index===1){const t=[p.y*p.fz-p.z*p.fy,p.z*p.fx-p.x*p.fz,p.x*p.fy-p.y*p.fx];answers={x:String(t[0]),y:String(t[1]),z:String(t[2]),axis:`(3*(${t[1]})+4*(${t[2]}))/5`};}
    else if(index===2){
      const R=p.radius,k=p.k,d=p.sense*p.offset*R,io=`${4*k}*${R}^2/2-${k}*(${R}^2/8+(${d}/2)^2)`;
      answers={mass:String(3*k),cm:`-${k}*(${d}/2)/${3*k}`,origin:io,center:`(${io})-${3*k}*(${d}/6)^2`};
    }else{
      const I=`(${p.alpha*(p.b+p.mass)*p.radius2*p.radius2}/4)/(${p.alpha})`,m=(p.b+p.mass)-p.b;
      answers={inertia:I,mass:`((${I})-${p.b*p.radius2*p.radius2}/4)/(${p.radius2}/2)^2`,validity:m<0?"invalid":"valid"};
    }
    for(const field of q.fields){
      if(field.kind==="choice"){const option=field.options.find(o=>o.id===answers[field.id]);if(!option)throw Error("Missing independent choice");await practice.getByLabel(option.label,{exact:true}).check();}
      else await practice.getByLabel(`${field.label}${field.unit?` (${field.unit})`:""}`,{exact:true}).fill(answers[field.id]);
    }
    if(index===0){
      await expect(practice.getByText("Saved in this browser.",{exact:true})).toBeVisible();await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
      for(const field of q.fields)if(field.kind!=="choice")await expect(practice.getByLabel(`${field.label}${field.unit?` (${field.unit})`:""}`,{exact:true})).toHaveValue(answers[field.id]);
      await expect(practice.getByLabel("Include both tangential and inward radial acceleration",{exact:true})).toBeChecked();
    }
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  const note="Mass radii determine inertia, while the independent force lever sets torque. Use the same axis and include radial acceleration when checking point motion.";
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true}).fill(note);await page.getByRole("button",{name:"Save lesson notes",exact:true}).click();await expect(page.getByText("Lesson notes saved.",{exact:true})).toBeVisible();
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const path=testInfo.outputPath("rotation-backup.json");await(await downloading).saveAs(path);const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m07-l01",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true})).toHaveValue(note);
});
