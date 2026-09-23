import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";

const route = "/courses/mth-215/lessons/b05";
test("coordinate graphs, scaled readings, and line predictions work with keyboard controls", async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/courses/mth-215/lessons/b04");
  await page.getByRole("link", { name: "Next: Coordinates, lines, and measurement labels", exact: true }).click();
  const point = page.locator("#guided .answer-fields circle[data-point=A]");
  await expect(point).toHaveAttribute("cx", "128"); await expect(point).toHaveAttribute("cy", "98");
  await page.locator("#guided .answer-fields").getByText("Read the graph as text", { exact: true }).click();
  await expect(page.locator("#guided .answer-fields details")).toContainText("2 horizontal tick intervals left");
  await page.getByLabel("Point A voltage (V)", { exact: true }).fill("-2");
  await page.getByLabel("Point A current (mA)", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(page.locator("#guided .answer-feedback")).toContainText("Review this reasoning");
  await page.getByLabel("Point A voltage (V)", { exact: true }).fill("-4");
  await page.getByLabel("Point A current (mA)", { exact: true }).fill("15");
  await page.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(page.locator("#guided .answer-feedback")).toContainText("Correct. You have checked every part.");
  const prediction = page.getByLabel("Predicted slope", { exact: true }), check = page.getByRole("button", { name: "Check slope prediction", exact: true });
  await prediction.fill("1"); await check.focus(); await check.press("Enter");
  await expect(page.locator("#investigate [role=status]")).toContainText("is correct");
  await page.getByLabel("Point B: y", { exact: true }).fill("-1"); await prediction.fill("0"); await check.click();
  await expect(page.locator("#investigate .notice")).toContainText("horizontal line");
  await page.getByLabel("Point B: x", { exact: true }).fill("-2"); await check.click();
  await expect(page.locator("#investigate [role=status]")).toContainText("two distinct points");
  await page.getByLabel("Point B: y", { exact: true }).fill("3"); await prediction.fill("0"); await check.click();
  await expect(page.locator("#investigate [role=status]")).toContainText("Compare the signed rise");
  await prediction.fill("undefined"); await check.click();
  await expect(page.locator("#investigate [role=status]")).toContainText("is correct");
  await expect(page.locator("#investigate .notice")).toContainText("undefined slope, not zero slope");
  await page.getByLabel("Point B: x", { exact: true }).fill("2"); await page.getByLabel("Point A: y", { exact: true }).fill("4");
  await prediction.fill("-1/4"); await check.click();
  await expect(page.locator("#investigate .notice")).toContainText("negative slope");
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator("#investigate").screenshot({ path: testInfo.outputPath("line-mobile.png") });
  await page.getByRole("button", { name: "Reset points", exact: true }).click();
  await expect(page.getByLabel("Point A: y", { exact: true })).toHaveValue("-1");
  await page.getByRole("button", { name: "Start practice", exact: true }).click();
  await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 10");
  await page.locator("#practice").getByLabel("Horizontal coordinate (V)", { exact: true }).fill("4");
  const graph = await page.locator("#practice .coordinate-figure").textContent();
  await page.reload();
  await expect(page.locator("#practice").getByLabel("Horizontal coordinate (V)", { exact: true })).toHaveValue("4");
  expect(await page.locator("#practice .coordinate-figure").textContent()).toBe(graph);
  expect(errors).toEqual([]);
});

test("coordinate checkpoint snapshots survive backup export and restoration", async ({ page }, testInfo) => {
  const lesson = lessonSchema.parse(JSON.parse(await readFile(new URL("../../content/lessons/mth-215/b05.json", import.meta.url), "utf8")));
  const attempt = createAttempt(lesson, "checkpoint", "coordinate-browser-fixture");
  const data = { schemaVersion: 2, profile: { displayName: "", weeklyHours: 5 }, plan: [], bookmarks: [], notes: {}, confidence: {}, sessions: [], learning: { attempts: [attempt], evidence: [], notes: {} } };
  await page.goto("/"); await page.evaluate(data => localStorage.setItem("ece-study:progress:v1", JSON.stringify(data)), data);
  await page.goto(route); await page.getByRole("button", { name: "Checkpoint", exact: true }).click();
  for (let index = 0; index < attempt.questions.length; index++) {
    for (const field of attempt.questions[index].fields) {
      if (field.kind === "choice") await page.locator("#practice").locator(`input[value="${field.correct}"]`).check();
      else await page.locator("#practice").getByLabel(`${field.label}${field.unit ? ` (${field.unit})` : ""}`, { exact: true }).fill(String(field.expected));
    }
    await page.getByRole("button", { name: index === 3 ? "Submit checkpoint" : "Next question", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
  await page.goto("/settings");
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Export progress", exact: true }).click();
  const file = testInfo.outputPath("coordinate-progress.json"); await (await download).saveAs(file);
  const backup = JSON.parse(await readFile(file, "utf8"));
  expect(backup.learning.attempts[0].questions[0].figure).toEqual(attempt.questions[0].figure);
  await page.getByRole("button", { name: "Reset local progress", exact: true }).click();
  await page.getByRole("button", { name: "Confirm reset", exact: true }).click();
  await page.getByLabel("Import a progress backup", { exact: true }).setInputFiles(file);
  await page.getByRole("button", { name: "Replace with this backup", exact: true }).click();
  await page.goto(route); await page.getByRole("button", { name: "Checkpoint", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
  await page.getByText("Question 1: Correct", { exact: true }).click();
  await expect(page.locator("#practice .coordinate-figure").first()).toContainText("Read point A");
});
