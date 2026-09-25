import { expect, it } from "vitest";
import { coupledModeInputSchema, coupledModeModel, coupledModePoint, coupledModeRun, type CoupledModeInput } from "../lib/learning/phs-232-coupled-modes";

const base: CoupledModeInput = { mass: 1, stiffness: 4, couplingRatio: .125, firstPosition: .04, secondPosition: 0, firstVelocity: 0, secondVelocity: 0, cycles: 12 };
function fixture(seed: number): CoupledModeInput {
  return { mass: .2 + seed % 8 / 10, stiffness: .5 + seed % 9, couplingRatio: seed % 13 / 3,
    firstPosition: (seed % 9 - 4) / 100, secondPosition: ((seed * 7) % 11 - 5) / 100,
    firstVelocity: (seed % 7 - 3) / 10, secondVelocity: ((seed * 3) % 9 - 4) / 10, cycles: 1 + seed % 6 };
}
function integrate(p: CoupledModeInput, end: number, steps = 16384) {
  let values = [p.firstPosition, p.firstVelocity, p.secondPosition, p.secondVelocity, 0, 0];
  const h = end / steps, coupling = p.stiffness * p.couplingRatio, checkpoints = [{ time: 0, values: [...values] }];
  const derivative = (y: number[]) => {
    const force = coupling * (y[2] - y[0]);
    return [y[1], (-p.stiffness * y[0] + force) / p.mass, y[3], (-p.stiffness * y[2] - force) / p.mass, force * y[1], -force * y[3]];
  };
  for (let i = 1; i <= steps; i++) {
    const a = derivative(values), b = derivative(values.map((v, j) => v + h * a[j] / 2)), c = derivative(values.map((v, j) => v + h * b[j] / 2)), d = derivative(values.map((v, j) => v + h * c[j]));
    values = values.map((v, j) => v + h * (a[j] + 2 * b[j] + 2 * c[j] + d[j]) / 6);
    if (i % (steps / 4) === 0) checkpoints.push({ time: end * i / steps, values: [...values] });
  }
  return checkpoints;
}
const cache = new Map<number, ReturnType<typeof integrate>>();
function reference(seed: number) {
  if (!cache.has(seed)) { const p = fixture(seed); cache.set(seed, integrate(p, p.cycles * 2 * Math.PI * Math.sqrt(p.mass / p.stiffness))); }
  return cache.get(seed)!;
}
function physicalEnergy(p: CoupledModeInput, y: number[]) {
  return { first: (p.mass * y[1] ** 2 + p.stiffness * y[0] ** 2) / 2, second: (p.mass * y[3] ** 2 + p.stiffness * y[2] ** 2) / 2, coupling: p.stiffness * p.couplingRatio * (y[2] - y[0]) ** 2 / 2 };
}

it("compares fifty general four-component initial states with independent integration of the original force equations", () => {
  for (let seed = 0; seed < 50; seed++) {
    const input = fixture(seed), p = coupledModeModel(input), scale = Math.max(p.plusAmplitude + p.minusAmplitude, 1e-6);
    for (const sample of reference(seed)) {
      const actual = coupledModePoint(p, sample.time), fields = [actual.firstPosition, actual.firstVelocity, actual.secondPosition, actual.secondVelocity];
      fields.forEach((v, i) => expect(Math.abs(v - sample.values[i]) / (scale * (i % 2 ? p.omegaMinus : 1))).toBeLessThan(2e-8));
      const dt = p.period * 1e-5;
      if (sample.time > dt && sample.time + dt <= 24 * p.period) {
        const after = coupledModePoint(p, sample.time + dt), before = coupledModePoint(p, sample.time - dt);
        expect(Math.abs((after.firstVelocity - before.firstVelocity) / (2 * dt) - actual.firstAcceleration) / (scale * p.omegaMinus ** 2)).toBeLessThan(8e-9);
        expect(Math.abs((after.secondVelocity - before.secondVelocity) / (2 * dt) - actual.secondAcceleration) / (scale * p.omegaMinus ** 2)).toBeLessThan(8e-9);
      }
      const measured = physicalEnergy(input, sample.values), energy = measured.first + measured.second + measured.coupling;
      expect(energy / (p.totalEnergy || 1)).toBeCloseTo(p.totalEnergy ? 1 : 0, 8);
      expect(actual.totalEnergy).toBeCloseTo(energy, 8);
      expect(actual.plusEnergy).toBeCloseTo(p.plusEnergy, 11); expect(actual.minusEnergy).toBeCloseTo(p.minusEnergy, 11);
      expect(actual.firstPower + actual.secondPower + actual.couplingPower).toBeCloseTo(0, 12);
    }
  }
});

it("checks fifty independently integrated spring-work accounts with separate coupling energy and refinement", () => {
  for (let seed = 0; seed < 50; seed++) {
    const input = fixture(seed), run = coupledModeRun(input), p = run.model, initial = physicalEnergy(input, reference(seed)[0].values), last = reference(seed).at(-1)!;
    const expected = physicalEnergy(input, last.values), actual = run.fine.at(-1)!, scale = p.totalEnergy || 1;
    expect(Math.abs(actual.firstWork - last.values[4]) / scale).toBeLessThan(3e-7);
    expect(Math.abs(actual.secondWork - last.values[5]) / scale).toBeLessThan(3e-7);
    expect((expected.first - initial.first - last.values[4]) / scale).toBeCloseTo(0, 8);
    expect((expected.second - initial.second - last.values[5]) / scale).toBeCloseTo(0, 8);
    expect((expected.coupling - initial.coupling + last.values[4] + last.values[5]) / scale).toBeCloseTo(0, 8);
    expect(run.fineResidual / scale).toBeLessThan(1e-6);
    expect(run.fineResidual).toBeLessThan(run.coarseResidual * .08 + scale * 1e-12);
    expect(run.intervals / (input.cycles * p.omegaMinus / p.omegaPlus)).toBeGreaterThanOrEqual(32);
    expect(run.fine).toHaveLength(2 * run.intervals + 1);
    for (let i = 0; i < run.coarse.length; i++) expect(run.fine[2 * i].time).toBe(run.coarse[i].time);
    expect(Math.abs(actual.totalResidual) / scale).toBeLessThan(1e-13);
  }
});

it("verifies fifty symmetric and antisymmetric frequencies from stiffness eigenvalues and pure-mode force integration", () => {
  for (let seed = 0; seed < 50; seed++) {
    const input = { ...fixture(seed), couplingRatio: .1 + seed % 13 / 4, firstPosition: .03, firstVelocity: .1 }, p = coupledModeModel(input);
    const trace = 2 * input.stiffness * (1 + input.couplingRatio) / input.mass;
    const determinant = ((input.stiffness * (1 + input.couplingRatio)) ** 2 - (input.stiffness * input.couplingRatio) ** 2) / input.mass ** 2;
    const eigenvalues = [(trace - Math.sqrt(trace ** 2 - 4 * determinant)) / 2, (trace + Math.sqrt(trace ** 2 - 4 * determinant)) / 2];
    expect(p.omegaPlus ** 2).toBeCloseTo(eigenvalues[0], 10); expect(p.omegaMinus ** 2).toBeCloseTo(eigenvalues[1], 10);
    for (const sign of [1, -1]) {
      const pure = { ...input, secondPosition: sign * input.firstPosition, secondVelocity: sign * input.firstVelocity }, model = coupledModeModel(pure), omega = Math.sqrt(eigenvalues[sign === 1 ? 0 : 1]);
      const end = 2 * Math.PI / omega, integrated = integrate(pure, end, 4096).at(-1)!, point = coupledModePoint(model, end);
      expect(integrated.values[0]).toBeCloseTo(pure.firstPosition, 10); expect(integrated.values[1]).toBeCloseTo(pure.firstVelocity, 10);
      expect(point.firstPosition).toBeCloseTo(integrated.values[0], 10);
      expect(point.secondPosition).toBeCloseTo(sign * point.firstPosition, 12);
      expect(model.hasTwoModes).toBe(false);
      if (sign === 1) { expect(point.couplingEnergy).toBe(0); expect(model.minusEnergy).toBe(0); }
      else expect(model.plusEnergy).toBe(0);
    }
  }
});

it("checks fifty exact beat products and successive magnitude beats without equating envelope zeros with energy transfer", () => {
  for (let seed = 0; seed < 50; seed++) {
    const input = { ...base, mass: .5 + seed % 5 / 10, stiffness: 1 + seed % 7, couplingRatio: .15 + .03 * (seed % 17), cycles: 24 }, p = coupledModeModel(input);
    const beat = p.beatPeriod!, delta = p.omegaMinus - p.omegaPlus, carrier = (p.omegaMinus + p.omegaPlus) / 2;
    expect(beat * p.beatFrequency).toBeCloseTo(1, 13); expect(p.signedModulationPeriod).toBe(2 * beat);
    for (const fraction of [0, .137, .5, .731, 1, 1.5, 2]) {
      const t = beat * fraction, row = coupledModePoint(p, t);
      expect(row.firstPosition).toBeCloseTo(input.firstPosition * Math.cos(carrier * t) * Math.cos(delta * t / 2), 11);
      expect(row.secondPosition).toBeCloseTo(input.firstPosition * Math.sin(carrier * t) * Math.sin(delta * t / 2), 11);
      expect(row.firstEnvelope).toBeCloseTo(Math.abs(input.firstPosition * Math.cos(delta * t / 2)), 11);
      expect(row.secondEnvelope).toBeCloseTo(Math.abs(input.firstPosition * Math.sin(delta * t / 2)), 11);
      expect(Math.abs(row.firstPosition)).toBeLessThanOrEqual(row.firstEnvelope + 1e-13);
    }
    expect(coupledModePoint(p, beat).firstEnvelope).toBeCloseTo(coupledModePoint(p, 0).firstEnvelope, 12);
    expect(Math.cos(delta * beat / 2)).toBeCloseTo(-1, 12);
  }
  const p = coupledModeModel({ ...base, stiffness: 1, couplingRatio: .345, cycles: 24 }), row = coupledModePoint(p, 10 * Math.PI / 3);
  expect(row.firstEnvelope).toBeCloseTo(0, 12); expect(row.firstPosition).toBeCloseTo(0, 12);
  expect(row.firstVelocity).toBeCloseTo(-3 * Math.sqrt(3) * base.firstPosition / 40, 12);
  expect(row.firstEnergy).toBeGreaterThan(0); expect(row.couplingEnergy).toBeGreaterThan(0);
  expect(row.secondEnergy).toBeLessThan(p.totalEnergy);
});

it("checks arbitrary-phase magnitude bounds, unequal modal amplitudes and finite windows over fifty fixtures", () => {
  for (let seed = 0; seed < 50; seed++) {
    const p = coupledModeModel(fixture(seed));
    for (let i = 0; i <= 101; i++) {
      const t = p.end * i / 101, row = coupledModePoint(p, t);
      const plus = p.plusAmplitude * Math.cos(p.omegaPlus * t + (p.plusPhase ?? 0)), minus = p.minusAmplitude * Math.cos(p.omegaMinus * t + (p.minusPhase ?? 0));
      expect(row.firstPosition).toBeCloseTo(plus + minus, 12); expect(row.secondPosition).toBeCloseTo(plus - minus, 12);
      expect(Math.abs(row.firstPosition)).toBeLessThanOrEqual(row.firstEnvelope + 1e-12);
      expect(Math.abs(row.secondPosition)).toBeLessThanOrEqual(row.secondEnvelope + 1e-12);
      expect(row.firstEnvelope + 1e-12).toBeGreaterThanOrEqual(Math.abs(p.plusAmplitude - p.minusAmplitude));
      expect(row.secondEnvelope + 1e-12).toBeGreaterThanOrEqual(Math.abs(p.plusAmplitude - p.minusAmplitude));
    }
  }
  const run = coupledModeRun({ ...base, couplingRatio: .001, cycles: 4 });
  expect(run.beatCyclesInView!).toBeLessThan(.01);
  expect(run.model.beatPeriod!).toBeGreaterThan(run.model.end);
});

it("handles equal-frequency uncoupled masses, tiny coupling, zero state and all supported extremes", () => {
  const input = { ...base, couplingRatio: 0, firstVelocity: .13, secondPosition: -.03, secondVelocity: -.27 }, p = coupledModeModel(input);
  expect(p.beatPeriod).toBeNull(); expect(p.signedModulationPeriod).toBeNull(); expect(p.beatFrequency).toBe(0);
  const run = coupledModeRun(input);
  for (const row of run.fine) {
    expect(row.firstWork).toBe(0); expect(row.secondWork).toBe(0); expect(row.couplingEnergy).toBe(0);
    expect(row.firstPosition).toBeCloseTo(input.firstPosition * Math.cos(2 * row.time) + input.firstVelocity / 2 * Math.sin(2 * row.time), 12);
    expect(row.secondPosition).toBeCloseTo(input.secondPosition * Math.cos(2 * row.time) + input.secondVelocity / 2 * Math.sin(2 * row.time), 12);
    expect(row.firstEnergy).toBeCloseTo(run.fine[0].firstEnergy, 12); expect(row.secondEnergy).toBeCloseTo(run.fine[0].secondEnergy, 12);
  }
  const tiny = coupledModeModel({ ...base, couplingRatio: 1e-12 });
  expect(tiny.deltaOmega / (tiny.omegaPlus * 1e-12)).toBeCloseTo(1, 11);
  expect(tiny.beatPeriod).not.toBeNull();
  const zero = coupledModeModel({ ...base, firstPosition: 0 });
  expect(zero.atRest).toBe(true); expect(zero.plusPhase).toBeNull(); expect(zero.minusPhase).toBeNull(); expect(coupledModePoint(zero, 0).totalEnergy).toBe(0);
  for (const mass of [.1, 5]) for (const stiffness of [.1, 100]) for (const couplingRatio of [0, 4]) {
    const extreme = coupledModeRun({ ...base, mass, stiffness, couplingRatio, firstPosition: -.1, secondPosition: .1, firstVelocity: 1, secondVelocity: -1, cycles: 24 });
    for (const row of [extreme.fine[0], extreme.fine.at(-1)!]) expect(Object.values(row).every(Number.isFinite)).toBe(true);
    expect(extreme.fineResidual / extreme.model.totalEnergy).toBeLessThan(1e-6);
    expect(extreme.intervals).toBeLessThanOrEqual(2304);
  }
});

it("rejects invalid parameters and point times instead of silently changing the physical model", () => {
  for (const patch of [{ mass: 0 }, { stiffness: 0 }, { couplingRatio: -.01 }, { couplingRatio: 4.1 }, { firstPosition: .11 }, { secondVelocity: 1.1 }, { cycles: 0 }, { cycles: 25 }, { firstVelocity: NaN }, { stiffness: Infinity }, { extra: 1 }]) expect(coupledModeInputSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  const p = coupledModeModel(base);
  for (const t of [-1, NaN, Infinity, 25 * p.period]) expect(() => coupledModePoint(p, t)).toThrow();
});
