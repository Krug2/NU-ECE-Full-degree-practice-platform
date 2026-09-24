import { expect,test,type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { lessonSchema,type AnswerField } from "../../lib/learning/contracts";
import { createAttempt } from "../../lib/learning/attempts";
import { formatIntervals } from "../../lib/learning/intervals";
import { readStoredProgress,restoreProgress } from "./progress";

const route="/courses/mth-215/lessons/m04-l04";
const cases=[
  {domain:"[-1,inf)",range:"[3,inf)",x:"1",y:"11"},
  {domain:"(-inf,-1]",range:"[3,inf)",x:"-3",y:"11"},
  {domain:"[2,inf)",range:"(-inf,5]",x:"3",y:"2"},
  {domain:"(-inf,4]",range:"(-inf,3]",x:"0",y:"-1"},
  {domain:"R",range:"R",x:"0",y:"5"},
  {domain:"(-inf,-2]",range:"[-1,inf)",x:"-4",y:"7"},
];
async function domains(activity:Locator,domain:string,range:string,exists="yes"){
  await activity.getByLabel("Predicted original domain",{exact:true}).fill(domain);await activity.getByLabel("Predicted original range",{exact:true}).fill(range);
  await activity.getByLabel("Does an inverse function exist?",{exact:true}).selectOption(exists);
  if(exists==="yes"){await activity.getByLabel("Predicted inverse domain",{exact:true}).fill(range);await activity.getByLabel("Predicted inverse range",{exact:true}).fill(domain);}
  await activity.getByRole("button",{name:"Check domain predictions",exact:true}).click();
}
async function values(activity:Locator,forward:string,forwardBack:string,inverse:string,inverseBack:string){
  for(const [label,value] of [["Predicted f(x)",forward],["Predicted g(f(x))",forwardBack],["Predicted g(y)",inverse],["Predicted f(g(y))",inverseBack]])await activity.getByLabel(label,{exact:true}).fill(value);
  await activity.getByRole("button",{name:"Check composition predictions",exact:true}).click();
}
test("radical investigation distinguishes branches, inverse domains, exact boundaries and approximate roots without evidence",async({page})=>{
  test.setTimeout(180_000);const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/courses/mth-215/lessons/m04-l03");await page.getByRole("link",{name:"Next: Radical functions and restricted inverses",exact:true}).click();
  const guided=page.locator("#guided"),activity=page.locator("#investigate");
  await guided.getByRole("group",{name:"Inverse formula",exact:true}).locator('input[value="left"]').check();
  for(const [label,value] of [["Inverse domain","R"],["Inverse range","(-inf,2]"],["Recovered input g(11)","0"],["Returned value g(f(-1))","-sqrt(1)"],["Turning value g(-1)","4/2"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByRole("group",{name:"Does the original function accept x = 3?",exact:true}).locator('input[value="no"]').check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Review this reasoning");
  await guided.getByLabel("Inverse domain",{exact:true}).fill("[-1,inf)");await guided.getByRole("group",{name:"Inverse formula",exact:true}).locator('input[value="right"]').check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Review this reasoning");
  await guided.getByRole("group",{name:"Inverse formula",exact:true}).locator('input[value="left"]').check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await domains(activity,"R","[3,inf)");await expect(activity.locator(".radical-domain-status")).toContainText("Review the original domain");await expect(activity.getByRole("button",{name:"Check composition predictions",exact:true})).toHaveCount(0);
  await activity.getByLabel("Original power branch",{exact:true}).selectOption("all");await domains(activity,"R","[3,inf)");await expect(activity.locator(".radical-domain-status")).toContainText("repeats outputs");
  await domains(activity,"R","[3,inf)","no");await expect(activity.locator(".radical-domain-status")).toContainText("has no inverse function");await expect(activity.locator(".radical-inverse-curve")).toHaveCount(0);
  await activity.getByLabel("Original power branch",{exact:true}).selectOption("left");await domains(activity,"(-inf,-1]","[3,inf)");await values(activity,"11","1","-3","11");await expect(activity.locator(".radical-value-status")).toContainText("Review f(x), g(f(x))");
  await values(activity,"undefined","undefined","-3","11");await expect(activity.locator(".radical-value-status")).toContainText("All four predictions are correct");
  await activity.getByLabel("Radical example",{exact:true}).selectOption("3");await domains(activity,"(-inf,4]","(-inf,3]");
  await activity.getByLabel("Predicted inverse domain",{exact:true}).fill("R");await activity.getByRole("button",{name:"Check domain predictions",exact:true}).click();await expect(activity.locator(".radical-domain-status")).toContainText("Review the inverse domain");
  await domains(activity,"(-inf,4]","(-inf,3]");await activity.getByLabel("Original input x",{exact:true}).fill("4.000000000000000001");await activity.getByLabel("Inverse input y",{exact:true}).fill("3.000000000000000001");
  await values(activity,"undefined","undefined","undefined","undefined");await expect(activity.locator(".radical-value-status")).toContainText("All four predictions are correct");await expect(activity.locator(".radical-selected-point")).toHaveCount(0);
  await activity.getByLabel("Original input x",{exact:true}).fill("4");await activity.getByLabel("Inverse input y",{exact:true}).fill("3");await values(activity,"3","4","4","3");await expect(activity.locator(".radical-value-status")).toContainText("All four predictions are correct");
  await activity.getByLabel("Original input x",{exact:true}).fill("i");await activity.getByRole("button",{name:"Check composition predictions",exact:true}).click();await expect(activity.locator(".radical-result")).toHaveCount(0);await expect(activity.locator(".radical-value-status")).not.toHaveText("");
  await activity.getByLabel("Radical example",{exact:true}).selectOption("4");await domains(activity,"R","R");await activity.getByLabel("Original input x",{exact:true}).fill("sqrt(2)");await activity.getByLabel("Inverse input y",{exact:true}).fill("4");
  await values(activity,"17-10*sqrt(2)","sqrt(8)/2","0.21","4");await expect(activity.locator(".radical-value-status")).toContainText("Review g(y)");
  await values(activity,"17-10*sqrt(2)","sqrt(8)/2","0.206299474","4");await expect(activity.locator(".radical-value-status")).toContainText("All four predictions are correct");await expect(activity.getByRole("region",{name:"Both composition orders",exact:true})).toContainText("approximately");
  expect((await readStoredProgress(page)).learning.evidence).toEqual([]);await expect(page.locator(".katex-error")).toHaveCount(0);expect(errors).toEqual([]);
});
test("six inverse cases provide reflected graphs, accessible exact tables, mobile controls and reset",async({page},testInfo)=>{
  test.setTimeout(180_000);await page.goto(route);const activity=page.locator("#investigate");
  for(let i=0;i<cases.length;i++){
    const item=cases[i];await activity.getByLabel("Radical example",{exact:true}).selectOption(String(i));await domains(activity,item.domain,item.range);await expect(activity.locator(".radical-domain-status")).toContainText("All domain predictions are correct");
    await values(activity,item.y,item.x,item.x,item.y);await expect(activity.locator(".radical-value-status")).toContainText("All four predictions are correct");await expect(activity.getByRole("region",{name:"Both composition orders",exact:true}).getByRole("row")).toHaveCount(3);await expect(activity.locator(".radical-selected-point")).toHaveCount(2);
    const original=(await activity.locator(".radical-original-curve").getAttribute("points"))!.split(" ").map(pair=>pair.split(",").map(Number)),inverse=(await activity.locator(".radical-inverse-curve").getAttribute("points"))!.split(" ").map(pair=>pair.split(",").map(Number));
    for(let j=0;j<original.length;j++){expect(inverse[j][0]).toBeCloseTo(480-original[j][1],8);expect(inverse[j][1]).toBeCloseTo(480-original[j][0],8);}
  }
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await activity.locator(".radical-figure").screenshot({path:testInfo.outputPath("radical-mobile.png")});
  const table=activity.getByRole("region",{name:"Both composition orders",exact:true});await table.focus();await expect(table).toBeFocused();const button=activity.getByRole("button",{name:"Check composition predictions",exact:true});await button.focus();await button.press("Enter");await expect(activity.locator(".radical-value-status")).toContainText("All four predictions are correct");
  await activity.getByRole("button",{name:"Reset radical investigation",exact:true}).click();await expect(activity.locator(".radical-result")).toHaveCount(0);await expect(activity.getByLabel("Radical example",{exact:true})).toHaveValue("0");await expect(activity.getByLabel("Original power branch",{exact:true})).toHaveValue("right");await expect(activity.getByLabel("Predicted original domain",{exact:true})).toHaveValue("");
  await page.getByRole("button",{name:"Start practice",exact:true}).click();await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 32");
});
const answer=(field:AnswerField):string=>{
  if(field.kind==="choice")return field.correct;
  if(field.kind==="roots")return field.expected.map(value=>{const n=Number(value);return (n<0?"-":"")+"sqrt("+n*n+")";}).join(",")||"empty";
  if(field.kind==="intervals")return formatIntervals(field.expected);
  if(field.kind==="rational"||field.kind==="exact")return field.expected;
  if(field.kind==="polynomial")return "("+field.expected+")+0*x";
  throw new Error("Unexpected radical field");
};
const label=(field:AnswerField)=>field.label+("unit" in field&&field.unit?" ("+field.unit+")":"");
test("a missing inverse restriction blocks evidence and exact roots, fractions and polynomials survive reload and backup",async({page},testInfo)=>{
  test.setTimeout(180_000);const lesson=lessonSchema.parse(JSON.parse(await readFile("content/lessons/mth-215/m04-l04.json","utf8"))),variants=["canceled-hole","scale","root-to-power","wrong-branch"];
  const template={...lesson,checkpoint:lesson.checkpoint.map((slot,i)=>({...slot,variant:variants[i]}))};
  const attempt=Array.from({length:50},(_,i)=>createAttempt(template,"checkpoint","radical-browser-"+i)).find(a=>a.questions[1].fields.some(field=>field.kind==="rational"&&field.expected.includes("/")))!;expect(attempt).toBeDefined();
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  async function submit(missDomain:boolean){
    await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
    for(let i=0;i<attempt.questions.length;i++){
      for(const field of attempt.questions[i].fields){
        if(field.kind==="choice")await page.locator("#practice").getByRole("group",{name:field.label,exact:true}).locator('input[value="'+field.correct+'"]').check();
        else await page.locator("#practice").getByLabel(label(field),{exact:true}).fill(missDomain&&i===2&&field.id==="domain"?"R":answer(field));
      }
      if(!missDomain&&(i===0||i===2)){
        await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
        for(const field of attempt.questions[i].fields)if(field.kind!=="choice")await expect(page.locator("#practice").getByLabel(label(field),{exact:true})).toHaveValue(answer(field));
      }
      await page.getByRole("button",{name:i===3?"Submit checkpoint":"Next question",exact:true}).click();
    }
  }
  await restoreProgress(page,data);await submit(true);await expect(page.getByRole("heading",{name:"Keep working on this objective",exact:true})).toBeVisible();await expect(page.locator(".attempt-results")).toContainText("3 of 4 correct");expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
  await restoreProgress(page,data);await submit(false);await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const file=testInfo.outputPath("radical-progress.json");await(await download).saveAs(file);
  const backup=JSON.parse(await readFile(file,"utf8"));expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence).toHaveLength(1);
  for(const q of attempt.questions)for(const field of q.fields)expect(backup.learning.attempts[0].responses[q.id][field.id]).toBe(answer(field));
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
