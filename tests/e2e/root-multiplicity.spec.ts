import { expect,test,type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt,type Attempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { readStoredProgress,restoreProgress } from "./progress";

const route="/courses/mth-215/lessons/m03-l02";
async function predict(activity:Locator,degree:string,count:string,behavior:string,left:string,right:string){
  await activity.getByLabel("Predicted total degree",{exact:true}).fill(degree);
  await activity.getByLabel("Predicted distinct zero count",{exact:true}).fill(count);
  await activity.getByLabel(/^Predicted behavior/).selectOption(behavior);
  await activity.getByLabel(/^Predicted sign immediately left/).selectOption(left);
  await activity.getByLabel(/^Predicted sign immediately right/).selectOption(right);
  await activity.getByRole("button",{name:"Check root predictions",exact:true}).click();
}
test("root instruction connects factors, degree, crossing, and exact signs without awarding exploration evidence",async({page})=>{
  await page.goto("/courses/mth-215/lessons/m03-l01");
  await page.getByRole("link",{name:"Next: Zeros, multiplicity, and graph shape",exact:true}).click();
  const guided=page.locator("#guided"),activity=page.locator("#investigate");
  for(const [label,value] of [["Distinct real zeros","3,-1"],["Multiplicity at x = -1","4/2"],["Total degree","3"],["p(0)","12/2"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByRole("group",{name:"Behavior at x = -1",exact:true}).getByRole("radio",{name:"Touches and turns",exact:true}).check();
  await guided.getByRole("group",{name:"Sign on (-1, 3)",exact:true}).getByRole("radio",{name:"Positive",exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await activity.getByRole("button",{name:"Check root predictions",exact:true}).click();await expect(activity.locator("[role=status]")).toContainText("Enter all five");
  await predict(activity,"2","2","cross","negative","positive");await expect(activity.locator("[role=status]")).toContainText("Add all multiplicities");
  await predict(activity,"3","2","cross","negative","positive");await expect(activity.locator("[role=status]")).toContainText("All predictions are correct");
  await activity.getByLabel("Zero to investigate",{exact:true}).selectOption("1");
  await predict(activity,"3","2","touch","positive","positive");await expect(activity.locator(".root-conclusions")).toContainText("multiplicity 2");
  const before=await activity.locator(".changed-root-curve").getAttribute("points");
  await activity.getByLabel("Multiplicity at the selected zero",{exact:true}).selectOption("3");
  await expect(activity.locator(".root-results")).toHaveCount(0);
  await predict(activity,"4","2","cross","negative","positive");await expect(activity.locator("[role=status]")).toContainText("All predictions are correct");
  expect(await activity.locator(".changed-root-curve").getAttribute("points")).not.toBe(before);
  await expect(activity.locator(".root-results")).toContainText("p(0) = -2.");
  await activity.getByLabel("Leading scale a",{exact:true}).selectOption("-1");
  await predict(activity,"4","2","cross","positive","negative");await expect(activity.locator("[role=status]")).toContainText("All predictions are correct");
  const conclusions=await activity.locator(".root-conclusions").textContent();
  await activity.getByLabel("Root comparison window",{exact:true}).selectOption("all");
  await expect(activity.locator(".root-conclusions")).toHaveText(conclusions!);
  const signs=activity.getByRole("region",{name:"Exact polynomial sign table",exact:true});
  await expect(signs.locator("tbody tr")).toHaveCount(3);
  await expect(signs.locator("tbody tr").first().locator("th,td")).toHaveText(["(-∞, -2)","-3","-64","negative"]);
  expect((await readStoredProgress(page)).learning.evidence).toEqual([]);
  await expect(page.locator(".katex-error")).toHaveCount(0);
});
test("every root example supports prediction, local views, mobile tables, and keyboard controls",async({page},testInfo)=>{
  await page.goto(route);const activity=page.locator("#investigate");
  const cases=[["3","2","cross","negative","positive"],["5","2","touch","positive","positive"],["3","2","touch","negative","negative"],["3","2","cross","negative","positive"],["3","3","cross","negative","positive"]];
  for(let index=0;index<cases.length;index++){
    await activity.getByLabel("Factor example",{exact:true}).selectOption(String(index));
    await expect(activity.locator(".root-results")).toHaveCount(0);
    const [degree,count,behavior,left,right]=cases[index];await predict(activity,degree,count,behavior,left,right);
    await expect(activity.locator("[role=status]")).toContainText("All predictions are correct");
  }
  await activity.getByLabel("Multiplicity at the selected zero",{exact:true}).selectOption("6");
  await predict(activity,"8","3","touch","positive","positive");await expect(activity.locator("[role=status]")).toContainText("All predictions are correct");
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await activity.locator(".polynomial-figure").screenshot({path:testInfo.outputPath("roots-mobile.png")});
  const table=activity.getByRole("region",{name:"Exact polynomial sign table",exact:true});await table.focus();await expect(table).toBeFocused();
  const button=activity.getByRole("button",{name:"Check root predictions",exact:true});await button.focus();await button.press("Enter");await expect(activity.locator("[role=status]")).toContainText("All predictions are correct");
  await activity.getByRole("button",{name:"Reset factors",exact:true}).click();
  await expect(activity.getByLabel("Factor example",{exact:true})).toHaveValue("0");await expect(activity.getByLabel("Multiplicity at the selected zero",{exact:true})).toHaveValue("1");
  await expect(activity.locator(".root-results")).toHaveCount(0);
  await page.getByRole("button",{name:"Start practice",exact:true}).click();await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 26");
});
test("root checkpoints preserve exact answers and require multiplicity reasoning through reload and restore",async({page},testInfo)=>{
  const lesson=lessonSchema.parse(JSON.parse(await readFile("content/lessons/mth-215/m03-l02.json","utf8"))),attempt=createAttempt(lesson,"checkpoint","roots-browser-fixture");
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  async function submit(current:Attempt,missBehavior:boolean){
    await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
    for(let index=0;index<current.questions.length;index++){
      for(const [fieldIndex,field] of current.questions[index].fields.entries()){
        if(field.kind==="choice"){
          const answer=missBehavior&&index===1&&fieldIndex===0?field.options.find(option=>option.id!==field.correct)!.id:field.correct;
          await page.locator("#practice").getByRole("group",{name:field.label,exact:true}).locator('input[value="'+answer+'"]').check();
        }else if(field.kind==="rational"||field.kind==="polynomial"||field.kind==="roots"){
          await page.locator("#practice").getByLabel(field.label,{exact:true}).fill(field.kind==="roots"?field.expected.join(","):field.expected);
        }else throw new Error("Unexpected root checkpoint field");
      }
      if(!missBehavior&&index===3){
        await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");
        await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
        const polynomial=current.questions[3].fields.find(field=>field.kind==="polynomial")!;
        if(polynomial.kind!=="polynomial")throw new Error("Missing reconstruction field");
        await expect(page.locator("#practice").getByLabel(polynomial.label,{exact:true})).toHaveValue(polynomial.expected);
      }
      await page.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
    }
  }
  await restoreProgress(page,data);await submit(attempt,true);
  await expect(page.getByRole("heading",{name:"Keep working on this objective",exact:true})).toBeVisible();
  await expect(page.locator(".attempt-results")).toContainText("3 of 4 correct");expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
  await restoreProgress(page,data);await submit(attempt,false);
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const file=testInfo.outputPath("roots-progress.json");await(await download).saveAs(file);const backup=JSON.parse(await readFile(file,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence).toHaveLength(1);
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
