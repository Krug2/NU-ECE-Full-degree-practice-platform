import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";

const route = "/courses/mth-215/lessons/b04";
test("fraction investigations preserve canceled exclusions and allow a zero numerator", async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/courses/mth-215/lessons/b03");
  await page.getByRole("link", { name: "Next: Fractions containing variables", exact: true }).click();
  await page.getByLabel("Reduced expression", { exact: true }).fill("x+3");
  await page.getByLabel("Original excluded inputs", { exact: true }).fill("none");
  await page.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(page.locator("#guided .answer-feedback")).toContainText("Review this reasoning");
  await page.getByLabel("Original excluded inputs", { exact: true }).fill("3");
  await page.getByLabel("Reduced expression", { exact: true }).fill("(x^2-9)/(x-3)");
  await page.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(page.locator("#guided .answer-feedback")).toContainText("common variable factors remain");
  await page.getByLabel("Reduced expression", { exact: true }).fill("3+x");
  await page.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(page.locator("#guided .answer-feedback")).toContainText("Correct. You have checked every part.");
  const prediction = page.getByLabel("Is the original fraction defined here?", { exact: true }), sample = page.getByLabel("Test input x", { exact: true }), check = page.getByRole("button", { name: "Check original domain", exact: true });
  await prediction.selectOption("defined"); await check.click();
  await expect(page.locator("#investigate [role=status]")).toContainText("Revisit the original denominator");
  await expect(page.locator("#investigate .notice")).toContainText("reduced formula is -3/2");
  await prediction.selectOption("undefined"); await check.click();
  await expect(page.locator("#investigate [role=status]")).toContainText("is correct");
  await sample.fill("4"); await check.click();
  await expect(page.locator("#investigate .notice")).toContainText("Both expressions are undefined");
  await sample.fill("-1"); await prediction.selectOption("defined"); await check.click();
  await expect(page.locator("#investigate .notice")).toContainText("original fraction is 0. The reduced formula is 0");
  await page.getByLabel("Canceled factor: x minus a", { exact: true }).fill("3");
  await sample.fill("3"); await prediction.selectOption("undefined"); await check.focus(); await check.press("Enter");
  await expect(page.locator("#investigate .notice")).toContainText("original exclusions remain 3 and 4");
  await page.getByLabel("Canceled factor: x minus a", { exact: true }).fill("4"); await check.click();
  await expect(page.locator("#investigate [role=status]")).toContainText("three distinct integers");
  await page.getByRole("button", { name: "Reset factors", exact: true }).click();
  await expect(sample).toHaveValue("2");
  await prediction.selectOption("undefined"); await check.click();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator("#investigate").screenshot({ path: testInfo.outputPath("fractions-mobile.png") });
  await page.getByRole("button", { name: "Start practice", exact: true }).click();
  await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 13");
  await page.locator("#practice").getByLabel("Simplified expression", { exact: true }).fill("(x+1)/(x-2)");
  await page.locator("#practice").getByLabel("All original excluded inputs", { exact: true }).fill("2,3");
  await page.reload();
  await expect(page.locator("#practice").getByLabel("Simplified expression", { exact: true })).toHaveValue("(x+1)/(x-2)");
  await expect(page.locator("#practice").getByLabel("All original excluded inputs", { exact: true })).toHaveValue("2,3");
  expect(errors).toEqual([]);
});

test("a missed original exclusion prevents fraction checkpoint evidence despite a high score", async ({ page }) => {
  const lesson = lessonSchema.parse(JSON.parse(await readFile(new URL("../../content/lessons/mth-215/b04.json", import.meta.url), "utf8")));
  const attempt = createAttempt(lesson, "checkpoint", "fraction-browser-fixture");
  const data = { schemaVersion: 2, profile: { displayName: "", weeklyHours: 5 }, plan: [], bookmarks: [], notes: {}, confidence: {}, sessions: [], learning: { attempts: [attempt], evidence: [], notes: {} } };
  await page.goto("/"); await page.evaluate(data => localStorage.setItem("ece-study:progress:v1", JSON.stringify(data)), data);
  await page.goto(route); await page.getByRole("button", { name: "Checkpoint", exact: true }).click();
  for (let index = 0; index < attempt.questions.length; index++) {
    for (const field of attempt.questions[index].fields) {
      if (field.kind === "choice") await page.locator("#practice").locator(`input[value="${field.correct}"]`).check();
      else {
        const value = field.kind === "roots" ? index === 0 ? field.expected.slice(1).join(",") : field.expected.join(",") : String(field.expected);
        await page.locator("#practice").getByLabel(field.label, { exact: true }).fill(value);
      }
    }
    await page.getByRole("button", { name: index === 3 ? "Submit checkpoint" : "Next question", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Keep working on this objective", exact: true })).toBeVisible();
  await expect(page.locator(".attempt-results")).toContainText("3 of 4 correct. A required validity check needs review.");
  await page.reload();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ece-study:progress:v1")!));
  expect(saved.learning.evidence).toHaveLength(0);
  expect(saved.learning.attempts[0].status).toBe("submitted");
});
