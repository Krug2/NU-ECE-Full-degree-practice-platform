import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m08-l01";
const labels=["Predicted left normal (N)","Predicted right normal (N)","Predicted required left friction (N)"];
const predict=async(lab:Locator,answers:string[],decision="admitted")=>{
  for(const [i,label] of labels.entries())await lab.getByLabel(label,{exact:true}).fill(answers[i]);
  await lab.getByLabel("Predicted contact decision",{exact:true}).selectOption(decision);
  const check=lab.getByRole("button",{name:"Check static account",exact:true});await check.focus();await check.press("Enter");
};
const value=(region:Locator,name:string)=>region.getByRole("row").filter({has:region.page().getByRole("rowheader",{name,exact:true})}).getByRole("cell").first();
const selected=(lab:Locator)=>lab.getByRole("region",{name:"Selected support account",exact:true});

for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const)test(`statics ${name} diagrams, tables, and keyboard controls are accessible`,async({page},testInfo)=>{
  await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});await page.goto(route);const lab=page.locator("#investigate");
  await predict(lab,["36","84","-12"]);await lab.getByText("Complete load-position sweep table",{exact:true}).click();
  const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await lab.getByRole("img").first().scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`statics-${name}-geometry.png`)});
  await lab.getByRole("img").nth(1).scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath(`statics-${name}-reactions.png`)});
  const table=lab.getByRole("region",{name:"Complete statics sweep",exact:true});await expect(table.getByRole("row").first()).toContainText("Support decision");
  if(name==="mobile"){await table.scrollIntoViewIfNeeded();await table.focus();await table.press("ArrowRight");await expect.poll(()=>table.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await table.press("ArrowDown");await expect.poll(()=>table.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);await expect(table.getByRole("columnheader",{name:"NA (N)",exact:true})).toBeVisible();await page.screenshot({path:testInfo.outputPath("statics-mobile-table.png")});}
});

test("statics guided feedback rejects total-normal friction and distinguishes equations from admitted contacts",async({page})=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.goto(route);
  const guided=page.locator("#guided"),names=["Left candidate normal (N)","Right candidate normal (N)","Required signed left friction (N)","Available left friction magnitude (N)","Remaining friction margin (N)"];
  for(const [i,label]of names.entries())await guided.getByLabel(label,{exact:true}).fill(["16","104","-12","48","36"][i]);
  await guided.getByLabel("It holds because the total 120 N normal gives 48 N of friction capacity",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Only the left support is rough");
  await guided.getByLabel(names[3],{exact:true}).fill("32/5");await guided.getByLabel(names[4],{exact:true}).fill("-28/5");
  await guided.getByLabel("Normals are admitted, but left friction cannot sustain the candidate",{exact:true}).check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate");
  await predict(lab,["40","80","-12"]);await expect(lab.getByRole("status")).toContainText("Revisit left normal, right normal");
  await predict(lab,["36","84","-12"]);await expect(lab.getByRole("status")).toContainText("All four predictions agree");
  const account=selected(lab);await expect(value(account,"Downward-load centroid")).toHaveText("3");await expect(value(account,"Effective vertical reaction line")).toHaveText("3.1");
  for(const label of ["Horizontal force residual","Vertical force residual","Moment residual about left end","Moment residual about A","Moment residual about B"])await expect(value(account,label)).toHaveText("0");
  const slider=lab.getByLabel("Load-position sample",{exact:true});await slider.focus();await slider.press("Home");await expect(value(account,"Left candidate normal")).toHaveText("96");await expect(slider).toHaveAttribute("aria-valuetext",/x = 0 m; Admitted/);
  await slider.press("ArrowRight");await expect(slider).toHaveValue("1");await slider.press("End");await expect(value(account,"Left candidate normal")).toHaveText("-24");await expect(value(account,"Left friction capacity")).toContainText("Unavailable");
  await lab.getByRole("button",{name:"Left friction reaches its bound",exact:true}).click();await expect(value(account,"Left candidate normal")).toHaveText("30");await expect(value(account,"Right candidate normal")).toHaveText("90");await expect(value(account,"Algebraic friction margin")).toHaveText("0");await expect(slider).toHaveAttribute("aria-valuetext","x = 3.3 m; Admitted at a limit");
  await lab.getByRole("button",{name:"Left normal reaches zero",exact:true}).click();await expect(value(account,"Left candidate normal")).toHaveText("0");await expect(value(account,"Required left friction")).toHaveText("-12");await expect(slider).toHaveAttribute("aria-valuetext","x = 4.8 m; Friction capacity fails");
  await expect(lab.getByRole("region",{name:"External force inventory",exact:true}).getByRole("row")).toHaveCount(7);
  await page.reload();await expect(lab.getByLabel("Initial load position (m)",{exact:true})).toHaveValue("3");await expect(lab.getByRole("img")).toHaveCount(0);expect(errors).toEqual([]);
});

test("statics load comparisons preserve distributed moments and reject impossible reactions",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate");await lab.getByText("Load prepared comparisons",{exact:true}).click();
  const cases:[string,string[],string,string,string][]=[
    ["Friction fails",["16","104","-12"],"friction","6.4","-5.6"],
    ["Left contact fails",["-4","124","-12"],"contact","Unavailable: negative normal candidate","-13.6"],
    ["Right contact fails",["150","-30","0"],"contact","60","60"],
    ["Right-heavy line load",["20","100","0"],"admitted","8","8"],
    ["Left-heavy line load",["60","60","0"],"admitted","24","24"],
    ["Couple cancels raised-load moment",["40","80","-12"],"admitted","16","4"],
  ];
  for(const [name,answers,decision,capacity,margin] of cases){
    await lab.getByRole("button",{name,exact:true}).click();await predict(lab,answers,decision);await expect(lab.getByRole("status")).toContainText("All four predictions agree");
    await expect(value(selected(lab),"Left friction capacity")).toHaveText(capacity);await expect(value(selected(lab),"Algebraic friction margin")).toHaveText(margin);
    if(name==="Right-heavy line load"||name==="Left-heavy line load")await expect(lab.getByRole("region",{name:"External force inventory",exact:true}).getByRole("row").filter({hasText:"Distributed-load resultant"})).toContainText(name==="Right-heavy line load"?"4":"2");
  }
});

test("statics feasible windows include singleton and empty sets without invented post-failure equilibria",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate");await lab.getByText("Load prepared comparisons",{exact:true}).click();
  await lab.getByRole("button",{name:"Single admissible position",exact:true}).click();await predict(lab,["80","0","-40"]);await expect(lab).toContainText("Only x = 1 m is admitted");await expect(lab.getByLabel("Load-position sample",{exact:true})).toHaveAttribute("aria-valuetext","x = 1 m; Admitted at a limit");
  const slider=lab.getByLabel("Load-position sample",{exact:true});await slider.press("ArrowLeft");await expect(value(selected(lab),"Right candidate normal")).toHaveText("-1");await expect(slider).toHaveAttribute("aria-valuetext",/Unilateral contact fails/);
  await lab.getByRole("button",{name:"Left friction reaches its bound",exact:true}).click();await slider.press("ArrowRight");await expect(value(selected(lab),"Algebraic friction margin")).toHaveText("-0.5");
  await lab.getByRole("button",{name:"No admissible position",exact:true}).click();await predict(lab,["80","0","-41"],"friction");await expect(lab).toContainText("No admissible load position");
  await lab.getByRole("button",{name:"Position-independent loading",exact:true}).click();await predict(lab,["20","20","0"]);await expect(lab).toContainText("Admissible positions: [0, 4] m");await slider.press("End");await expect(value(selected(lab),"Left candidate normal")).toHaveText("20");await expect(value(selected(lab),"Right candidate normal")).toHaveText("20");await expect(lab).toContainText("No distributed centroid exists when Q is zero.");
});

test("statics invalid domains and predictions do not reveal an unchecked result",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check static account",exact:true});
  await check.click();await expect(lab.getByRole("status")).toContainText("Predict both normal reactions");
  await predict(lab,["36","84","-12"]);await lab.getByLabel("Left support position (m)",{exact:true}).fill("4");await check.click();await expect(lab.getByRole("status")).toContainText("supports at least 0.1 m apart");await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByLabel("Left support position (m)",{exact:true}).fill("1");await lab.getByLabel("Initial load position (m)",{exact:true}).fill("7");await check.click();await expect(lab.getByRole("status")).toContainText("initial load position on the beam");
  await lab.getByLabel("Initial load position (m)",{exact:true}).fill("");await check.click();await expect(lab.getByRole("status")).toContainText("empty input is not zero");
  await lab.getByLabel("Initial load position (m)",{exact:true}).fill("3");await predict(lab,["sqrt(-1)","84","-12"]);await expect(lab.getByRole("status")).toContainText("must be real");
  await predict(lab,["1e999","84","-12"]);await expect(lab.getByRole("status")).toContainText("finite real");await expect(lab.getByRole("img")).toHaveCount(0);
  await predict(lab,["72/2","168/2","-24/2"],"contact");await expect(lab.getByRole("status")).toContainText("Revisit contact decision");
  await lab.getByRole("button",{name:"Reset statics investigation",exact:true}).click();await expect(lab.getByLabel(labels[0],{exact:true})).toHaveValue("");await expect(lab.getByLabel("Predicted contact decision",{exact:true})).toHaveValue("");
  const input=lab.getByLabel("Horizontal load height (m)",{exact:true});await input.focus();await input.press("ArrowUp");await expect(input).toHaveValue("1.1");
});

test("statics checkpoint saves independently solved reactions and validity decisions through reload and backup",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m08-l01.json",import.meta.url),"utf8")),attempt=createAttempt(lessonSchema.parse(data),"checkpoint","statics-evidence");
  await restoreProgress(page,{schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();const practice=page.locator("#practice");
  for(const [index,q] of attempt.questions.entries()){
    const p=q.parameters;let answers:Record<string,string>;
    if(index===0){
      const a=`(${p.W}*(${p.L}/2)+${p.P}*(${p.L}-${p.x})+${p.M})/${p.L}`;
      answers={a,b:`${p.W}+${p.P}-(${a})`,centroid:`(${p.W}*${p.L}/2+${p.P}*${p.x})/(${p.W}+${p.P})`};
    }else if(index===1){
      answers={load:`${p.L}*(${p.left}+${p.right})/2`,centroid:`${p.L}*(${p.left}+2*${p.right})/(3*(${p.left}+${p.right}))`,a:`${p.L}*(2*${p.left}+${p.right})/6`,b:`${p.L}*(${p.left}+2*${p.right})/6`};
    }else if(index===2){
      const a=`(${30*p.scale}*(5-${p.x})-(${p.H}))/3`;
      answers={a,b:`${60*p.scale}-(${a})`,friction:String(-p.H),minimum:`${Math.abs(p.H)}/(${a})`,margin:`${p.muNum}/${p.muDen}*(${a})-${Math.abs(p.H)}`,regime:p.margin>=0?"admitted":"fails"};
    }else answers={vertical:String(p.W),horizontal:String(-p.H),moment:`${p.M}-${p.W}*${p.L}/2`,rank:2*p.M===p.W*p.L?"family":"impossible"};
    for(const f of q.fields){
      if(f.kind==="choice"){const option=f.options.find(o=>o.id===answers[f.id]);if(!option)throw Error("Missing independently derived decision");await practice.getByLabel(option.label,{exact:true}).check();}
      else await practice.getByLabel(`${f.label}${f.unit?` (${f.unit})`:""}`,{exact:true}).fill(answers[f.id]);
    }
    if(index===2){
      await expect(practice.getByText("Saved in this browser.",{exact:true})).toBeVisible();await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
      for(const f of q.fields){
        if(f.kind==="choice"){const option=f.options.find(o=>o.id===answers[f.id]);if(!option)throw Error("Missing saved decision");await expect(practice.getByLabel(option.label,{exact:true})).toBeChecked();}
        else await expect(practice.getByLabel(`${f.label}${f.unit?` (${f.unit})`:""}`,{exact:true})).toHaveValue(answers[f.id]);
      }
    }
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  const note="At x=4 m, the beam needs NA=16 N, NB=104 N, and fA=-12 N. Only the rough left support supplies friction: its capacity is 6.4 N. Zero moment residual does not repair the negative friction margin. I checked moments about both supports; the first limit is at x=3.3 m.";
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true}).fill(note);await page.getByRole("button",{name:"Save lesson notes",exact:true}).click();await expect(page.getByText("Lesson notes saved.",{exact:true})).toBeVisible();
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const path=testInfo.outputPath("statics-backup.json");await(await downloading).saveAs(path);const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m08-l01",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true})).toHaveValue(note);
});

