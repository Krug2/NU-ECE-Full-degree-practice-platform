import { expect,test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { fill,solve } from "./phs-231-assessment-helpers";
import { readStoredProgress,restoreProgress } from "./progress";

const route="/courses/phs-231/assessments/quiz-m01";
const assessment=(page:import("@playwright/test").Page)=>page.locator("#assessment");
test("an independently solved module preserves every objective through reload and actual backup restoration",async({page},info)=>{
  await page.goto(route);const scope=assessment(page);
  await scope.getByRole("button",{name:"Start assessment",exact:true}).click();
  const before=await readStoredProgress(page),attempt=before.learning.attempts[0];
  expect(attempt.questions).toHaveLength(8);expect(attempt.assessment!.objectives).toHaveLength(2);
  for(const [index,question] of attempt.questions.entries()){
    await fill(scope,question,solve(question));
    expect(await scope.locator(".answer-feedback").count()).toBe(0);expect(await scope.getByRole("button",{name:/Show a hint/}).count()).toBe(0);
    if(index===1){
      await expect(scope.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");
      await page.reload();await expect(scope.locator(".attempt-meta")).toContainText("Question 2 of 8");
      await expect(scope.getByLabel("Time exponent r",{exact:true})).toHaveValue(String(-question.parameters.power));
      expect((await readStoredProgress(page)).learning.attempts[0].questions).toEqual(attempt.questions);
      await scope.getByRole("button",{name:"Previous question",exact:true}).click();
      await expect(scope.getByLabel("Converted value (m²)",{exact:true})).toHaveValue(solve(attempt.questions[0]).value);
      await scope.getByRole("button",{name:"Next question",exact:true}).click();
    }
    await scope.getByRole("button",{name:index===7?"Submit assessment":"Next question",exact:true}).click();
  }
  await expect(scope.getByRole("heading",{name:"Assessment target met",exact:true})).toBeVisible();
  const saved=await readStoredProgress(page);expect(saved.learning.evidence).toEqual([]);
  expect(saved.learning.assessmentResults?.[0]).toMatchObject({passed:true,objectives:[{correct:4,total:4,passed:true},{correct:4,total:4,passed:true}]});
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const file=info.outputPath("module-progress.json");await(await downloading).saveAs(file);
  const exported=JSON.parse(await readFile(file,"utf8"));expect(exported.learning).toEqual(saved.learning);
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();
  await restoreProgress(page,exported);await page.goto(route);
  await expect(scope.getByRole("heading",{name:"Assessment target met",exact:true})).toBeVisible();expect((await readStoredProgress(page)).learning).toEqual(saved.learning);
});
test("a high aggregate cannot hide a critical failure and removing details retains the failed result",async({page})=>{
  await page.goto(route);const scope=assessment(page);await scope.getByRole("button",{name:"Start assessment",exact:true}).click();
  const attempt=(await readStoredProgress(page)).learning.attempts[0];
  for(const [index,question] of attempt.questions.entries()){
    const answers=solve(question);if(index===0)answers.reason="cube";
    await fill(scope,question,answers);await scope.getByRole("button",{name:index===7?"Submit assessment":"Next question",exact:true}).click();
  }
  await expect(scope.getByRole("heading",{name:"Review needed",exact:true})).toBeVisible();
  await expect(scope.getByRole("status").first()).toContainText("7 of 8");
  const first=scope.locator(".assessment-table tbody tr").first();await expect(first).toContainText("Review required");await expect(first).toContainText("3 / 4");
  await first.getByRole("link",{name:"Fresh independent review",exact:true}).click();await expect(page).toHaveURL(/review-m01-l01$/);
  await expect(page.getByRole("heading",{level:1})).toContainText("Review:");
  await page.goto(route);await scope.getByText("Saved assessment history (1)",{exact:true}).click();
  await scope.getByRole("button",{name:"Remove attempt details",exact:true}).click();await scope.getByRole("button",{name:"Confirm removal",exact:true}).click();
  await scope.getByRole("button",{name:"Close removed attempt",exact:true}).click();
  await expect(scope.getByRole("heading",{name:"Retained independent result: review needed",exact:true})).toBeVisible();
  await page.reload();const learning=(await readStoredProgress(page)).learning;
  expect(learning.attempts).toEqual([]);expect(learning.assessmentResults?.[0]).toMatchObject({passed:false,objectives:[{correct:3,criticalPassed:false,passed:false},{correct:4,passed:true}]});
});
for(const part of ["a","b"])test("cumulative "+part+" spans every lesson and routes each missed objective after a complete resumed session",async({page})=>{
  await page.goto("/courses/phs-231/assessments/cumulative-"+part);const scope=assessment(page);await scope.getByRole("button",{name:"Start assessment",exact:true}).click();
  const attempt=(await readStoredProgress(page)).learning.attempts[0];expect(attempt.questions).toHaveLength(22);expect(new Set(attempt.questions.map(item=>item.objectiveId)).size).toBe(22);
  const text=scope.locator(".answer-fields input:not([type=radio])").first();if(await text.count()){await text.fill("not a number");await expect(scope.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");}
  await scope.getByRole("button",{name:"Next question",exact:true}).click();await page.reload();await expect(scope.locator(".attempt-meta")).toContainText("Question 2 of 22");
  for(let index=1;index<22;index++){expect(await scope.locator(".answer-feedback").count()).toBe(0);await scope.getByRole("button",{name:index===21?"Submit assessment":"Next question",exact:true}).click();}
  await expect(scope.getByRole("heading",{name:"Review needed",exact:true})).toBeVisible();
  await expect(scope.locator(".assessment-table tbody tr")).toHaveCount(22);await expect(scope.getByRole("link",{name:"Fresh independent review",exact:true})).toHaveCount(22);
  const result=(await readStoredProgress(page)).learning.assessmentResults![0];expect(result.passed).toBe(false);expect(result.objectives.every(item=>item.correct===0&&item.total===1&&!item.passed)).toBe(true);
  await scope.locator(".result-item").first().locator("summary").click();await expect(scope.locator(".answer-feedback").first()).toBeVisible();
});
test("readiness links real preparation while awarding no prerequisite or physics evidence",async({page})=>{
  await page.goto("/courses/phs-231/assessments/readiness");
  await expect(page.getByText(/PHS 104 and MTH 220, or CSC 208 and MTH 221, or CSC 209/)).toBeVisible();
  await expect(page.getByText(/Course preparation is under construction/)).toHaveCount(3);
  const scope=assessment(page);await scope.getByRole("button",{name:"Start assessment",exact:true}).click();
  for(let i=0;i<8;i++)await scope.getByRole("button",{name:i===7?"Submit assessment":"Next question",exact:true}).click();
  await expect(scope.getByRole("heading",{name:"Readiness screen completed",exact:true})).toBeVisible();
  const learning=(await readStoredProgress(page)).learning;expect(learning.evidence).toEqual([]);expect(learning.assessmentResults).toBeUndefined();
  const links=await scope.locator(".assessment-table tbody th a").evaluateAll(items=>items.map(item=>item.getAttribute("href")));
  expect(links).toEqual(["/courses/f06/lessons/m01-l02","/courses/f07/lessons/m01-l01","/courses/f04/lessons/m01-l01","/courses/f08/lessons/m01-l02","/courses/f08/lessons/m01-l05","/courses/phs-231/lessons/m02-l03","/courses/phs-231/lessons/m03-l01","/courses/phs-231/lessons/m02-l01"]);
  await scope.locator(".assessment-table tbody th a").first().click();await expect(page.getByRole("heading",{level:1})).toContainText(/unit|conversion/i);
});
for(const [label,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const)test("assessment "+label+" preserves keyboard access full result tables and readable history",async({page},info)=>{
  await page.setViewportSize(viewport);await page.goto(route);const scope=assessment(page);
  const start=scope.getByRole("button",{name:"Start assessment",exact:true});await expect(start).toBeEnabled();await start.focus();await start.press("Enter");
  for(let i=0;i<8;i++){await expect(scope.locator(".attempt-meta")).toContainText("Question "+(i+1)+" of 8");const button=scope.getByRole("button",{name:i===7?"Submit assessment":"Next question",exact:true});await expect(button).toBeEnabled();await button.focus();await button.press("Enter");}
  await scope.getByText("Saved assessment history (1)",{exact:true}).click();
  const table=scope.getByRole("region",{name:"Results and repair links by original objective",exact:true});await table.focus();
  if(label==="mobile"){await page.keyboard.press("ArrowRight");await expect.poll(()=>table.evaluate(element=>element.scrollLeft)).toBeGreaterThan(0);}
  const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(item=>({id:item.id,targets:item.nodes.map(node=>node.target)}))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await table.screenshot({path:info.outputPath("assessment-"+label+"-table.png")});await scope.screenshot({path:info.outputPath("assessment-"+label+".png")});
  await page.reload();await expect(scope.getByRole("heading",{name:"Review needed",exact:true})).toBeVisible();
});
