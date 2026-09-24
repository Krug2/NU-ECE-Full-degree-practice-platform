import { expect,test,type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt,type Attempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { readStoredProgress,restoreProgress } from "./progress";

const route="/courses/mth-215/lessons/m03-l04";
async function candidate(activity:Locator,value:string,prediction:string){
  await activity.getByLabel("Candidate to test",{exact:true}).selectOption(value);
  await activity.getByLabel("Predicted exact value of S(c)",{exact:true}).fill(prediction);
  await activity.getByRole("button",{name:"Check candidate",exact:true}).click();
}
async function remove(activity:Locator,value:string){
  await candidate(activity,value,"0");await expect(activity.getByRole("status")).toContainText("this candidate is a root");
  await activity.getByRole("button",{name:"Remove one factor",exact:true}).click();await expect(activity.getByRole("status")).toContainText("One factor removed");
}
async function finish(activity:Locator,roots:string,count:string){
  await activity.getByLabel("Complete complex root list with repetitions",{exact:true}).fill(roots);
  await activity.getByLabel("Predicted distinct real x-intercepts",{exact:true}).fill(count);
  await activity.getByRole("button",{name:"Check complete roots",exact:true}).click();
}
test("root search requires exact confirmation and keeps removed roots in the complete list",async({page})=>{
  await page.goto("/courses/mth-215/lessons/m03-l03");await page.getByRole("link",{name:"Next: Finding and checking all polynomial roots",exact:true}).click();
  const guided=page.locator("#guided"),activity=page.locator("#investigate");
  for(const [label,value] of [["All complex roots with multiplicity","2,i,-i"],["Total complex roots with multiplicity","4"],["Distinct real x-intercepts","1"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Review this reasoning");
  await guided.getByLabel("All complex roots with multiplicity",{exact:true}).fill("sqrt(-1),4/2,2,-i");
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await activity.getByRole("button",{name:"Check candidate",exact:true}).click();await expect(activity.getByRole("status")).toContainText("Choose a candidate");
  await expect(activity.getByRole("button",{name:"Remove one factor",exact:true})).toBeDisabled();
  await candidate(activity,"2","0");await expect(activity.getByRole("status")).toContainText("exact evaluation is -4");await expect(activity.getByRole("button",{name:"Remove one factor",exact:true})).toBeDisabled();
  await candidate(activity,"2","-4");await expect(activity.getByRole("status")).toContainText("nonzero result rejects");
  await remove(activity,"1");await expect(activity.getByRole("list",{name:"Confirmed factor removals",exact:true}).getByRole("listitem")).toHaveCount(1);
  await finish(activity,"3,-2","3");await expect(activity.getByRole("status")).toContainText("Keep every removed root");
  await finish(activity,"1,3,-2","2");await expect(activity.getByRole("status")).toContainText("Count distinct real root values");
  await finish(activity,"1,3,-2","3");await expect(activity.getByRole("status")).toContainText("Complete root list verified");
  const before=await activity.locator(".root-search-curve").getAttribute("points");
  await activity.getByLabel("Real graph window",{exact:true}).selectOption("2");
  await expect(activity.locator(".root-search-result")).toContainText("2 of 3 real intercepts are inside this window");
  expect(await activity.locator(".root-search-curve").getAttribute("points")).not.toBe(before);
  await expect(activity.getByRole("region",{name:"Complete root verification",exact:true}).locator("tbody tr")).toHaveCount(3);
  expect((await readStoredProgress(page)).learning.evidence).toEqual([]);await expect(page.locator(".katex-error")).toHaveCount(0);
});
test("all search cases preserve repetitions, exact irrational roots, and accessible real-graph comparisons",async({page},testInfo)=>{
  test.setTimeout(120_000);await page.goto(route);const activity=page.locator("#investigate");
  const cases=[
    {remove:["1"],roots:"1,3,-2",count:"3"},
    {remove:["1","1"],roots:"1,1,-2",count:"2"},
    {remove:["1/2"],roots:"1/2,sqrt(2),-sqrt(2)",count:"3"},
    {remove:["2"],roots:"2,2*i,-2*i",count:"1"},
    {remove:["0","0"],roots:"0,0,i,-i",count:"1"},
    {remove:[],roots:"sqrt(2),-sqrt(2)",count:"2"}
  ];
  for(let index=0;index<cases.length;index++){
    await activity.getByLabel("Root search example",{exact:true}).selectOption(String(index));await expect(activity.locator(".root-search-result")).toHaveCount(0);
    for(const root of cases[index].remove)await remove(activity,root);
    if(index===5){
      await candidate(activity,"1","-1");await expect(activity.getByRole("status")).toContainText("nonzero result rejects");
      await activity.getByRole("button",{name:"Show remaining roots",exact:true}).click();await expect(activity.locator(".root-search-finish .notice")).toContainText("sqrt(2)");
    }
    await finish(activity,cases[index].roots,cases[index].count);await expect(activity.getByRole("status")).toContainText("Complete root list verified");
    if(index===3||index===4)await expect(activity.getByRole("region",{name:"Complete root verification",exact:true}).locator("tbody tr td:nth-child(3)")).toHaveText(["Real intercept","Nonreal","Nonreal"]);
  }
  await activity.getByLabel("Root search example",{exact:true}).selectOption("4");await remove(activity,"0");await remove(activity,"0");await finish(activity,"0,i,-i","1");
  await expect(activity.getByRole("status")).toContainText("every repetition");
  await finish(activity,"0,0,i,-i","1");await expect(activity.getByRole("status")).toContainText("Complete root list verified");
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await activity.locator(".polynomial-figure").screenshot({path:testInfo.outputPath("complete-roots-mobile.png")});
  const table=activity.getByRole("region",{name:"Complete root verification",exact:true});await table.focus();await expect(table).toBeFocused();
  const check=activity.getByRole("button",{name:"Check complete roots",exact:true});await check.focus();await check.press("Enter");await expect(activity.getByRole("status")).toContainText("Complete root list verified");
  await activity.getByRole("button",{name:"Reset root search",exact:true}).click();await expect(activity.getByLabel("Root search example",{exact:true})).toHaveValue("0");await expect(activity.locator(".root-search-result")).toHaveCount(0);
  await page.getByRole("button",{name:"Start practice",exact:true}).click();await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 27");
});
test("complete-root checkpoints reject a lost repetition and preserve complex answers through reload and backup",async({page},testInfo)=>{
  const lesson=lessonSchema.parse(JSON.parse(await readFile("content/lessons/mth-215/m03-l04.json","utf8")));
  const attempt=createAttempt({...lesson,checkpoint:lesson.checkpoint.map((slot,index)=>index===2?{...slot,variant:"repeated-complex"}:slot)},"checkpoint","complete-roots-browser");
  const list=attempt.questions[2].fields[0];if(list.kind!=="root-list")throw new Error("Missing repeated complex fixture");
  expect(list.expected).toHaveLength(4);expect(new Set(list.expected).size).toBe(2);
  const savedRootAnswer=list.expected.join(",");
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  async function submit(current:Attempt,missRepetition:boolean){
    await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
    for(let index=0;index<current.questions.length;index++){
      for(const field of current.questions[index].fields){
        if(field.kind==="choice")await page.locator("#practice").getByRole("group",{name:field.label,exact:true}).locator('input[value="'+field.correct+'"]').check();
        else if(field.kind==="rational"||field.kind==="polynomial"||field.kind==="roots"||field.kind==="root-list"){
          const answer=field.kind==="roots"||field.kind==="root-list"?(missRepetition&&index===2&&field.kind==="root-list"?field.expected.slice(1):field.expected).join(","):field.expected;
          await page.locator("#practice").getByLabel(field.label,{exact:true}).fill(answer);
        }else throw new Error("Unexpected complete-root field");
      }
      if(!missRepetition&&index===2){
        await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");await page.reload();
        await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
        await expect(page.locator("#practice").getByLabel(list.label,{exact:true})).toHaveValue(savedRootAnswer);
      }
      await page.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
    }
  }
  await restoreProgress(page,data);await submit(attempt,true);await expect(page.getByRole("heading",{name:"Keep working on this objective",exact:true})).toBeVisible();
  await expect(page.locator(".attempt-results")).toContainText("3 of 4 correct");expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
  await restoreProgress(page,data);await submit(attempt,false);await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const file=testInfo.outputPath("complete-roots-progress.json");await(await download).saveAs(file);const backup=JSON.parse(await readFile(file,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence).toHaveLength(1);
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
