import { restoreProgress,readStoredProgress } from "./progress";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { formatIntervals } from "../../lib/learning/intervals";

const route="/courses/mth-215/lessons/m01-l04";
test("candidate checks preserve original exclusions and accept valid negative roots",async({page})=>{
  await page.goto("/courses/mth-215/lessons/m01-l03");
  await page.getByRole("link",{name:"Next: Restrictions and extraneous solutions",exact:true}).click();
  await page.locator("#guided").getByLabel("Valid solutions",{exact:true}).fill("-2");
  await page.locator("#guided").getByLabel("Extraneous candidates",{exact:true}).fill("-5");
  await page.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(page.locator("#guided .answer-feedback")).toContainText("Correct. You have checked every part.");
  const activity=page.locator("#investigate");
  await activity.getByRole("button",{name:"Check candidates in the original equation",exact:true}).click();
  await expect(activity.getByRole("status")).toContainText("Classify every candidate");
  for(const [caseId,answers] of Object.entries({"rational-one":["excluded","valid"],"radical-one":["valid","extraneous"],"rational-empty":["excluded"],"radical-two":["valid","valid"]})){
    await activity.getByLabel("Equation to investigate",{exact:true}).selectOption(caseId);
    for(let index=0;index<answers.length;index++)await activity.locator(`#candidate-${index}`).selectOption(answers[index]);
    await activity.getByRole("button",{name:"Check candidates in the original equation",exact:true}).click();
    await expect(activity.getByRole("status")).toContainText("All candidates are classified correctly");
  }
  await page.getByRole("button",{name:"Start practice",exact:true}).click();
  await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 11");
  await page.locator("#practice").getByLabel("Valid solutions",{exact:true}).fill("empty");
  await page.reload();
  await expect(page.locator("#practice").getByLabel("Valid solutions",{exact:true})).toHaveValue("empty");
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(result.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});

test("a high checkpoint score cannot conceal a missed original restriction",async({page})=>{
  const lesson=lessonSchema.parse(JSON.parse(await readFile(new URL("../../content/lessons/mth-215/m01-l04.json",import.meta.url),"utf8")));
  const attempt=createAttempt(lesson,"checkpoint","restriction-browser-fixture");
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  await restoreProgress(page,data);
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  for(let index=0;index<attempt.questions.length;index++){
    for(const field of attempt.questions[index].fields){
      if(field.kind==="choice")await page.locator("#practice").locator(`input[value="${field.correct}"]`).check();
      else {
        const value=field.id==="excluded"?"empty":field.kind==="roots"?(field.expected.join(",")||"empty"):field.kind==="intervals"?formatIntervals(field.expected):String(field.expected);
        await page.locator("#practice").getByLabel(field.label,{exact:true}).fill(value);
      }
    }
    await page.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(page.getByRole("heading",{name:"Keep working on this objective",exact:true})).toBeVisible();
  await expect(page.locator(".attempt-results")).toContainText("3 of 4 correct");
  const saved=await readStoredProgress(page);
  expect(saved.learning.evidence).toEqual([]);
});
