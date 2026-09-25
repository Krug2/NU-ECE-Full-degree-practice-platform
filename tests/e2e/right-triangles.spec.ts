import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { lessonSchema, type AnswerField } from "../../lib/learning/contracts";
import { createAttempt } from "../../lib/learning/attempts";
import { readStoredProgress, restoreProgress } from "./progress";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/mth-215/m06-l02.json", "utf8"))), route = "/courses/mth-215/lessons/m06-l02";
const cases = [
  { opposite: "ac", adjacent: "ab", sin: "15/17", cos: "8/17", tan: "15/8", ab: "16" },
  { opposite: "ab", adjacent: "ac", sin: "5/13", cos: "12/13", tan: "5/12", ab: "5/2" },
  { opposite: "ac", adjacent: "ab", sin: "1/sqrt(2)", cos: "1/sqrt(2)", tan: "1", ab: "12" },
  { opposite: "ac", adjacent: "ab", sin: "1/2", cos: "sqrt(3)/2", tan: "1/sqrt(3)", ab: "9*sqrt(3)" },
  { opposite: "ab", adjacent: "ac", sin: "1/2", cos: "sqrt(3)/2", tan: "1/sqrt(3)", ab: "4" },
  { opposite: "ab", adjacent: "ac", sin: "3/5", cos: "4/5", tan: "3/4", ab: "3/20" },
];
type Case = typeof cases[number];
const answer = (field: AnswerField): string => {
  if (field.kind === "choice") return field.correct;
  if (field.kind === "rational" || field.kind === "numeric" || field.kind === "exact") return String(field.expected);
  throw new Error("Unexpected triangle answer format: " + field.kind);
};
async function fillField(container: Locator, field: AnswerField, value = answer(field)) {
  if (field.kind === "choice") await container.getByRole("group", { name: field.label, exact: true }).locator('input[value="' + value + '"]').check();
  else await container.getByLabel(field.label + (field.unit ? " (" + field.unit + ")" : ""), { exact: true }).fill(value);
}
async function predict(activity: Locator, item: Case) {
  await activity.getByLabel("Predicted opposite side", { exact: true }).selectOption(item.opposite);
  await activity.getByLabel("Predicted adjacent leg", { exact: true }).selectOption(item.adjacent);
  await activity.getByLabel("Predicted hypotenuse", { exact: true }).selectOption("bc");
  await activity.getByRole("button", { name: "Check side predictions", exact: true }).click();
}
async function solve(activity: Locator, item: Case) {
  for (const [label, value] of [["Exact sine", item.sin], ["Exact cosine", item.cos], ["Exact tangent", item.tan], ["Scaled AB (cm)", item.ab]]) await activity.getByLabel(label, { exact: true }).fill(value);
  await activity.getByRole("button", { name: "Check triangle calculations", exact: true }).click();
}
async function explain(activity: Locator) {
  await activity.getByLabel("What changes when the reference angle switches?", { exact: true }).selectOption("swap");
  await activity.getByLabel("Why do the ratios stay the same after scaling?", { exact: true }).selectOption("cancel");
  await activity.getByRole("button", { name: "Check triangle explanation", exact: true }).click();
  await expect(activity.locator(".right-explanation-status")).toContainText("Correct.");
}

test("guided survey and investigation reject wrong heights, stale answers and invalid triangles", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(route);
  await expect(page.locator("#read > section")).toHaveCount(20);
  await expect(page.locator(".worked-example")).toHaveCount(36);
  await expect(page.locator(".katex-error")).toHaveCount(0);
  const guided = page.locator("#guided"), activity = page.locator("#investigate");
  for (const field of lesson.guided.question.fields) await fillField(guided, field, field.id === "height" ? "6" : answer(field));
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Review this reasoning");
  await guided.getByLabel("Total mast height (m)", { exact: true }).fill("7.5");
  await expect(guided.locator(".answer-feedback")).toHaveCount(0);
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await predict(activity, { ...cases[0], opposite: "ab" });
  await expect(activity.locator(".right-prediction-status")).toContainText("Find BC across");
  await expect(activity.getByLabel("Exact sine", { exact: true })).toHaveCount(0);
  await predict(activity, cases[0]); await solve(activity, { ...cases[0], sin: "17/15" });
  await expect(activity.locator(".right-solution-status")).toContainText("Check each exact ratio");
  await expect(activity.locator(".right-results")).toHaveCount(0);
  await solve(activity, cases[0]); await explain(activity);
  await activity.getByLabel("Reference angle", { exact: true }).selectOption("C");
  await expect(activity.locator(".right-results")).toHaveCount(0);
  await expect(activity.locator(".right-prediction-status")).toHaveText("");
  const switched = { ...cases[0], opposite: "ab", adjacent: "ac", sin: "8/17", cos: "15/17", tan: "8/15" };
  await predict(activity, switched); await solve(activity, switched); await explain(activity);
  await activity.getByLabel("BC (cm)", { exact: true }).fill("16");
  await expect(activity.getByRole("alert")).toContainText("must equal BC² exactly");
  await expect(activity.locator(".right-results")).toHaveCount(0);
  await expect(activity.getByRole("button", { name: "Check side predictions", exact: true })).toBeDisabled();
  await activity.getByLabel("BC (cm)", { exact: true }).fill("17");
  await activity.getByLabel("Length scale factor", { exact: true }).fill("0");
  await expect(activity.getByRole("alert")).toContainText("scale factor from 1/10 to 10");
  await activity.getByRole("button", { name: "Reset this case", exact: true }).click();
  await expect(activity.getByLabel("Reference angle", { exact: true })).toHaveValue("B");
  await expect(activity.getByLabel("Length scale factor", { exact: true })).toHaveValue("2");
  expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0); expect(errors).toEqual([]);
});

test("six exact triangle cases support keyboard use and accessible mobile layouts", async ({ page }, testInfo) => {
  test.setTimeout(240_000); await page.goto(route);
  const activity = page.locator("#investigate"), selector = activity.getByLabel("Triangle case", { exact: true });
  await expect(selector).toBeEnabled(); await selector.focus(); await expect(selector).toBeFocused();
  await page.keyboard.press("Home"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter");
  await expect(activity.getByLabel("AB (cm)", { exact: true })).toHaveValue("5");
  for (let index = 0; index < cases.length; index++) {
    await selector.selectOption(String(index)); await predict(activity, cases[index]);
    if (index === 2) {
      await solve(activity, { ...cases[index], sin: "0.7071067812" });
      await expect(activity.locator(".right-results")).toHaveCount(0);
      await expect(activity.locator(".right-solution-status")).toContainText("Keep radicals exact");
    }
    await solve(activity, cases[index]); await explain(activity);
    await expect(activity.getByRole("table", { name: "Two acute angles in the same right triangle", exact: true })).toBeVisible();
    await expect(activity.locator(".katex-error")).toHaveCount(0);
  }
  const desktop = await new AxeBuilder({ page }).setLegacyMode().include("#investigate").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(desktop.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.failureSummary) }))).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await selector.selectOption("3"); await predict(activity, cases[3]); await solve(activity, cases[3]); await explain(activity);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const mobile = await new AxeBuilder({ page }).setLegacyMode().include("#investigate").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(mobile.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.failureSummary) }))).toEqual([]);
  const comparison = activity.getByRole("region", { name: "Exact triangle comparison", exact: true });
  await comparison.focus(); await expect(comparison).toBeFocused();
  await comparison.evaluate(element => element.scrollIntoView({ block: "start", behavior: "instant" }));
  const mobileHeader = (await page.locator(".sidebar").boundingBox())!;
  expect((await comparison.boundingBox())!.y).toBeGreaterThanOrEqual(mobileHeader.y + mobileHeader.height);
  await page.screenshot({ path: testInfo.outputPath("triangle-comparison-mobile.png") });
  await activity.getByLabel("What changes when the reference angle switches?", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("triangle-explanation-mobile.png") });
  await activity.locator(".triangle-figure").screenshot({ path: testInfo.outputPath("triangle-figure-mobile.png") });
  await activity.getByRole("button", { name: "Reset this case", exact: true }).click();
  await expect(selector).toHaveValue("3"); await expect(activity.getByLabel("AB (cm)", { exact: true })).toHaveValue("6*sqrt(3)");
  await expect(activity.locator(".right-results")).toHaveCount(0);
});

test("triangle practice and notes persist without independent evidence", async ({ page }) => {
  test.setTimeout(150_000); await page.goto(route);
  const notes = page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true });
  await notes.fill("Opposite and adjacent depend on the chosen angle. Add eye height after finding the rise.");
  await page.getByRole("button", { name: "Save lesson notes", exact: true }).click();
  await expect(page.getByText("Lesson notes saved.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start practice", exact: true }).click();
  await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 35");
  await page.locator("#practice").getByRole("button", { name: "Show a hint (0/3)", exact: true }).click();
  const saved = await readStoredProgress(page), question = saved.learning.attempts[0].questions[0];
  for (const field of question.fields) await fillField(page.locator("#practice"), field);
  await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");
  await page.reload(); await expect(notes).toHaveValue("Opposite and adjacent depend on the chosen angle. Add eye height after finding the rise.");
  await expect(page.locator("#practice").getByRole("button", { name: "Show a hint (1/3)", exact: true })).toBeVisible();
  for (const field of question.fields) {
    if (field.kind === "choice") await expect(page.locator("#practice").getByRole("group", { name: field.label, exact: true }).locator('input[value="' + answer(field) + '"]')).toBeChecked();
    else await expect(page.locator("#practice").getByLabel(field.label + (field.unit ? " (" + field.unit + ")" : ""), { exact: true })).toHaveValue(answer(field));
  }
  expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
});

test("critical triangle checkpoints survive reload and backup restoration", async ({ page }, testInfo) => {
  test.setTimeout(240_000); await page.goto(route);
  await expect(page.getByRole("button", { name: "Start practice", exact: true })).toBeEnabled();
  const attempt = createAttempt(lesson, "checkpoint", "77174bca-b6c5-4167-8af4-f5827e43c5e8"), progress = await readStoredProgress(page);
  progress.learning.attempts = [attempt];
  async function submit(wrong: boolean) {
    await page.goto(route); await page.getByRole("button", { name: "Checkpoint", exact: true }).click();
    await expect(page.locator("#practice").getByRole("button", { name: /Show a hint/ })).toHaveCount(0);
    for (let index = 0; index < 4; index++) {
      const question = attempt.questions[index];
      for (const [position, field] of question.fields.entries()) {
        const incorrect = field.kind === "choice" ? field.options.find(option => option.id !== field.correct)!.id : "-999";
        await fillField(page.locator("#practice"), field, wrong && index === 0 && position === 0 ? incorrect : answer(field));
      }
      await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");
      if (!wrong && index < 3) {
        await page.reload(); await page.getByRole("button", { name: "Checkpoint", exact: true }).click();
        for (const field of question.fields) if (field.kind !== "choice") await expect(page.locator("#practice").getByLabel(field.label + (field.unit ? " (" + field.unit + ")" : ""), { exact: true })).toHaveValue(answer(field));
      }
      await page.getByRole("button", { name: index === 3 ? "Submit checkpoint" : "Next question", exact: true }).click();
    }
  }
  await restoreProgress(page, progress); await submit(true);
  await expect(page.getByRole("heading", { name: "Keep working on this objective", exact: true })).toBeVisible();
  await expect(page.locator(".attempt-results")).toContainText("3 of 4 correct");
  expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
  await restoreProgress(page, progress); await submit(false);
  await expect(page.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
  await page.goto("/settings"); const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export progress", exact: true }).click();
  const file = testInfo.outputPath("triangle-progress.json"); await (await download).saveAs(file);
  const backup = JSON.parse(await readFile(file, "utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions); expect(backup.learning.evidence).toHaveLength(1);
  for (const question of attempt.questions) for (const field of question.fields) expect(backup.learning.attempts[0].responses[question.id][field.id]).toBe(answer(field));
  await restoreProgress(page, backup); await page.goto(route);
  await page.getByRole("button", { name: "Checkpoint", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
});
