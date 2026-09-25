import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema, type Question } from "../../lib/learning/contracts";
import { readStoredProgress, restoreProgress } from "./progress";

const route = "/courses/phs-232/lessons/m02-l01";
async function predict(lab: Locator, speed = "20", velocity = String(Math.PI / 10), power = "positive") {
  await lab.getByLabel("Predicted positive wave speed (m/s)", { exact: true }).fill(speed);
  await lab.getByLabel("Predicted transverse velocity at x=0,t=0 (m/s)", { exact: true }).fill(velocity);
  await lab.getByLabel("Sign of transported power away from zero-slope points", { exact: true }).selectOption(power);
  const button = lab.getByRole("button", { name: "Check wave predictions", exact: true }); await button.focus(); await button.press("Enter");
}
async function convergence(lab: Locator) {
  const rows = lab.getByRole("table", { name: /^Wave convergence:/ }).locator("tbody tr");
  return Promise.all([0, 1].map(async i => (await rows.nth(i).getByRole("cell").allTextContents()).map(Number)));
}
async function assertCleared(lab: Locator) { await expect(lab.getByRole("img")).toHaveCount(0); await expect(lab.getByLabel("Predicted positive wave speed (m/s)", { exact: true })).toHaveValue(""); }

test("wave teaching corrects transport misconceptions and exposes complete keyboard-controlled state and energy records", async ({ page }, info) => {
  test.setTimeout(180_000); await page.emulateMedia({ reducedMotion: "reduce" }); const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto(route); await expect(page.locator(".lesson-kicker")).toContainText("Course under construction"); const guided = page.locator("#guided");
  for (const [label, value] of [["Signed crest velocity (m/s)", "4"], ["Transverse velocity at zero (m/s)", "9/125"], ["Spatial slope at zero", "9/500"], ["Local stretch energy per length (J/m)", "0"], ["Signed cycle-mean power toward +x (W)", "-81/78125"], ["Wavelength (m)", "2*pi/3"]]) await guided.getByLabel(label, { exact: true }).fill(value);
  await guided.getByLabel("A permanently stationary point with zero local energy", { exact: true }).check(); await guided.getByRole("button", { name: "Check guided work", exact: true }).click(); await expect(guided).toContainText("positive transverse velocity shows this point is moving");
  for (const [label, value] of [["Signed crest velocity (m/s)", "-4"], ["Local stretch energy per length (J/m)", "0.8*(0.006*3)^2/2"], ["Signed cycle-mean power toward +x (W)", "-0.05*4*(0.006*12)^2/2"]]) await guided.getByLabel(label, { exact: true }).fill(value);
  await guided.getByLabel("An upward crossing with nonzero local energy and leftward transport", { exact: true }).check(); await guided.getByRole("button", { name: "Check guided work", exact: true }).click(); await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab = page.locator("#investigate"); await predict(lab, ".314159", "20", "negative"); await expect(lab.getByRole("status")).toContainText("Revisit medium speed, local transverse velocity, power direction");
  await predict(lab); await expect(lab.getByRole("status")).toContainText("predictions agree"); await expect(lab.getByRole("img")).toHaveCount(3);
  const [coarse, fine] = await convergence(lab); expect(coarse.slice(0, 2)).toEqual([128, 128]); expect(fine.slice(0, 2)).toEqual([256, 256]); expect(fine[5]).toBeLessThan(coarse[5] / 10); expect(fine[5]).toBeGreaterThan(0);
  const position = lab.getByRole("slider", { name: /^Tagged material-point position index/ }), time = lab.getByRole("slider", { name: /^Wave time index/ });
  await position.focus(); await position.press("End"); await expect(lab.getByTestId("wave-probe")).toContainText("x=8 m; t=0 s");
  await time.focus(); await time.press("End"); await expect(lab.getByTestId("wave-probe")).toContainText("x=8 m; t=0.8 s"); await expect(lab.getByTestId("wave-pattern")).toContainText("outside this view"); await time.press("Home"); await time.press("ArrowRight"); await expect(time).toHaveValue("1");
  await position.focus(); await position.press("Home"); await expect(position).toHaveValue("0"); await lab.getByRole("button", { name: "Next wave position", exact: true }).click(); await expect(position).toHaveValue("1");
  for (const [summary, label, count] of [["All spatial derivatives and energy values", "Wave snapshot", 257], ["All tagged-point time states", "Wave time history", 257], ["All boundary work and stored-energy records", "Wave energy ledger", 257]] as const) {
    await lab.getByText(summary, { exact: true }).click(); const table = lab.getByRole("region", { name: label + "; scroll horizontally if needed", exact: true });
    for (let i = 0; i < 5; i++) { await lab.getByLabel(label + " page", { exact: true }).selectOption(String(i)); await expect(table.getByRole("row")).toHaveCount(i === 4 ? 2 : 65); await expect(table).toContainText(count + " rows; page " + (i + 1)); }
    if (label === "Wave energy ledger") { await lab.getByLabel("Wave energy record resolution", { exact: true }).selectOption("coarse"); await expect(table).toContainText("129 rows; page 1"); }
    await lab.getByText(summary, { exact: true }).click();
  }
  await lab.getByText("Traveling-wave investigation self-check rubric", { exact: true }).click(); await expect(lab.getByText("This proposed self-check", { exact: false })).toHaveCount(1);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  for (const [i, name] of ["profile", "history", "balance"].entries()) { const figure = lab.locator("figure").nth(i); await figure.evaluate(e => e.scrollIntoView({ block: "center", behavior: "instant" })); await figure.screenshot({ path: info.outputPath("wave-desktop-" + name + ".png") }); }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [i, name] of ["profile", "history", "balance"].entries()) { const figure = lab.locator("figure").nth(i); await figure.evaluate(e => e.scrollIntoView({ block: "center", behavior: "instant" })); await figure.screenshot({ path: info.outputPath("wave-mobile-" + name + ".png") }); }
  await lab.getByRole("table", { name: /^Wave convergence:/ }).evaluate(e => e.scrollIntoView({ block: "center", behavior: "instant" })); await page.screenshot({ path: info.outputPath("wave-mobile-ledger.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(errors).toEqual([]);
});

test("wave comparisons retain the imposed source frequency, reverse signed flux and distinguish zero motion and invalid inputs", async ({ page }) => {
  test.setTimeout(150_000); await page.goto(route); const lab = page.locator("#investigate"); await predict(lab);
  await lab.getByLabel("Wave direction", { exact: true }).selectOption("-1"); await assertCleared(lab); await predict(lab, "20", String(-Math.PI / 10), "negative");
  await expect(lab.getByRole("status")).toContainText("predictions agree"); await expect(lab).toContainText("signed mean P=-0.078956835 W");
  await lab.getByLabel("Wave displacement amplitude (m)", { exact: true }).fill(".04"); await assertCleared(lab); await predict(lab, "20", String(-Math.PI / 5), "negative"); await expect(lab).toContainText("signed mean P=-0.31582734 W");
  await lab.getByLabel("Wave displacement amplitude (m)", { exact: true }).fill(".02"); await lab.getByLabel("Wave tension (N)", { exact: true }).fill("32"); await predict(lab, "40", String(-Math.PI / 10), "negative"); await expect(lab).toContainText("characteristic length is 8 m"); await expect(lab).toContainText("signed mean P=-0.15791367 W"); await expect(lab.getByLabel("Source frequency (Hz; harmonic only)", { exact: true })).toHaveValue("5");
  await lab.getByLabel("Wave displacement amplitude (m)", { exact: true }).fill("0"); await predict(lab, "40", "0", "zero"); await expect(lab.getByTestId("wave-pattern")).toContainText("no identifiable crest"); const rows = await convergence(lab); expect(rows[1].slice(3)).toEqual([0, 0, 0]);
  await lab.getByLabel("Wave linear density (kg/m)", { exact: true }).fill(""); await predict(lab); await expect(lab.getByRole("status")).toContainText("empty value is not zero"); await expect(lab.getByRole("img")).toHaveCount(0);
  await lab.getByLabel("Wave linear density (kg/m)", { exact: true }).fill("2"); await lab.getByLabel("Wave tension (N)", { exact: true }).fill(".1"); await lab.getByLabel("Source frequency (Hz; harmonic only)", { exact: true }).fill("20"); await lab.getByLabel("Wave displacement amplitude (m)", { exact: true }).fill(".1"); await predict(lab); await expect(lab.getByRole("status")).toContainText("maximum slope at most 0.2"); await expect(lab.getByRole("img")).toHaveCount(0);
  await page.reload(); await expect(lab.getByLabel("Wave tension (N)", { exact: true })).toHaveValue("8"); await expect(lab.getByRole("img")).toHaveCount(0);
});

test("a finite pulse exposes independent signed boundary work and numerical refinement in both directions", async ({ page }) => {
  test.setTimeout(150_000); await page.goto(route); const lab = page.locator("#investigate");
  await lab.getByLabel("Traveling profile", { exact: true }).selectOption("gaussian"); await lab.getByLabel("Record duration (characteristic times)", { exact: true }).fill("8"); await lab.getByLabel("Wave base integration intervals", { exact: true }).selectOption("64");
  const initialVelocity = 20 * 2.5 / .5 * .02 * Math.exp(-(2.5 ** 2) / 2);
  await predict(lab, "20", String(initialVelocity)); await expect(lab.getByRole("status")).toContainText("predictions agree"); await expect(lab).toContainText("has no wavelength, harmonic frequency or oscillation period"); await expect(lab.getByText("Periodic snapshots and sampling ambiguity", { exact: true })).toHaveCount(0);
  const [coarse, fine] = await convergence(lab); expect(fine[5]).toBeLessThan(coarse[5] / 10);
  await lab.getByText("All boundary work and stored-energy records", { exact: true }).click(); const table = lab.getByRole("region", { name: "Wave energy ledger; scroll horizontally if needed", exact: true });
  await lab.getByLabel("Wave energy ledger page", { exact: true }).selectOption("2"); const final = (await table.locator("tbody tr").last().getByRole("cell").allTextContents()).map(Number);
  let initialEnergy = 0; const dx = .35 / 8192;
  for (let i = 0; i < 8192; i++) { const x = -.175 + (i + .5) * dx, q = (x + 1.25) / .5; initialEnergy += 8 * (.02 / .5) ** 2 * q * q * Math.exp(-q * q) * dx; }
  expect(final[5]).toBeGreaterThan(0); expect(final[6]).toBeGreaterThan(0); expect(final[6]).toBeGreaterThan(final[5]); expect(final[1] - final[2]).toBeCloseTo(initialEnergy, 9);
  expect(Math.abs(final[2] - final[7] - final[8])).toBeLessThan(1e-9);
  await lab.getByLabel("Wave base integration intervals", { exact: true }).selectOption("128"); await predict(lab, "20", String(initialVelocity)); const refined = await convergence(lab); expect(refined[0][5]).toBeCloseTo(fine[5], 12); expect(refined[1][5]).toBeLessThan(fine[5] / 10);
  await lab.getByLabel("Wave direction", { exact: true }).selectOption("-1"); await predict(lab, "20", String(initialVelocity), "negative"); await expect(lab.getByRole("status")).toContainText("predictions agree");
  await lab.getByText("All boundary work and stored-energy records", { exact: true }).click(); await lab.getByLabel("Wave energy ledger page", { exact: true }).selectOption("4"); const reverse = (await table.locator("tbody tr").last().getByRole("cell").allTextContents()).map(Number);
  expect(reverse[5]).toBeLessThan(0); expect(reverse[6]).toBeLessThan(0); expect(reverse[5]).toBeLessThan(reverse[6]); expect(reverse[1]).toBeCloseTo(final[1], 10);
});

test("periodic records reveal alias reversal, a frozen recording, a half-wavelength tie and spatial degeneracy", async ({ page }) => {
  test.setTimeout(120_000); await page.goto(route); const lab = page.locator("#investigate"); await predict(lab);
  await lab.getByText("Periodic snapshots and sampling ambiguity", { exact: true }).click(); await expect(lab.getByTestId("wave-alias")).toContainText("principal signed shift=0.5 m; apparent principal velocity=20 m/s", { ignoreCase: true });
  await lab.getByLabel("Recording time step (periods)", { exact: true }).selectOption("0.75"); await expect(lab.getByTestId("wave-alias")).toContainText("principal signed shift=-1 m; apparent principal velocity=-6.6666667 m/s", { ignoreCase: true });
  await lab.getByLabel("Recording time step (periods)", { exact: true }).selectOption("1"); await expect(lab.getByTestId("wave-alias")).toContainText("Model translation=4 m"); await expect(lab.getByTestId("wave-alias")).toContainText("apparent principal velocity=0 m/s");
  const times = lab.getByRole("table", { name: /^Wave stroboscopic record:/ }).locator("tbody tr"); const recorded = await times.evaluateAll(rows => rows.map(row => Number(row.querySelectorAll("td")[2].textContent))); expect(recorded).toHaveLength(9); for (const y of recorded) expect(y).toBeCloseTo(recorded[0], 10);
  await lab.getByLabel("Recording position step (wavelengths)", { exact: true }).selectOption("1"); const positions = lab.getByRole("table", { name: /^Wave recorded snapshots:/ }).locator("tbody tr"); const shape = await positions.evaluateAll(rows => rows.map(row => Number(row.querySelectorAll("td")[0].textContent))); expect(shape).toHaveLength(17); for (const y of shape) expect(y).toBeCloseTo(shape[0], 10);
  await lab.getByLabel("Recording time step (periods)", { exact: true }).selectOption("0.5"); await expect(lab.getByTestId("wave-alias")).toContainText("Half-wavelength tie");
});

function checkpointAnswers(q: Question, i: number): Record<string, string> {
  const p = q.parameters;
  if (i === 0) { const sine = Math.sin(p.phaseIndex * Math.PI / 4), exact = p.phaseIndex % 2 ? (sine > 0 ? "sqrt(2)/2" : "-sqrt(2)/2") : String(Math.round(sine)), sign = p.direction * Math.round(1000 * sine); return { velocity: p.direction * p.a * p.k * p.c + "/1000*(" + exact + ")", slope: -p.a * p.k + "/1000*(" + exact + ")", motion: sign === 0 ? "rest" : sign > 0 ? "up" : "down" }; }
  if (i === 1) { const v = p.mode % 2 ? 2 * p.c : p.c; return { residual: String(v * v - p.c * p.c), tension: p.densityNumerator + "/100*" + v * v, solution: v === p.c ? "yes" : "no", point: "no" }; }
  if (i === 2) { const energy = p.m + "/1000*(" + p.a + "/1000)^2*(" + p.k * p.c + ")^2/2"; return { density: energy, power: p.direction * p.c + "*(" + energy + ")", stored: "(" + energy + ")*2*pi/" + p.k, crossing: p.direction + "*(" + energy + ")*2*pi/" + p.k }; }
  const [tension, density] = [[4, 1], [1, 4], [9, 4], [.25, 9]][p.mode], speed = Math.sqrt(tension / density), ratio = speed === 1 / 6 ? "1/6" : String(speed);
  return { speed: ratio, wavelength: ratio, frequency: "1", density: String(density), power: "(" + ratio + ")*" + density };
}

test("wave checkpoints resume and restore their exact records with hints, notes and earlier physics attempts", async ({ page }, info) => {
  test.setTimeout(180_000); const load = async (path: string) => lessonSchema.parse(JSON.parse(await readFile(new URL(path, import.meta.url), "utf8")));
  const lesson = await load("../../content/lessons/phs-232/m02-l01.json"), driven = await load("../../content/lessons/phs-232/m01-l04.json"), mechanics = await load("../../content/lessons/phs-231/m01-l01.json");
  const checkpoint = createAttempt(lesson, "checkpoint", "wave-retention"), practice = createAttempt(lesson, "practice", "wave-hints"); practice.position = 1;
  const previous = [createAttempt(driven, "practice", "wave-preserves-driven"), createAttempt(mechanics, "practice", "wave-preserves-mechanics")];
  await restoreProgress(page, { schemaVersion: 2, profile: { displayName: "", weeklyHours: 5 }, plan: [], bookmarks: [], notes: {}, confidence: {}, sessions: [], learning: { attempts: [...previous, checkpoint, practice], evidence: [], notes: { "phs-232": { "m01-l04": "Startup and periodic response have distinct energy accounts." } } } });
  await page.goto(route); const runner = page.locator("#practice"); await runner.getByRole("button", { name: "Show a hint (0/3)", exact: true }).click(); await page.reload(); await expect(runner.getByRole("button", { name: "Show a hint (1/3)", exact: true })).toBeVisible();
  await runner.getByRole("button", { name: "Checkpoint", exact: true }).click(); await expect(runner.getByRole("button", { name: /Show a hint/ })).toHaveCount(0);
  for (const [i, q] of checkpoint.questions.entries()) {
    const response = checkpointAnswers(q, i);
    for (const field of q.fields) { if (field.kind === "choice") await runner.getByRole("group", { name: field.label, exact: true }).locator('input[value="' + response[field.id] + '"]').check(); else if ("unit" in field) await runner.getByLabel(field.label + (field.unit ? " (" + field.unit + ")" : ""), { exact: true }).fill(response[field.id]); }
    if (i === 0) { await page.reload(); await runner.getByRole("button", { name: "Checkpoint", exact: true }).click(); await expect(runner.getByLabel("Transverse velocity at zero (m/s)", { exact: true })).toHaveValue(response.velocity); }
    await runner.getByRole("button", { name: i === 3 ? "Submit checkpoint" : "Next question", exact: true }).click();
  }
  await expect(runner.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
  const note = "String: tension 8 N, density .02 kg/m, A=.02 m, f=5 Hz, phase pi/6. c=20 m/s and wavelength=4 m. Mean rightward power=.0789568352 W. At 3/4-period spacing the principal shift is -1 m although the tracked crest moves +3 m. Compare signed boundary work at 128 and 256 intervals.";
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true }).fill(note); await page.getByRole("button", { name: "Save lesson notes", exact: true }).click(); await expect.poll(async () => (await readStoredProgress(page)).learning.notes["phs-232"]?.["m02-l01"]).toBe(note);
  await page.goto("/settings"); const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Export progress", exact: true }).click(); const path = info.outputPath("wave-backup.json"); await (await download).saveAs(path); const backup = JSON.parse(await readFile(path, "utf8"));
  for (const prior of previous) expect(backup.learning.attempts.find((a: { id: string }) => a.id === prior.id)).toEqual(prior);
  expect(backup.learning.attempts.find((a: { id: string }) => a.id === checkpoint.id).questions).toEqual(checkpoint.questions); expect(backup.learning.evidence[0]).toMatchObject({ courseId: "phs-232", lessonId: "m02-l01", correct: 4 });
  await page.getByRole("button", { name: "Reset local progress", exact: true }).click(); await page.getByRole("button", { name: "Confirm reset", exact: true }).click(); await expect(page.getByText("Local progress has been reset.", { exact: true })).toBeVisible();
  await restoreProgress(page, backup); await page.goto(route); await runner.getByRole("button", { name: "Checkpoint", exact: true }).click(); await expect(runner.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
  await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true })).toHaveValue(note); expect(await readStoredProgress(page)).toEqual(backup);
  await runner.getByRole("button", { name: "Practice", exact: true }).click(); await expect(runner.getByRole("button", { name: "Show a hint (1/3)", exact: true })).toBeVisible();
});

for (const viewport of [{ width: 320, height: 800 }, { width: 720, height: 500 }]) test.describe("wave layout " + viewport.width + "px", () => {
  const scale = viewport.width === 720 ? 2 : 1; test.use({ viewport, deviceScaleFactor: scale });
  test("keeps both probes, complete table values and reduced-motion reading accessible", async ({ page }, info) => {
    test.setTimeout(120_000); await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto(route); const lab = page.locator("#investigate"); await predict(lab);
    expect(await page.evaluate(() => ({ width: innerWidth, scale: devicePixelRatio, reduced: matchMedia("(prefers-reduced-motion: reduce)").matches }))).toEqual({ width: viewport.width, scale, reduced: true });
    for (const [name, value] of [[/^Tagged material-point position index/, "129"], [/^Wave time index/, "1"]] as const) {
      const probe = lab.getByRole("slider", { name }); await probe.focus(); await probe.press("ArrowRight"); await expect(probe).toHaveValue(value); await probe.evaluate(e => e.scrollIntoView({ block: "center", behavior: "instant" }));
      const bounds = await probe.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width); expect(bounds!.y).toBeGreaterThanOrEqual(0); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
      expect(await probe.evaluate(e => { const r = e.getBoundingClientRect(); return e === document.activeElement && e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: info.outputPath("wave-reflow-" + viewport.width + ".png") });
    await lab.getByText("All spatial derivatives and energy values", { exact: true }).click(); const table = lab.getByRole("region", { name: "Wave snapshot; scroll horizontally if needed", exact: true }); await table.focus(); await table.press("ArrowRight"); await expect.poll(() => table.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
    expect(await table.evaluate(e => Array.from(e.querySelectorAll("td")).every(cell => { const range = document.createRange(); range.selectNodeContents(cell); return range.getClientRects().length === 1; }))).toBe(true);
    await table.evaluate(e => e.scrollIntoView({ block: "center", behavior: "instant" })); await page.screenshot({ path: info.outputPath("wave-table-" + viewport.width + ".png") });
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  });
});
