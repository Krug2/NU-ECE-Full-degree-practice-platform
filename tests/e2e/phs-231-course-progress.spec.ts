import { expect,test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { readStoredProgress,restoreProgress } from "./progress";
import { courseFixture,failedReview } from "./phs-231-course-fixture";
import { fill,solve } from "./phs-231-assessment-helpers";

const route="/courses/phs-231";
test("the course connects preparation every required form and the project while respecting empty evidence",async({page})=>{
  await page.goto(route);const panel=page.locator("#assessments");
  await expect(panel).toContainText("0 / 22 current lesson objectives demonstrated; 0 / 9 module quizzes and 0 / 2 cumulative parts passed.");
  await expect(panel.getByText("Self-study completion targets met.",{exact:true})).toHaveCount(0);
  await panel.getByText("Module quizzes: all nine required",{exact:true}).click();await expect(panel.getByRole("link",{name:/^M0[1-9] quiz:/})).toHaveCount(9);
  await panel.getByText("Cumulative assessment: both parts required",{exact:true}).click();await expect(panel.getByRole("link",{name:/^Cumulative [AB]:/})).toHaveCount(2);
  await panel.getByRole("link",{name:"Check preparation",exact:true}).click();await expect(page).toHaveURL(/assessments\/readiness$/);
  await page.getByRole("link",{name:"Back to PHS 231 assessments",exact:true}).click();await expect(page).toHaveURL(/phs-231#assessments$/);
  await panel.getByRole("link",{name:"Open the reproducible simulation project and notebook",exact:true}).click();await expect(page).toHaveURL(/m09-l02#investigate$/);
  expect((await page.goto("/courses/mth-215/assessments/quiz-m01"))?.status()).toBe(404);
});
test("all required evidence and the self-assessed artifact survive actual export reset restore",async({page},info)=>{
  const fixture=await courseFixture();await restoreProgress(page,fixture);await page.goto(route);
  await expect(page.locator("#assessments").getByText("Self-study completion targets met.",{exact:true})).toBeVisible();
  await expect(page.locator("#assessments")).toContainText("22 / 22 current lesson objectives demonstrated; 9 / 9 module quizzes and 2 / 2 cumulative parts passed.");
  await page.goto("/settings");const downloading=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const path=info.outputPath("course-evidence.json");await(await downloading).saveAs(path);const exported=JSON.parse(await readFile(path,"utf8"));expect(exported.learning).toEqual(fixture.learning);
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();
  await restoreProgress(page,exported);await page.goto(route);await expect(page.locator("#assessments").getByText("Self-study completion targets met.",{exact:true})).toBeVisible();
  const failed=structuredClone(exported),part=failed.learning.assessmentResults.find((item:{assessmentId:string})=>item.assessmentId==="cumulative-b");part.passed=false;part.objectives[0]={...part.objectives[0],correct:0,criticalPassed:false,passed:false};
  await restoreProgress(page,failed);await page.goto(route);await expect(page.locator("#assessments").getByText("Self-study completion targets met.",{exact:true})).toHaveCount(0);
  await expect(page.locator("#assessments")).toContainText("1 / 2 cumulative parts passed.");
});
test("a failed review blocks the recommendation until a fresh independently solved repair",async({page})=>{
  const fixture=failedReview(await courseFixture());await restoreProgress(page,fixture);await page.goto(route);const panel=page.locator("#assessments");
  await expect(panel.getByText("Self-study completion targets met.",{exact:true})).toHaveCount(0);
  await panel.getByRole("link",{name:/^Repair:/}).click();await expect(page).toHaveURL(/review-m01-l01$/);
  const scope=page.locator("#assessment");await scope.getByRole("button",{name:"Start assessment",exact:true}).click();const attempt=(await readStoredProgress(page)).learning.attempts[0];
  for(const [index,question] of attempt.questions.entries()){await fill(scope,question,solve(question));await scope.getByRole("button",{name:index===3?"Submit assessment":"Next question",exact:true}).click();}
  await expect(scope.getByRole("heading",{name:"Assessment target met",exact:true})).toBeVisible();
  await page.getByRole("link",{name:"Return to the course and review plan",exact:true}).click();await expect(panel.getByText("Self-study completion targets met.",{exact:true})).toBeVisible();
  const learning=(await readStoredProgress(page)).learning;expect(learning.assessmentResults!.filter(item=>item.kind==="review")).toHaveLength(1);expect(learning.assessmentResults!.find(item=>item.kind==="review")!.passed).toBe(true);
});
for(const [label,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const)test("course evidence "+label+" exposes seven-day reviews with accessible navigation",async({page},info)=>{
  await page.setViewportSize(viewport);await page.clock.setFixedTime(new Date("2026-10-02T12:00:00.000Z"));await restoreProgress(page,await courseFixture());await page.goto(route);
  const panel=page.locator("#assessments");await expect(panel.getByText("Seven-day retrieval due",{exact:true})).toHaveCount(22);
  await panel.getByRole("link",{name:"Check preparation",exact:true}).focus();await page.keyboard.press("Enter");await expect(page).toHaveURL(/readiness$/);await page.goBack();await expect(panel).toBeVisible();
  const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(item=>({id:item.id,targets:item.nodes.map(node=>node.target)}))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await panel.getByRole("heading",{name:"Assess, repair, and retrieve.",exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath("course-"+label+"-evidence.png")});
  await panel.getByText("Targeted review and seven-day retrieval",{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath("course-"+label+"-review.png")});
});
