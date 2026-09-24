import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { refresherAnswers } from "../refresher-answers";
import { readStoredProgress } from "./progress";
import type { Question, LearningPack } from "../../lib/learning/contracts";

const algebra: LearningPack = JSON.parse(readFileSync(new URL("../../content/learning-packs/f02.json", import.meta.url), "utf8"));
const functions: LearningPack = JSON.parse(readFileSync(new URL("../../content/learning-packs/f03.json", import.meta.url), "utf8"));
const trigonometry: LearningPack = JSON.parse(readFileSync(new URL("../../content/learning-packs/f04.json", import.meta.url), "utf8"));

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

for (const pack of [algebra, functions, trigonometry]) {
  const course = pack.courseId, lessons = pack.modules.flatMap(module => module.lessons);
  test(`${course}: diagnostic gaps, exact resume, notes, and backup round trip`, async ({ page }, testInfo) => {
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto("/curriculum?group=refresher");
    const card = page.locator("article").filter({ has: page.getByRole("heading", { name: pack.title, exact: true }) });
    await expect(card).toContainText(pack.status === "building" ? "Planning ahead" : "Available preview");
    await card.getByRole("link", { name: pack.title, exact: true }).click();
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

test("F03 scaled coordinates and keyboard line investigation distinguish zero and undefined", async ({ page }) => {
  await page.goto("/courses/f03/lessons/m01-l01");
  const guided = page.locator("#guided"), activity = page.locator("#investigate");
  await guided.getByLabel("Point A voltage (V)", { exact: true }).fill("-4");
  await guided.getByLabel("Point A current (mA)", { exact: true }).fill("15");
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct.");
  await activity.getByLabel("Predicted slope", { exact: true }).fill("1");
  await activity.getByLabel("Predicted slope", { exact: true }).press("Tab");
  await expect(activity.getByRole("button", { name: "Check slope prediction", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(activity.getByRole("status")).toContainText("correct");
  await activity.getByLabel("Point B: y", { exact: true }).fill("-1");
  await activity.getByLabel("Predicted slope", { exact: true }).fill("0");
  await activity.getByRole("button", { name: "Check slope prediction", exact: true }).click();
  await expect(activity.getByRole("status")).toContainText("correct");
  await activity.getByLabel("Point B: x", { exact: true }).fill("-2");
  await activity.getByLabel("Point B: y", { exact: true }).fill("3");
  await activity.getByLabel("Predicted slope", { exact: true }).fill("undefined");
  await activity.getByRole("button", { name: "Check slope prediction", exact: true }).click();
  await expect(activity.getByRole("status")).toContainText("correct");
  await activity.getByLabel("Point B: y", { exact: true }).fill("-1");
  await activity.getByRole("button", { name: "Check slope prediction", exact: true }).click();
  await expect(activity.getByRole("status")).toContainText("two distinct points");
});

test("F03 piecewise boundaries and transformed points preserve domains and graph descriptions", async ({ page }, testInfo) => {
  await page.goto("/courses/f03/lessons/m01-l02");
  let guided = page.locator("#guided"), activity = page.locator("#investigate");
  await guided.getByRole("group", { name: "Branch at x = 0", exact: true }).getByLabel("Higher-input branch", { exact: true }).check();
  for (const [label, value] of [["Sensor output f(0) (V)", "1"], ["Sensor domain", "[-4,4]"], ["Sensor range", "[-2,3]"]]) await guided.getByLabel(label, { exact: true }).fill(value);
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct.");
  await activity.getByLabel("Predicted branch", { exact: true }).selectOption("right");
  await activity.getByLabel("Predicted output", { exact: true }).fill("1");
  const trace = activity.getByRole("button", { name: "Trace the input", exact: true });
  await trace.focus(); await trace.press("Enter");
  await expect(activity.getByRole("status")).toContainText("Both predictions are correct");
  await activity.getByLabel("Sensor rule", { exact: true }).selectOption("1");
  await activity.getByRole("button", { name: "At the boundary", exact: true }).click();
  await activity.getByLabel("Predicted branch", { exact: true }).selectOption("missing");
  await activity.getByLabel("Predicted output", { exact: true }).fill("0");
  await trace.click(); await expect(activity.getByRole("status")).toContainText("difference between undefined and zero");
  await activity.getByLabel("Predicted output", { exact: true }).fill("undefined");
  await trace.click(); await expect(activity.getByRole("status")).toContainText("Both predictions are correct");
  await page.goto("/courses/f03/lessons/m01-l03");
  guided = page.locator("#guided"); activity = page.locator("#investigate");
  for (const [label, value] of [["Mapped input", "-5"], ["Mapped output", "3"], ["Complete domain", "(-inf,3]"], ["Complete range", "[-1,inf)"]]) await guided.getByLabel(label, { exact: true }).fill(value);
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct.");
  for (const [index, point] of [["3","-1"],["1","1"],["-5","3"]].entries()) {
    await activity.getByLabel("Anchor "+"ABC"[index]+" new input", { exact: true }).fill(point[0]);
    await activity.getByLabel("Anchor "+"ABC"[index]+" new output", { exact: true }).fill(point[1]);
  }
  const check = activity.getByRole("button", { name: "Check transformed points", exact: true });
  await check.focus(); await check.press("Enter");
  await expect(activity.getByRole("status")).toContainText("All three anchors are mapped correctly");
  await activity.getByLabel("Graph window", { exact: true }).selectOption("6");
  await expect(activity.locator(".notice")).toContainText("Domain of g: (-inf, 3]");
  await activity.getByText("Read the transformed graph as text", { exact: true }).click();
  await expect(activity.locator("details")).toContainText("included endpoint is (3, -1)");
  await page.setViewportSize({ width: 390, height: 844 });
  await activity.locator(".transformed-figure > svg").screenshot({ path: testInfo.outputPath("f03-transformed-mobile.png") });
});

test("F03 composition order and calibration keep intermediate values and model limits visible", async ({ page }) => {
  await page.goto("/courses/f03/lessons/m01-l04");
  let guided = page.locator("#guided"), activity = page.locator("#investigate");
  await guided.getByRole("group", { name: "Inverse rule", exact: true }).getByRole("radio", { name: "One minus the square root of (x minus two)", exact: true }).check();
  for (const [label, value] of [["Inverse domain", "[2,inf)"], ["Inverse range", "(-inf,1]"], ["Inverse at 11", "-2"]]) await guided.getByLabel(label, { exact: true }).fill(value);
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct.");
  for (const [order, first, last] of [["fg", "4", "11"], ["gf", "7", "49"]]) {
    await activity.getByLabel("Composition order", { exact: true }).selectOption(order);
    await activity.getByLabel("Predicted first-stage output", { exact: true }).fill(first);
    await activity.getByLabel("Predicted final output", { exact: true }).fill(last);
    const trace = activity.getByRole("button", { name: "Trace function machines", exact: true });
    await trace.focus(); await trace.press("Enter");
    await expect(activity.getByRole("status")).toContainText("Both stage predictions are correct");
  }
  await page.goto("/courses/f03/lessons/m01-l05");
  guided = page.locator("#guided"); activity = page.locator("#investigate");
  for (const [label, value] of [["Slope (V per degree C)", "-3/100"], ["Voltage rule (V)", "4-3*x/100"], ["Predicted voltage at 50 (V)", "2.5"], ["Observed minus predicted (V)", ".1"]]) await guided.getByLabel(label, { exact: true }).fill(value);
  await guided.getByRole("radio", { name: "It meets the inclusive tolerance at this input; further observations are needed to assess the model", exact: true }).check();
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct.");
  for (const [id, value] of [["slope", "1/50"], ["intercept", "1/2"], ["value", "17/10"], ["residual", "0"]]) await activity.locator("#calibration-answer-"+id).fill(value);
  const check = activity.getByRole("button", { name: "Check calibration", exact: true });
  await check.focus(); await check.press("Enter");
  await expect(activity.getByRole("status")).toContainText("All predictions are correct");
  const rate = await activity.locator(".calibration-rate").textContent();
  await activity.getByLabel("Horizontal span", { exact: true }).selectOption("4");
  await expect(activity.locator(".calibration-rate")).toHaveText(rate!);
  await activity.getByLabel("Calibration B input (degrees C)", { exact: true }).fill("0");
  await check.click();
  await expect(activity.getByRole("status")).toContainText("Calibration inputs must be distinct");
});
