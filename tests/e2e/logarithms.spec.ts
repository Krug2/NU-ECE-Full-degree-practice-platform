import { expect,test,type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { lessonSchema,type AnswerField } from "../../lib/learning/contracts";
import { createAttempt } from "../../lib/learning/attempts";
import { formatIntervals } from "../../lib/learning/intervals";
import { readStoredProgress,restoreProgress } from "./progress";

const route="/courses/mth-215/lessons/m05-l02";
const cases=[
  {range:"(0,inf)",values:["8","3","3","8"]},
  {range:"(0,inf)",values:["1/9","2","2","1/9"]},
  {range:"(4,inf)",values:["16","2","3","10"]},
  {range:"(-inf,5)",values:["-3","1","2","1"]},
  {range:"(-1,inf)",values:["-3/4","0","4","3"]},
  {range:"(-3,inf)",values:[String(2*Math.E-3),String(2*Math.LN2),"2","1"]},
];
async function domains(activity:Locator,range:string,inverseDomain=range){
  for(const [label,value] of [["Predicted F domain","R"],["Predicted F range",range],["Predicted G domain",inverseDomain],["Predicted G range","R"]])await activity.getByLabel(label,{exact:true}).fill(value);
  await activity.getByRole("button",{name:"Check inverse domains",exact:true}).click();
}
async function predict(activity:Locator,values:string[]){
  const labels=["Predicted F(t)","Predicted G(u)","Predicted G(F(t))","Predicted F(G(u))"];
  for(let i=0;i<labels.length;i++)await activity.getByLabel(labels[i],{exact:true}).fill(values[i]);
  await activity.getByRole("button",{name:"Check inverse predictions",exact:true}).click();
}
test("logarithm lesson preserves open domains, exact compositions and calculator distinctions without evidence",async({page})=>{
  test.setTimeout(180_000);const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/courses/mth-215/lessons/m05-l01");await page.getByRole("link",{name:"Next: Logarithms as inverse functions",exact:true}).click();
  const guided=page.locator("#guided"),activity=page.locator("#investigate");
  for(const [label,value] of [["Inverse outside coefficient A","2"],["Inverse inside coefficient C","1/3"],["Inverse input shift H","7"],["Inverse output shift K","1"],["Full inverse domain","(-inf,7]"],["Recovered original input G(1)","3"],["Exact G(F(-1))","-1"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByRole("group",{name:"What happens at the inverse input y = 7?",exact:true}).locator('input[value="undefined"]').check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Review this reasoning");
  await guided.getByLabel("Inverse inside coefficient C",{exact:true}).fill("-1/3");await guided.getByLabel("Full inverse domain",{exact:true}).fill("(-inf,7)");await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await activity.getByLabel("Exponential and logarithm pair",{exact:true}).selectOption("3");await domains(activity,"(-inf,5)","(-inf,5]");await expect(activity.locator(".logarithm-domain-status")).toContainText("Review");await expect(activity.getByRole("button",{name:"Check inverse predictions",exact:true})).toHaveCount(0);
  await domains(activity,"(-inf,5)");await predict(activity,["-3","2","2","1"]);await expect(activity.locator(".logarithm-prediction-status")).toContainText("Review: Predicted G(u)");await predict(activity,cases[3].values);await expect(activity.locator(".logarithm-prediction-status")).toContainText("All four predictions are correct");
  for(const probe of ["5","6"]){
    await activity.getByLabel("Inverse input u",{exact:true}).fill(probe);await expect(activity.locator(".logarithm-result")).toHaveCount(0);
    await predict(activity,["-3","undefined","2","not defined"]);await expect(activity.locator(".logarithm-prediction-status")).toContainText("All four predictions are correct");await expect(activity.locator(".logarithm-inverse-point")).toHaveCount(0);await expect(activity.locator(".logarithm-result")).toContainText("cannot restore an input excluded by its inner logarithm");
  }
  const near="49999999999999999999999999999/10000000000000000000000000000";
  await activity.getByLabel("Inverse input u",{exact:true}).fill(near);await predict(activity,["-3",String(Math.log2(5e-29)),"2","5"]);await expect(activity.locator(".logarithm-prediction-status")).toContainText("Review: Predicted F(G(u))");
  await predict(activity,["-3",String(Math.log2(5e-29)),"2",near]);await expect(activity.locator(".logarithm-prediction-status")).toContainText("All four predictions are correct");
  await activity.getByLabel("Exponential and logarithm pair",{exact:true}).selectOption("0");await domains(activity,"(0,inf)");await activity.getByLabel("Original input t",{exact:true}).fill("1/2");await activity.getByLabel("Inverse input u",{exact:true}).fill("sqrt(8)");await predict(activity,["sqrt(8)/2","3/2","1/2","2*sqrt(2)"]);await expect(activity.locator(".logarithm-prediction-status")).toContainText("All four predictions are correct");
  await activity.getByLabel("Original input t",{exact:true}).fill("13");await activity.getByRole("button",{name:"Check inverse predictions",exact:true}).click();await expect(activity.locator(".logarithm-prediction-status")).toContainText("not the exponential function's domain");await expect(activity.locator(".logarithm-result")).toHaveCount(0);
  await activity.getByLabel("Calculator argument",{exact:true}).fill("2");await activity.getByRole("button",{name:"Calculate logarithm",exact:true}).click();await expect(activity.locator(".logarithm-calculator-result")).toContainText(Math.LN2.toPrecision(14));
  await activity.getByLabel("Calculator logarithm type",{exact:true}).selectOption("common");await activity.getByLabel("Calculator argument",{exact:true}).fill("1/10000");await activity.getByRole("button",{name:"Calculate logarithm",exact:true}).click();await expect(activity.locator(".logarithm-calculator-result")).toContainText("Exactly -4");
  await activity.getByLabel("Calculator logarithm type",{exact:true}).selectOption("custom");await activity.getByLabel("Calculator base",{exact:true}).fill("1/2");await activity.getByLabel("Calculator argument",{exact:true}).fill("8");await activity.getByRole("button",{name:"Calculate logarithm",exact:true}).click();await expect(activity.locator(".logarithm-calculator-result")).toContainText("Exactly -3");
  await activity.getByLabel("Calculator base",{exact:true}).fill("1");await activity.getByRole("button",{name:"Calculate logarithm",exact:true}).click();await expect(activity.locator(".logarithm-calculator-status")).toContainText("positive base other than one");await expect(activity.locator(".logarithm-calculator-result")).toHaveCount(0);
  await activity.getByLabel("Calculator base",{exact:true}).fill("2");
  for(const argument of ["0","-1"]){await activity.getByLabel("Calculator argument",{exact:true}).fill(argument);await activity.getByRole("button",{name:"Calculate logarithm",exact:true}).click();await expect(activity.locator(".logarithm-calculator-status")).toContainText("strictly positive");}
  await activity.getByLabel("Calculator argument",{exact:true}).fill("sqrt(8)");await activity.getByRole("button",{name:"Calculate logarithm",exact:true}).click();await expect(activity.locator(".logarithm-calculator-result")).toContainText("Exactly 3/2");
  await activity.getByLabel("Calculator argument",{exact:true}).fill("1/0");await activity.getByRole("button",{name:"Calculate logarithm",exact:true}).click();await expect(activity.locator(".logarithm-calculator-status")).toContainText("Division by zero");await expect(activity.locator(".logarithm-calculator-result")).toHaveCount(0);
  expect((await readStoredProgress(page)).learning.evidence).toEqual([]);await expect(page.locator(".katex-error")).toHaveCount(0);expect(errors).toEqual([]);
});
test("six logarithm pairs provide equal-scale reflection, exact tables, mobile access and keyboard reset",async({page},testInfo)=>{
  test.setTimeout(180_000);await page.goto(route);const activity=page.locator("#investigate");
  for(let i=0;i<cases.length;i++){
    const item=cases[i];await activity.getByLabel("Exponential and logarithm pair",{exact:true}).selectOption(String(i));await domains(activity,item.range);await expect(activity.locator(".logarithm-domain-status")).toContainText("All four domain and range predictions are correct");await predict(activity,item.values);await expect(activity.locator(".logarithm-prediction-status")).toContainText("All four predictions are correct");
    await expect(activity.getByRole("region",{name:"Exponential points and inverse coordinates",exact:true}).getByRole("row")).toHaveCount(4);await expect(activity.getByRole("region",{name:"Both inverse composition orders",exact:true}).getByRole("row")).toHaveCount(3);
    const rectangle=activity.locator(".logarithm-figure svg rect").first(),width=Number(await rectangle.getAttribute("width")),height=Number(await rectangle.getAttribute("height")),sum=Number(await rectangle.getAttribute("x"))+Number(await rectangle.getAttribute("y"))+width;expect(width).toBe(height);
    const forward=(await activity.locator(".logarithm-forward-curve").getAttribute("points"))!.split(" ").map(pair=>pair.split(",").map(Number)),inverse=(await activity.locator(".logarithm-inverse-curve").getAttribute("points"))!.split(" ").map(pair=>pair.split(",").map(Number));
    expect(forward).toHaveLength(81);expect(inverse).toHaveLength(81);forward.forEach(([x,y],j)=>{expect(inverse[j][0]+y).toBeCloseTo(sum,8);expect(inverse[j][1]+x).toBeCloseTo(sum,8);});
  }
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);expect(page.frames()).toHaveLength(1);const audit=await new AxeBuilder({page}).setLegacyMode().withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await activity.locator(".logarithm-figure").screenshot({path:testInfo.outputPath("logarithm-mobile.png")});
  const table=activity.getByRole("region",{name:"Both inverse composition orders",exact:true});await table.focus();await expect(table).toBeFocused();const button=activity.getByRole("button",{name:"Check inverse predictions",exact:true});await button.focus();await button.press("Enter");await expect(activity.locator(".logarithm-prediction-status")).toContainText("All four predictions are correct");
  await activity.getByRole("button",{name:"Reset inverse investigation",exact:true}).click();await expect(activity.locator(".logarithm-result")).toHaveCount(0);await expect(activity.getByLabel("Exponential and logarithm pair",{exact:true})).toHaveValue("0");await expect(activity.getByLabel("Predicted F domain",{exact:true})).toHaveValue("");await expect(activity.getByLabel("Calculator argument",{exact:true})).toHaveValue("");await expect(activity.getByRole("button",{name:"Check inverse predictions",exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Start practice",exact:true}).click();await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 35");
});
const answer=(field:AnswerField):string=>{
  if(field.kind==="choice")return field.correct;
  if(field.kind==="intervals")return formatIntervals(field.expected);
  if(field.kind==="rational"||field.kind==="exact")return "("+field.expected+")+0";
  if(field.kind==="numeric")return field.expected.toFixed(6);
  throw new Error("Unexpected logarithm field");
};
const label=(field:AnswerField)=>field.label+("unit" in field&&field.unit?" ("+field.unit+")":"");
test("operating inverse endpoints are critical and exact and numerical work survives reload and backup",async({page},testInfo)=>{
  test.setTimeout(180_000);const lesson=lessonSchema.parse(JSON.parse(await readFile("content/lessons/mth-215/m05-l02.json","utf8"))),variants=["common-natural","canceled-hole","inverse-pair","operating-window"],template={...lesson,checkpoint:lesson.checkpoint.map((slot,i)=>({...slot,variant:variants[i]}))},attempt=createAttempt(template,"checkpoint","logarithm-browser");
  expect(attempt.questions[0].fields.filter(field=>field.kind==="numeric")).toHaveLength(2);expect(attempt.questions[2].fields.some(field=>field.kind==="rational"&&field.expected.includes("/"))).toBe(true);
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  async function submit(missEndpoints:boolean){
    await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
    for(let i=0;i<attempt.questions.length;i++){
      for(const field of attempt.questions[i].fields){
        if(field.kind==="choice")await page.locator("#practice").getByRole("group",{name:field.label,exact:true}).locator('input[value="'+field.correct+'"]').check();
        else await page.locator("#practice").getByLabel(label(field),{exact:true}).fill(missEndpoints&&i===3&&field.id==="operating-domain"?answer(field).replace(/^\[/,"(").replace(/\]$/,")"):answer(field));
      }
      if(!missEndpoints&&i<3){
        await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
        for(const field of attempt.questions[i].fields)if(field.kind!=="choice")await expect(page.locator("#practice").getByLabel(label(field),{exact:true})).toHaveValue(answer(field));
      }
      await page.getByRole("button",{name:i===3?"Submit checkpoint":"Next question",exact:true}).click();
    }
  }
  await restoreProgress(page,data);await submit(true);await expect(page.getByRole("heading",{name:"Keep working on this objective",exact:true})).toBeVisible();await expect(page.locator(".attempt-results")).toContainText("3 of 4 correct");expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
  await restoreProgress(page,data);await submit(false);await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const file=testInfo.outputPath("logarithm-progress.json");await(await download).saveAs(file);
  const backup=JSON.parse(await readFile(file,"utf8"));expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence).toHaveLength(1);for(const q of attempt.questions)for(const field of q.fields)expect(backup.learning.attempts[0].responses[q.id][field.id]).toBe(answer(field));
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
