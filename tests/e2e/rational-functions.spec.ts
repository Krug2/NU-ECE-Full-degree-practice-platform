import { expect,test,type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { lessonSchema,type AnswerField } from "../../lib/learning/contracts";
import { createAttempt } from "../../lib/learning/attempts";
import { readStoredProgress,restoreProgress } from "./progress";

const route="/courses/mth-215/lessons/m04-l01";
async function predict(activity:Locator,input:string,original:string,reduced:string,kind:string){
  await activity.getByLabel("Real input to investigate",{exact:true}).fill(input);
  await activity.getByLabel("Predicted original value f(x)",{exact:true}).fill(original);
  await activity.getByLabel("Predicted reduced value g(x)",{exact:true}).fill(reduced);
  await activity.getByLabel("Predicted input type",{exact:true}).selectOption(kind);
  await activity.getByRole("button",{name:"Check function predictions",exact:true}).click();
}
test("rational investigation retains original exclusions and handles exact and invalid inputs",async({page})=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/courses/mth-215/lessons/m03-l04");await page.getByRole("link",{name:"Next: Holes, asymptotes, and intercepts",exact:true}).click();
  const guided=page.locator("#guided"),activity=page.locator("#investigate");
  for(const [label,value] of [["Reduced expression","(x^2-x-2)/(x-3)"],["All original excluded inputs","2,3"],["Inputs with holes","2"],["Vertical asymptote inputs","3"],["All real x-intercept inputs","-1,2"],["Hole height at x = 2","0"],["Y-intercept output","4/6"],["End trend Q(x)","2+x"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Review this reasoning");
  await guided.getByLabel("All real x-intercept inputs",{exact:true}).fill("-1");await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await activity.getByRole("button",{name:"Check function predictions",exact:true}).click();await expect(activity.getByRole("status")).toContainText("Predict both values");
  await predict(activity,"1","2","2","allowed");await expect(activity.getByRole("status")).toContainText("Check the original denominator");
  await predict(activity,"1","undefined","4/2","hole");await expect(activity.getByRole("status")).toContainText("All three predictions are correct");
  const middle=activity.getByRole("region",{name:"Original and reduced value comparison",exact:true}).locator("tbody tr").nth(2);
  await expect(middle.locator("td").nth(0)).toHaveText("undefined");await expect(activity.locator(".rational-hole")).toHaveCount(1);
  await predict(activity,"2","3","3","allowed");await expect(activity.getByRole("status")).toContainText("All three predictions are correct");
  for(const input of ["i","sqrt(2)+sqrt(3)"]){await predict(activity,input,"0","0","allowed");await expect(activity.getByRole("status")).toContainText("one real quadratic radical");await expect(activity.locator(".rational-function-result")).toHaveCount(0);}
  await predict(activity,"sqrt(2)","1+sqrt(2)","sqrt(2)+1","allowed");await expect(activity.getByRole("status")).toContainText("All three predictions are correct");
  await expect(activity.getByRole("region",{name:"Original and reduced value comparison",exact:true}).locator("tbody tr")).toHaveCount(5);
  expect((await readStoredProgress(page)).learning.evidence).toEqual([]);await expect(page.locator(".katex-error")).toHaveCount(0);expect(errors).toEqual([]);
});
test("all rational graph cases preserve gaps and support mobile, keyboard, and accessible comparisons",async({page},testInfo)=>{
  test.setTimeout(120_000);await page.goto(route);const activity=page.locator("#investigate");
  const cases=[{x:"1",original:"undefined",reduced:"2",kind:"hole",holes:1,poles:0},{x:"1",original:"undefined",reduced:"-1/4",kind:"hole",holes:1,poles:1},{x:"1",original:"undefined",reduced:"undefined",kind:"pole",holes:0,poles:1},{x:"-2",original:"undefined",reduced:"0",kind:"hole",holes:1,poles:0},{x:"0",original:"0",reduced:"0",kind:"allowed",holes:0,poles:0},{x:"2",original:"undefined",reduced:"undefined",kind:"pole",holes:0,poles:1}];
  for(let index=0;index<cases.length;index++){
    const item=cases[index];await activity.getByLabel("Rational function example",{exact:true}).selectOption(String(index));await expect(activity.locator(".rational-function-result")).toHaveCount(0);
    await predict(activity,item.x,item.original,item.reduced,item.kind);await expect(activity.getByRole("status")).toContainText("All three predictions are correct");
    await expect(activity.locator(".rational-hole")).toHaveCount(item.holes);await expect(activity.locator(".rational-pole")).toHaveCount(item.poles);
    if(index===2)await expect(activity.getByRole("region",{name:"Vertical asymptote behavior",exact:true}).locator("tbody td")).toHaveText(["2","positive infinity","positive infinity"]);
    if(index===3)await expect(activity.locator(".rational-function-result")).toContainText("X-intercept inputs: none");
    if(index===4)await expect(activity.locator(".rational-function-result")).toContainText("original graph meets this trend at: 0");
  }
  await activity.getByLabel("Rational function example",{exact:true}).selectOption("1");await predict(activity,"-3","undefined","undefined","pole");
  await expect(activity.getByRole("region",{name:"Vertical asymptote behavior",exact:true}).locator("tbody td")).toHaveText(["1","positive infinity","negative infinity"]);
  await activity.getByLabel("Horizontal graph extent",{exact:true}).selectOption("2");await expect(activity.locator(".rational-pole")).toHaveCount(0);await expect(activity.locator(".rational-function-result")).toContainText("0 of 1 vertical asymptotes");
  await activity.getByLabel("Horizontal graph extent",{exact:true}).selectOption("5");await predict(activity,"1","undefined","-1/4","hole");
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await activity.locator(".polynomial-figure").screenshot({path:testInfo.outputPath("rational-functions-mobile.png")});
  const table=activity.getByRole("region",{name:"Original and reduced value comparison",exact:true});await table.focus();await expect(table).toBeFocused();
  const check=activity.getByRole("button",{name:"Check function predictions",exact:true});await check.focus();await check.press("Enter");await expect(activity.getByRole("status")).toContainText("All three predictions are correct");
  await activity.getByRole("button",{name:"Reset rational investigation",exact:true}).click();await expect(activity.getByLabel("Rational function example",{exact:true})).toHaveValue("0");await expect(activity.locator(".rational-function-result")).toHaveCount(0);
  await page.getByRole("button",{name:"Start practice",exact:true}).click();await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 31");
});
const answer=(field:AnswerField):string=>{
  if(field.kind==="choice")return field.correct;
  if(field.kind==="roots")return field.expected.join(",")||"empty";
  if(field.kind==="polynomial"||field.kind==="rational-expression"||field.kind==="rational"||field.kind==="exact")return field.expected;
  if(field.kind==="intervals")return field.expected.map(i=>(i.lowerClosed?"[":"(")+(i.lower??"-inf")+","+(i.upper??"inf")+(i.upperClosed?"]":")")).join(" U ");
  throw new Error("Unexpected rational-function field");
};
test("a lost original exclusion blocks evidence and exact domains survive reload and backup",async({page},testInfo)=>{
  test.setTimeout(120_000);const lesson=lessonSchema.parse(JSON.parse(await readFile("content/lessons/mth-215/m04-l01.json","utf8")));
  const variants=["hole-zero","y-excluded","excluded-crossing","model-domain"],attempt=createAttempt({...lesson,checkpoint:lesson.checkpoint.map((slot,i)=>({...slot,variant:variants[i]}))},"checkpoint","rational-functions-browser");
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  const excluded=attempt.questions[0].fields.find(f=>f.id==="excluded")!;
  async function submit(missDomain:boolean){
    await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
    for(let i=0;i<attempt.questions.length;i++){
      for(const field of attempt.questions[i].fields){
        if(field.kind==="choice")await page.locator("#practice").getByRole("group",{name:field.label,exact:true}).locator('input[value="'+field.correct+'"]').check();
        else await page.locator("#practice").getByLabel(field.label+(field.unit?" ("+field.unit+")":""),{exact:true}).fill(missDomain&&i===0&&field.id==="excluded"?"empty":answer(field));
      }
      if(!missDomain&&i===0){await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(page.locator("#practice").getByLabel(excluded.label,{exact:true})).toHaveValue(answer(excluded));}
      await page.getByRole("button",{name:i===3?"Submit checkpoint":"Next question",exact:true}).click();
    }
  }
  await restoreProgress(page,data);await submit(true);await expect(page.getByRole("heading",{name:"Keep working on this objective",exact:true})).toBeVisible();await expect(page.locator(".attempt-results")).toContainText("3 of 4 correct");expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
  await restoreProgress(page,data);await submit(false);await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const file=testInfo.outputPath("rational-functions-progress.json");await(await download).saveAs(file);
  const backup=JSON.parse(await readFile(file,"utf8"));expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence).toHaveLength(1);
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
