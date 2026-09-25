import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { lessonSchema, type AnswerField } from "../../lib/learning/contracts";
import { formatExact, parseExact } from "../../lib/learning/exact-number";
import { createAttempt } from "../../lib/learning/attempts";
import { readStoredProgress, restoreProgress } from "./progress";

const lesson = lessonSchema.parse(JSON.parse(readFileSync("content/lessons/mth-215/m06-l04.json", "utf8"))), route = "/courses/mth-215/lessons/m06-l04";
const names = ["sine", "cosine", "tangent", "secant", "cosecant", "cotangent"];
const cases: (string | null)[][] = [
  ["15/17", "-8/17", "-15/8", "-17/8", "17/15", "-8/15"],
  ["-sqrt(3)/2", "1/2", "-sqrt(3)", "2", "-2/sqrt(3)", "-1/sqrt(3)"],
  ["1", "0", null, null, "1", "0"],
  ["0", "-1", "0", "-1", null, null],
  ["100/sqrt(10001)", "1/sqrt(10001)", "100", "sqrt(10001)", "sqrt(10001)/100", "1/100"],
  ["-12/13", "-5/13", "12/5", "-13/5", "-13/12", "5/12"],
];
const answer = (field: AnswerField): string => {
  if (field.kind === "choice") return field.correct;
  if (field.kind === "exact-or-undefined") return field.expected ?? "undefined";
  if (field.kind === "roots") return field.expected.length ? field.expected.join(",") : "none";
  if (field.kind === "exact" || field.kind === "pi-expression") return field.expected;
  throw new Error("Unexpected six-function answer format: " + field.kind);
};
async function fillField(container: Locator, field: AnswerField, value = answer(field)) {
  if (field.kind === "choice") await container.getByRole("group", { name: field.label, exact: true }).locator('input[value="' + value + '"]').check();
  else await container.getByLabel(field.label + (field.unit ? " (" + field.unit + ")" : ""), { exact: true }).fill(value);
}
async function predict(activity: Locator, values: (string | null)[]) {
  for (const index of [2, 5, 3, 4]) await activity.getByLabel("Predicted " + names[index] + " status", { exact: true }).selectOption(values[index] === null ? "undefined" : "defined");
  await activity.getByRole("button", { name: "Check function predictions", exact: true }).click();
}
async function solve(activity: Locator, values: (string | null)[]) {
  for (const [index, value] of values.entries()) await activity.getByLabel("Exact " + names[index], { exact: true }).fill(value ?? "undefined");
  await activity.getByRole("button", { name: "Check six values", exact: true }).click();
}
async function explain(activity: Locator) {
  await activity.getByLabel("What makes a quotient undefined?", { exact: true }).selectOption("denominator");
  await activity.getByLabel("Why do tangent and cotangent repeat after a half-turn?", { exact: true }).selectOption("cancel");
  await activity.getByRole("button", { name: "Check function explanation", exact: true }).click();
  await expect(activity.locator(".six-explanation-status")).toContainText("Correct.");
}
async function checkCell(cell: Locator, value: string | null) {
  if (value === null) await expect(cell).toHaveText("Undefined");
  else await expect(cell.locator("annotation")).toHaveText(formatExact(parseExact(value), true));
}

test("guided ratios and editable investigation reject undefined substitutes and stale answers", async ({ page }) => {
  test.setTimeout(180_000); const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(route);
  await expect(page.locator("#read > section")).toHaveCount(22); await expect(page.locator(".worked-example")).toHaveCount(37);
  await expect(page.locator(".katex-error")).toHaveCount(0);
  const guided = page.locator("#guided"), activity = page.locator("#investigate");
  for (const field of lesson.guided.question.fields) await fillField(guided, field, field.id === "axis" ? "0" : answer(field));
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Review this reasoning");
  await guided.getByLabel("Tangent at pi/2", { exact: true }).fill("undefined");
  await guided.getByLabel("Exact sine of theta", { exact: true }).fill("-sqrt(144/169)");
  await expect(guided.locator(".answer-feedback")).toHaveCount(0);
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await predict(activity, cases[0].map((value, index) => index === 2 ? null : value));
  await expect(activity.locator(".six-prediction-status")).toContainText("Inspect denominators");
  await expect(activity.getByLabel("Exact sine", { exact: true })).toHaveCount(0);
  await predict(activity, cases[0]);
  for (const bad of ["15/8", "0.8823529412", "undefined"]) {
    await solve(activity, cases[0].map((value, index) => index === 0 ? bad : value));
    await expect(activity.locator(".six-results")).toHaveCount(0);
  }
  await solve(activity, cases[0]); await explain(activity);
  await activity.getByLabel("Compare a transformation", { exact: true }).selectOption("reflection");
  await expect(activity.locator(".six-explanation-status")).toBeEmpty();
  await expect(activity.getByLabel("What makes a quotient undefined?", { exact: true })).toHaveValue("");
  await activity.getByLabel("Exact cotangent", { exact: true }).fill("15/8");
  await expect(activity.locator(".six-results")).toHaveCount(0); await solve(activity, cases[0]);
  await activity.getByLabel("Predicted secant status", { exact: true }).selectOption("undefined");
  await expect(activity.getByLabel("Exact sine", { exact: true })).toHaveCount(0);
  await activity.getByLabel("Point x", { exact: true }).fill("0"); await activity.getByLabel("Point y", { exact: true }).fill("0");
  await expect(activity.getByRole("alert")).toContainText("origin");
  await expect(activity.getByRole("button", { name: "Check function predictions", exact: true })).toBeDisabled();
  await activity.getByLabel("Point x", { exact: true }).fill("101");
  await expect(activity.getByRole("alert")).toContainText("-100 to 100");
  await activity.getByLabel("Point x", { exact: true }).fill("1+sqrt(2)"); await activity.getByLabel("Point y", { exact: true }).fill("1");
  await expect(activity.getByRole("alert")).toBeVisible();
  await expect(activity.getByRole("button", { name: "Check function predictions", exact: true })).toBeDisabled();
  await activity.getByLabel("Point x", { exact: true }).fill("3"); await activity.getByLabel("Point y", { exact: true }).fill("4");
  const changed = ["4/5", "3/5", "4/3", "5/3", "5/4", "3/4"];
  await predict(activity, changed); await solve(activity, changed); await explain(activity);
  await activity.getByRole("button", { name: "Reset this case", exact: true }).click();
  await expect(activity.getByLabel("Point x", { exact: true })).toHaveValue("-8");
  await expect(activity.getByLabel("Point y", { exact: true })).toHaveValue("15");
  await expect(activity.locator(".six-results")).toHaveCount(0);
  await activity.getByLabel("Six-function case", { exact: true }).selectOption("2");
  await predict(activity, cases[2]);
  for (const invalid of ["Infinity", "1/0", "0"]) {
    await solve(activity, cases[2].map((value, index) => index === 2 ? invalid : value));
    await expect(activity.locator(".six-results")).toHaveCount(0);
  }
  await solve(activity, cases[2]); await explain(activity);
  expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0); expect(errors).toEqual([]);
});

test("six cases and all transformations provide exact accessible tables on desktop and mobile", async ({ page }, testInfo) => {
  test.setTimeout(240_000); await page.goto(route);
  const activity = page.locator("#investigate"), selector = activity.getByLabel("Six-function case", { exact: true });
  await expect(selector).toBeEnabled(); await selector.focus(); await expect(selector).toBeFocused();
  await page.keyboard.press("Home"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter");
  await expect(activity.getByLabel("Point y", { exact: true })).toHaveValue("-sqrt(3)");
  for (let index = 0; index < cases.length; index++) {
    const values = cases[index]; await selector.selectOption(String(index)); await predict(activity, values); await solve(activity, values);
    const rows = activity.getByRole("table", { name: "Coordinate definitions at the selected point", exact: true }).locator("tbody tr");
    await expect(rows).toHaveCount(6);
    for (let row = 0; row < 6; row++) {
      await checkCell(rows.nth(row).locator("td").nth(1), values[row]);
      if (values[row] === null) await expect(rows.nth(row)).toContainText("Zero denominator");
    }
    for (const [transform, flips] of [["reflection", [0, 2, 4, 5]], ["half-turn", [0, 1, 3, 4]], ["full-turn", []]] as const) {
      await activity.getByLabel("Compare a transformation", { exact: true }).selectOption(transform);
      const compared = activity.getByRole("region", { name: "Six-function transformation comparison", exact: true }).locator("tbody tr");
      for (let row = 0; row < 6; row++) {
        const value = values[row], expected = value === null ? null : (flips as readonly number[]).includes(row) ? "-(" + value + ")" : value;
        await checkCell(compared.nth(row).locator("td").nth(0), value);
        await checkCell(compared.nth(row).locator("td").nth(1), expected);
      }
    }
    await explain(activity); await expect(activity.locator(".katex-error")).toHaveCount(0);
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
  const comparison = activity.getByRole("region", { name: "Six exact values and denominators", exact: true });
  expect(await comparison.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await comparison.focus(); await expect(comparison).toBeFocused();
  await comparison.evaluate(element => element.scrollIntoView({ block: "start", behavior: "instant" }));
  const tableBounds = await comparison.boundingBox(), headerBounds = await page.locator(".sidebar").boundingBox();
  expect(tableBounds!.y).toBeGreaterThanOrEqual(headerBounds!.y + headerBounds!.height);
  await page.screenshot({ path: testInfo.outputPath("six-table-mobile.png") });
  await activity.locator(".six-diagram").screenshot({ path: testInfo.outputPath("six-diagram-mobile.png") });
  for (const index of [2, 4]) {
    await selector.selectOption(String(index)); await predict(activity, cases[index]); await solve(activity, cases[index]); await explain(activity);
    const point = await activity.locator(".six-diagram text").filter({ hasText: /^P$/ }).boundingBox();
    const axis = await activity.locator(".six-diagram text").filter({ hasText: /^y$/ }).boundingBox();
    expect(point!.x + point!.width <= axis!.x || point!.y >= axis!.y + axis!.height).toBe(true);
    await activity.locator(".six-diagram").screenshot({ path: testInfo.outputPath("six-axis-" + index + "-mobile.png") });
  }
  expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
});

test("six-function practice and notes persist without independent evidence", async ({ page }) => {
  test.setTimeout(150_000); await page.goto(route);
  const notes = page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true });
  await notes.fill("Check the denominator exactly. Cotangent may be zero when tangent is undefined.");
  await page.getByRole("button", { name: "Save lesson notes", exact: true }).click();
  await expect(page.getByText("Lesson notes saved.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start practice", exact: true }).click();
  await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 36");
  await page.locator("#practice").getByRole("button", { name: "Show a hint (0/3)", exact: true }).click();
  const saved = await readStoredProgress(page), question = saved.learning.attempts[0].questions[0];
  for (const field of question.fields) await fillField(page.locator("#practice"), field);
  await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");
  await page.reload(); await expect(notes).toHaveValue("Check the denominator exactly. Cotangent may be zero when tangent is undefined.");
  await expect(page.locator("#practice").getByRole("button", { name: "Show a hint (1/3)", exact: true })).toBeVisible();
  for (const field of question.fields) {
    if (field.kind === "choice") await expect(page.locator("#practice").getByRole("group", { name: field.label, exact: true }).locator('input[value="' + answer(field) + '"]')).toBeChecked();
    else await expect(page.locator("#practice").getByLabel(field.label + (field.unit ? " (" + field.unit + ")" : ""), { exact: true })).toHaveValue(answer(field));
  }
  expect((await readStoredProgress(page)).learning.evidence).toHaveLength(0);
});

test("critical six-function checkpoints survive reload and backup restoration", async ({ page }, testInfo) => {
  test.setTimeout(240_000); await page.goto(route);
  await expect(page.getByRole("button", { name: "Start practice", exact: true })).toBeEnabled();
  const attempt = createAttempt(lesson, "checkpoint", "495d798f-7897-476b-9a80-a059d0c443fd"), progress = await readStoredProgress(page);
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
  const file = testInfo.outputPath("six-progress.json"); await (await download).saveAs(file);
  const backup = JSON.parse(await readFile(file, "utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);
  expect(attempt.questions[1].fields.filter(field => field.kind === "exact-or-undefined" && field.expected === null)).toHaveLength(2); expect(backup.learning.evidence).toHaveLength(1);
  for (const question of attempt.questions) for (const field of question.fields) expect(backup.learning.attempts[0].responses[question.id][field.id]).toBe(answer(field));
  await restoreProgress(page, backup); await page.goto(route);
  await page.getByRole("button", { name: "Checkpoint", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
});
