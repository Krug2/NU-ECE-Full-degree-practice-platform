import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { formatPiMultiple } from "../../lib/learning/angles";
import { parseRational } from "../../lib/learning/rational";

const route = "/courses/mth-215/lessons/b06";
test("triangle diagrams and calculator modes support exploration and exact guided answers", async ({ page }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/courses/mth-215/lessons/b05");
  await page.getByRole("link", { name: "Next: Right triangles and calculator use", exact: true }).click();
  const guided = page.locator("#guided");
  await guided.locator(".answer-fields").getByText("Read the triangle as text", { exact: true }).click();
  await expect(guided.locator(".answer-fields details")).toContainText("BA and BC at B");
  await page.getByLabel("Hypotenuse BC (cm)", { exact: true }).fill("-10");
  await page.getByLabel("Sine of theta", { exact: true }).fill("4/5");
  await page.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Review this reasoning");
  await page.getByLabel("Hypotenuse BC (cm)", { exact: true }).fill("sqrt(100)");
  await page.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");

  const activity = page.locator("#investigate"), check = page.getByRole("button", { name: "Evaluate sine input", exact: true });
  const angle = page.getByLabel("Angle entered into sine", { exact: true }), prediction = page.getByLabel("Predicted sine value", { exact: true });
  await prediction.fill("1/2"); await check.focus(); await check.press("Enter");
  await expect(activity.locator("[role=status]")).toContainText("prediction is correct");
  await expect(activity.locator(".notice")).toContainText("matches the target");
  await page.getByLabel("Calculator angle mode", { exact: true }).selectOption("radians");
  await expect(angle).toHaveValue("30");
  await check.click();
  await expect(activity.locator(".notice")).toContainText("-0.988032");
  await expect(activity.locator(".notice")).toContainText("differs from the target");
  await page.getByRole("button", { name: "Use target angle in this mode", exact: true }).click();
  await expect(angle).toHaveValue("pi/6"); await check.click();
  await expect(activity.locator("[role=status]")).toContainText("prediction is correct");
  await expect(activity.locator(".notice")).toContainText("matches the target");
  await angle.fill("5*pi/6"); await check.click();
  await expect(activity.locator("[role=status]")).toContainText("prediction is correct");
  await expect(activity.locator(".notice")).toContainText("matching sine value alone would not prove");
  await page.getByLabel("Hypotenuse (cm)", { exact: true }).fill("20");
  await expect(activity.getByRole("row", { name: "AC 10.0000 cm", exact: true })).toBeVisible();
  await page.getByLabel("Target angle (degrees)", { exact: true }).fill("90"); await check.click();
  await expect(activity.locator("[role=status]")).toContainText("1 to 89 degrees");
  await page.getByRole("button", { name: "Reset triangle calculator", exact: true }).click();
  await angle.fill("pi/6"); await prediction.fill("1/2"); await check.click();
  await expect(activity.locator("[role=status]")).toContainText("degree");
  await page.getByRole("button", { name: "Reset triangle calculator", exact: true }).click();
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await activity.locator(".triangle-figure").screenshot({ path: testInfo.outputPath("triangle-mobile.png") });
  await page.getByRole("button", { name: "Start practice", exact: true }).click();
  await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 12");
  await page.locator("#practice").getByRole("group", { name: "Hypotenuse", exact: true }).getByLabel("BC", { exact: true }).check();
  const figure = await page.locator("#practice .triangle-figure").textContent();
  await page.reload();
  await expect(page.locator("#practice").getByRole("group", { name: "Hypotenuse", exact: true }).getByLabel("BC", { exact: true })).toBeChecked();
  expect(await page.locator("#practice .triangle-figure").textContent()).toBe(figure);
  expect(errors).toEqual([]);
});

test("exact angle answers and triangle evidence survive reload and backup restoration", async ({ page }, testInfo) => {
  const lesson = lessonSchema.parse(JSON.parse(await readFile(new URL("../../content/lessons/mth-215/b06.json", import.meta.url), "utf8")));
  const attempt = createAttempt(lesson, "checkpoint", "triangle-browser-fixture");
  const data = { schemaVersion: 2, profile: { displayName: "", weeklyHours: 5 }, plan: [], bookmarks: [], notes: {}, confidence: {}, sessions: [], learning: { attempts: [attempt], evidence: [], notes: {} } };
  await page.goto("/"); await page.evaluate(data => localStorage.setItem("ece-study:progress:v1", JSON.stringify(data)), data);
  await page.goto(route); await page.getByRole("button", { name: "Checkpoint", exact: true }).click();
  for (let index = 0; index < attempt.questions.length; index++) {
    for (const field of attempt.questions[index].fields) {
      if (field.kind === "choice") await page.locator("#practice").getByRole("group", { name: field.label, exact: true }).locator('input[value="' + field.correct + '"]').check();
      else {
        const answer = field.kind === "pi-multiple" ? formatPiMultiple(parseRational(field.expected)) : String(field.expected);
        const input = page.locator("#practice").getByLabel(field.label + (field.unit ? " (" + field.unit + ")" : ""), { exact: true });
        await input.fill(answer);
        if (field.kind === "pi-multiple") {
          await page.reload();
          await page.getByRole("button", { name: "Checkpoint", exact: true }).click();
          await expect(input).toHaveValue(answer);
        }
      }
    }
    await page.getByRole("button", { name: index === 3 ? "Submit checkpoint" : "Next question", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
  await page.goto("/settings");
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Export progress", exact: true }).click();
  const file = testInfo.outputPath("triangle-progress.json"); await (await download).saveAs(file);
  const backup = JSON.parse(await readFile(file, "utf8"));
  expect(backup.learning.attempts[0].questions[0].figure).toEqual(attempt.questions[0].figure);
  expect(backup.learning.attempts[0].questions[2].fields[0].kind).toBe("pi-multiple");
  await page.getByRole("button", { name: "Reset local progress", exact: true }).click();
  await page.getByRole("button", { name: "Confirm reset", exact: true }).click();
  await page.getByLabel("Import a progress backup", { exact: true }).setInputFiles(file);
  await page.getByRole("button", { name: "Replace with this backup", exact: true }).click();
  await page.goto(route); await page.getByRole("button", { name: "Checkpoint", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
  await page.getByText("Question 1: Correct", { exact: true }).click();
  await expect(page.locator("#practice .triangle-figure").first()).toContainText("Right triangle ABC");
  await page.getByText("Question 3: Correct", { exact: true }).click();
  await expect(page.locator("#practice .answer-feedback").nth(2)).toContainText("Exact radian measure");
});
