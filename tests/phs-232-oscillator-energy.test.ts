import { expect, it } from "vitest";
import { pendulumInputSchema, pendulumModel, pendulumModelSchema, pendulumRun } from "../lib/learning/phs-232-oscillator-energy";

function energyPeriod(amplitude: number, length: number, gravity: number) {
  const k = Math.sin(amplitude / 2), divisions = 4000, h = Math.PI / 2 / divisions;
  let area = 0;
  for (let index = 0; index <= divisions; index++) {
    const value = 1 / Math.sqrt(1 - k * k * Math.sin(index * h) ** 2);
    area += (index === 0 || index === divisions ? 1 : index % 2 ? 4 : 2) * value;
  }
  return 4 * Math.sqrt(length / gravity) * h * area / 3;
}

it("checks the pendulum reference period against independent energy quadrature across 50 amplitudes", () => {
  for (let seed = 0; seed < 50; seed++) {
    const mass = .1 + seed % 10 / 5, length = .2 + seed % 20 / 5, gravity = .5 + seed % 30 / 2, amplitudeDegrees = .1 + 169.9 * seed / 49;
    const model = pendulumModel({ mass, length, gravity, amplitudeDegrees }), period = energyPeriod(model.amplitude, length, gravity);
    expect(model.referencePeriod! / period).toBeCloseTo(1, 11);
    expect(model.initialEnergy).toBeCloseTo(mass * gravity * length * (1 - Math.cos(model.amplitude)), 11);
    let sine = model.amplitude, term = sine;
    for (let n = 1; n < 25; n++) { term *= -(model.amplitude ** 2) / ((2 * n) * (2 * n + 1)); sine += term; }
    expect(model.forceDifferenceRelativeToLinearPercent).toBeCloseTo(100 * (model.amplitude - sine) / model.amplitude, 10);
    const doubledMass = pendulumModel({ mass: 2 * mass, length, gravity, amplitudeDegrees });
    expect(doubledMass.referencePeriod).toBe(model.referencePeriod); expect(doubledMass.initialEnergy).toBeCloseTo(2 * model.initialEnergy, 11);
  }
});

it("compares 50 simulated trajectories with an independent velocity-Verlet integration and checks refinement", () => {
  for (let seed = 0; seed < 50; seed++) {
    const input = { mass: .1 + seed % 8 / 4, length: .2 + seed % 17 / 4, gravity: .5 + seed % 30 / 2, amplitudeDegrees: .1 + 169.9 * seed / 49, cycles: 4, stepsPerPeriod: 64 as const };
    const run = pendulumRun(input), model = run.model, h = model.linearPeriod / 16384;
    let theta = model.amplitude, velocity = 0, acceleration = -input.gravity / input.length * Math.sin(theta), coarseError = 0, fineError = 0;
    for (let step = 1; step <= 4 * 16384; step++) {
      const nextAngle = theta + h * velocity + h * h * acceleration / 2, nextAcceleration = -input.gravity / input.length * Math.sin(nextAngle);
      velocity += h * (acceleration + nextAcceleration) / 2; theta = nextAngle; acceleration = nextAcceleration;
      if (step % 256 === 0) {
        const index = step / 256, coarse = run.coarse.states[index], fine = run.fine.states[2 * index];
        coarseError = Math.max(coarseError, Math.abs(coarse.angle - theta), Math.abs(coarse.angularVelocity - velocity) / model.omega);
        fineError = Math.max(fineError, Math.abs(fine.angle - theta), Math.abs(fine.angularVelocity - velocity) / model.omega);
        expect(coarse.time).toBe(fine.time);
        expect(coarse.linearAngle).toBeCloseTo(model.amplitude * Math.cos(model.omega * coarse.time), 3);
        expect(fine.potential).toBeGreaterThanOrEqual(0); expect(fine.kinetic).toBeGreaterThanOrEqual(0);
      }
    }
    expect(coarseError, `coarse trajectory ${seed}`).toBeLessThan(.0004);
    expect(fineError, `fine trajectory ${seed}`).toBeLessThan(coarseError + 1e-8);
    expect(run.coarse.relativeEnergyDrift).toBeLessThan(.0001);
    expect(run.fine.relativeEnergyDrift).toBeLessThan(run.coarse.relativeEnergyDrift!);
    expect(run.coarse.periodEstimate).not.toBeNull(); expect(run.fine.periodEstimate).not.toBeNull();
    expect(Math.abs(run.fine.periodEstimate! - model.referencePeriod!)).toBeLessThan(Math.abs(run.coarse.periodEstimate! - model.referencePeriod!));
    const referenceCrossings: { time: number; direction: string }[] = [];
    for (let quarter = 1; quarter * model.referencePeriod! / 4 <= run.duration; quarter += 2) referenceCrossings.push({ time: quarter * model.referencePeriod! / 4, direction: quarter % 4 === 1 ? "negative" : "positive" });
    expect(run.fine.crossings).toHaveLength(referenceCrossings.length);
    run.fine.crossings.forEach((crossing, index) => { expect(crossing.direction).toBe(referenceCrossings[index].direction); expect(Math.abs(crossing.time - referenceCrossings[index].time) / model.linearPeriod).toBeLessThan(.00001); });
  }
});

it("separates force-law discrepancy from period discrepancy and numerical drift", () => {
  const input = { mass: 1, length: 1, gravity: 10, amplitudeDegrees: 15, cycles: 4, stepsPerPeriod: 128 as const }, run = pendulumRun(input);
  expect(run.model.forceDifferenceRelativeToLinearPercent).toBeCloseTo(1.138407053463076, 10);
  expect(run.model.periodIncreasePercent).toBeCloseTo(.4300579173465158, 10);
  expect(Math.abs(run.fine.periodErrorPercent!)).toBeLessThan(.00001);
  expect(run.model.initialLinearEnergy).toBeGreaterThan(run.model.initialEnergy);
  expect(run.model.initialLinearEnergy - run.model.initialEnergy).toBeGreaterThan(100 * run.coarse.energyDrift);
  expect(run.maxAngleDifference).toBeLessThan(.000001);
});

it("does not invent a measured period from a short record or from stationary equilibrium", () => {
  const base = { mass: 1, length: 1, gravity: 10, cycles: 1, stepsPerPeriod: 32 as const };
  const short = pendulumRun({ ...base, amplitudeDegrees: 170 });
  expect(short.coarse.falling).toHaveLength(1); expect(short.coarse.periodEstimate).toBeNull(); expect(short.periodDifference).toBeNull(); expect(short.model.referencePeriod).toBeGreaterThan(short.duration);
  const rest = pendulumRun({ ...base, amplitudeDegrees: 0 });
  expect(rest.model.referencePeriod).toBeNull(); expect(rest.model.forceDifferenceRelativeToLinearPercent).toBeNull(); expect(rest.model.periodIncreasePercent).toBeNull();
  expect(rest.coarse.crossings).toHaveLength(0); expect(rest.coarse.periodEstimate).toBeNull(); expect(rest.coarse.energyDrift).toBe(0); expect(rest.coarse.relativeEnergyDrift).toBeNull();
  expect(rest.coarse.states.every(state => state.angle === 0 && state.angularVelocity === 0 && state.energy === 0 && state.linearEnergy === 0)).toBe(true);
});

it("rejects unsupported parameters and keeps both integration grids on the same physical interval", () => {
  const base = { mass: 1, length: 1, gravity: 10, amplitudeDegrees: 160, cycles: 6, stepsPerPeriod: 256 as const };
  for (const patch of [{ mass: 0 }, { length: 0 }, { gravity: -1 }, { amplitudeDegrees: .05 }, { amplitudeDegrees: 171 }, { amplitudeDegrees: NaN }, { cycles: 1.5 }, { stepsPerPeriod: 48 }]) expect(pendulumInputSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  expect(pendulumModelSchema.safeParse({ mass: 1, length: 1, gravity: Infinity, amplitudeDegrees: 10 }).success).toBe(false);
  const run = pendulumRun(base);
  expect(run.coarse.states).toHaveLength(1537); expect(run.fine.states).toHaveLength(3073);
  expect(run.coarse.states.at(-1)!.time).toBe(run.fine.states.at(-1)!.time); expect(run.coarse.states.at(-1)!.time).toBeCloseTo(run.duration, 12);
  expect(run.fine.step).toBe(run.coarse.step / 2);
});
