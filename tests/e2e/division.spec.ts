import { expect,test,type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt,type Attempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { readStoredProgress,restoreProgress } from "./progress";

const route="/courses/mth-215/lessons/m03-l03";
async function setup(activity:Locator,values:string[]){
  const inputs=activity.getByRole("region",{name:"Dividend coefficient setup",exact:true}).getByRole("textbox");
  await expect(inputs).toHaveCount(values.length);
  for(let i=0;i<values.length;i++)await inputs.nth(i).fill(values[i]);
  await activity.getByRole("button",{name:"Check coefficient row",exact:true}).click();
  await expect(activity.getByRole("status")).toContainText("Coefficient row correct");
}
async function step(activity:Locator,first:string,second:string,synthetic=false){
  await activity.getByLabel(synthetic?"Incoming product":"Next quotient term",{exact:true}).fill(first);
  await activity.getByLabel(synthetic?"New bottom entry":"Polynomial after subtraction",{exact:true}).fill(second);
  await activity.getByRole("button",{name:"Check division step",exact:true}).click();
}
test("division instruction preserves missing coefficients and repairs signs before accepting a reconstruction",async({page})=>{
  await page.goto("/courses/mth-215/lessons/m03-l02");
  await page.getByRole("link",{name:"Next: Division, remainders, and factors",exact:true}).click();
  const guided=page.locator("#guided"),activity=page.locator("#investigate");
  for(const [label,value] of [["Synthetic input c","-6/2"],["Quotient Q(x)","(x-1)^2+1"],["Remainder R","-10/2"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByRole("group",{name:"Is x + 3 a factor?",exact:true}).getByRole("radio",{name:"No",exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await activity.getByRole("button",{name:"Check coefficient row",exact:true}).click();await expect(activity.getByRole("status")).toContainText("Fill every coefficient");
  await activity.getByLabel("Dividend coefficient of x^3",{exact:true}).fill("1");
  await activity.getByLabel("Dividend coefficient of x^2",{exact:true}).fill("-4");
  await activity.getByRole("button",{name:"Check coefficient row",exact:true}).click();await expect(activity.getByRole("status")).toContainText("Check the coefficient of x^2");
  await setup(activity,["1","0","-4","1"]);
  await step(activity,"x","2*x^2-4*x+1");await expect(activity.getByRole("status")).toContainText("next quotient term");
  await step(activity,"x^2","2*x^2-4*x-1");await expect(activity.getByRole("status")).toContainText("first differs at constant");
  await step(activity,"x^2","2*x^2-4*x+1");await expect(activity.getByRole("status")).toContainText("Step correct");
  await expect(activity.getByRole("list",{name:"Accepted long-division steps"}).getByRole("listitem")).toHaveCount(1);
  await step(activity,"2*x","1");await expect(activity.getByRole("status")).toContainText("Division complete");
  await expect(activity.locator(".division-result")).toContainText("D is not a factor");
  const check=activity.getByRole("region",{name:"Reconstruction coefficient check",exact:true});
  await expect(check.locator("tbody tr").nth(1).locator("th,td")).toHaveText(["x^2","0","0"]);
  await activity.getByLabel("Division method",{exact:true}).selectOption("synthetic");await expect(activity.locator(".division-result")).toHaveCount(0);
  await setup(activity,["1","0","-4","1"]);
  await step(activity,"1","1",true);await expect(activity.getByRole("status")).toContainText("no incoming product");
  for(const row of [["0","1"],["2","2"],["4","0"],["0","1"]])await step(activity,row[0],row[1],true);
  await expect(activity.getByRole("status")).toContainText("Division complete");
  await expect(activity.getByRole("region",{name:"Synthetic division table",exact:true}).locator("tbody tr").last().locator("td")).toHaveText(["1","2","0","1"]);
  expect((await readStoredProgress(page)).learning.evidence).toEqual([]);
  await expect(page.locator(".katex-error")).toHaveCount(0);
});
test("all six division cases work on mobile and desktop with accessible tables and keyboard controls",async({page},testInfo)=>{
  test.setTimeout(120_000);
  await page.goto(route);const activity=page.locator("#investigate");
  const cases=[
    {coefficients:["1","0","-4","1"],steps:[["x^2","2*x^2-4*x+1"],["2*x","1"]]},
    {coefficients:["1","2","-5","-6"],steps:[["x^2","-x^2-5*x-6"],["-x","-2*x-6"],["-2","0"]]},
    {coefficients:["2","3","-1","5"],steps:[["x^2","4*x^2-x+5"],["2*x","x+5"],["1/2","11/2"]]},
    {coefficients:["1","0","3","2","5"],steps:[["x^2","2*x^2+2*x+5"],["2","2*x+3"]]},
    {coefficients:["1","2"],steps:[]},
    {coefficients:["1","-2","0","0"],steps:[["x^2","-2*x^2"],["-2*x","0"]]}
  ];
  for(let index=0;index<cases.length;index++){
    await activity.getByLabel("Division example",{exact:true}).selectOption(String(index));
    if([2,3,4].includes(index))await expect(activity.getByLabel("Division method",{exact:true}).locator('option[value="synthetic"]')).toBeDisabled();
    await setup(activity,cases[index].coefficients);
    for(const [term,remainder] of cases[index].steps)await step(activity,term,remainder);
    await expect(activity.locator(".division-result")).toBeVisible();
    if(index===1||index===5){
      await activity.getByLabel("Division method",{exact:true}).selectOption("synthetic");await setup(activity,cases[index].coefficients);
      const rows=index===1?[["0","1"],["-3","-1"],["3","-2"],["6","0"]]:[["0","1"],["0","-2"],["0","0"],["0","0"]];
      for(const [product,bottom] of rows)await step(activity,product,bottom,true);
      await expect(activity.locator(".division-result")).toContainText("D is a factor");
    }
  }
  await activity.getByLabel("Division example",{exact:true}).selectOption("3");await setup(activity,cases[3].coefficients);
  for(const [term,remainder] of cases[3].steps)await step(activity,term,remainder);
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await activity.getByLabel("Division example",{exact:true}).focus();
  await page.screenshot({path:testInfo.outputPath("division-mobile.png")});
  const table=activity.getByRole("region",{name:"Reconstruction coefficient check",exact:true});await table.focus();await expect(table).toBeFocused();
  const reset=activity.getByRole("button",{name:"Reset division",exact:true});await reset.focus();await reset.press("Enter");
  await expect(activity.getByLabel("Division example",{exact:true})).toHaveValue("0");await expect(activity.locator(".division-work")).toHaveCount(0);
  await page.getByRole("button",{name:"Start practice",exact:true}).click();await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 25");
});
test("division checkpoints require the factor check and preserve fractional answers through reload and backup",async({page},testInfo)=>{
  const lesson=lessonSchema.parse(JSON.parse(await readFile("content/lessons/mth-215/m03-l03.json","utf8")));
  const attempt=createAttempt({...lesson,checkpoint:lesson.checkpoint.map((slot,index)=>index===0?{...slot,variant:"fraction"}:slot)},"checkpoint","division-browser-fixture");
  expect(attempt.questions[0].fields.some(field=>field.kind==="polynomial"&&field.expected.includes("/2"))).toBe(true);
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  async function submit(current:Attempt,missFactor:boolean){
    await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
    for(let index=0;index<current.questions.length;index++){
      for(const field of current.questions[index].fields){
        if(field.kind==="choice"){
          const value=missFactor&&index===2&&field.id==="factor"?field.options.find(option=>option.id!==field.correct)!.id:field.correct;
          await page.locator("#practice").getByRole("group",{name:field.label,exact:true}).locator('input[value="'+value+'"]').check();
        }else if(field.kind==="rational"||field.kind==="polynomial")await page.locator("#practice").getByLabel(field.label,{exact:true}).fill(field.expected);
        else throw new Error("Unexpected checkpoint field");
      }
      if(!missFactor&&index===3){
        await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");
        await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
        const field=current.questions[3].fields.find(field=>field.kind==="polynomial")!;
        if(field.kind!=="polynomial")throw new Error("Missing audit quotient");
        await expect(page.locator("#practice").getByLabel(field.label,{exact:true})).toHaveValue(field.expected);
      }
      await page.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
    }
  }
  await restoreProgress(page,data);await submit(attempt,true);
  await expect(page.getByRole("heading",{name:"Keep working on this objective",exact:true})).toBeVisible();
  await expect(page.locator(".attempt-results")).toContainText("3 of 4 correct");expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
  await restoreProgress(page,data);await submit(attempt,false);await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const file=testInfo.outputPath("division-progress.json");await(await download).saveAs(file);const backup=JSON.parse(await readFile(file,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence).toHaveLength(1);
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
