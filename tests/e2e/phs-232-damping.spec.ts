import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema, type Question } from "../../lib/learning/contracts";
import { readStoredProgress, restoreProgress } from "./progress";

const route = "/courses/phs-232/lessons/m01-l03";
async function predict(lab: Locator, beta = 1, energy = .08, regime = "underdamped") {
  await lab.getByLabel("Predicted beta (1/s)", { exact: true }).fill(String(beta));
  await lab.getByLabel("Predicted initial mechanical energy (J)", { exact: true }).fill(String(energy));
  await lab.getByLabel("Predicted damping regime", { exact: true }).selectOption(regime);
  const check = lab.getByRole("button", { name: "Check damping predictions", exact: true }); await check.focus(); await check.press("Enter");
}
async function residuals(lab: Locator) { return (await lab.getByRole("row", { name: /^Maximum \|E\+D−E0\|/ }).getByRole("cell").allTextContents()).map(Number); }

test("damping lesson corrects the initial constants and connects predictions to state, event and energy evidence", async ({ page }, info) => {
  test.setTimeout(180_000); await page.emulateMedia({ reducedMotion: "reduce" }); const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto(route); await expect(page.locator(".lesson-kicker")).toContainText("Course under construction");
  const guided = page.locator("#guided");
  for (const [label, value] of [["Constant C (m)", ".12"], ["Constant D (m/s)", "-.48"], ["Positive-time equilibrium crossing (s)", ".5"], ["Signed crossing velocity (m/s)", "0"], ["Initial mechanical energy (J)", ".144"]]) await guided.getByLabel(label, { exact: true }).fill(value);
  await guided.getByLabel("No crossing because critical damping always forbids overshoot", { exact: true }).check(); await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).not.toContainText("Correct. You have checked every part."); await expect(guided).toContainText("linear factor changes sign");
  await guided.getByLabel("Constant D (m/s)", { exact: true }).fill("-.24"); await guided.getByLabel("Signed crossing velocity (m/s)", { exact: true }).fill(String(-.24 / Math.E));
  await guided.getByLabel("One crossing, then decay on the other side without repeated oscillation", { exact: true }).check(); await guided.getByRole("button", { name: "Check guided work", exact: true }).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab = page.locator("#investigate"); await predict(lab, 1, .08, "critical"); await expect(lab.getByRole("status")).toContainText("Revisit damping regime");
  await predict(lab); await expect(lab.getByRole("status")).toContainText("predictions agree"); await expect(lab.getByRole("img")).toHaveCount(3);
  await expect(lab.locator(".phs232-probe")).toContainText("x=0.08 m; v=0 m/s; a=-2 m/s²"); await expect(lab.locator(".phs232-probe")).toContainText("Joint band: outside");
  const residual = await residuals(lab); expect(residual[1]).toBeGreaterThan(0); expect(residual[1]).toBeLessThan(residual[0] / 10);
  const probe = lab.getByRole("slider", { name: /^Damping time probe/ }); await probe.focus(); await probe.press("ArrowRight"); await expect(probe).toHaveValue("1");
  await probe.press("End"); await expect(probe).toHaveValue("256"); await expect(lab.locator(".phs232-probe")).toContainText("Joint band: inside"); await probe.press("Home"); await expect(probe).toHaveValue("0");
  await lab.getByText("All sampled states and energy transfers", { exact: true }).click(); const stateTable = lab.getByRole("region", { name: "Damping state table; scroll horizontally if needed", exact: true });
  await expect(stateTable).toContainText("257 states; page 1 of 5"); await expect(stateTable.getByRole("row")).toHaveCount(65);
  await lab.getByLabel("Damping table page", { exact: true }).selectOption("4"); await expect(stateTable.getByRole("row")).toHaveCount(2); await expect(stateTable.getByRole("rowheader", { name: "256", exact: true })).toBeVisible();
  await lab.getByLabel("Damping table resolution", { exact: true }).selectOption("coarse"); await expect(stateTable).toContainText("129 states; page 1 of 3");
  await lab.getByRole("button", { name: "Next damping table page", exact: true }).click(); await expect(stateTable).toContainText("page 2 of 3"); await lab.getByText("All sampled states and energy transfers", { exact: true }).click();
  await lab.getByText("Analytic crossing and extremum evidence", { exact: true }).click();
  const extrema = lab.getByRole("region", { name: "Damping extrema; scroll horizontally if needed", exact: true });
  const peakTimes = await extrema.getByRole("row").allTextContents(); expect(peakTimes[1]).toContain("maximum"); expect(peakTimes[1]).toContain("0.08");
  const firstMinimum = extrema.getByRole("row").nth(2); await expect(firstMinimum.getByRole("rowheader")).toHaveText("minimum"); expect(Number(await firstMinimum.getByRole("cell").first().textContent())).toBeCloseTo(Math.PI / Math.sqrt(24), 7);
  await lab.getByText("Damping investigation self-check rubric", { exact: true }).click(); await expect(lab).toContainText("does not award objective evidence");
  for (const [name, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]] as const) {
    await page.setViewportSize(viewport); const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze(); expect(audit.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const [i, label] of ["position", "phase", "energy"].entries()) { await lab.getByRole("img").nth(i).evaluate(e => e.scrollIntoView({ block: "center" })); await page.screenshot({ path: info.outputPath(`damping-${name}-${label}.png`) }); }
    await lab.getByRole("region", { name: "Damping evidence table; scroll horizontally if needed", exact: true }).scrollIntoViewIfNeeded(); await page.screenshot({ path: info.outputPath(`damping-${name}-evidence.png`) });
  }
  expect(errors).toEqual([]); await expect(page.locator(".katex-error")).toHaveCount(0);
});

test("damping comparison handles critical crossing, near-critical continuity, refinement, stationary and invalid states", async ({ page }) => {
  test.setTimeout(180_000); await page.goto(route); const lab = page.locator("#investigate"); await predict(lab);
  await lab.getByLabel("Damping ratio zeta", { exact: true }).fill("1"); await expect(lab.getByRole("img")).toHaveCount(0); await lab.getByLabel("Initial velocity (m/s)", { exact: true }).fill("-.8"); await predict(lab, 5, .4, "critical");
  await expect(lab.getByRole("status")).toContainText("predictions agree"); await expect(lab).toContainText("Repeated characteristic rate: −5 1/s");
  await lab.getByText("Analytic crossing and extremum evidence", { exact: true }).click();
  await expect(lab.getByRole("region", { name: "Damping zero times; scroll horizontally if needed", exact: true }).getByRole("cell", { name: "0.2", exact: true })).toBeVisible();
  await expect(lab.getByRole("region", { name: "Damping extrema; scroll horizontally if needed", exact: true }).getByRole("cell", { name: "0.4", exact: true })).toBeVisible();
  const positions: number[] = [];
  for (const zeta of [.9999, 1, 1.0001]) {
    await lab.getByLabel("Damping ratio zeta", { exact: true }).fill(String(zeta)); await predict(lab, 5 * zeta, .4, zeta < 1 ? "underdamped" : zeta === 1 ? "critical" : "overdamped");
    const probe = lab.getByRole("slider", { name: /^Damping time probe/ }); await probe.focus(); for (let i = 0; i < 10; i++) await probe.press("ArrowRight");
    const text = await lab.locator(".phs232-probe").textContent(); positions.push(Number(text!.match(/x=([^ ]+) m;/)![1]));
  }
  expect(Math.abs(positions[0] - positions[1])).toBeLessThan(.00001); expect(Math.abs(positions[2] - positions[1])).toBeLessThan(.00001);
  await lab.getByLabel("Initial velocity (m/s)", { exact: true }).fill("0"); await lab.getByLabel("Damping ratio zeta", { exact: true }).fill(".05"); await lab.getByLabel("Joint band fraction of the initial state scale", { exact: true }).fill(".2"); await lab.getByLabel("Window length (natural periods T0)", { exact: true }).fill("6"); await lab.getByLabel("Coarse intervals across the window", { exact: true }).selectOption("64"); await predict(lab, .25);
  const entry = (await lab.getByRole("row", { name: /^First sampled entry/ }).getByRole("cell").allTextContents()).map(v => Number(v.split(" ")[0]));
  const suffix = (await lab.getByRole("row", { name: /^Start of final/ }).getByRole("cell").allTextContents()).map(v => Number(v.split(" ")[0])); expect(suffix[1]).toBeGreaterThan(entry[1]);
  const before = await residuals(lab); await lab.getByLabel("Coarse intervals across the window", { exact: true }).selectOption("256"); await predict(lab, .25); expect((await residuals(lab))[0]).toBeLessThan(before[0] / 100);
  await lab.getByLabel("Damping ratio zeta", { exact: true }).fill("0"); await predict(lab, 0, .08, "undamped"); for (const residual of await residuals(lab)) expect(residual).toBeLessThan(1e-14);
  await expect(lab.getByRole("row", { name: /^Start of final/ })).toContainText("not reached in this window");
  await lab.getByLabel("Initial position (m)", { exact: true }).fill("0"); await predict(lab, 0, 0, "undamped"); await expect(lab).toContainText("Both initial coordinates are zero");
  await lab.getByText("Analytic crossing and extremum evidence", { exact: true }).click(); await expect(lab).toContainText("Displacement is zero continuously"); await expect(lab).toContainText("No isolated extremum occurs");
  await lab.getByLabel("Predicted beta (1/s)", { exact: true }).fill("sqrt(-1)"); await lab.getByRole("button", { name: "Check damping predictions", exact: true }).click(); await expect(lab.getByRole("status")).toContainText("finite real numbers"); await expect(lab.getByRole("img")).toHaveCount(0);
  for (const [label, value] of [["Damping ratio zeta", "3.01"], ["Damping ratio zeta", "-1"], ["Initial position (m)", ".0000001"]]) {
    await lab.getByRole("button", { name: "Reset damping model", exact: true }).click(); await lab.getByLabel(label, { exact: true }).fill(value); await lab.getByRole("button", { name: "Check damping predictions", exact: true }).click(); await expect(lab.getByRole("status")).toContainText("labeled input ranges");
  }
  await lab.getByRole("button", { name: "Reset damping model", exact: true }).click(); await lab.getByLabel("Mass (kg)", { exact: true }).fill(""); await lab.getByRole("button", { name: "Check damping predictions", exact: true }).click(); await expect(lab.getByRole("status")).toContainText("empty input is not zero");
  await page.reload(); await expect(lab.getByLabel("Damping ratio zeta", { exact: true })).toHaveValue("0.2"); await expect(lab.getByLabel("Initial position (m)", { exact: true })).toHaveValue("0.08"); await expect(lab.getByRole("img")).toHaveCount(0);
});

function checkpointAnswers(q: Question, i: number): Record<string, string> {
  const p = q.parameters, s = p.scale;
  if (i === 0) {
    const cNumerator = p.sx * p.a, vNumerator = p.mode === 0 ? 0 : p.mode === 1 ? -s * cNumerator : p.sv * p.c * s, dNumerator = vNumerator + s * cNumerator;
    const C = cNumerator / 20, D = dNumerator / 20, time = p.timeIndex / s;
    return { c: `${cNumerator}/20`, d: `${dNumerator}/20`, position: ((C + D * time) * Math.exp(-s * time)).toFixed(12), velocity: ((D - s * (C + D * time)) * Math.exp(-s * time)).toFixed(12), crossing: cNumerator * dNumerator < 0 ? "yes" : "no" };
  }
  if (i === 1) {
    const slow = p.mode === 2 ? 0 : p.sx * p.a / 100, fast = p.mode === 1 ? 0 : p.sv * p.c / 100, time = p.timeIndex / s;
    return { rates: `${-4 * s},${-s}`, slow: String(slow), fast: String(fast), position: (slow * Math.exp(-s * time) + fast * Math.exp(-4 * s * time)).toFixed(12), velocity: (-s * slow * Math.exp(-s * time) - 4 * s * fast * Math.exp(-4 * s * time)).toFixed(12) };
  }
  if (i === 2) {
    const ratio = 2 ** p.ratioPower, beta = Math.log(ratio) / p.elapsed, w = 2 * Math.PI * p.cycles / p.elapsed;
    return { beta: `ln(${ratio})/${p.elapsed}`, decrement: `ln(${ratio})/${p.cycles}`, frequency: `2*pi*${p.cycles}/${p.elapsed}`, natural: String(Math.sqrt(w * w + beta * beta)), coefficient: `${p.massNumerator}*ln(${ratio})/${p.elapsed}` };
  }
  if (q.figure?.kind !== "data-table") throw Error("Missing checkpoint data table");
  const rows = q.figure.rows, inside = rows.map(row => Math.abs(Number(row[1])) <= p.bandNumerator / 10 && Math.abs(Number(row[2])) <= p.bandNumerator / 10);
  return { first: rows[inside.indexOf(true)][0], suffix: rows[inside.lastIndexOf(false) + 1][0], outside: String(inside.filter(value => !value).length), inference: "record" };
}

test("damping resumes and restores exact question tables, hints, checkpoint answers and notes alongside previous physics work", async ({ page }, info) => {
  test.setTimeout(180_000); await page.emulateMedia({ reducedMotion: "reduce" });
  const load = async (path: string) => lessonSchema.parse(JSON.parse(await readFile(new URL(path, import.meta.url), "utf8")));
  const lesson = await load("../../content/lessons/phs-232/m01-l03.json"), energy = await load("../../content/lessons/phs-232/m01-l02.json"), mechanics = await load("../../content/lessons/phs-231/m01-l01.json");
  const checkpoint = createAttempt(lesson, "checkpoint", "damping-retention"), practice = createAttempt(lesson, "practice", "damping-assisted"); practice.position = 10;
  const previous = [createAttempt(energy, "practice", "damping-preserves-energy"), createAttempt(mechanics, "practice", "damping-preserves-mechanics")];
  await restoreProgress(page, { schemaVersion: 2, profile: { displayName: "", weeklyHours: 5 }, plan: [], bookmarks: [], notes: {}, confidence: {}, sessions: [], learning: { attempts: [...previous, checkpoint, practice], evidence: [], notes: { "phs-232": { "m01-l02": "Check model discrepancy separately from numerical drift." } } } });
  await page.goto(route); const runner = page.locator("#practice");
  const table = runner.getByRole("table", { name: "Finite sampled state record", exact: true }); const originalTable = await table.innerText(); await expect(table.getByRole("row")).toHaveCount(12);
  await runner.getByRole("button", { name: "Show a hint (0/3)", exact: true }).click(); await page.reload(); await expect(runner.getByRole("button", { name: "Show a hint (1/3)", exact: true })).toBeVisible(); expect(await table.innerText()).toBe(originalTable);
  await page.setViewportSize({ width: 320, height: 800 }); const tableRegion = runner.getByRole("region", { name: "Finite sampled state record: scrollable table", exact: true }); await tableRegion.focus(); await tableRegion.press("ArrowRight"); await expect.poll(() => tableRegion.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
  expect(await table.evaluate(e => Array.from(e.querySelectorAll("td")).every(cell => { const range = document.createRange(); range.selectNodeContents(cell); return range.getClientRects().length === 1; }))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await tableRegion.evaluate(e => e.scrollIntoView({ block: "center" })); await page.screenshot({ path: info.outputPath("damping-question-table-mobile.png") });
  const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze(); expect(audit.violations).toEqual([]); await page.setViewportSize({ width: 1280, height: 900 });
  await runner.getByRole("button", { name: "Checkpoint", exact: true }).click(); await expect(runner.getByRole("button", { name: /Show a hint/ })).toHaveCount(0);
  for (const [i, q] of checkpoint.questions.entries()) {
    const answer = checkpointAnswers(q, i);
    for (const field of q.fields) {
      if (field.kind === "choice") await runner.getByRole("group", { name: field.label, exact: true }).locator(`input[value="${answer[field.id]}"]`).check();
      else if ("unit" in field) await runner.getByLabel(`${field.label}${field.unit ? ` (${field.unit})` : ""}`, { exact: true }).fill(answer[field.id]);
    }
    if (i === 1) { await page.reload(); await runner.getByRole("button", { name: "Checkpoint", exact: true }).click(); await expect(runner.getByLabel("Both real characteristic rates (1/s)", { exact: true })).toHaveValue(answer.rates); }
    if (i === 3) await expect(runner.getByRole("table", { name: "Finite sampled state record", exact: true }).getByRole("row")).toHaveCount(12);
    await runner.getByRole("button", { name: i === 3 ? "Submit checkpoint" : "Next question", exact: true }).click();
  }
  await expect(runner.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
  const note = "Critical crossing: m=1 kg, k=25 N/m, zeta=1, x0=.08 m, v0=-.8 m/s; x=(.08-.4t) exp(-5t) crosses at .2 s. A final passing sample sequence is not a permanent-containment proof.";
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true }).fill(note); await page.getByRole("button", { name: "Save lesson notes", exact: true }).click(); await expect.poll(async () => (await readStoredProgress(page)).learning.notes["phs-232"]?.["m01-l03"]).toBe(note);
  await page.goto("/settings"); const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Export progress", exact: true }).click(); const path = info.outputPath("damping-backup.json"); await (await download).saveAs(path); const backup = JSON.parse(await readFile(path, "utf8"));
  for (const prior of previous) expect(backup.learning.attempts.find((a: { id: string }) => a.id === prior.id)).toEqual(prior);
  expect(backup.learning.attempts.find((a: { id: string }) => a.id === checkpoint.id).questions).toEqual(checkpoint.questions); expect(backup.learning.evidence[0]).toMatchObject({ courseId: "phs-232", lessonId: "m01-l03", correct: 4 });
  await page.getByRole("button", { name: "Reset local progress", exact: true }).click(); await page.getByRole("button", { name: "Confirm reset", exact: true }).click(); await expect(page.getByText("Local progress has been reset.", { exact: true })).toBeVisible();
  await restoreProgress(page, backup); await page.goto(route); await runner.getByRole("button", { name: "Checkpoint", exact: true }).click(); await expect(runner.getByRole("heading", { name: "Objective demonstrated", exact: true })).toBeVisible();
  await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit", { exact: true })).toHaveValue(note);
  const restored = await readStoredProgress(page); expect(restored).toEqual(backup);
  await runner.getByRole("button", { name: "Practice", exact: true }).click(); await expect(runner.getByRole("button", { name: "Show a hint (1/3)", exact: true })).toBeVisible(); expect(await table.innerText()).toBe(originalTable);
});

for (const viewport of [{ width: 320, height: 800 }, { width: 720, height: 500 }]) test.describe(`damping layout ${viewport.width}px`, () => {
  const scale = viewport.width === 720 ? 2 : 1; test.use({ viewport, deviceScaleFactor: scale });
  test("preserves keyboard focus, all state-table pages and reduced-motion reading", async ({ page }, info) => {
    test.setTimeout(120_000); await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto(route); const lab = page.locator("#investigate"); await predict(lab);
    expect(await page.evaluate(() => ({ width: innerWidth, scale: devicePixelRatio, reduced: matchMedia("(prefers-reduced-motion: reduce)").matches }))).toEqual({ width: viewport.width, scale, reduced: true });
    const probe = lab.getByRole("slider", { name: /^Damping time probe/ }); await probe.focus(); await probe.press("ArrowRight"); await expect(probe).toHaveValue("1"); await probe.evaluate(e => e.scrollIntoView({ block: "center" }));
    const bounds = await probe.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width); expect(bounds!.y).toBeGreaterThanOrEqual(0); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    expect(await probe.evaluate(e => { const r = e.getBoundingClientRect(); return e === document.activeElement && e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: info.outputPath(`damping-reflow-${viewport.width}.png`) });
    await lab.getByText("All sampled states and energy transfers", { exact: true }).click(); const table = lab.getByRole("region", { name: "Damping state table; scroll horizontally if needed", exact: true }); await table.focus(); await table.press("ArrowRight"); await expect.poll(() => table.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze(); expect(audit.violations).toEqual([]);
  });
});
