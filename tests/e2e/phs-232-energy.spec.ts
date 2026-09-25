import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema, type Question } from "../../lib/learning/contracts";
import { readStoredProgress, restoreProgress } from "./progress";

const route = "/courses/phs-232/lessons/m01-l02";
async function predict(lab: Locator, energy = .10648179284666152, comparison = "longer", period = Math.PI / 2) {
  await lab.getByLabel("Predicted small-angle period (s)", { exact: true }).fill(String(period));
  await lab.getByLabel("Predicted nonlinear release energy (J)", { exact: true }).fill(String(energy));
  await lab.getByLabel("Predicted nonlinear period compared with T0", { exact: true }).selectOption(comparison);
  const check = lab.getByRole("button", { name: "Check pendulum predictions", exact: true }); await check.focus(); await check.press("Enter");
}
async function drift(lab: Locator) {
  return (await lab.getByRole("row", { name: /^Maximum nonlinear absolute energy drift/ }).getByRole("cell").allTextContents()).map(Number);
}

test("energy lesson corrects a linear-force substitution and connects pendulum predictions, convergence and keyboard evidence", async ({ page }, info) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto(route); await expect(page.locator(".lesson-kicker")).toContainText("Course under construction");
  const guided = page.locator("#guided");
  for (const [label, value] of [["Equilibrium coordinate (m)", "0"], ["Local natural angular frequency (rad/s)", "4"], ["Exact force at one-half meter (N)", "-8"], ["All possible velocities at one-quarter meter (m/s)", "1"]]) await guided.getByLabel(label, { exact: true }).fill(value);
  await guided.getByLabel("No: the potential there exceeds total energy", { exact: true }).check();
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).not.toContainText("Correct. You have checked every part.");
  await guided.getByLabel("Exact force at one-half meter (N)", { exact: true }).fill("-9");
  await guided.getByLabel("All possible velocities at one-quarter meter (m/s)", { exact: true }).fill("-1,1");
  await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab = page.locator("#investigate");
  await predict(lab, .10648179284666152, "equal"); await expect(lab.getByRole("status")).toContainText("Revisit period comparison");
  await predict(lab); await expect(lab.getByRole("status")).toContainText("predictions agree");
  await expect(lab).toContainText("1.1384071 %"); await expect(lab).toContainText("0.43005792 %");
  await expect(lab).toContainText("1.5775517 s"); await expect(lab.getByRole("img")).toHaveCount(2);
  const drifts = await drift(lab); expect(drifts[1]).toBeLessThan(drifts[0] / 8); expect(drifts[1]).toBeGreaterThan(0);
  const steps = (await lab.getByRole("row", { name: /^Time step/ }).getByRole("cell").allTextContents()).map(Number); expect(steps[1] / steps[0]).toBeCloseTo(.5, 7);
  const probe = lab.getByRole("slider", { name: /^Pendulum time probe/ });
  await probe.focus(); await probe.press("ArrowRight"); await expect(probe).toHaveValue("1");
  await expect(lab.locator(".phs232-probe")).not.toContainText("Probe at 0 s:");
  await probe.press("End"); await expect(probe).toHaveValue("512");
  await expect(lab.locator(".phs232-probe")).toContainText("Probe at 6.2831853 s:");
  await probe.press("Home"); await expect(probe).toHaveValue("0"); await expect(lab.locator(".phs232-probe")).toContainText("θ=0.26179939 rad, θ̇=0 rad/s");
  await lab.getByText("All model states and both energy accounts", { exact: true }).click();
  const stateTable = lab.getByRole("region", { name: "Pendulum state table; scroll horizontally if needed", exact: true });
  await expect(stateTable).toContainText("513 states; page 1 of 9"); await expect(stateTable.getByRole("row")).toHaveCount(65);
  await lab.getByLabel("State table page", { exact: true }).selectOption("8"); await expect(stateTable.getByRole("row")).toHaveCount(2);
  await expect(stateTable.getByRole("rowheader", { name: "512", exact: true })).toBeVisible();
  await lab.getByLabel("State table resolution", { exact: true }).selectOption("coarse"); await expect(stateTable).toContainText("257 states; page 1 of 5");
  await lab.getByRole("button", { name: "Next state page", exact: true }).click(); await expect(stateTable).toContainText("page 2 of 5");
  await lab.getByText("All model states and both energy accounts", { exact: true }).click();
  await lab.getByText("Zero-crossing evidence", { exact: true }).click();
  await expect(lab.getByRole("region", { name: "Pendulum crossing table; scroll horizontally if needed", exact: true }).getByRole("cell", { name: "negative", exact: true })).toHaveCount(8);
  await lab.getByText("Pendulum investigation self-check rubric", { exact: true }).click(); await expect(lab).toContainText("does not award objective evidence or an official grade");
  for (const [name, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]] as const) {
    await page.setViewportSize(viewport); await page.emulateMedia({ reducedMotion: "reduce" });
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze(); expect(audit.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await lab.getByRole("img").first().evaluate(e => e.scrollIntoView({ block: "center" })); await page.screenshot({ path: info.outputPath(`energy-${name}-angles.png`) });
    await lab.getByRole("img").last().evaluate(e => e.scrollIntoView({ block: "center" })); await page.screenshot({ path: info.outputPath(`energy-${name}-energies.png`) });
    await lab.getByRole("region", { name: "Pendulum convergence table; scroll horizontally if needed", exact: true }).scrollIntoViewIfNeeded(); await page.screenshot({ path: info.outputPath(`energy-${name}-convergence.png`) });
  }
  expect(errors).toEqual([]);
});

test("pendulum distinguishes mass scaling, refinement, missing periods, equilibrium and invalid input", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(route); const lab = page.locator("#investigate"); await predict(lab);
  await lab.getByLabel("Point mass (kg)", { exact: true }).fill("1"); await expect(lab.getByRole("img")).toHaveCount(0);
  await predict(lab, 2 * .10648179284666152); await expect(lab.getByRole("status")).toContainText("predictions agree");
  await expect(lab).toContainText("0.21296359 J"); await expect(lab).toContainText("1.5775517 s");
  await lab.getByLabel("Coarse steps per small-angle period", { exact: true }).selectOption("32"); await predict(lab, 2 * .10648179284666152); const coarse = await drift(lab);
  await lab.getByLabel("Coarse steps per small-angle period", { exact: true }).selectOption("128"); await predict(lab, 2 * .10648179284666152); const refined = await drift(lab);
  expect(refined[0]).toBeLessThan(coarse[0] / 100); expect(refined[1]).toBeLessThan(refined[0]);
  await lab.getByLabel("Release angle (degrees)", { exact: true }).fill("170");
  await lab.getByLabel("Window length (small-angle natural periods)", { exact: true }).fill("1");
  const largeEnergy = 6.25 * (1 - Math.cos(170 * Math.PI / 180)); await predict(lab, largeEnergy);
  await expect(lab).toContainText("Insufficient window for a crossing-period estimate");
  await expect(lab.getByRole("row", { name: /^Nonlinear crossing period/ })).toContainText("not defined for this run");
  await lab.getByLabel("Window length (small-angle natural periods)", { exact: true }).fill("4"); await predict(lab, largeEnergy);
  await expect(lab).not.toContainText("Insufficient window"); await expect(lab.getByRole("row", { name: /^Nonlinear crossing period/ })).not.toContainText("not defined");
  await lab.getByLabel("Release angle (degrees)", { exact: true }).fill("0"); await predict(lab, 0, "stationary");
  await expect(lab.getByRole("status")).toContainText("predictions agree"); await expect(lab).toContainText("The state remains at equilibrium");
  expect(await drift(lab)).toEqual([0, 0]); await expect(lab.getByRole("row", { name: /^Maximum nonlinear relative energy drift/ })).toContainText("not defined");
  await lab.getByLabel("Predicted nonlinear release energy (J)", { exact: true }).fill("sqrt(-1)"); await lab.getByRole("button", { name: "Check pendulum predictions", exact: true }).click();
  await expect(lab.getByRole("status")).toContainText("finite real numbers"); await expect(lab.getByRole("img")).toHaveCount(0);
  for (const angle of ["0.01", "171"]) { await lab.getByLabel("Release angle (degrees)", { exact: true }).fill(angle); await lab.getByRole("button", { name: "Check pendulum predictions", exact: true }).click(); await expect(lab.getByRole("status")).toContainText("Use the labeled ranges"); }
  await lab.getByRole("button", { name: "Reset pendulum model", exact: true }).click();
  await lab.getByLabel("Point mass (kg)", { exact: true }).fill(""); await lab.getByRole("button", { name: "Check pendulum predictions", exact: true }).click(); await expect(lab.getByRole("status")).toContainText("empty input is not zero");
  await page.reload(); await expect(lab.getByLabel("Point mass (kg)", { exact: true })).toHaveValue("0.5"); await expect(lab.getByLabel("Release angle (degrees)", { exact: true })).toHaveValue("15");
  await lab.getByLabel("Window length (small-angle natural periods)", { exact: true }).fill("2.5"); await lab.getByRole("button", { name: "Check pendulum predictions", exact: true }).click(); await expect(lab.getByRole("status")).toContainText("integer window");
});

function checkpointAnswers(q: Question, i: number): Record<string, string> {
  const p = q.parameters;
  if (i === 0) {
    const stiffness = `${p.massNumerator}/4*${p.omega}^2`, amplitude = `${p.scale}/20`, position = `${p.positionIndex * p.scale}/100`;
    const response: Record<string, string> = { "required-kinetic": `(${stiffness})*((${amplitude})^2-(${position})^2)/2`, "maximum-speed": `${p.omega}*${amplitude}`, allowed: p.positionIndex <= 5 ? "yes" : "no" };
    if (p.positionIndex <= 5) response.speed = `${p.omega}*sqrt((${amplitude})^2-(${position})^2)`;
    return response;
  }
  if (i === 1) {
    const k = p.parallel ? `${p.k1}+${p.k2}` : `1/(1/${p.k1}+1/${p.k2})`;
    return { stiffness: k, omega: `sqrt((${k})*4/${p.massNumerator})`, force: `(${k})*${p.scale}/100`, energy: `(${k})*(${p.scale}/100)^2/2` };
  }
  if (i === 2) {
    const L = p.lengthNumerator / 5, m = p.massNumerator / 4, d = p.shape ? L : L / 2, Icm = m * L * L * (p.shape ? .5 : 1 / 12), I = Icm + m * d * d;
    return { distance: `${p.lengthNumerator}/${p.shape ? 5 : 10}`, inertia: `${p.massNumerator}/4*(${p.lengthNumerator}/5)^2*(${p.shape ? "3/2" : "1/3"})`, omega: p.shape ? `sqrt(2*${p.gravity}/(3*${p.lengthNumerator}/5))` : `sqrt(3*${p.gravity}/(2*${p.lengthNumerator}/5))`, period: String(2 * Math.PI * Math.sqrt(I / (m * p.gravity * d))) };
  }
  const a = p.angleDegrees * Math.PI / 180, h = Math.PI / 2000, f = (u: number) => 1 / Math.sqrt(1 - Math.sin(a / 2) ** 2 * Math.sin(u) ** 2);
  let sum = f(0) + f(Math.PI / 2);
  for (let j = 1; j < 1000; j++) sum += (j % 2 ? 4 : 2) * f(j * h);
  const force = 100 * (1 - Math.sin(a) / a), period = 100 * (2 / Math.PI * h * sum / 3 - 1);
  return { "force-error": String(force), "period-error": String(period), passes: force <= p.tolerance ? period <= p.tolerance ? "both" : "force" : period <= p.tolerance ? "period" : "neither" };
}

test("energy checkpoints resume and restore exact work, hints and notes without changing prior physics attempts", async ({ page }, info) => {
  test.setTimeout(180_000);
  const load = async (path: string) => lessonSchema.parse(JSON.parse(await readFile(new URL(path, import.meta.url), "utf8")));
  const lesson = await load("../../content/lessons/phs-232/m01-l02.json"), harmonic = await load("../../content/lessons/phs-232/m01-l01.json"), mechanics = await load("../../content/lessons/phs-231/m01-l01.json");
  const checkpoint = createAttempt(lesson, "checkpoint", "energy-retention"), practice = createAttempt(lesson, "practice", "energy-assisted");
  const previous = [createAttempt(harmonic, "practice", "energy-preserves-harmonic"), createAttempt(mechanics, "practice", "energy-preserves-mechanics")];
  await restoreProgress(page, { schemaVersion: 2, profile: { displayName: "", weeklyHours: 5 }, plan: [], bookmarks: [], notes: {}, confidence: {}, sessions: [], learning: { attempts: [...previous, checkpoint, practice], evidence: [], notes: { "phs-232": { "m01-l01": "Both initial conditions determine phase." } } } });
  await page.goto(route); const runner = page.locator("#practice");
  await runner.getByRole("button", { name: "Show a hint (0/3)", exact: true }).click(); await page.reload();
  await expect(runner.getByRole("button", { name: "Show a hint (1/3)", exact: true })).toBeVisible();
  await runner.getByRole("button", { name: "Checkpoint", exact: true }).click(); await expect(runner.getByRole("button", { name: /Show a hint/ })).toHaveCount(0);
  for (const [i, q] of checkpoint.questions.entries()) {
    const answer = checkpointAnswers(q, i);
    for (const field of q.fields) {
      if (field.kind === "choice") await runner.getByRole("group", { name: field.label, exact: true }).locator(`input[value="${answer[field.id]}"]`).check();
      else await runner.getByLabel(`${field.label}${field.unit ? ` (${field.unit})` : ""}`, { exact: true }).fill(answer[field.id]);
    }
    if (i === 1) { await page.reload(); await runner.getByRole("button", { name: "Checkpoint", exact: true }).click(); await expect(runner.getByLabel("Effective stiffness (N/m)", { exact: true })).toHaveValue(answer.stiffness); }
    await runner.getByRole("button", { name: i === 3 ? "Submit checkpoint" : "Next question", exact: true }).click();
  }
  await expect(runner.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
  const note = "At 15 degrees the force discrepancy is 1.138407% relative to linear force, while the period increase is 0.430058%. Refinement tests numerical drift separately.";
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true }).fill(note); await page.getByRole("button", { name: "Save lesson notes", exact: true }).click();
  await expect.poll(async () => (await readStoredProgress(page)).learning.notes["phs-232"]?.["m01-l02"]).toBe(note);
  await page.goto("/settings"); const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Export progress", exact: true }).click();
  const path = info.outputPath("energy-backup.json"); await (await download).saveAs(path); const backup = JSON.parse(await readFile(path, "utf8"));
  for (const prior of previous) expect(backup.learning.attempts.find((a: { id: string }) => a.id === prior.id)).toEqual(prior);
  expect(backup.learning.attempts.find((a: { id: string }) => a.id === checkpoint.id).questions).toEqual(checkpoint.questions);
  expect(backup.learning.evidence).toHaveLength(1); expect(backup.learning.evidence[0]).toMatchObject({ courseId: "phs-232", lessonId: "m01-l02", correct: 4 });
  await page.getByRole("button", { name: "Reset local progress", exact: true }).click(); await page.getByRole("button", { name: "Confirm reset", exact: true }).click(); await expect(page.getByText("Local progress has been reset.", { exact: true })).toBeVisible();
  await restoreProgress(page, backup); await page.goto(route); await runner.getByRole("button", { name: "Checkpoint", exact: true }).click();
  await expect(runner.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
  await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true })).toHaveValue(note);
  const restored = await readStoredProgress(page); for (const prior of previous) expect(restored.learning.attempts.find(a => a.id === prior.id)).toEqual(prior);
  expect(restored.learning.notes["phs-232"]["m01-l01"]).toBe("Both initial conditions determine phase.");
});

for (const viewport of [{ width: 320, height: 800 }, { width: 720, height: 500 }]) test.describe(`pendulum layout ${viewport.width}px`, () => {
  const scale = viewport.width === 720 ? 2 : 1; test.use({ viewport, deviceScaleFactor: scale });
  test("preserves keyboard focus, table access and reduced-motion reading", async ({ page }, info) => {
    test.setTimeout(120_000); await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto(route);
    expect(await page.evaluate(() => ({ width: innerWidth, scale: devicePixelRatio, reduced: matchMedia("(prefers-reduced-motion: reduce)").matches }))).toEqual({ width: viewport.width, scale, reduced: true });
    const lab = page.locator("#investigate"); await predict(lab); const probe = lab.getByRole("slider", { name: /^Pendulum time probe/ });
    await probe.focus(); await probe.press("ArrowRight"); await expect(probe).toHaveValue("1"); await probe.evaluate(e => e.scrollIntoView({ block: "center" }));
    const bounds = await probe.boundingBox(); expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width); expect(bounds!.y).toBeGreaterThanOrEqual(0); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    expect(await probe.evaluate(e => { const r = e.getBoundingClientRect(); return e === document.activeElement && e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`energy-reflow-${viewport.width}.png`) });
    await lab.getByText("All model states and both energy accounts", { exact: true }).click();
    const table = lab.getByRole("region", { name: "Pendulum state table; scroll horizontally if needed", exact: true }); await table.focus(); await table.press("ArrowRight");
    await expect.poll(() => table.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze(); expect(audit.violations).toEqual([]);
  });
});
