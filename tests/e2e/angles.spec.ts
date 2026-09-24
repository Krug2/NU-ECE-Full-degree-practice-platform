import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { lessonSchema, type AnswerField } from "../../lib/learning/contracts";
import { createAttempt } from "../../lib/learning/attempts";
import { readStoredProgress, restoreProgress } from "./progress";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/mth-215/m06-l01.json", "utf8"))), route = "/courses/mth-215/lessons/m06-l01";
const cases = [
  { location: "quadrant-ii", relation: "equal", net: "2pi/3", travel: "2pi/3", distance: "2pi", scaled: "4pi", area: "4" },
  { location: "quadrant-iii", relation: "equal", net: "-5pi/6", travel: "5pi/6", distance: "5pi", scaled: "5pi/2", area: "1/4" },
  { location: "positive-y", relation: "equal", net: "9pi/2", travel: "9pi/2", distance: "9pi", scaled: "27pi", area: "9" },
  { location: "positive-y", relation: "equal", net: "-3pi/2", travel: "3pi/2", distance: "6pi", scaled: "9pi", area: "9/4" },
  { location: "quadrant-i", relation: "equal", net: "7/5", travel: "7/5", distance: "7", scaled: "14", area: "4" },
  { location: "positive-x", relation: "greater", net: "0", travel: "3pi", distance: "6pi", scaled: "12pi", area: "4" },
];
type Case = typeof cases[number];
const answer = (field: AnswerField): string => {
  if (field.kind === "choice") return field.correct;
  if (field.kind === "rational" || field.kind === "pi-expression" || field.kind === "exact") return field.expected;
  throw new Error("Unexpected angle answer format: " + field.kind);
};
async function fillField(container: Locator, field: AnswerField, value = answer(field)) {
  if (field.kind === "choice") await container.getByRole("group", { name: field.label, exact: true }).locator('input[value="' + value + '"]').check();
  else await container.getByLabel(field.label + (field.unit ? " (" + field.unit + ")" : ""), { exact: true }).fill(value);
}
async function predict(activity: Locator, item: Case) {
  await activity.getByLabel("Predicted terminal ray", { exact: true }).selectOption(item.location);
  await activity.getByLabel("Total travel compared with the magnitude of net rotation", { exact: true }).selectOption(item.relation);
  await activity.getByRole("button", { name: "Check rotation predictions", exact: true }).click();
}
async function solve(activity: Locator, item: Case) {
  for (const [label, value] of [
    ["Signed net rotation (rad)", item.net], ["Total angular travel (rad)", item.travel],
    ["Distance at original radius (cm)", item.distance], ["Distance at scaled radius (cm)", item.scaled],
    ["Accumulated area scale factor", item.area],
  ]) await activity.getByLabel(label, { exact: true }).fill(value);
  await activity.getByRole("button", { name: "Check circular calculations", exact: true }).click();
}
async function explain(activity: Locator) {
  await activity.getByLabel("How should total angular travel be calculated?", { exact: true }).selectOption("segments");
  await activity.getByLabel("What changes when radius is multiplied by c?", { exact: true }).selectOption("square");
  await activity.getByRole("button", { name: "Check rotation explanation", exact: true }).click();
  await expect(activity.locator(".rotation-explanation-status")).toContainText("Correct.");
}

test("guided angles and investigation controls reject lost turns and clear stale results", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(route);
  await expect(page.locator("#read > section")).toHaveCount(22);
  await expect(page.locator(".worked-example")).toHaveCount(44);
  await expect(page.locator(".katex-error")).toHaveCount(0);
  const guided = page.locator("#guided"), activity = page.locator("#investigate");
  for (const field of lesson.guided.question.fields) await fillField(guided, field, field.id === "angle" ? "3pi/2" : answer(field));
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Review this reasoning");
  await guided.getByLabel("Complete signed rotation (rad)", { exact: true }).fill("-10π/4");
  await expect(guided.locator(".answer-feedback")).toHaveCount(0);
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await predict(activity, { ...cases[0], location: "quadrant-i" });
  await expect(activity.locator(".rotation-prediction-status")).toContainText("Locate the final ray");
  await expect(activity.getByLabel("Signed net rotation (rad)", { exact: true })).toHaveCount(0);
  await predict(activity, cases[0]); await solve(activity, { ...cases[0], distance: "6.283185307" });
  await expect(activity.locator(".rotation-solution-status")).toContainText("exact value");
  await expect(activity.locator(".rotation-results")).toHaveCount(0);
  await solve(activity, { ...cases[0], distance: "4π/2" }); await explain(activity);
  await activity.getByLabel("Original radius (cm)", { exact: true }).fill("0");
  await expect(activity.getByRole("alert")).toContainText("radius from 1/10 to 20");
  await expect(activity.locator(".rotation-results")).toHaveCount(0);
  await expect(activity.getByRole("button", { name: "Check rotation predictions", exact: true })).toBeDisabled();
  await activity.getByRole("button", { name: "Reset this case", exact: true }).click();
  await expect(activity.getByLabel("Original radius (cm)", { exact: true })).toHaveValue("3");
  await predict(activity, cases[0]); await solve(activity, cases[0]);
  await activity.getByLabel("Unit for both rotations", { exact: true }).selectOption("radians");
  await expect(activity.locator(".rotation-results")).toHaveCount(0);
  await expect(activity.locator(".rotation-prediction-status")).toHaveText("");
  expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0); expect(errors).toEqual([]);
});

test("all six rotations work with keyboard controls and accessible narrow layouts", async ({ page }, testInfo) => {
  test.setTimeout(240_000); await page.goto(route);
  const activity = page.locator("#investigate"), selector = activity.getByLabel("Rotation case", { exact: true });
  await expect(selector).toBeEnabled();
  await selector.focus(); await expect(selector).toBeFocused();
  await page.keyboard.press("Home"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter");
  await expect(activity.getByLabel("Original radius (cm)", { exact: true })).toHaveValue("6");
  for (let index = 0; index < cases.length; index++) {
    await selector.selectOption(String(index)); await predict(activity, cases[index]); await solve(activity, cases[index]); await explain(activity);
    await expect(activity.getByRole("img", { name: "Two radii and a directed rotation", exact: true })).toBeVisible();
    await expect(activity.getByRole("table")).toBeVisible();
    await expect(activity.locator(".katex-error")).toHaveCount(0);
  }
  const desktop = await new AxeBuilder({ page }).setLegacyMode().include("#investigate").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(desktop.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.failureSummary) }))).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const mobile = await new AxeBuilder({ page }).setLegacyMode().include("#investigate").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(mobile.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.failureSummary) }))).toEqual([]);
  await activity.getByRole("region", { name: "Exact rotation values", exact: true }).focus();
  await expect(activity.getByRole("region", { name: "Exact rotation values", exact: true })).toBeFocused();
  await activity.locator(".rotation-figure").screenshot({ path: testInfo.outputPath("rotation-mobile.png") });
  await activity.getByRole("button", { name: "Reset this case", exact: true }).click();
  await expect(selector).toHaveValue("5"); await expect(activity.getByLabel("Second rotation", { exact: true })).toHaveValue("-270");
});

test("practice and notes resume without awarding independent evidence", async ({ page }) => {
  test.setTimeout(150_000); await page.goto(route);
  const notes = page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true });
  await notes.fill("A terminal ray loses complete turns. Sum segment magnitudes for travel.");
  await page.getByRole("button", { name: "Save lesson notes", exact: true }).click();
  await expect(page.getByText("Lesson notes saved.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start practice", exact: true }).click();
  await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 38");
  await page.locator("#practice").getByRole("button", { name: "Show a hint (0/3)", exact: true }).click();
  const saved = await readStoredProgress(page), question = saved.learning.attempts[0].questions[0];
  for (const field of question.fields) await fillField(page.locator("#practice"), field);
  await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");
  await page.reload(); await expect(notes).toHaveValue("A terminal ray loses complete turns. Sum segment magnitudes for travel.");
  await expect(page.locator("#practice").getByRole("button", { name: "Show a hint (1/3)", exact: true })).toBeVisible();
  for (const field of question.fields) if (field.kind !== "choice") await expect(page.locator("#practice").getByLabel(field.label + (field.unit ? " (" + field.unit + ")" : ""), { exact: true })).toHaveValue(answer(field));
  expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
});

test("critical checkpoints preserve exact answers through reload, export and restore", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  await page.goto(route);
  await expect(page.getByRole("button", { name: "Start practice", exact: true })).toBeEnabled();
  const attempt = createAttempt(lesson, "checkpoint", "07174bca-b6c5-4167-8af4-f5827e43c5e8"), progress = await readStoredProgress(page);
  progress.learning.attempts = [attempt];
  async function submit(wrong: boolean) {
    await page.goto(route); await page.getByRole("button", { name: "Checkpoint", exact: true }).click();
    await expect(page.locator("#practice").getByRole("button", { name: /Show a hint/ })).toHaveCount(0);
    for (let index = 0; index < 4; index++) {
      const question = attempt.questions[index];
      for (const [position, field] of question.fields.entries()) {
        const incorrect = field.kind === "choice" ? field.options.find(option => option.id !== field.correct)!.id : "999991";
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
  const file = testInfo.outputPath("angle-progress.json"); await (await download).saveAs(file);
  const backup = JSON.parse(await readFile(file, "utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions); expect(backup.learning.evidence).toHaveLength(1);
  for (const question of attempt.questions) for (const field of question.fields) expect(backup.learning.attempts[0].responses[question.id][field.id]).toBe(answer(field));
  await restoreProgress(page, backup); await page.goto(route);
  await page.getByRole("button", { name: "Checkpoint", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
});
