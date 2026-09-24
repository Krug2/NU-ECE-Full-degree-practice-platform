import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { refresherAnswers } from "../refresher-answers";
import { readStoredProgress } from "./progress";
import type { Question, LearningPack } from "../../lib/learning/contracts";

const algebra: LearningPack = JSON.parse(readFileSync(new URL("../../content/learning-packs/f02.json", import.meta.url), "utf8"));

async function fillAnswer(area: Locator, question: Question, wrong = false) {
  const answers = refresherAnswers(question);
  for (const [index, field] of question.fields.entries()) {
    if (field.kind === "choice") {
      const value = wrong && index === 0 ? field.options.find(option => option.id !== field.correct)!.id : field.correct;
      await area.getByRole("group", { name: field.label, exact: true }).locator(`input[value="${value}"]`).check();
    } else {
      await area.getByLabel(field.label + (field.unit ? ` (${field.unit})` : ""), { exact: true }).fill(wrong && index === 0 ? "987654" : answers[field.id]);
    }
  }
}

for (const pack of [algebra]) {
  const course = pack.courseId, lessons = pack.modules.flatMap(module => module.lessons);
  test(`${course}: diagnostic gaps, exact resume, notes, and backup round trip`, async ({ page }, testInfo) => {
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto(`/courses/${course}`);
    await page.getByLabel("How familiar does this feel?", { exact: true }).selectOption("comfortable");
    await expect(page.getByTestId("refresher-evidence")).toContainText(`0 of ${lessons.length}`);
    const diagnostic = page.locator("#diagnostic");
    await diagnostic.getByRole("button", { name: "Start practice", exact: true }).click();
    const diagnosticAttempt = (await readStoredProgress(page)).learning.attempts.at(-1)!;
    await diagnostic.getByRole("button", { name: "Show a hint (0/3)", exact: true }).click();
    for (const [index, question] of diagnosticAttempt.questions.entries()) {
      await fillAnswer(diagnostic, question, index === 0);
      await diagnostic.getByRole("button", { name: index === diagnosticAttempt.questions.length-1 ? "Submit practice" : "Next question", exact: true }).click();
    }
    await expect(diagnostic.getByRole("heading", { name: "Practice completed", exact: true })).toBeVisible();
    await expect(page.getByTestId("refresher-evidence")).toContainText(`0 of ${lessons.length}`);
    await page.getByRole("link", { name: "Review: "+lessons[0].title, exact: true }).click();
    const practice = page.locator("#practice");
    await practice.getByRole("button", { name: "Start practice", exact: true }).click();
    const snapshot = (await readStoredProgress(page)).learning.attempts.at(-1)!;
    await fillAnswer(practice, snapshot.questions[0], true);
    await practice.getByRole("button", { name: "Check practice answer", exact: true }).click();
    await expect(practice.locator(".answer-feedback")).toContainText("Review this reasoning");
    await expect(practice.getByText("Saved in this browser.", { exact: true })).toBeVisible();
    const saved = (await readStoredProgress(page)).learning.attempts.at(-1)!;
    await page.reload();
    expect((await readStoredProgress(page)).learning.attempts.at(-1)!.responses).toEqual(saved.responses);
    expect((await readStoredProgress(page)).learning.attempts.at(-1)!.questions).toEqual(snapshot.questions);
    await page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true }).fill("Explain the step before applying it.");
    await page.getByRole("button", { name: "Save lesson notes", exact: true }).click();
    await expect(page.getByText("Lesson notes saved.", { exact: true })).toBeVisible();
    await page.goto(`/courses/${course}`);
    await page.getByLabel("Reasoning and next steps", { exact: true }).fill("Return for an independent check tomorrow.");
    await page.getByRole("button", { name: "Save refresher notes", exact: true }).click();
    await expect(page.getByText("Refresher notes saved.", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Resume "+lessons[0].title, exact: true }).click();
    await expect(practice.locator(".attempt-meta")).toContainText("Question 1");
    await page.goto("/settings");
    const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Export progress", exact: true }).click();
    const file = testInfo.outputPath("backup.json"); await (await download).saveAs(file);
    const backup = JSON.parse(await readFile(file, "utf8"));
    expect(backup.learning.evidence).toHaveLength(0);
    expect(backup.learning.attempts.at(-1).questions).toEqual(snapshot.questions);
    await page.getByRole("button", { name: "Reset local progress", exact: true }).click();
    await page.getByRole("button", { name: "Confirm reset", exact: true }).click();
    await page.getByLabel("Import a progress backup", { exact: true }).setInputFiles(file);
    await page.getByRole("button", { name: "Replace with this backup", exact: true }).click();
    await page.goto(`/courses/${course}`);
    await expect(page.getByLabel("Reasoning and next steps", { exact: true })).toHaveValue("Return for an independent check tomorrow.");
    await page.getByRole("link", { name: "Resume "+lessons[0].title, exact: true }).click();
    await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true })).toHaveValue("Explain the step before applying it.");
    expect((await readStoredProgress(page)).learning.attempts.at(-1)!.responses).toEqual(saved.responses);
    expect(errors).toEqual([]);
  });

  test(`${course}: every checkpoint and mixed review preserve independent evidence`, async ({ page }) => {
    test.setTimeout(180_000);
    for (const lesson of lessons) {
      await page.goto(`/courses/${course}/lessons/${lesson.id}`);
      const practice = page.locator("#practice");
      await practice.getByRole("button", { name: "Checkpoint", exact: true }).click();
      await practice.getByRole("button", { name: "Start checkpoint", exact: true }).click();
      await expect(practice.locator(".attempt-meta")).toContainText("Question 1 of 4");
      await expect(practice.getByRole("button", { name: /Show a hint/ })).toHaveCount(0);
      const attempt = (await readStoredProgress(page)).learning.attempts.at(-1)!;
      await fillAnswer(practice, attempt.questions[0]);
      await expect(practice.getByText("Saved in this browser.", { exact: true })).toBeVisible();
      await page.reload();
      await expect(practice.getByRole("button", { name: "Checkpoint", exact: true })).toHaveAttribute("aria-pressed", "true");
      for (const [index, question] of attempt.questions.entries()) {
        await fillAnswer(practice, question);
        await practice.getByRole("button", { name: index === 3 ? "Submit checkpoint" : "Next question", exact: true }).click();
      }
      await expect(practice.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
    }
    await page.goto(`/courses/${course}`);
    await expect(page.getByTestId("refresher-evidence")).toContainText(`${lessons.length} of ${lessons.length}`);
    const mixed = page.locator("#recall");
    await mixed.getByRole("button", { name: "Start checkpoint", exact: true }).click();
    const attempt = (await readStoredProgress(page)).learning.attempts.at(-1)!;
    for (const [index, question] of attempt.questions.entries()) {
      await fillAnswer(mixed, question);
      await mixed.getByRole("button", { name: index === 3 ? "Submit checkpoint" : "Next question", exact: true }).click();
    }
    await expect(page.getByTestId("refresher-evidence")).toContainText("Required evidence is recorded");
    expect((await readStoredProgress(page)).learning.evidence.every(item => item.courseId === course)).toBe(true);
    await mixed.getByRole("button", { name: "Start another checkpoint", exact: true }).click();
    const retry = (await readStoredProgress(page)).learning.attempts.at(-1)!;
    expect(retry.seed).not.toBe(attempt.seed);
    expect(retry.questions).not.toEqual(attempt.questions);
  });

  test(`${course}: all pages support mobile layout, keyboard guided feedback, and accessible content`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    for (const route of [`/courses/${course}`, ...lessons.map(lesson => `/courses/${course}/lessons/${lesson.id}`)]) {
      await page.goto(route);
      for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(viewport);
        const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        expect(result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await expect(page.locator(".katex-error")).toHaveCount(0);
      }
      if (route.includes("/lessons/")) {
        const check = page.locator("#guided").getByRole("button", { name: "Check guided work", exact: true });
        await check.focus(); await check.press("Enter");
        await expect(page.locator("#guided .answer-feedback")).toContainText("Enter an answer first");
      }
    }
    await page.goto(`/courses/${course}`); await page.screenshot({ path: testInfo.outputPath(course+"-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.screenshot({ path: testInfo.outputPath(course+"-desktop.png"), fullPage: true });
  });
}

test("F02 guided algebra and keyboard coefficient investigation", async ({ page }, testInfo) => {
  await page.goto("/courses/f02/lessons/m01-l01");
  const guided = page.locator("#guided");
  await guided.getByLabel("Expanded form of the first expression", { exact: true }).fill("x+10");
  await guided.getByLabel("Factored form of the second expression", { exact: true }).fill("3*x*(x+4)");
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct.");
  const activity = page.locator("#investigate");
  await activity.getByLabel("Starting comparison", { exact: true }).selectOption("1");
  await activity.getByLabel("Equal for every real x?", { exact: true }).selectOption("no");
  await activity.getByLabel("Test input x", { exact: true }).fill("0");
  await activity.getByLabel("Test input x", { exact: true }).press("Tab");
  await expect(activity.getByRole("button", { name: "Compare polynomials", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(activity.getByRole("status")).toContainText("correct");
  await expect(activity.getByText("The sample agrees even though the polynomials differ.", { exact: false })).toBeVisible();
  await activity.getByLabel("Test input x", { exact: true }).fill("1");
  await activity.getByRole("button", { name: "Compare polynomials", exact: true }).click();
  await expect(activity.getByText("This input is a counterexample", { exact: false })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await activity.screenshot({ path: testInfo.outputPath("f02-polynomial-mobile.png") });
});
