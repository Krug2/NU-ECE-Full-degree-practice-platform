import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { lessonSchema, type AnswerField } from "../../lib/learning/contracts";
import { createAttempt } from "../../lib/learning/attempts";
import { readStoredProgress, restoreProgress } from "./progress";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/mth-215/m06-l03.json", "utf8"))), route = "/courses/mth-215/lessons/m06-l03";
const cases = [
  { location: "quadrant-ii", xSign: "negative", ySign: "positive", x: "-sqrt(3)/2", y: "1/2" },
  { location: "quadrant-iv", xSign: "positive", ySign: "negative", x: "1/sqrt(2)", y: "-1/sqrt(2)" },
  { location: "quadrant-i", xSign: "positive", ySign: "positive", x: "1/2", y: "sqrt(3)/2" },
  { location: "negative-y", xSign: "zero", ySign: "negative", x: "0", y: "-1" },
  { location: "quadrant-iii", xSign: "negative", ySign: "negative", x: "-1/sqrt(2)", y: "-1/sqrt(2)" },
  { location: "positive-x", xSign: "positive", ySign: "zero", x: "1", y: "0" },
];
type Case = typeof cases[number];
const answer = (field: AnswerField): string => {
  if (field.kind === "choice") return field.correct;
  if (field.kind === "exact" || field.kind === "pi-expression" || field.kind === "roots") return String(field.expected);
  throw new Error("Unexpected circle answer format: " + field.kind);
};
async function fillField(container: Locator, field: AnswerField, value = answer(field)) {
  if (field.kind === "choice") await container.getByRole("group", { name: field.label, exact: true }).locator('input[value="' + value + '"]').check();
  else await container.getByLabel(field.label + (field.unit ? " (" + field.unit + ")" : ""), { exact: true }).fill(value);
}
async function predict(activity: Locator, item: Case) {
  await activity.getByLabel("Predicted terminal location", { exact: true }).selectOption(item.location);
  await activity.getByLabel("Predicted x sign", { exact: true }).selectOption(item.xSign);
  await activity.getByLabel("Predicted y sign", { exact: true }).selectOption(item.ySign);
  await activity.getByRole("button", { name: "Check circle prediction", exact: true }).click();
}
async function solve(activity: Locator, item: Case) {
  await activity.getByLabel("Exact x = cosine", { exact: true }).fill(item.x);
  await activity.getByLabel("Exact y = sine", { exact: true }).fill(item.y);
  await activity.getByRole("button", { name: "Check circle coordinates", exact: true }).click();
}
async function explain(activity: Locator) {
  await activity.getByLabel("Which coordinate is negated by the x-axis reflection rule?", { exact: true }).selectOption("y");
  await activity.getByLabel("Why does x² + y² = 1 fail to choose the signs?", { exact: true }).selectOption("squares");
  await activity.getByRole("button", { name: "Check circle explanation", exact: true }).click();
  await expect(activity.locator(".circle-explanation-status")).toContainText("Correct.");
}

test("guided reconstruction and circle investigation reject wrong signs, rounding and stale results", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(route);
  await expect(page.locator("#read > section")).toHaveCount(18);
  await expect(page.locator(".worked-example")).toHaveCount(33);
  await expect(page.locator(".katex-error")).toHaveCount(0);
  const guided = page.locator("#guided"), activity = page.locator("#investigate");
  for (const field of lesson.guided.question.fields) await fillField(guided, field, field.id === "reconstructed" ? "3/4" : answer(field));
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Review this reasoning");
  await guided.getByLabel("Cosine of the separate quadrant III point", { exact: true }).fill("-sqrt(9/16)");
  await expect(guided.locator(".answer-feedback")).toHaveCount(0);
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await predict(activity, { ...cases[0], xSign: "positive" });
  await expect(activity.locator(".circle-prediction-status")).toContainText("Locate the terminal side");
  await expect(activity.locator(".circle-diagram")).toHaveCount(0);
  await expect(activity.getByLabel("Exact x = cosine", { exact: true })).toHaveCount(0);
  await predict(activity, cases[0]);
  await solve(activity, { ...cases[0], x: cases[0].y, y: cases[0].x });
  await expect(activity.locator(".circle-results")).toHaveCount(0);
  await expect(activity.locator(".circle-solution-status")).toContainText("coordinate order and signs");
  await solve(activity, { ...cases[0], x: "-0.8660254038" });
  await expect(activity.locator(".circle-results")).toHaveCount(0);
  await solve(activity, cases[0]); await explain(activity);
  await activity.getByLabel("Exact x = cosine", { exact: true }).fill("-1/2");
  await expect(activity.locator(".circle-results")).toHaveCount(0);
  await solve(activity, cases[0]);
  await activity.getByLabel("Predicted x sign", { exact: true }).selectOption("positive");
  await expect(activity.getByLabel("Exact x = cosine", { exact: true })).toHaveCount(0);
  await activity.getByLabel("Directed angle", { exact: true }).fill("pi/7");
  await expect(activity.getByRole("alert")).toContainText("multiple of 30 or 45 degrees");
  await expect(activity.getByRole("button", { name: "Check circle prediction", exact: true })).toBeDisabled();
  await activity.getByLabel("Directed angle", { exact: true }).fill("150");
  await activity.getByLabel("Angle unit", { exact: true }).selectOption("degrees");
  await predict(activity, cases[0]); await solve(activity, cases[0]); await explain(activity);
  await activity.getByLabel("Directed angle", { exact: true }).fill("5/12");
  await activity.getByLabel("Angle unit", { exact: true }).selectOption("turns");
  await expect(activity.locator(".circle-results")).toHaveCount(0);
  await predict(activity, cases[0]); await solve(activity, cases[0]);
  await activity.getByRole("button", { name: "Reset this case", exact: true }).click();
  await expect(activity.getByLabel("Directed angle", { exact: true })).toHaveValue("5pi/6");
  await expect(activity.getByLabel("Angle unit", { exact: true })).toHaveValue("radians");
  expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
  expect(errors).toEqual([]);
});

test("six circle cases support keyboard use, exact tables and accessible mobile layouts", async ({ page }, testInfo) => {
  test.setTimeout(240_000); await page.goto(route);
  const activity = page.locator("#investigate"), selector = activity.getByLabel("Unit-circle case", { exact: true });
  await expect(selector).toBeEnabled(); await selector.focus(); await expect(selector).toBeFocused();
  await page.keyboard.press("Home"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter");
  await expect(activity.getByLabel("Directed angle", { exact: true })).toHaveValue("-pi/4");
  for (let index = 0; index < cases.length; index++) {
    await selector.selectOption(String(index)); await predict(activity, cases[index]); await solve(activity, cases[index]); await explain(activity);
    await expect(activity.getByRole("table", { name: "Exact coordinates under rotation and reflection", exact: true })).toBeVisible();
    await expect(activity.locator(".katex-error")).toHaveCount(0);
    if (index > 4) await expect(activity.locator(".circle-results")).toContainText("no acute reference angle");
  }
  const desktop = await new AxeBuilder({ page }).setLegacyMode().include("#investigate").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(desktop.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.failureSummary) }))).toEqual([]);
  await selector.selectOption("0"); await predict(activity, cases[0]); await solve(activity, cases[0]); await explain(activity);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await new AxeBuilder({ page }).setLegacyMode().include("#investigate").withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(mobile.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.failureSummary) }))).toEqual([]);
  const comparison = activity.getByRole("region", { name: "Exact unit-circle comparison", exact: true });
  expect(await comparison.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await comparison.focus(); await expect(comparison).toBeFocused();
  await comparison.evaluate(element => element.scrollIntoView({ block: "start", behavior: "instant" }));
  const tableBounds = await comparison.boundingBox(), headerBounds = await page.locator(".sidebar").boundingBox();
  expect(tableBounds!.y).toBeGreaterThanOrEqual(headerBounds!.y + headerBounds!.height);
  await page.screenshot({ path: testInfo.outputPath("circle-comparison-mobile.png") });
  await activity.locator(".circle-diagram").screenshot({ path: testInfo.outputPath("circle-diagram-mobile.png") });
  await activity.getByLabel("Directed angle", { exact: true }).fill("90");
  await activity.getByLabel("Angle unit", { exact: true }).selectOption("degrees");
  const top = { location: "positive-y", xSign: "zero", ySign: "positive", x: "0", y: "1" };
  await predict(activity, top); await solve(activity, top); await explain(activity);
  const pointLabel = await activity.locator(".circle-diagram text").filter({ hasText: /^P$/ }).boundingBox();
  const axisLabel = await activity.locator(".circle-diagram text").filter({ hasText: /^y$/ }).boundingBox();
  expect(pointLabel!.x + pointLabel!.width <= axisLabel!.x || pointLabel!.y >= axisLabel!.y + axisLabel!.height).toBe(true);
  await activity.locator(".circle-diagram").screenshot({ path: testInfo.outputPath("circle-axis-mobile.png") });
  expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
});

test("circle practice and notes persist without independent evidence", async ({ page }) => {
  test.setTimeout(150_000); await page.goto(route);
  const notes = page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true });
  await notes.fill("Cosine is horizontal. A missing coordinate needs a sign from the quadrant.");
  await page.getByRole("button", { name: "Save lesson notes", exact: true }).click();
  await expect(page.getByText("Lesson notes saved.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start practice", exact: true }).click();
  await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 32");
  await page.locator("#practice").getByRole("button", { name: "Show a hint (0/3)", exact: true }).click();
  const saved = await readStoredProgress(page), question = saved.learning.attempts[0].questions[0];
  for (const field of question.fields) await fillField(page.locator("#practice"), field);
  await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");
  await page.reload(); await expect(notes).toHaveValue("Cosine is horizontal. A missing coordinate needs a sign from the quadrant.");
  await expect(page.locator("#practice").getByRole("button", { name: "Show a hint (1/3)", exact: true })).toBeVisible();
  for (const field of question.fields) {
    if (field.kind === "choice") await expect(page.locator("#practice").getByRole("group", { name: field.label, exact: true }).locator('input[value="' + answer(field) + '"]')).toBeChecked();
    else await expect(page.locator("#practice").getByLabel(field.label + (field.unit ? " (" + field.unit + ")" : ""), { exact: true })).toHaveValue(answer(field));
  }
  expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
});

test("critical circle checkpoints survive reload and backup restoration", async ({ page }, testInfo) => {
  test.setTimeout(240_000); await page.goto(route);
  await expect(page.getByRole("button", { name: "Start practice", exact: true })).toBeEnabled();
  const attempt = createAttempt(lesson, "checkpoint", "990987bc-ac63-44eb-b289-e0bafcdb2749"), progress = await readStoredProgress(page);
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
  const file = testInfo.outputPath("circle-progress.json"); await (await download).saveAs(file);
  const backup = JSON.parse(await readFile(file, "utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions); expect(backup.learning.evidence).toHaveLength(1);
  for (const question of attempt.questions) for (const field of question.fields) expect(backup.learning.attempts[0].responses[question.id][field.id]).toBe(answer(field));
  await restoreProgress(page, backup); await page.goto(route);
  await page.getByRole("button", { name: "Checkpoint", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
});
