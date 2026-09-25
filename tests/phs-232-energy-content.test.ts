import { expect, it } from "vitest";
import content from "../content/lessons/phs-232/m01-l02.json";
import { lessonSchema } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import { pendulumRun } from "../lib/learning/phs-232-oscillator-energy";

it("checks the guided nonlinear state using work and rejects the missing root, linear-force substitution and inadmissible position", () => {
  const q = lessonSchema.parse(content).guided.question;
  let work = 0;
  const n = 1000, h = .25 / n;
  for (let i = 0; i <= n; i++) {
    const x = i * h;
    work += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * (16 * x + 8 * x ** 3) * h / 3;
  }
  expect(129 / 128 - work).toBeCloseTo(.5, 13);
  const response = { equilibrium: "0", omega: "4", force: "-9", velocities: "1,-1", reachable: "no" };
  expect(gradeQuestion(q, response).correct).toBe(true);
  for (const wrong of [{ equilibrium: "1/4" }, { omega: "16" }, { force: "-8" }, { force: "9" }, { velocities: "1" }, { velocities: "-1" }, { velocities: "-1,1,0" }, { reachable: "yes" }, { reachable: "unknown" }]) expect(gradeQuestion(q, { ...response, ...wrong }).correct).toBe(false);
});

it("checks the lesson's pendulum numerical examples and separates zero amplitude from an insufficient observation window", () => {
  const run = pendulumRun({ mass: .5, length: .625, gravity: 10, amplitudeDegrees: 15, cycles: 4, stepsPerPeriod: 64 });
  expect(run.model.initialEnergy).toBeCloseTo(.10648179284666152, 13);
  expect(run.model.initialLinearEnergy).toBeCloseTo(.10709206164376472, 13);
  expect(run.model.referencePeriod).toBeCloseTo(1.5775516607636664, 12);
  expect(run.model.forceDifferenceRelativeToLinearPercent).toBeGreaterThan(1);
  expect(run.model.periodIncreasePercent).toBeLessThan(1);
  const short = pendulumRun({ mass: .5, length: .625, gravity: 10, amplitudeDegrees: 170, cycles: 1, stepsPerPeriod: 64 });
  expect(short.fine.falling).toHaveLength(1); expect(short.fine.periodEstimate).toBeNull();
  expect(short.fine.falling[0].time / short.model.linearPeriod).toBeCloseTo(.60984068, 6);
  expect(short.model.referencePeriod).not.toBeNull();
  const stationary = pendulumRun({ mass: .5, length: .625, gravity: 10, amplitudeDegrees: 0, cycles: 4, stepsPerPeriod: 64 });
  expect(stationary.fine.crossings).toEqual([]); expect(stationary.model.referencePeriod).toBeNull();
  expect(stationary.fine.relativeEnergyDrift).toBeNull(); expect(stationary.fine.energyDrift).toBe(0);
  expect(stationary.model.linearPeriod).toBeCloseTo(Math.PI / 2, 14);
});

it("checks the worked spring and potential accounts through independent numerical state and gradient fixtures", () => {
  const U = (y: number) => 4 * y * y - 5 * y;
  expect(U(.675)).toBeCloseTo(-1.5525, 12);
  expect(U(.675) - U(.625)).toBeCloseTo(.01, 12);
  const force = .24, displacements = [force / 12, force / 4];
  expect(displacements.reduce((sum, x) => sum + x, 0)).toBeCloseTo(.08, 14);
  expect(displacements.reduce((sum, x, i) => sum + [12, 4][i] * x * x / 2, 0)).toBeCloseTo(.0096, 14);
  const potential = (x: number) => 3 + 8 * x * x + 2 * x ** 4, step = 1e-5;
  for (const [x, force] of [[.1, -1.608], [.5, -9]]) expect(-(potential(x + step) - potential(x - step)) / (2 * step)).toBeCloseTo(force, 7);
  const fixture = { ...content, interaction: { ...content.interaction, initial: { ...content.interaction.initial, amplitudeDegrees: .01 } } };
  expect(lessonSchema.safeParse(fixture).success).toBe(false);
});
