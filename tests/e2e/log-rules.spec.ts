import { expect,test,type Locator,type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { lessonSchema,type AnswerField } from "../../lib/learning/contracts";
import { createAttempt } from "../../lib/learning/attempts";
import { formatIntervals } from "../../lib/learning/intervals";
import { readStoredProgress,restoreProgress } from "./progress";

const route="/courses/mth-215/lessons/m05-l03";
const cases=[
  {left:"(-inf,2) U (2,inf)",right:"(2,inf)",relationship:"left-larger",values:["0","undefined"],conclusion:"domain-mismatch",common:"yes",equivalent:"no"},
  {left:"(-inf,2) U (2,inf)",right:"(-inf,2) U (2,inf)",relationship:"same",values:["0","0"],conclusion:"agreement",common:"yes",equivalent:"yes"},
  {left:"(-inf,-2) U (1,inf)",right:"(1,inf)",relationship:"left-larger",values:["2*ln(2)","undefined"],conclusion:"domain-mismatch",common:"yes",equivalent:"no"},
  {left:"(-inf,-2) U (1,inf)",right:"(1,inf)",relationship:"left-larger",values:["-2*ln(2)","undefined"],conclusion:"domain-mismatch",common:"yes",equivalent:"no"},
  {left:"(-4,inf)",right:"(0,inf)",relationship:"left-larger",values:["ln(2)+ln(3)","3*ln(2)"],conclusion:"value-mismatch",common:"no",equivalent:"no"},
  {left:"(1,3) U (3,inf)",right:"(1,inf)",relationship:"right-larger",values:["not defined","ln(2)"],conclusion:"domain-mismatch",common:"yes",equivalent:"no"},
];
async function domains(activity:Locator,left:string,right:string,relationship:string){
  await activity.getByLabel("Predicted L domain",{exact:true}).fill(left);await activity.getByLabel("Predicted R domain",{exact:true}).fill(right);
  await activity.getByLabel("Predicted domain relationship",{exact:true}).selectOption(relationship);await activity.getByRole("button",{name:"Check rewrite domains",exact:true}).click();
}
async function predict(activity:Locator,values:string[]){
  await activity.getByLabel("Predicted L(x)",{exact:true}).fill(values[0]);await activity.getByLabel("Predicted R(x)",{exact:true}).fill(values[1]);await activity.getByRole("button",{name:"Check value predictions",exact:true}).click();
}
async function explain(activity:Locator,conclusion:string,common:string,equivalent:string){
  await activity.getByRole("group",{name:"What does this probe establish?",exact:true}).locator('input[value="'+conclusion+'"]').check();
  await activity.getByLabel("Do values agree at every input where both expressions exist?",{exact:true}).selectOption(common);
  await activity.getByLabel("Do L and R define the same real function on their complete domains?",{exact:true}).selectOption(equivalent);
  await activity.getByRole("button",{name:"Check rewrite explanation",exact:true}).click();
}
const answer=(field:AnswerField):string=>{
  if(field.kind==="choice")return field.correct;
  if(field.kind==="intervals")return formatIntervals(field.expected);
  if(field.kind==="numeric")return field.expected.toFixed(6);
  if(field.kind==="roots"||field.kind==="logarithmic-roots")return field.expected.join(";")||"none";
  if(field.kind==="rational"||field.kind==="exact"||field.kind==="logarithmic"||field.kind==="polynomial"||field.kind==="rational-expression")return field.expected;
  throw new Error("Unexpected logarithm-rules field: "+field.kind);
};
async function fillField(container:Locator,field:AnswerField,value=answer(field)){
  if(field.kind==="choice")await container.getByRole("group",{name:field.label,exact:true}).locator('input[value="'+value+'"]').check();
  else await container.getByLabel(field.label,{exact:true}).fill(value);
}

test("guided candidate checks and rewrite predictions distinguish domains, exact values and identities",async({page})=>{
  test.setTimeout(180_000);const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.goto(route);
  await expect(page.locator("#read > section")).toHaveCount(20);await expect(page.locator(".worked-example")).toHaveCount(47);
  const lesson=lessonSchema.parse(JSON.parse(await readFile("content/lessons/mth-215/m05-l03.json","utf8"))),guided=page.locator("#guided"),activity=page.locator("#investigate");
  for(const field of lesson.guided.question.fields)await fillField(guided,field,field.id==="domain"?"R":field.id==="solutions"?"-1;5":answer(field));
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Review this reasoning");
  await guided.getByLabel("Original common real domain",{exact:true}).fill("(3,inf)");await guided.getByLabel("Complete exact real solution set",{exact:true}).fill("5");
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await domains(activity,"(2,inf)","(2,inf)","same");await expect(activity.locator(".rewrite-domain-status")).toContainText("Review");await expect(activity.getByLabel("Probe input x",{exact:true})).toHaveCount(0);
  await domains(activity,cases[0].left,cases[0].right,cases[0].relationship);await predict(activity,["0","0"]);await expect(activity.locator(".rewrite-value-status")).toContainText("undefined");await expect(activity.locator(".rewrite-result")).toHaveCount(0);
  await predict(activity,cases[0].values);await explain(activity,"domain-mismatch","yes","yes");await expect(activity.locator(".rewrite-explanation-status")).toContainText("Review");await expect(activity.locator(".rewrite-proof")).toHaveCount(0);
  await explain(activity,"domain-mismatch","yes","no");await expect(activity.locator(".rewrite-proof")).toBeVisible();
  await activity.getByLabel("Logarithm rewrite",{exact:true}).selectOption("4");await expect(activity.getByLabel("Predicted L domain",{exact:true})).toHaveValue("");await expect(activity.locator(".rewrite-result")).toHaveCount(0);
  await domains(activity,cases[4].left,cases[4].right,cases[4].relationship);await predict(activity,[String(Math.log(6)),"ln(8)"]);await expect(activity.locator(".rewrite-value-status")).toContainText("rounded approximation");await expect(activity.locator(".rewrite-result")).toHaveCount(0);
  await predict(activity,cases[4].values);await explain(activity,"value-mismatch","no","no");await expect(activity.locator(".rewrite-proof")).toBeVisible();
  await activity.getByLabel("Probe input x",{exact:true}).fill("4/3");await expect(activity.locator(".rewrite-result")).toHaveCount(0);await expect(activity.getByLabel("Predicted L(x)",{exact:true})).toHaveValue("");
  await predict(activity,["ln(16)-ln(3)","ln(16/3)"]);await explain(activity,"agreement","yes","yes");await expect(activity.locator(".rewrite-explanation-status")).toContainText("Review");
  await explain(activity,"agreement","no","no");await expect(activity.locator(".rewrite-proof")).toBeVisible();
  await activity.getByLabel("Probe input x",{exact:true}).fill("-4");await predict(activity,["undefined","undefined"]);await explain(activity,"neither-defined","no","no");await expect(activity.locator(".rewrite-proof")).toBeVisible();
  for(const invalid of ["1000001","1/0"]){await activity.getByLabel("Probe input x",{exact:true}).fill(invalid);await predict(activity,["0","0"]);await expect(activity.locator(".rewrite-value-status")).not.toBeEmpty();await expect(activity.locator(".rewrite-result")).toHaveCount(0);}
  await activity.getByLabel("Predicted L domain",{exact:true}).fill("R");await expect(activity.getByLabel("Probe input x",{exact:true})).toHaveCount(0);
  expect((await readStoredProgress(page)).learning.evidence).toEqual([]);await expect(page.locator(".katex-error")).toHaveCount(0);expect(errors).toEqual([]);
});

test("six rewrite investigations support mobile reading, keyboard controls, accessible tables and reset",async({page},testInfo)=>{
  test.setTimeout(240_000);await page.goto(route);const activity=page.locator("#investigate");
  for(let i=0;i<cases.length;i++){
    const item=cases[i];await activity.getByLabel("Logarithm rewrite",{exact:true}).selectOption(String(i));await domains(activity,item.left,item.right,item.relationship);
    await expect(activity.locator(".rewrite-domain-status")).toContainText("Both original domains and their relationship are correct");await predict(activity,item.values);await expect(activity.locator(".rewrite-value-status")).toContainText("Both value predictions are correct");
    await explain(activity,item.conclusion,item.common,item.equivalent);await expect(activity.locator(".rewrite-explanation-status")).toContainText("both whole-domain judgments are correct");await expect(activity.locator(".rewrite-proof")).toBeVisible();
    await expect(activity.getByRole("region",{name:"Exact values of the two original expressions",exact:true}).getByRole("row")).toHaveCount(3);
  }
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);const audit=await new AxeBuilder({page}).setLegacyMode().withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await activity.getByLabel("Probe input x",{exact:true}).focus();await activity.locator("h2").scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath("log-rules-mobile.png")});
  await activity.getByRole("button",{name:"Check rewrite explanation",exact:true}).focus();await page.screenshot({path:testInfo.outputPath("log-rules-explanation-mobile.png")});
  const table=activity.getByRole("region",{name:"Exact values of the two original expressions",exact:true});await table.focus();await expect(table).toBeFocused();
  const explainButton=activity.getByRole("button",{name:"Check rewrite explanation",exact:true});await explainButton.focus();await explainButton.press("Enter");await expect(activity.locator(".rewrite-proof")).toBeVisible();
  const reset=activity.getByRole("button",{name:"Reset rewrite investigation",exact:true});await reset.focus();await reset.press("Enter");await expect(activity.getByLabel("Logarithm rewrite",{exact:true})).toHaveValue("0");await expect(activity.getByLabel("Predicted L domain",{exact:true})).toHaveValue("");await expect(activity.locator(".rewrite-result")).toHaveCount(0);await expect(activity.getByLabel("Probe input x",{exact:true})).toHaveCount(0);
  const selector=activity.getByLabel("Logarithm rewrite",{exact:true});await selector.focus();await selector.press("ArrowDown");await expect(selector).toHaveValue("1");await selector.press("Tab");
  for(let i=0;i<2;i++){const equation=activity.locator(".rewrite-formulas .display-equation").nth(i);await expect(equation).toBeFocused();await equation.press("Tab");}
  await expect(activity.getByLabel("Predicted L domain",{exact:true})).toBeFocused();
  await page.getByRole("button",{name:"Start practice",exact:true}).click();await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 34");
});

test("critical logarithmic domain errors block evidence and complete exact work survives reload and backup",async({page},testInfo)=>{
  test.setTimeout(180_000);const lesson=lessonSchema.parse(JSON.parse(await readFile("content/lessons/mth-215/m05-l03.json","utf8"))),variants=["change-base","canceled-hole","quadratic-two","equal-arguments"],template={...lesson,checkpoint:lesson.checkpoint.map((slot,i)=>({...slot,variant:variants[i]}))};
  let attempt=createAttempt(template,"checkpoint","log-rules-browser-0");
  for(let i=1;attempt.questions[3].parameters.t>0&&i<100;i++)attempt=createAttempt(template,"checkpoint","log-rules-browser-"+i);
  expect(attempt.questions[3].parameters.t).toBeLessThanOrEqual(0);
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  async function openCheckpoint(target:Page){await target.goto(route);await target.getByRole("button",{name:"Checkpoint",exact:true}).click();}
  async function submit(acceptInvalidCandidate:boolean){
    await openCheckpoint(page);
    for(let i=0;i<attempt.questions.length;i++){
      const question=attempt.questions[i];for(const field of question.fields)await fillField(page.locator("#practice"),field,acceptInvalidCandidate&&i===3&&field.id==="solutions"?String(question.parameters.x0):answer(field));
      if(!acceptInvalidCandidate&&i<3){
        await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
        for(const field of question.fields)if(field.kind!=="choice")await expect(page.locator("#practice").getByLabel(field.label,{exact:true})).toHaveValue(answer(field));
      }
      await page.getByRole("button",{name:i===3?"Submit checkpoint":"Next question",exact:true}).click();
    }
  }
  await restoreProgress(page,data);await submit(true);await expect(page.getByRole("heading",{name:"Keep working on this objective",exact:true})).toBeVisible();await expect(page.locator(".attempt-results")).toContainText("3 of 4 correct");expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
  await restoreProgress(page,data);await submit(false);await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const file=testInfo.outputPath("log-rules-progress.json");await(await download).saveAs(file);
  const backup=JSON.parse(await readFile(file,"utf8"));expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence).toHaveLength(1);
  for(const question of attempt.questions)for(const field of question.fields)expect(backup.learning.attempts[0].responses[question.id][field.id]).toBe(answer(field));
  await restoreProgress(page,backup);await openCheckpoint(page);await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
