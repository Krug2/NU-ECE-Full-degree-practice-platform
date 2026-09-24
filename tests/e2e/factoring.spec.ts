import { restoreProgress,readStoredProgress } from "./progress";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";

const route = "/courses/mth-215/lessons/b03";
test("factoring practice checks form and distinguishes an identity from a matching sample", async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/courses/mth-215/lessons/b02");
  await page.getByRole("link", { name: "Next: Expansion and factoring", exact: true }).click();
  await page.getByLabel("Expanded form of the first expression", { exact: true }).fill("10+x");
  await page.getByLabel("Factored form of the second expression", { exact: true }).fill("x*(3x+12)");
  await page.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(page.locator("#guided .answer-feedback")).toContainText("Extract the remaining numerical common factors");
  await page.getByLabel("Factored form of the second expression", { exact: true }).fill("(x+4)*3x");
  await page.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(page.locator("#guided .answer-feedback")).toContainText("Correct. You have checked every part.");
  await page.getByLabel("Starting comparison", { exact: true }).selectOption({ label: "A missing middle term" });
  const prediction = page.getByLabel("Equal for every real x?", { exact: true }), compare = page.getByRole("button", { name: "Compare polynomials", exact: true });
  await compare.click();
  await expect(page.locator("#investigate [role=status]")).toContainText("Predict whether");
  await prediction.selectOption("yes"); await compare.click();
  await expect(page.locator("#investigate [role=status]")).toContainText("Revisit your prediction");
  await expect(page.locator("#investigate .notice")).toContainText("The sample agrees even though the polynomials differ");
  await prediction.selectOption("no"); await page.getByLabel("Test input x", { exact: true }).fill("1");
  await compare.focus(); await compare.press("Enter");
  await expect(page.locator("#investigate .notice")).toContainText("first value is 16 and the second is 10");
  await expect(page.getByRole("table", { name: "Exact coefficients after collecting like terms" })).toBeVisible();
  await page.getByLabel("Second expression", { exact: true }).fill("x^2+6x+9");
  await prediction.selectOption("yes"); await compare.click();
  await expect(page.locator("#investigate .notice")).toContainText("Every coefficient agrees");
  await page.getByLabel("Second expression", { exact: true }).fill("x/x"); await compare.click();
  await expect(page.locator("#investigate [role=status]")).toContainText("divide only by a nonzero constant");
  await page.getByRole("button", { name: "Reset comparison", exact: true }).click();
  await expect(page.getByLabel("Second expression", { exact: true })).toHaveValue("x^2+9");
  await prediction.selectOption("no"); await compare.click();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator("#investigate").screenshot({ path: testInfo.outputPath("polynomial-mobile.png") });
  await page.getByRole("button", { name: "Start practice", exact: true }).click();
  await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 12");
  await page.locator("#practice").getByLabel("Expanded polynomial", { exact: true }).fill("2x-3");
  await page.reload();
  await expect(page.locator("#practice").getByLabel("Expanded polynomial", { exact: true })).toHaveValue("2x-3");
  expect(errors).toEqual([]);
});

test("a complete factoring checkpoint records independent refresher evidence", async ({ page }) => {
  const lesson = lessonSchema.parse(JSON.parse(await readFile(new URL("../../content/lessons/mth-215/b03.json", import.meta.url), "utf8")));
  const attempt = createAttempt(lesson, "checkpoint", "factoring-browser-fixture");
  const data = { schemaVersion: 2, profile: { displayName: "", weeklyHours: 5 }, plan: [], bookmarks: [], notes: {}, confidence: {}, sessions: [], learning: { attempts: [attempt], evidence: [], notes: {} } };
  await restoreProgress(page,data);
  await page.goto(route); await page.getByRole("button", { name: "Checkpoint", exact: true }).click();
  for (let index = 0; index < attempt.questions.length; index++) {
    const question = attempt.questions[index], { a, b, d, g, power } = question.parameters;
    for (const field of question.fields) {
      if (field.kind === "choice") await page.locator("#practice").locator(`input[value="${field.correct}"]`).check();
      else {
        const value = question.familyId === "mth-common-factor" ? `${g}x^${power}*(${a}x+(${b}))` : question.familyId === "mth-quadratic-factor" ? `(${a}x+(${b}))*(x+(${d}))` : String(field.expected);
        await page.locator("#practice").getByLabel(field.label, { exact: true }).fill(value);
      }
    }
    await page.getByRole("button", { name: index === 3 ? "Submit checkpoint" : "Next question", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Objective demonstrated", { exact: true })).toBeVisible();
  const saved = await readStoredProgress(page);
  expect(saved.learning.evidence).toHaveLength(1);
  expect(saved.learning.evidence[0]).toMatchObject({ lessonId: "b03", attemptId: attempt.id });
});
