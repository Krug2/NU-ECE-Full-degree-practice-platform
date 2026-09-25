import { expect, it } from "vitest";
import content from "../content/lessons/phs-232/m01-l03.json";
import { lessonSchema } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { dampingModel, dampingState, dampingEvents, dampingRun } from "../lib/learning/phs-232-damping";

function integrate(x: number, v: number, stiffness: number, damping: number, time: number) {
  const h = time / 16384;
  for (let i = 0; i < 16384; i++) {
    const a1 = -stiffness * x - damping * v, v2 = v + h * a1 / 2, a2 = -stiffness * (x + h * v / 2) - damping * v2;
    const v3 = v + h * a2 / 2, a3 = -stiffness * (x + h * v2 / 2) - damping * v3, v4 = v + h * a3, a4 = -stiffness * (x + h * v3) - damping * v4;
    x += h * (v + 2 * v2 + 2 * v3 + v4) / 6; v += h * (a1 + 2 * a2 + 2 * a3 + a4) / 6;
  }
  return { x, v };
}

it("checks the guided critical crossing by independently integrated motion and rejects the no-overshoot and spring-only errors", () => {
  const q = lessonSchema.parse(content).guided.question, state = integrate(.12, -.48, 4, 4, .5);
  expect(Math.abs(state.x)).toBeLessThan(1e-13);
  const response = { c: "12/100", d: "-24/100", crossing: "1/2", velocity: state.v.toFixed(12), energy: "1/2*(48/100)^2+2*(12/100)^2", behavior: "single" };
  expect(gradeQuestion(q, response).correct).toBe(true);
  for (const wrong of [{ c: "-.12" }, { d: "-.48" }, { crossing: "-.5" }, { velocity: "0" }, { velocity: String(-state.v) }, { energy: ".0288" }, { behavior: "none" }, { behavior: "periodic" }]) expect(gradeQuestion(q, { ...response, ...wrong }).correct).toBe(false);
  const turning = integrate(.12, -.48, 4, 4, 1); expect(turning.x).toBeLessThan(0); expect(Math.abs(turning.v)).toBeLessThan(1e-13);
});

it("verifies the authored underdamped state, true events and phase-dependent energy independently", () => {
  const state = integrate(.08, 0, 25, 6, Math.PI / 8);
  expect(state.x).toBeCloseTo(.01847183827970994, 12); expect(state.v).toBeCloseTo(-.1539319856642495, 12);
  expect(-25 * state.x - 6 * state.v).toBeCloseTo(.46179595699274856, 11);
  const E = state.v * state.v / 2 + 25 * state.x * state.x / 2;
  expect(E).toBeCloseTo(.016112638223166328, 12); expect(E / (.08 * Math.exp(-6 * Math.PI / 8))).toBeCloseTo(17 / 8, 11);
  const zeroTime = .5535743588970452; expect(Math.abs(integrate(.08, 0, 25, 6, zeroTime).x)).toBeLessThan(1e-12);
  const nextPeak = integrate(.08, 0, 25, 6, Math.PI / 2); expect(nextPeak.x).toBeCloseTo(.0007186632816903543, 12); expect(Math.abs(nextPeak.v)).toBeLessThan(1e-12);
  const phaseModel = dampingModel({ mass: 1, stiffness: 25, dampingRatio: .6, position: .03, velocity: -.21 });
  expect(phaseModel.displacementEnvelope).toBeCloseTo(.03 * Math.sqrt(2), 14);
  for (const t of [.1, .7, 1.3]) expect(dampingState(phaseModel, t).position).toBeCloseTo(.03 * Math.sqrt(2) * Math.exp(-3 * t) * Math.cos(4 * t + Math.PI / 4), 14);
});

it("verifies the critical and overdamped examples, including a missing slow mode and directed crossing", () => {
  const release = integrate(.08, 0, 25, 10, .2); expect(release.x).toBeCloseTo(.16 / Math.E, 13); expect(release.v).toBeCloseTo(-.4 / Math.E, 13);
  const cross = dampingModel({ mass: 1, stiffness: 25, dampingRatio: 1, position: .08, velocity: -.8 }), events = dampingEvents(cross, 1);
  expect(events.zeros.times[0]).toBeCloseTo(.2, 14); expect(events.peaks[0].time).toBeCloseTo(.4, 14); expect(events.peaks[0].kind).toBe("minimum");
  const oracle = integrate(.08, -.8, 25, 10, .4); expect(oracle.x).toBeCloseTo(-.08 * Math.exp(-2), 13); expect(Math.abs(oracle.v)).toBeLessThan(1e-13);
  for (const t of [.2, 1, 3]) {
    const slow = integrate(.08, 0, 4, 5, t), fast = integrate(.08, -.32, 4, 5, t);
    expect(slow.x).toBeCloseTo((8 * Math.exp(-t) - 2 * Math.exp(-4 * t)) / 75, 13); expect(slow.v).toBeLessThan(0);
    expect(fast.x).toBeCloseTo(.08 * Math.exp(-4 * t), 13); expect(fast.v).toBeCloseTo(-.32 * Math.exp(-4 * t), 13);
  }
});

it("checks the fit, measurement bounds and future containment claims without assuming finite samples prove them", () => {
  const beta = Math.log(.08 / .02) / 6, wd = 2 * Math.PI / 2;
  expect(Math.sqrt(wd * wd + beta * beta)).toBeCloseTo(3.150077470365212, 12); expect(Math.log(2) / beta).toBeCloseTo(3, 14);
  const lowerFirst = (80 - 1) / (40 + 1), upperLast = (40 + 1) / (30 - 1); expect(lowerFirst).toBeGreaterThan(upperLast);
  const threshold = Math.min(25 * .004 ** 2 / 2, .02 ** 2 / 2); expect(threshold).toBeCloseTo(.0002, 14);
  expect(Math.sqrt(2 * .00015 / 25)).toBeLessThan(.004); expect(Math.sqrt(2 * .00015)).toBeLessThan(.02);
  const run = dampingRun({ mass: 1, stiffness: 25, dampingRatio: .05, position: .08, velocity: 0, cycles: 6, intervals: 64, bandFraction: .2 });
  expect(run.fine.firstInBand).not.toBeNull(); expect(run.fine.sampledRemainderSince).toBeGreaterThan(run.fine.firstInBand!); expect(run.energySufficientSince).toBeGreaterThan(run.fine.firstInBand!);
  for (const t of [run.energySufficientSince!, 9, 12, 25]) { const state = integrate(.08, 0, 25, .5, t); expect(Math.abs(state.x)).toBeLessThanOrEqual(run.positionBand + 1e-11); expect(Math.abs(state.v)).toBeLessThanOrEqual(run.velocityBand + 1e-11); }
  expect(lessonSchema.safeParse({ ...content, interaction: { ...content.interaction, initial: { ...content.interaction.initial, dampingRatio: -1 } } }).success).toBe(false);
});
