import { expect,test,type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt,type Attempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { readStoredProgress,restoreProgress } from "./progress";

const route="/courses/mth-215/lessons/m03-l01";
async function predict(activity:Locator,degree:string,coefficient:string,turns:string,left:string,right:string){
  await activity.getByLabel("Predicted degree",{exact:true}).fill(degree);
  await activity.getByLabel("Predicted leading coefficient",{exact:true}).fill(coefficient);
  await activity.getByLabel("Predicted maximum turning points",{exact:true}).fill(turns);
  await activity.getByLabel("Predicted left end",{exact:true}).selectOption(left);
  await activity.getByLabel("Predicted right end",{exact:true}).selectOption(right);
  await activity.getByRole("button",{name:"Check polynomial predictions",exact:true}).click();
}
test("polynomial instruction links forward and explains the difference between local and eventual behavior",async({page})=>{
  await page.goto("/courses/mth-215/lessons/m02-l04");
  await page.getByRole("link",{name:"Next: Degree and end behavior",exact:true}).click();
  const guided=page.locator("#guided"),activity=page.locator("#investigate");
  for(const [label,value] of [["Degree after collecting terms","8/2"],["Leading coefficient","-6/2"],["Maximum permitted turning points","3"]])await guided.getByLabel(label,{exact:true}).fill(value);
  for(const label of ["Far-left behavior","Far-right behavior"])await guided.getByRole("group",{name:label,exact:true}).getByRole("radio",{name:"Down without bound",exact:true}).check();
  await guided.getByRole("radio",{name:"The graph has no more than this many turns",exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await activity.getByRole("button",{name:"Check polynomial predictions",exact:true}).click();await expect(activity.locator("[role=status]")).toContainText("Enter all five");
  await predict(activity,"5","1","3","up","up");await expect(activity.locator("[role=status]")).toContainText("Collect like terms");
  await predict(activity,"4","1","3","up","up");await expect(activity.locator("[role=status]")).toContainText("All predictions are correct");
  const first=activity.locator("tbody tr").first();await expect(first).toHaveText("-10-1000010000-1");
  await expect(activity.locator("tbody tr").nth(2)).toContainText("Undefined: L(x) = 0");
  const directions=await activity.locator(".polynomial-directions").textContent(),curve=await activity.locator(".polynomial-curve").getAttribute("points");
  await activity.getByLabel("Horizontal graph window",{exact:true}).selectOption("100");
  await expect(first).toHaveText("-1009800000010000000049/50");
  await expect(activity.locator(".polynomial-directions")).toHaveText(directions!);expect(await activity.locator(".polynomial-curve").getAttribute("points")).not.toBe(curve);
  await expect(page.locator(".katex-error")).toHaveCount(0);
});
test("all polynomial cases preserve their algebraic conclusions with accessible graph and table controls",async({page},testInfo)=>{
  await page.goto(route);const activity=page.locator("#investigate");
  const cases=[["4","1","3","up","up"],["4","-2","3","down","down"],["3","1","2","down","up"],["5","-1","4","up","down"],["3","-2","2","up","down"],["1","-2","0","up","down"]];
  for(let index=0;index<cases.length;index++){
    await activity.getByLabel("Polynomial example",{exact:true}).selectOption(String(index));
    await expect(activity.locator(".polynomial-results")).toHaveCount(0);
    const [degree,coefficient,turns,left,right]=cases[index];await predict(activity,degree,coefficient,turns,left,right);
    await expect(activity.locator("[role=status]")).toContainText("All predictions are correct");
  }
  await activity.getByRole("button",{name:"Reset polynomial",exact:true}).click();
  await expect(activity.getByLabel("Polynomial example",{exact:true})).toHaveValue("0");
  await predict(activity,"4","1","3","up","up");await activity.getByLabel("Horizontal graph window",{exact:true}).selectOption("100");
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await activity.locator(".polynomial-figure").screenshot({path:testInfo.outputPath("polynomial-mobile.png")});
  const table=activity.getByRole("region",{name:"Exact polynomial comparison",exact:true});await table.focus();await expect(table).toBeFocused();
  const button=activity.getByRole("button",{name:"Check polynomial predictions",exact:true});await button.focus();await button.press("Enter");
  await expect(activity.locator("[role=status]")).toContainText("All predictions are correct");
  await page.getByRole("button",{name:"Start practice",exact:true}).click();await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 25");
});
test("polynomial checkpoints require critical reasoning and preserve every answer through a backup",async({page},testInfo)=>{
  const lesson=lessonSchema.parse(JSON.parse(await readFile("content/lessons/mth-215/m03-l01.json","utf8")));
  const attempt=createAttempt(lesson,"checkpoint","polynomial-browser-fixture");
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  async function submit(attempt:Attempt,missClassification:boolean){
    await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
    for(let index=0;index<attempt.questions.length;index++){
      for(const [fieldIndex,field] of attempt.questions[index].fields.entries()){
        if(field.kind==="choice"){
          const answer=missClassification&&index===2&&fieldIndex===0?field.options.find(option=>option.id!==field.correct)!.id:field.correct;
          await page.locator("#practice").getByRole("group",{name:field.label,exact:true}).locator('input[value="'+answer+'"]').check();
        }else if(field.kind==="rational")await page.locator("#practice").getByLabel(field.label,{exact:true}).fill(field.expected);
        else throw new Error("Unexpected polynomial checkpoint field");
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
  const file=testInfo.outputPath("polynomial-progress.json");await(await download).saveAs(file);const backup=JSON.parse(await readFile(file,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence).toHaveLength(1);
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
});
