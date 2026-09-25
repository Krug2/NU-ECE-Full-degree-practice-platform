import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema, type Question } from "../../lib/learning/contracts";
import { readStoredProgress, restoreProgress } from "./progress";

const route = "/courses/phs-232/lessons/m01-l04";
async function predict(lab: Locator, amplitude = "1/sqrt(145)", peak = "interior", phase = "below") {
  await lab.getByLabel("Predicted particular amplitude (m), or none", { exact: true }).fill(amplitude);
  await lab.getByLabel("Predicted peak behavior for the selected output", { exact: true }).selectOption(peak);
  await lab.getByLabel("Predicted displacement lag at the selected frequency", { exact: true }).selectOption(phase);
  const check = lab.getByRole("button", { name: "Check driven predictions", exact: true }); await check.focus(); await check.press("Enter");
}
async function residuals(lab: Locator) { return (await lab.getByRole("row", { name: /^Maximum \|E−E0−W_in\+D\|/ }).getByRole("cell").allTextContents()).map(Number); }
async function change(lab: Locator, label: string, value: string) { await lab.getByLabel(label, { exact: true }).fill(value); await expect(lab.getByRole("img")).toHaveCount(0); }

test("driven teaching corrects phase and startup misconceptions and exposes all sweep and state evidence", async ({ page }, info) => {
  test.setTimeout(180_000); await page.emulateMedia({ reducedMotion: "reduce" }); const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto(route); await expect(page.locator(".lesson-kicker")).toContainText("Course under construction"); const guided = page.locator("#guided");
  for (const [label, value] of [["Cosine coefficient C (m)", "1/73"], ["Sine coefficient D (m)", "-8/219"], ["Periodic displacement amplitude (m)", "1/(3*sqrt(73))"], ["Displacement phase lag (rad)", "-1.212025656524"], ["Periodic mean input power (W)", "16/219"], ["Forcing frequency for maximum displacement amplitude (rad/s)", "5"]]) await guided.getByLabel(label, { exact: true }).fill(value);
  await guided.getByLabel("Already equals the periodic response because the force is sinusoidal", { exact: true }).check(); await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).not.toContainText("Correct. You have checked every part."); await expect(guided).toContainText("differs in both position and velocity");
  for (const [label, value] of [["Sine coefficient D (m)", "8/219"], ["Displacement phase lag (rad)", String(Math.acos(9 / Math.sqrt(657)))], ["Forcing frequency for maximum displacement amplitude (rad/s)", "sqrt(7)"]]) await guided.getByLabel(label, { exact: true }).fill(value);
  await guided.getByLabel("Requires a decaying correction to both particular initial coordinates", { exact: true }).check(); await guided.getByRole("button", { name: "Check guided work", exact: true }).click(); await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab = page.locator("#investigate"); await predict(lab, "1/25", "endpoint", "above"); await expect(lab.getByRole("status")).toContainText("Revisit particular amplitude, output-specific peak, phase lag");
  await predict(lab); await expect(lab.getByRole("status")).toContainText("predictions agree"); await expect(lab.getByRole("img")).toHaveCount(3);
  await expect(lab.locator(".phs232-driven-probe")).toContainText("x=0 m; v=0 m/s; a=1 m/s²"); const residual = await residuals(lab); expect(residual[1]).toBeLessThan(residual[0] / 10); expect(residual[1]).toBeGreaterThan(0);
  const time = lab.getByRole("slider", { name: /^Driven time probe/ }); await time.focus(); await time.press("End"); await expect(time).toHaveValue("256"); await time.press("Home"); await time.press("ArrowRight"); await expect(time).toHaveValue("1");
  const sweep = lab.getByRole("slider", { name: /^Driven sweep probe/ }); await sweep.focus(); await sweep.press("End"); await expect(lab.locator(".phs232-sweep-probe")).toContainText("Ω/ω0=4; Ω=20 rad/s"); await sweep.press("Home");
  await lab.getByText("All time states and independent work integrals", { exact: true }).click(); const table = lab.getByRole("region", { name: "Driven state table; scroll horizontally if needed", exact: true });
  await expect(table).toContainText("257 states; page 1 of 5"); await expect(table.getByRole("row")).toHaveCount(65); await lab.getByLabel("Driven state table page", { exact: true }).selectOption("4"); await expect(table.getByRole("row")).toHaveCount(2);
  for (const [record, count] of [["coarse", 129], ["cycle-coarse", 129], ["cycle-fine", 257]]) { await lab.getByLabel("Driven state record", { exact: true }).selectOption(String(record)); await expect(table).toContainText(String(count) + " states; page 1"); }
  await lab.getByText("All time states and independent work integrals", { exact: true }).click();
  await lab.getByText("All uniform frequency-response samples", { exact: true }).click(); await expect(lab.getByRole("table", { name: "Uniform sweep page 1", exact: true }).getByRole("row")).toHaveCount(65);
  await lab.getByLabel("Driven sweep table page", { exact: true }).selectOption("2"); await expect(lab.getByRole("table", { name: "Uniform sweep page 3", exact: true }).getByRole("row")).toHaveCount(2);
  await lab.getByText("Exact response peaks and half-power frequencies", { exact: true }).click(); const peakCells = await lab.getByRole("table", { name: "Response event 1", exact: true }).getByRole("cell").allTextContents();
  expect(Number(peakCells[0])).toBeCloseTo(Math.sqrt(23), 7); await expect(lab).toContainText("Exact half-power width=2 rad/s");
  await lab.getByText("Driven investigation self-check rubric", { exact: true }).click(); await expect(lab).toContainText("does not award objective evidence");
  for (const [name, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]] as const) {
    await page.setViewportSize(viewport); const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze(); expect(audit.violations).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const [i, label] of ["sweep", "state", "energy"].entries()) { await lab.getByRole("img").nth(i).evaluate(e => e.scrollIntoView({ block: "center" })); await page.screenshot({ path: info.outputPath("driven-" + name + "-" + label + ".png") }); }
    await lab.getByRole("region", { name: "Driven work evidence; scroll horizontally if needed", exact: true }).evaluate(e => e.scrollIntoView({ block: "center" })); await page.screenshot({ path: info.outputPath("driven-" + name + "-work.png") });
  }
  expect(errors).toEqual([]); await expect(page.locator(".katex-error")).toHaveCount(0);
});

test("driven sweeps distinguish the displacement threshold, output-specific peaks and exact undamped resonance", async ({ page }) => {
  test.setTimeout(180_000); await page.goto(route); const lab = page.locator("#investigate"); await predict(lab);
  await change(lab, "Driven damping ratio zeta", ".8"); await predict(lab, "1/sqrt(1105)", "endpoint"); await expect(lab.getByRole("status")).toContainText("predictions agree");
  await lab.getByText("Exact response peaks and half-power frequencies", { exact: true }).click(); await expect(lab).toContainText("Displacement maximum: static endpoint");
  for (const output of ["velocityAmplitude", "meanPower"]) { await lab.getByLabel("Measured sweep output", { exact: true }).selectOption(output); await expect(lab.getByRole("img")).toHaveCount(0); await predict(lab, "1/sqrt(1105)", "interior"); await expect(lab.getByRole("status")).toContainText("predictions agree"); }
  await change(lab, "Driven damping ratio zeta", "3"); await predict(lab, "1/sqrt(14481)", "interior"); await lab.getByText("Exact response peaks and half-power frequencies", { exact: true }).click(); await expect(lab).toContainText("(outside displayed sweep)");
  await lab.getByRole("button", { name: "Reset driven model", exact: true }).click();
  for (const [label, value] of [["Driven spring stiffness (N/m)", "4"], ["Force amplitude F0 (N)", ".2"], ["Driven damping ratio zeta", "0"], ["Selected forcing ratio Omega / omega0", "1"], ["Driven window (natural periods T0)", ".25"]]) await change(lab, label, value);
  await predict(lab, "none", "unbounded", "undefined"); await expect(lab.getByRole("status")).toContainText("predictions agree"); await expect(lab).toContainText("Undamped exact resonance: no bounded sinusoidal particular response exists");
  const time = lab.getByRole("slider", { name: /^Driven time probe/ }); await time.focus(); await time.press("End");
  let text = await lab.locator(".phs232-driven-probe").textContent(); const resonantPosition = Number(text!.match(/x=([^ ]+) m;/)![1]); expect(resonantPosition).toBeCloseTo(Math.PI / 80, 8); expect(Number(text!.match(/v=([^ ]+) m\/s;/)![1])).toBeCloseTo(.05, 8);
  await lab.getByLabel("Trajectory display", { exact: true }).selectOption("full"); await expect(lab).toContainText("Display: full state only");
  for (const ratio of [.9999, 1.0001]) {
    await change(lab, "Selected forcing ratio Omega / omega0", String(ratio)); await predict(lab, String(.2 / Math.abs(4 - 4 * ratio * ratio)), "unbounded", ratio < 1 ? "zero" : "pi"); await expect(lab.getByRole("status")).toContainText("predictions agree");
    await time.focus(); await time.press("End"); text = await lab.locator(".phs232-driven-probe").textContent(); expect(Math.abs(Number(text!.match(/x=([^ ]+) m;/)![1]) - resonantPosition)).toBeLessThan(.00001);
  }
  await change(lab, "Selected forcing ratio Omega / omega0", "1"); await change(lab, "Driven damping ratio zeta", ".000001"); await predict(lab, "25000", "interior", "quarter"); await expect(lab.getByRole("status")).toContainText("predictions agree");
  await time.focus(); await time.press("End"); text = await lab.locator(".phs232-driven-probe").textContent(); expect(Math.abs(Number(text!.match(/x=([^ ]+) m;/)![1]) - resonantPosition)).toBeLessThan(.000001);
});

test("driven work evidence distinguishes startup from periodic means, refines quadrature and handles constant, zero and invalid inputs", async ({ page }) => {
  test.setTimeout(180_000); await page.goto(route); const lab = page.locator("#investigate");
  for (const [label, value] of [["Driven spring stiffness (N/m)", "4"], ["Force amplitude F0 (N)", ".2"], ["Driven damping ratio zeta", ".25"], ["Selected forcing ratio Omega / omega0", "1"], ["Driven window (natural periods T0)", "1"]]) await change(lab, label, value);
  await lab.getByLabel("Driven coarse intervals", { exact: true }).selectOption("64"); await predict(lab, ".1", "interior", "quarter"); await expect(lab.getByRole("status")).toContainText("predictions agree");
  const evidence = lab.getByRole("region", { name: "Driven last-cycle evidence; scroll horizontally if needed", exact: true });
  const meanInput = Number(await evidence.getByRole("row", { name: /^Mean input power/ }).getByRole("cell").last().textContent());
  const meanLoss = Number(await evidence.getByRole("row", { name: /^Mean viscous power/ }).getByRole("cell").last().textContent());
  const changeEnergy = Number(await evidence.getByRole("row", { name: /^Stored energy change/ }).getByRole("cell").last().textContent());
  expect(meanInput).toBeCloseTo(.009997350883046579, 9); expect(meanLoss).toBeCloseTo(.00605675199449402, 9); expect((meanInput - meanLoss) * Math.PI).toBeCloseTo(changeEnergy, 9);
  await expect(lab).toContainText("mean periodic power=0.02 W"); expect(Math.abs(meanInput - .02)).toBeGreaterThan(.009);
  const original = await residuals(lab); await lab.getByLabel("Driven coarse intervals", { exact: true }).selectOption("256"); await predict(lab, ".1", "interior", "quarter"); const refined = await residuals(lab); expect(refined[0]).toBeLessThan(original[0] / 100);
  await change(lab, "Driven window (natural periods T0)", ".25"); await predict(lab, ".1", "interior", "quarter"); await expect(lab).toContainText("No complete forcing cycle is available");
  await change(lab, "Selected forcing ratio Omega / omega0", "0"); await predict(lab, ".05", "interior", "zero"); await expect(lab.getByRole("status")).toContainText("predictions agree"); await expect(lab).toContainText("Constant force: the particular state is F0/k"); await expect(lab).toContainText("No complete forcing cycle is available");
  await change(lab, "Force amplitude F0 (N)", "0"); await predict(lab, "0", "flat", "undefined"); await expect(lab.getByRole("status")).toContainText("predictions agree"); await expect(lab).toContainText("Zero force: the particular response is zero"); for (const value of await residuals(lab)) expect(value).toBe(0);
  await lab.getByLabel("Predicted particular amplitude (m), or none", { exact: true }).fill("sqrt(-1)"); await lab.getByRole("button", { name: "Check driven predictions", exact: true }).click(); await expect(lab.getByRole("status")).toContainText("finite real amplitude"); await expect(lab.getByRole("img")).toHaveCount(0);
  for (const [label, value] of [["Driven damping ratio zeta", "-1"], ["Driven damping ratio zeta", ".00000001"], ["Selected forcing ratio Omega / omega0", "5"], ["Force amplitude F0 (N)", "21"]]) {
    await lab.getByRole("button", { name: "Reset driven model", exact: true }).click(); await change(lab, label, value); await lab.getByRole("button", { name: "Check driven predictions", exact: true }).click(); await expect(lab.getByRole("status")).toContainText("labeled ranges");
  }
  await lab.getByRole("button", { name: "Reset driven model", exact: true }).click(); await change(lab, "Driven mass (kg)", ""); await lab.getByRole("button", { name: "Check driven predictions", exact: true }).click(); await expect(lab.getByRole("status")).toContainText("empty input is not zero");
  await page.reload(); await expect(lab.getByLabel("Driven mass (kg)", { exact: true })).toHaveValue("1"); await expect(lab.getByLabel("Driven damping ratio zeta", { exact: true })).toHaveValue("0.2"); await expect(lab.getByRole("img")).toHaveCount(0);
});

function checkpointAnswers(q: Question, i: number): Record<string, string> {
  const p = q.parameters, n = p.massNumerator, s = p.scale;
  if (i === 0) {
    const r = p.ratioNumerator, denominator = (4 - r * r) ** 2 + r * r, re = 4 - r * r;
    return { cosine: String(p.a * re) + "/" + (5 * n * s * s * denominator), sine: String(p.a * r) + "/" + (5 * n * s * s * denominator), lag: String(Math.acos(re / Math.sqrt(denominator))), "initial-velocity": String(p.a * r * r) + "/" + (5 * n * s * denominator), interval: r < 2 ? "below" : r === 2 ? "quarter" : "above" };
  }
  if (i === 1) {
    const C = p.mode === 2 ? String(p.a) + "/" + (15 * n * s * s) : "0", V = p.mode === 2 ? "0" : String(p.a) + "/" + (5 * n * s);
    return { "particular-position": C, "particular-velocity": V, "correction-position": p.mode === 1 ? "0" : String(p.sign * p.a) + "/100-(" + C + ")", "correction-velocity": p.mode === 1 ? "0" : "-(" + V + ")", behavior: ["decays", "absent", "persists"][p.mode] };
  }
  const d = p.dampingNumerator;
  if (i === 2) {
    const r = [2, 3, 5, 7][p.frequencyIndex], power = String(p.a * p.a * d * r * r) + "/" + (50 * n * s * ((25 - r * r) ** 2 + 4 * d * d * r * r));
    return { input: power, loss: power, "energy-change": "0", negative: r === 5 ? "no" : "yes" };
  }
  return { quality: "5/" + (2 * d), lower: s + "*(sqrt(" + (25 + d * d) + ")-" + d + ")", upper: s + "*(sqrt(" + (25 + d * d) + ")+" + d + ")", width: String(2 * d * s), "loss-definition": "approximation" };
}

test("driven checkpoints resume and restore exact answers, hints and notes with earlier course work intact", async ({ page }, info) => {
  test.setTimeout(180_000);
  const load = async (path: string) => lessonSchema.parse(JSON.parse(await readFile(new URL(path, import.meta.url), "utf8")));
  const lesson = await load("../../content/lessons/phs-232/m01-l04.json"), damping = await load("../../content/lessons/phs-232/m01-l03.json"), mechanics = await load("../../content/lessons/phs-231/m01-l01.json");
  const checkpoint = createAttempt(lesson, "checkpoint", "driven-retention"), practice = createAttempt(lesson, "practice", "driven-assisted"); practice.position = 1;
  const previous = [createAttempt(damping, "practice", "driven-preserves-damping"), createAttempt(mechanics, "practice", "driven-preserves-mechanics")];
  await restoreProgress(page, { schemaVersion: 2, profile: { displayName: "", weeklyHours: 5 }, plan: [], bookmarks: [], notes: {}, confidence: {}, sessions: [], learning: { attempts: [...previous, checkpoint, practice], evidence: [], notes: { "phs-232": { "m01-l03": "Finite sampled containment is not permanent settling." } } } });
  await page.goto(route); const runner = page.locator("#practice"); await runner.getByRole("button", { name: "Show a hint (0/3)", exact: true }).click(); await page.reload(); await expect(runner.getByRole("button", { name: "Show a hint (1/3)", exact: true })).toBeVisible();
  await runner.getByRole("button", { name: "Checkpoint", exact: true }).click(); await expect(runner.getByRole("button", { name: /Show a hint/ })).toHaveCount(0);
  for (const [i, q] of checkpoint.questions.entries()) {
    const response = checkpointAnswers(q, i);
    for (const field of q.fields) {
      if (field.kind === "choice") await runner.getByRole("group", { name: field.label, exact: true }).locator('input[value="' + response[field.id] + '"]').check();
      else if ("unit" in field) await runner.getByLabel(field.label + (field.unit ? " (" + field.unit + ")" : ""), { exact: true }).fill(response[field.id]);
    }
    if (i === 0) { await page.reload(); await runner.getByRole("button", { name: "Checkpoint", exact: true }).click(); await expect(runner.getByLabel("Displacement phase lag delta (rad)", { exact: true })).toHaveValue(response.lag); }
    await runner.getByRole("button", { name: i === 3 ? "Submit checkpoint" : "Next question", exact: true }).click();
  }
  await expect(runner.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
  const note = "Fixed force: m=1 kg, k=4 N/m, b=1 kg/s, F0=.2 N, Omega=2 rad/s, x0=v0=0. First cycle W=.03140760409 J, D=.01902784757 J, Delta E=.01237975652 J. The periodic mean .02 W does not describe this startup cycle.";
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true }).fill(note); await page.getByRole("button", { name: "Save lesson notes", exact: true }).click(); await expect.poll(async () => (await readStoredProgress(page)).learning.notes["phs-232"]?.["m01-l04"]).toBe(note);
  await page.goto("/settings"); const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Export progress", exact: true }).click(); const path = info.outputPath("driven-backup.json"); await (await download).saveAs(path); const backup = JSON.parse(await readFile(path, "utf8"));
  for (const prior of previous) expect(backup.learning.attempts.find((a: { id: string }) => a.id === prior.id)).toEqual(prior);
  expect(backup.learning.attempts.find((a: { id: string }) => a.id === checkpoint.id).questions).toEqual(checkpoint.questions); expect(backup.learning.evidence[0]).toMatchObject({ courseId: "phs-232", lessonId: "m01-l04", correct: 4 });
  await page.getByRole("button", { name: "Reset local progress", exact: true }).click(); await page.getByRole("button", { name: "Confirm reset", exact: true }).click(); await expect(page.getByText("Local progress has been reset.", { exact: true })).toBeVisible();
  await restoreProgress(page, backup); await page.goto(route); await runner.getByRole("button", { name: "Checkpoint", exact: true }).click(); await expect(runner.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
  await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true })).toHaveValue(note); expect(await readStoredProgress(page)).toEqual(backup);
  await runner.getByRole("button", { name: "Practice", exact: true }).click(); await expect(runner.getByRole("button", { name: "Show a hint (1/3)", exact: true })).toBeVisible();
});

for (const viewport of [{ width: 320, height: 800 }, { width: 720, height: 500 }]) test.describe("driven layout " + viewport.width + "px", () => {
  const scale = viewport.width === 720 ? 2 : 1; test.use({ viewport, deviceScaleFactor: scale });
  test("preserves keyboard probes, intact table values and reduced-motion reflow", async ({ page }, info) => {
    test.setTimeout(120_000); await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto(route); const lab = page.locator("#investigate"); await predict(lab);
    expect(await page.evaluate(() => ({ width: innerWidth, scale: devicePixelRatio, reduced: matchMedia("(prefers-reduced-motion: reduce)").matches }))).toEqual({ width: viewport.width, scale, reduced: true });
    for (const name of [/^Driven sweep probe/, /^Driven time probe/]) {
      const probe = lab.getByRole("slider", { name }); await probe.focus(); await probe.press("ArrowRight"); await expect(probe).toHaveValue("1"); await probe.evaluate(e => e.scrollIntoView({ block: "center" }));
      const bounds = await probe.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width); expect(bounds!.y).toBeGreaterThanOrEqual(0); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
      expect(await probe.evaluate(e => { const r = e.getBoundingClientRect(); return e === document.activeElement && e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: info.outputPath("driven-reflow-" + viewport.width + ".png") });
    await lab.getByText("All time states and independent work integrals", { exact: true }).click(); const table = lab.getByRole("region", { name: "Driven state table; scroll horizontally if needed", exact: true }); await table.focus(); await table.press("ArrowRight"); await expect.poll(() => table.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
    expect(await table.evaluate(e => Array.from(e.querySelectorAll("td")).every(cell => { const range = document.createRange(); range.selectNodeContents(cell); return range.getClientRects().length === 1; }))).toBe(true);
    await table.evaluate(e => e.scrollIntoView({ block: "center" })); await page.screenshot({ path: info.outputPath("driven-table-" + viewport.width + ".png") });
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze(); expect(audit.violations).toEqual([]);
  });
});
