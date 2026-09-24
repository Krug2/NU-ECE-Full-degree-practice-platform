import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { readStoredProgress } from "./progress";
import type { Question } from "../../lib/learning/contracts";

async function fillAnswer(area: Locator, question: Question, wrong = false) {
  for (const [index, field] of question.fields.entries()) {
    if (field.kind === "choice") {
      await area.getByRole("group", { name: field.label, exact: true }).locator(`input[value="${field.correct}"]`).check();
    } else {
      const value = wrong && index === 0 ? "987654" : field.kind === "roots" ? field.expected.join(",") : String(field.expected);
      await area.getByLabel(field.label + (field.unit ? ` (${field.unit})` : ""), { exact: true }).fill(value);
    }
  }
}

test("diagnoses a specific arithmetic gap, resumes exact work, and restores notes through the existing backup", async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/curriculum?group=refresher");
  const card = page.locator("article").filter({ has: page.getByRole("heading", { name: "Arithmetic and notation", exact: true }) });
  await expect(card).toContainText("Available preview");
  await card.getByRole("link", { name: "Arithmetic and notation", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Arithmetic and notation", exact: true })).toBeVisible();
  await page.getByLabel("How familiar does this feel?", { exact: true }).selectOption("comfortable");
  await expect(page.getByTestId("refresher-evidence")).toContainText("0 of 4");
  const diagnostic = page.locator("#diagnostic");
  await expect(diagnostic.getByRole("button", { name: "Checkpoint", exact: true })).toHaveCount(0);
  await diagnostic.getByRole("button", { name: "Start practice", exact: true }).click();
  await expect(diagnostic.locator(".attempt-meta")).toContainText("Question 1 of 8");
  const attempt = (await readStoredProgress(page)).learning.attempts.at(-1)!;
  await diagnostic.getByRole("button", { name: "Show a hint (0/3)", exact: true }).click();
  for (const [index, question] of attempt.questions.entries()) {
    await fillAnswer(diagnostic, question, index === 0);
    await diagnostic.getByRole("button", { name: index === 7 ? "Submit practice" : "Next question", exact: true }).click();
  }
  await expect(diagnostic.getByRole("heading", { name: "Practice completed", exact: true })).toBeVisible();
  await expect(page.getByTestId("refresher-evidence")).toContainText("0 of 4");
  await page.getByRole("link", { name: "Review: Signed numbers and operation order", exact: true }).click();
  const guided = page.locator("#guided");
  for (const [label, value] of [["Grouped difference", "-2"], ["Twice that difference", "-4"], ["Final value", "-9"]]) await guided.getByLabel(label, { exact: true }).fill(value);
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct.");
  const activity = page.locator("#investigate");
  await activity.getByLabel("Predicted exact value", { exact: true }).fill("-4");
  await activity.getByLabel("Predicted exact value", { exact: true }).press("Tab");
  await expect(activity.getByRole("button", { name: "Check arithmetic prediction", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(activity.locator("[role=status]")).toContainText("correct");
  await activity.getByLabel("Arithmetic expression", { exact: true }).fill("1/0");
  await activity.getByRole("button", { name: "Check arithmetic prediction", exact: true }).click();
  await expect(activity.locator("[role=status]")).toContainText("Division by zero");
  const practice = page.locator("#practice");
  await practice.getByRole("button", { name: "Start practice", exact: true }).click();
  await practice.getByLabel("Resulting reading", { exact: true }).fill("123");
  await practice.getByRole("button", { name: "Check practice answer", exact: true }).click();
  await expect(practice.locator(".answer-feedback")).toContainText("Review this reasoning");
  await expect(practice.getByText("Saved in this browser.", { exact: true })).toBeVisible();
  const snapshot = (await readStoredProgress(page)).learning.attempts.at(-1)!;
  await page.reload();
  await expect(practice.getByLabel("Resulting reading", { exact: true })).toHaveValue("123");
  expect((await readStoredProgress(page)).learning.attempts.at(-1)!.questions).toEqual(snapshot.questions);
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true }).fill("Name the operation before using a sign rule.");
  await page.getByRole("button", { name: "Save lesson notes", exact: true }).click();
  await expect(page.getByText("Lesson notes saved.", { exact: true })).toBeVisible();
  await page.goto("/courses/f01");
  await page.getByLabel("Reasoning and next steps", { exact: true }).fill("Return to the signed-change checkpoint.");
  await page.getByRole("button", { name: "Save refresher notes", exact: true }).click();
  await expect(page.getByText("Refresher notes saved.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Resume Signed numbers and operation order", exact: true }).click();
  await expect(practice.getByLabel("Resulting reading", { exact: true })).toHaveValue("123");
  await page.goto("/settings");
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Export progress", exact: true }).click();
  const file = testInfo.outputPath("refresher-backup.json"); await (await download).saveAs(file);
  const backup = JSON.parse(await readFile(file, "utf8"));
  expect(backup.learning.evidence).toHaveLength(0);
  expect(backup.learning.attempts.at(-1).questions).toEqual(snapshot.questions);
  await page.getByRole("button", { name: "Reset local progress", exact: true }).click();
  await page.getByRole("button", { name: "Confirm reset", exact: true }).click();
  await page.getByLabel("Import a progress backup", { exact: true }).setInputFiles(file);
  await page.getByRole("button", { name: "Replace with this backup", exact: true }).click();
  await page.goto("/courses/f01");
  await expect(page.getByLabel("Reasoning and next steps", { exact: true })).toHaveValue("Return to the signed-change checkpoint.");
  await page.getByRole("link", { name: "Resume Signed numbers and operation order", exact: true }).click();
  await expect(practice.getByLabel("Resulting reading", { exact: true })).toHaveValue("123");
  await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true })).toHaveValue("Name the operation before using a sign rule.");
  expect(errors).toEqual([]);
});

test("another tab starting a checkpoint does not switch an open practice draft", async ({ page, context }) => {
  await page.goto("/courses/f01/lessons/m01-l01");
  const practice = page.locator("#practice");
  await practice.getByRole("button", { name: "Start practice", exact: true }).click();
  await practice.getByLabel("Resulting reading", { exact: true }).fill("123");
  await expect(practice.getByText("Saved in this browser.", { exact: true })).toBeVisible();
  const other = await context.newPage();
  await other.goto("/courses/f01/lessons/m01-l01");
  await other.locator("#practice").getByRole("button", { name: "Checkpoint", exact: true }).click();
  await other.locator("#practice").getByRole("button", { name: "Start checkpoint", exact: true }).click();
  await expect(other.locator(".attempt-meta")).toContainText("Independent checkpoint");
  await expect(practice.getByRole("button", { name: "Practice", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(practice.getByLabel("Resulting reading", { exact: true })).toHaveValue("123");
  await other.close();
});

test("all four independent objectives and mixed recall work without changing MTH 215 evidence", async ({ page }) => {
  for (let lesson = 1; lesson <= 4; lesson++) {
    await page.goto(`/courses/f01/lessons/m01-l0${lesson}`);
    const practice = page.locator("#practice");
    await practice.getByRole("button", { name: "Checkpoint", exact: true }).click();
    await practice.getByRole("button", { name: "Start checkpoint", exact: true }).click();
    await expect(practice.locator(".attempt-meta")).toContainText("Question 1 of 4");
    await expect(practice.getByRole("button", { name: /Show a hint/ })).toHaveCount(0);
    const attempt = (await readStoredProgress(page)).learning.attempts.at(-1)!;
    if (lesson === 1) {
      await fillAnswer(practice, attempt.questions[0]);
      await expect(practice.getByText("Saved in this browser.", { exact: true })).toBeVisible();
      await page.goto("/courses/f01");
      await page.getByRole("link", { name: "Resume Signed numbers and operation order", exact: true }).click();
      await expect(practice.getByRole("button", { name: "Checkpoint", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(practice.locator(".attempt-meta")).toContainText("Question 1 of 4");
      expect((await readStoredProgress(page)).learning.attempts.at(-1)!.questions).toEqual(attempt.questions);
    }
    for (const [index, question] of attempt.questions.entries()) {
      await fillAnswer(practice, question);
      await practice.getByRole("button", { name: index === 3 ? "Submit checkpoint" : "Next question", exact: true }).click();
    }
    await expect(practice.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
    await page.reload(); await practice.getByRole("button", { name: "Checkpoint", exact: true }).click();
    await expect(practice.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
  }
  await page.goto("/courses/f01");
  await expect(page.getByTestId("refresher-evidence")).toContainText("4 of 4");
  const mixed = page.locator("#recall");
  await expect(mixed.getByRole("button", { name: "Practice", exact: true })).toHaveCount(0);
  await mixed.getByRole("button", { name: "Start checkpoint", exact: true }).click();
  await expect(mixed.locator(".attempt-meta")).toContainText("Question 1 of 4");
  const attempt = (await readStoredProgress(page)).learning.attempts.at(-1)!;
  for (const [index, question] of attempt.questions.entries()) {
    await fillAnswer(mixed, question);
    await mixed.getByRole("button", { name: index === 3 ? "Submit checkpoint" : "Next question", exact: true }).click();
  }
  await expect(page.getByTestId("refresher-evidence")).toContainText("Required evidence is recorded");
  expect((await readStoredProgress(page)).learning.evidence.every(item => item.courseId === "f01")).toBe(true);
  await mixed.getByRole("button", { name: "Start another checkpoint", exact: true }).click();
  await expect(mixed.locator(".attempt-meta")).toContainText("Question 1 of 4");
  const next = (await readStoredProgress(page)).learning.attempts.at(-1)!;
  expect(next.seed).not.toBe(attempt.seed);
  expect(next.questions).not.toEqual(attempt.questions);
  await page.goto("/courses/mth-215");
  await expect(page.getByText("Objective demonstrated", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Refresher objective demonstrated", { exact: true })).toHaveCount(0);
});

test("F01 overview and every lesson remain accessible on desktop, mobile, and keyboard", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  for (const route of ["/courses/f01", ...[1, 2, 3, 4].map(n => `/courses/f01/lessons/m01-l0${n}`)]) {
    await page.goto(route);
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator(".katex-error")).toHaveCount(0);
    }
    if (route.endsWith("l02")) {
      await page.locator("#guided").screenshot({ path: testInfo.outputPath("fractions-mobile.png") });
      const check = page.locator("#guided").getByRole("button", { name: "Check guided work", exact: true });
      await check.focus(); await check.press("Enter");
      await expect(page.locator("#guided .answer-feedback")).toContainText("Enter an answer first");
    }
  }
  await page.goto("/courses/f01"); await page.screenshot({ path: testInfo.outputPath("f01-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: testInfo.outputPath("f01-desktop.png"), fullPage: true });
});
