import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema, type Question } from "../../lib/learning/contracts";
import { readStoredProgress, restoreProgress } from "./progress";

const route = "/courses/phs-232/lessons/m01-l01";
async function predict(lab: Locator, values: string[]) {
  for (const [index, label] of ["Predicted position at prediction time (m)", "Predicted velocity at prediction time (m/s)", "Predicted qualifying event count"].entries()) await lab.getByLabel(label, { exact: true }).fill(values[index]);
  const check = lab.getByRole("button", { name: "Check harmonic predictions", exact: true });
  await check.focus(); await check.press("Enter");
}

test("harmonic lesson corrects lost direction and connects predicted states, events, plots and keyboard probes", async ({ page }, info) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(route);
  await expect(page.locator(".lesson-kicker")).toContainText("Course under construction");
  const guided = page.locator("#guided");
  for (const [label, value] of [["Amplitude (m)", "1/20"], ["Position at pi/8 seconds (m)", "-1/25"], ["Velocity at pi/8 seconds (m/s)", "-3/25"], ["Acceleration at pi/8 seconds (m/s²)", "16/25"]]) await guided.getByLabel(label, { exact: true }).fill(value);
  await guided.getByLabel("Fourth quadrant: cosine positive, sine negative", { exact: true }).check();
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("would give positive initial velocity");
  await guided.getByLabel("First quadrant: cosine positive, sine positive", { exact: true }).check();
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab = page.locator("#investigate");
  await predict(lab, ["-1/25", "3/25", "4"]);
  await expect(lab.getByRole("status")).toContainText("Revisit velocity");
  await predict(lab, ["-1/25", "-3/25", "4"]);
  await expect(lab.getByRole("status")).toContainText("predictions agree");
  await expect(lab.locator(".phs232-probe")).toContainText("x=-0.04 m; v=-0.12 m/s; a=0.64 m/s²; moving in −x");
  await expect(lab.getByRole("img")).toHaveCount(4);
  await expect(lab.getByRole("row", { name: "1.107149 0.03 0.16 moving in +x", exact: true })).toBeVisible();
  const probe = lab.getByRole("slider", { name: /^Revealed time probe/ });
  await probe.focus(); await probe.press("ArrowRight");
  await expect(probe).toHaveValue("0.3125");
  await expect(lab.getByRole("status")).toContainText("original predictions apply");
  await probe.press("Home"); await expect(probe).toHaveValue("0");
  await expect(lab.locator(".phs232-probe")).toContainText("x=0.03 m; v=-0.16 m/s");
  await probe.press("End"); await expect(probe).toHaveValue("2");
  await expect(lab.locator(".phs232-probe")).toContainText("x=0.03 m; v=-0.16 m/s");
  await lab.getByText("Complete model table (129 states)", { exact: true }).click();
  await lab.getByText("Investigation self-check rubric", { exact: true }).click();
  await expect(lab).toContainText("it does not award objective evidence or an official grade");
  await expect(lab.getByRole("region", { name: "Complete model state table; scroll horizontally if needed", exact: true }).getByRole("row")).toHaveCount(130);
  await lab.getByText("Complete model table (129 states)", { exact: true }).click();
  for (const [name, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]] as const) {
    await page.setViewportSize(viewport); await page.emulateMedia({ reducedMotion: "reduce" });
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(audit.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) }))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await lab.screenshot({ path: info.outputPath(`harmonic-${name}.png`) });
    await lab.getByRole("img").first().scrollIntoViewIfNeeded(); await page.screenshot({ path: info.outputPath(`harmonic-${name}-viewport.png`) });
    await lab.getByRole("img").last().scrollIntoViewIfNeeded(); await page.screenshot({ path: info.outputPath(`harmonic-${name}-phase-plane.png`) });
  }
  expect(errors).toEqual([]);
});

test("harmonic investigation distinguishes directed touches, interval endpoints, aliasing and stationary motion", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(route); const lab = page.locator("#investigate");
  await lab.getByLabel("Initial position (m)", { exact: true }).fill(".05");
  await lab.getByLabel("Initial velocity (m/s)", { exact: true }).fill("0");
  await lab.getByLabel("Target position as a fraction of amplitude", { exact: true }).fill("1");
  await predict(lab, ["0", "-.2", "2"]); await expect(lab.getByRole("status")).toContainText("predictions agree");
  const initial = lab.getByLabel("Include t=0 in the event window", { exact: true }); await initial.focus(); await initial.press("Space");
  await predict(lab, ["0", "-.2", "3"]); await expect(lab.getByRole("status")).toContainText("predictions agree");
  await lab.getByLabel("Include the final instant in the event window", { exact: true }).uncheck();
  await predict(lab, ["0", "-.2", "2"]); await expect(lab.getByRole("status")).toContainText("predictions agree");
  await lab.getByLabel("Qualifying event direction", { exact: true }).selectOption("positive");
  await predict(lab, ["0", "-.2", "0"]); await expect(lab).toContainText("No event qualifies.");
  await lab.getByLabel("Qualifying event direction", { exact: true }).selectOption("either");
  await lab.getByLabel("Target position as a fraction of amplitude", { exact: true }).fill("1.1");
  await predict(lab, ["0", "-.2", "0"]); await expect(lab.getByRole("status")).toContainText("predictions agree");
  await lab.getByLabel("Recorded samples per natural period", { exact: true }).selectOption("1");
  await predict(lab, ["0", "-.2", "0"]);
  await expect(lab).toContainText("Every recorded position repeats the initial position");
  await lab.getByText("Recorded position table (3 samples)", { exact: true }).click();
  const records = lab.getByRole("region", { name: "Recorded position table; scroll horizontally if needed", exact: true });
  await expect(records.getByRole("row")).toHaveCount(4);
  await expect(records.getByRole("cell", { name: "0.05", exact: true })).toHaveCount(3);
  await lab.getByLabel("Window length (natural periods)", { exact: true }).fill("1.5");
  await predict(lab, ["0", "-.2", "0"]); await expect(lab.getByText("Recorded position table (2 samples)", { exact: true })).toBeVisible();
  await lab.getByLabel("Window length (natural periods)", { exact: true }).fill("1.6");
  await lab.getByLabel("Prediction time (natural periods from t=0)", { exact: true }).fill(".13");
  await predict(lab, [String(.05 * Math.cos(2 * Math.PI * .13)), String(-.2 * Math.sin(2 * Math.PI * .13)), "0"]);
  const irregularProbe = lab.getByRole("slider", { name: /^Revealed time probe/ }); await expect(irregularProbe).toHaveValue("0.13");
  await irregularProbe.focus(); await irregularProbe.press("End"); await expect(irregularProbe).toHaveValue("1.6");
  await irregularProbe.press("ArrowLeft"); await expect(irregularProbe).toHaveValue("1.5375");
  await lab.getByLabel("Initial position (m)", { exact: true }).fill("0");
  await lab.getByLabel("Target position as a fraction of amplitude", { exact: true }).fill("0");
  await predict(lab, ["0", "0", "all"]); await expect(lab.getByRole("status")).toContainText("predictions agree");
  await expect(lab).toContainText("not identifiable at zero amplitude"); await expect(lab).toContainText("no least positive period");
  await expect(lab).toContainText("Every instant in this interval qualifies");
  await lab.getByLabel("Qualifying event direction", { exact: true }).selectOption("negative");
  await predict(lab, ["0", "0", "0"]); await expect(lab.getByRole("status")).toContainText("predictions agree");
  await predict(lab, ["sqrt(-1)", "0", "0"]); await expect(lab.getByRole("status")).toContainText("must be real"); await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByLabel("Mass (kg)", { exact: true }).fill(""); await lab.getByRole("button", { name: "Check harmonic predictions", exact: true }).click();
  await expect(lab.getByRole("status")).toContainText("empty input is not zero");
  await lab.getByLabel("Mass (kg)", { exact: true }).fill("0"); await lab.getByRole("button", { name: "Check harmonic predictions", exact: true }).click();
  await expect(lab.getByRole("status")).toContainText("positive mass and stiffness");
  await lab.getByRole("button", { name: "Reset harmonic model", exact: true }).click();
  await lab.getByLabel("Prediction time (natural periods from t=0)", { exact: true }).fill("3"); await lab.getByRole("button", { name: "Check harmonic predictions", exact: true }).click();
  await expect(lab.getByRole("status")).toContainText("inside the chosen window");
  await page.reload(); await expect(lab.getByLabel("Prediction time (natural periods from t=0)", { exact: true })).toHaveValue("0.25");
});

function checkpointAnswers(question: Question, index: number): Record<string, string> {
  const p = question.parameters;
  if (index === 0) {
    const x = p.sx * (p.swap ? 4 : 3), v = p.sv * (p.swap ? 3 : 4);
    const phase = Math.acos(x / 5) * (v > 0 ? -1 : 1);
    return { omega: String(p.omega), amplitude: `${p.scale}/20`, phase: phase.toFixed(8) };
  }
  const cos = (n: number) => { const j = (n % 8 + 8) % 8; return j % 2 === 0 ? String([1, 0, -1, 0][j / 2]) : `${j === 1 || j === 7 ? 1 : -1}/sqrt(2)`; };
  if (index === 1) {
    const n = (p.phaseQuarter + p.timeQuarter + 32) % 8;
    return { position: `${p.scale}/100*(${cos(n)})`, velocity: `${-p.omega * p.scale}/100*(${cos(2 - n)})`, acceleration: `${-p.omega * p.omega * p.scale}/100*(${cos(n)})`, direction: n % 4 === 0 ? "zero" : n < 4 ? "negative" : "positive" };
  }
  if (index === 2) {
    const target = Math.cos(p.interiorQuarter * Math.PI / 4), answer: Record<string, string> = {};
    for (let n = 1; n <= 8; n++) {
      const phase = (p.phaseQuarter + n) * Math.PI / 4;
      if (Math.abs(Math.cos(phase) - target) > 1e-10) continue;
      const key = Math.sign(-Math.sin(phase)) === p.direction ? "requested" : "opposite";
      if (!answer[key]) answer[key] = `${n}*pi/${4 * p.omega}`;
    }
    return answer;
  }
  const candidates = Array.from({ length: p.sampleRate + 1 }, (_, i) => i);
  const alias = candidates.find(f => Array.from({ length: 12 }, (_, n) => Math.abs(Math.cos(2 * Math.PI * n * f / p.sampleRate) - Math.cos(2 * Math.PI * n * p.frequency / p.sampleRate)) < 1e-10).every(Boolean))!;
  return { alias: String(alias), sample: `${p.scale}/100*(${cos(8 * p.frequency / p.sampleRate)})`, alternative: "yes", unique: "no" };
}

test("harmonic checkpoints resume exact answers and preserve mechanics work and notes through backup restoration", async ({ page }, info) => {
  test.setTimeout(180_000);
  const harmonicData = JSON.parse(await readFile(new URL("../../content/lessons/phs-232/m01-l01.json", import.meta.url), "utf8"));
  const mechanicsData = JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m01-l01.json", import.meta.url), "utf8"));
  const attempt = createAttempt(lessonSchema.parse(harmonicData), "checkpoint", "harmonic-retention");
  const previous = createAttempt(lessonSchema.parse(mechanicsData), "practice", "mechanics-preserved");
  const practiceAttempt = createAttempt(lessonSchema.parse(harmonicData), "practice", "harmonic-assisted");
  await restoreProgress(page, { schemaVersion: 2, profile: { displayName: "", weeklyHours: 5 }, plan: [], bookmarks: [], notes: {}, confidence: {}, sessions: [], learning: { attempts: [previous, attempt, practiceAttempt], evidence: [], notes: { "phs-231": { "m01-l01": "Keep unit bounds distinct from standard uncertainty." } } } });
  await page.goto(route); const practice = page.locator("#practice");
  await practice.getByRole("button", { name: "Show a hint (0/3)", exact: true }).click();
  await expect(practice.getByText(practiceAttempt.questions[0].hints[0], { exact: true })).toBeVisible();
  await page.reload(); await expect(practice.getByRole("button", { name: "Show a hint (1/3)", exact: true })).toBeVisible();
  await practice.getByRole("button", { name: "Checkpoint", exact: true }).click();
  await expect(practice.getByRole("button", { name: /Show a hint/ })).toHaveCount(0);
  for (const [index, question] of attempt.questions.entries()) {
    const answers = checkpointAnswers(question, index);
    for (const field of question.fields) {
      if (field.kind === "choice") await practice.getByRole("group", { name: field.label, exact: true }).locator(`input[value="${answers[field.id]}"]`).check();
      else await practice.getByLabel(`${field.label}${field.unit ? ` (${field.unit})` : ""}`, { exact: true }).fill(answers[field.id]);
    }
    if (index === 2) {
      await page.reload(); await practice.getByRole("button", { name: "Checkpoint", exact: true }).click();
      await expect(practice.getByLabel("First crossing in the requested direction (s)", { exact: true })).toHaveValue(answers.requested);
    }
    await practice.getByRole("button", { name: index === 3 ? "Submit checkpoint" : "Next question", exact: true }).click();
  }
  await expect(practice.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true }).fill("A repeated position may reverse velocity. My quarter-period state is x=-0.04 m, v=-0.12 m/s. Constant samples alone do not prove rest.");
  await page.getByRole("button", { name: "Save lesson notes", exact: true }).click();
  await expect.poll(async () => (await readStoredProgress(page)).learning.notes["phs-232"]?.["m01-l01"]).toContain("Constant samples alone");
  await page.goto("/settings"); const downloading = page.waitForEvent("download"); await page.getByRole("button", { name: "Export progress", exact: true }).click();
  const path = info.outputPath("harmonic-backup.json"); await (await downloading).saveAs(path); const backup = JSON.parse(await readFile(path, "utf8"));
  expect(backup.learning.attempts.find((item: { id: string }) => item.id === previous.id)).toEqual(previous);
  expect(backup.learning.attempts.find((item: { id: string }) => item.id === attempt.id).questions).toEqual(attempt.questions);
  expect(backup.learning.evidence).toHaveLength(1); expect(backup.learning.evidence[0]).toMatchObject({ courseId: "phs-232", lessonId: "m01-l01", correct: 4 });
  expect(backup.learning.notes["phs-231"]["m01-l01"]).toContain("unit bounds");
  await page.getByRole("button", { name: "Reset local progress", exact: true }).click(); await page.getByRole("button", { name: "Confirm reset", exact: true }).click();
  await expect(page.getByText("Local progress has been reset.", { exact: true })).toBeVisible(); await restoreProgress(page, backup);
  await page.goto(route); await practice.getByRole("button", { name: "Checkpoint", exact: true }).click();
  await expect(practice.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
  await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true })).toHaveValue(backup.learning.notes["phs-232"]["m01-l01"]);
  expect((await readStoredProgress(page)).learning.attempts.find(item => item.id === previous.id)).toEqual(previous);
});

for (const viewport of [{ width: 320, height: 800 }, { width: 720, height: 500 }]) test.describe(`harmonic layout ${viewport.width}px`, () => {
  const scale = viewport.width === 720 ? 2 : 1;
  test.use({ viewport, deviceScaleFactor: scale });
  test("preserves reading and keyboard focus with reduced motion", async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.setViewportSize(viewport); await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto(route);
  expect(await page.evaluate(() => ({ width: innerWidth, scale: devicePixelRatio, reduced: matchMedia("(prefers-reduced-motion: reduce)").matches }))).toEqual({ width: viewport.width, scale, reduced: true });
  const lab = page.locator("#investigate"); await predict(lab, ["-.04", "-.12", "4"]);
  await expect(lab.getByRole("status")).toContainText("predictions agree");
  const probe = lab.getByRole("slider", { name: /^Revealed time probe/ }); await probe.focus(); await probe.press("ArrowRight");
  await expect(probe).toHaveValue("0.3125"); await probe.evaluate(element => element.scrollIntoView({ block: "center" }));
  const bounds = await probe.boundingBox(); expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
  expect(bounds!.y).toBeGreaterThanOrEqual(0); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
  expect(await probe.evaluate(element => { const r = element.getBoundingClientRect(); return element === document.activeElement && element.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze(); expect(audit.violations).toEqual([]);
  await page.screenshot({ path: info.outputPath(`harmonic-reflow-${viewport.width}.png`) });
  });
});
