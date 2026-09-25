import { expect, it } from "vitest";
import content from "../content/lessons/phs-232/m01-l04.json";
import { lessonSchema } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { drivenModel, drivenResponse, drivenRun, drivenState } from "../lib/learning/phs-232-driven";

function integrate(k: number, b: number, force: number, omega: number, x: number, v: number, duration: number) {
  let y = [x, v, 0, 0]; const n = 16384, h = duration / n;
  const rate = (t: number, s: number[]) => { const F = force * Math.cos(omega * t); return [s[1], F - b * s[1] - k * s[0], F * s[1], b * s[1] * s[1]]; };
  for (let i = 0; i < n; i++) {
    const t = i * h, a = rate(t, y), c = rate(t + h / 2, y.map((s, j) => s + h * a[j] / 2)), d = rate(t + h / 2, y.map((s, j) => s + h * c[j] / 2)), e = rate(t + h, y.map((s, j) => s + h * d[j]));
    y = y.map((s, j) => s + h * (a[j] + 2 * c[j] + 2 * d[j] + e[j]) / 6);
  }
  return { x: y[0], v: y[1], work: y[2], loss: y[3], energy: (y[1] ** 2 + k * y[0] ** 2) / 2 };
}

it("checks the guided coefficients, phase, mean power and initial correction by independent force and cycle accounts", () => {
  const q = lessonSchema.parse(content).guided.question, p = q.parameters, R = p.stiffness - p.mass * p.omega ** 2, I = p.dampingCoefficient * p.omega;
  const C = p.force * R / (R * R + I * I), D = p.force * I / (R * R + I * I), A = Math.hypot(C, D), phase = Math.acos(C / A);
  const response = { cosine: "9/(9^2+24^2)", sine: "24/(9^2+24^2)", amplitude: "sqrt(9^2+24^2)/(9^2+24^2)", lag: phase.toFixed(12), power: "6*4^2/(2*(9^2+24^2))", peak: "sqrt(25-2*(6/2)^2)", startup: "correction" };
  expect(gradeQuestion(q, response).correct).toBe(true);
  const period = 2 * Math.PI / p.omega, after = integrate(25, 6, 1, 4, C, 4 * D, period);
  expect(after.x).toBeCloseTo(C, 11); expect(after.v).toBeCloseTo(4 * D, 11);
  expect(after.work / period).toBeCloseTo(16 / 219, 11); expect(after.loss).toBeCloseTo(after.work, 11);
  for (const wrong of [{ cosine: "-1/73" }, { sine: "-8/219" }, { amplitude: "1/25" }, { lag: String(-phase) }, { power: "0" }, { peak: "4" }, { peak: "5" }, { startup: "already" }, { startup: "resonant" }]) expect(gradeQuestion(q, { ...response, ...wrong }).correct).toBe(false);
});

it("verifies the worked startup cycle's printed state, work, loss and stored energy with a separate ODE integration", () => {
  const first = integrate(4, 1, .2, 2, 0, 0, Math.PI), printed = content.examples[8].steps.map(s => s.math).join(" ");
  for (const value of [first.x, first.v, first.energy, first.work, first.loss, first.work / Math.PI]) expect(printed).toContain(value.toFixed(12));
  expect(first.work - first.loss).toBeCloseTo(first.energy, 12);
  expect(first.work).toBeLessThan(.02 * Math.PI); expect(Math.abs(first.work - first.loss)).toBeGreaterThan(.01);
  const periodic = integrate(4, 1, .2, 2, 0, .2, Math.PI);
  expect(periodic.energy).toBeCloseTo(.02, 12); expect(periodic.work).toBeCloseTo(.02 * Math.PI, 11); expect(periodic.loss).toBeCloseTo(periodic.work, 11);
  for (const time of [.1, .4, 1.3, 2.7]) {
    const state = integrate(4, 1, .2, 2, 0, 0, time);
    const x = .1 * Math.sin(2 * time) - .4 / Math.sqrt(15) * Math.exp(-time / 2) * Math.sin(Math.sqrt(15) * time / 2);
    expect(state.x).toBeCloseTo(x, 12);
  }
});

it("checks the authored phase, peak, negative-power, bandwidth and limiting examples", () => {
  const below = integrate(4, 1, .2, 1, .06, .02, Math.PI / 4);
  expect(.2 * Math.cos(Math.PI / 4) * below.v).toBeCloseTo(-.004, 12); expect(below.v ** 2).toBeCloseTo(.0008, 12);
  const above = drivenResponse(drivenModel({ mass: 1, stiffness: 4, dampingRatio: .25, force: .2, frequencyRatio: 1.5, position: 0, velocity: 0 }));
  expect(above.cosine).toBeCloseTo(-1 / 34, 14); expect(above.sine).toBeCloseTo(3 / 170, 14);
  expect(content.examples[1].steps.map(s => s.math).join(" ")).toContain(above.lag!.toFixed(9));
  const amplitude = (omega: number, b: number) => 1 / Math.hypot(25 - omega ** 2, b * omega);
  expect(amplitude(Math.sqrt(7), 6)).toBeCloseTo(1 / 24, 14); expect(amplitude(5, 6)).toBeCloseTo(1 / 30, 14);
  for (const omega of [.01, .1, 1, 5, 20]) expect(amplitude(omega, 8)).toBeLessThan(1 / 25);
  const roots = [Math.sqrt(34) - 3, Math.sqrt(34) + 3];
  for (const omega of roots) expect(6 * (omega * amplitude(omega, 6)) ** 2 / 2).toBeCloseTo(1 / 24, 13);
  expect(roots[1] - roots[0]).toBe(6); expect(roots[1] * roots[0]).toBeCloseTo(25, 13);
  const staticState = integrate(4, 4, .8, 0, 0, 0, .5);
  expect(content.examples[10].steps[2].math).toContain(staticState.x.toFixed(9)); expect(content.examples[10].steps[2].math).toContain(staticState.v.toFixed(9));
  const resonant = integrate(4, 0, .2, 2, 0, 0, Math.PI / 4); expect(resonant.x).toBeCloseTo(Math.PI / 80, 12); expect(resonant.v).toBeCloseTo(.05, 12);
  const crossing = integrate(4, 0, .2, 2, 0, 0, Math.PI / 2); expect(Math.abs(crossing.x)).toBeLessThan(1e-12); expect(crossing.v).toBeCloseTo(-Math.PI / 20, 12);
  const near = integrate(4, 0, .2, 2.0000002, 0, 0, 1); expect(content.examples[12].steps[3].math).toContain(near.x.toFixed(12));
  expect(content.examples[13].steps[0].math).toContain((.2 / Math.hypot(4 - 400, 20)).toFixed(12));
});

it("checks the proposed investigation defaults, real short-window limits and strict invalid activity rejection", () => {
  const lesson = lessonSchema.parse(content); if (lesson.interaction.kind !== "phs232-driven") throw Error("Wrong activity");
  const run = drivenRun(lesson.interaction.initial);
  expect(run.model.omega0).toBe(5); expect(run.model.b).toBe(2); expect(run.response.amplitude).toBeCloseTo(1 / Math.sqrt(145), 13);
  expect(run.peaks.displacementRatio).toBeCloseTo(Math.sqrt(23) / 5, 13); expect(run.response.lag).toBeCloseTo(Math.acos(9 / Math.sqrt(145)), 13);
  expect(run.cycle).not.toBeNull();
  const short = drivenRun({ ...lesson.interaction.initial, frequencyRatio: .25, cycles: .25 }); expect(short.cycle).toBeNull();
  const resonant = drivenModel({ mass: 1, stiffness: 25, dampingRatio: 0, force: 1, frequencyRatio: 1, position: 0, velocity: 0 });
  expect(drivenState(resonant, Math.PI / 10).position).toBeCloseTo(Math.PI / 100, 12);
  for (const change of [{ mass: 0 }, { force: -1 }, { dampingRatio: 1e-9 }, { frequencyRatio: 5 }, { cycles: 13 }, { intervals: 65 }]) expect(lessonSchema.safeParse({ ...content, interaction: { ...content.interaction, initial: { ...content.interaction.initial, ...change } } }).success).toBe(false);
});
