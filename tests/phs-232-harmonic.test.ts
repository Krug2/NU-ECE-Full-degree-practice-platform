import { expect, it } from "vitest";
import { harmonicEvents, harmonicInputSchema, harmonicModel, harmonicModelInputSchema, harmonicRun, harmonicState } from "../lib/learning/phs-232-harmonic";

it("preserves independently integrated states and the phase-plane invariant across 50 models", () => {
  for (let seed = 0; seed < 50; seed++) {
    const mass = [.1, .2, .5, 1, 2][seed % 5], omega = 1 + seed % 9;
    const initialX = ((seed % 11) - 5) / 20, initialV = ((seed % 13) - 6) / 5;
    const stiffness = mass * omega ** 2, model = harmonicModel({ mass, stiffness, position: initialX, velocity: initialV });
    expect(model.omega).toBeCloseTo(omega, 13);
    expect(model.naturalPeriod * model.frequency).toBeCloseTo(1, 14);
    expect(harmonicState(model, 0)).toMatchObject({ position: initialX, velocity: initialV });
    expect(harmonicState(model, 0).acceleration).toBeCloseTo(-(omega ** 2) * initialX, 12);
    const steps = 1800, h = 2 * Math.PI / omega / steps;
    let x = initialX, v = initialV;
    for (let i = 1; i <= steps; i++) {
      const dx1 = v, dv1 = -stiffness * x / mass;
      const dx2 = v + h * dv1 / 2, dv2 = -stiffness * (x + h * dx1 / 2) / mass;
      const dx3 = v + h * dv2 / 2, dv3 = -stiffness * (x + h * dx2 / 2) / mass;
      const dx4 = v + h * dv3, dv4 = -stiffness * (x + h * dx3) / mass;
      x += h * (dx1 + 2 * dx2 + 2 * dx3 + dx4) / 6;
      v += h * (dv1 + 2 * dv2 + 2 * dv3 + dv4) / 6;
      if (i % 150 === 0) {
        const state = harmonicState(model, h * i);
        expect(state.position).toBeCloseTo(x, 8); expect(state.velocity).toBeCloseTo(v, 8);
        expect(stiffness * state.position ** 2 + mass * state.velocity ** 2).toBeCloseTo(stiffness * initialX ** 2 + mass * initialV ** 2, 10);
        expect(state.acceleration).toBeCloseTo(-stiffness / mass * x, 7);
      }
    }
    if (model.phase !== null) {
      expect(model.phase).toBeGreaterThanOrEqual(-Math.PI); expect(model.phase).toBeLessThan(Math.PI);
      expect(model.amplitude * Math.cos(model.phase)).toBeCloseTo(initialX, 12);
      expect(-omega * model.amplitude * Math.sin(model.phase)).toBeCloseTo(initialV, 12);
    }
  }
});

it("enumerates every crossing against independently bracketed roots across 50 seeded states", () => {
  for (let seed = 0; seed < 50; seed++) {
    const omega = 1 + seed % 8, phase = .137 + seed * .019, amplitude = .1 + seed % 4 / 10;
    const initialX = amplitude * Math.cos(phase), initialV = -omega * amplitude * Math.sin(phase);
    const model = harmonicModel({ mass: 1, stiffness: omega ** 2, position: initialX, velocity: initialV });
    const period = 2 * Math.PI / omega, from = .083 * period, to = 3.913 * period;
    for (const fraction of [-.75, -.5, 0, .5, .75]) {
      const target = amplitude * fraction, value = (t: number) => amplitude * Math.cos(omega * t + phase) - target;
      const expected: { time: number; direction: string }[] = [];
      for (let index = 0; index < 2000; index++) {
        let lo = from + (to - from) * index / 2000, hi = from + (to - from) * (index + 1) / 2000;
        const left = value(lo), right = value(hi);
        if (left * right >= 0) continue;
        for (let step = 0; step < 45; step++) { const mid = (lo + hi) / 2; if (value(lo) * value(mid) <= 0) hi = mid; else lo = mid; }
        expected.push({ time: (lo + hi) / 2, direction: right > left ? "positive" : "negative" });
      }
      const actual = harmonicEvents(model, target, { from, to });
      expect(actual.kind).toBe("finite"); expect(actual.events).toHaveLength(expected.length);
      actual.events.forEach((event, i) => {
        expect(event.time).toBeCloseTo(expected[i].time, 10);
        expect(event.direction).toBe(expected[i].direction); expect(event.position).toBeCloseTo(target, 12);
      });
      for (const direction of ["positive", "negative"] as const) {
        const filtered = harmonicEvents(model, target, { from, to, direction }).events;
        expect(filtered).toHaveLength(expected.filter(event => event.direction === direction).length);
        expect(filtered.every(event => event.direction === direction)).toBe(true);
      }
    }
  }
});

it("handles closed and open event endpoints without duplicating turning points", () => {
  const model = harmonicModel({ mass: 1, stiffness: 4, position: .2, velocity: 0 }), period = Math.PI;
  const closed = harmonicEvents(model, .2, { from: 0, to: 2 * period });
  expect(closed.events.map(event => event.time)).toEqual([0, period, 2 * period]);
  expect(closed.events.every(event => event.direction === "turning")).toBe(true);
  expect(harmonicEvents(model, .2, { from: 0, to: 2 * period, includeFrom: false, includeTo: false }).events.map(event => event.time)).toEqual([period]);
  expect(harmonicEvents(model, .2, { from: 0, to: 2 * period, direction: "positive" }).kind).toBe("none");
  expect(harmonicEvents(model, .2, { from: 0, to: 2 * period, direction: "negative" }).kind).toBe("none");
  expect(harmonicEvents(model, 0, { from: period / 4 + 1e-8, to: 3 * period / 4 - 1e-8 }).kind).toBe("none");
  expect(harmonicEvents(model, .2 + 1e-13, { from: 0, to: period }).kind).toBe("none");
  expect(harmonicEvents(model, .2, { from: 0, to: 0 }).events).toHaveLength(1);
  expect(harmonicEvents(model, .2, { from: 0, to: 0, includeFrom: false }).kind).toBe("none");
  const late = harmonicEvents(model, .2, { from: 999 * period, to: 1000 * period });
  expect(late.events).toHaveLength(2); expect(late.events.every(event => event.direction === "turning")).toBe(true);
  expect(harmonicState(model, 100 * period - 1e-7).direction).toBe("positive");
  expect(harmonicState(model, 100 * period + 1e-7).direction).toBe("negative");
});

it("distinguishes equilibrium from a periodic nonzero trajectory and directed crossings", () => {
  const model = harmonicModel({ mass: .5, stiffness: 8, position: 0, velocity: 0 });
  expect(model).toMatchObject({ amplitude: 0, phase: null, trajectoryPeriod: null, omega: 4 });
  expect(harmonicState(model, 12)).toMatchObject({ position: 0, velocity: 0, acceleration: 0, direction: "rest" });
  expect(harmonicEvents(model, 0, { from: 0, to: 2 }).kind).toBe("continuous");
  expect(harmonicEvents(model, 0, { from: 0, to: 0, includeTo: false }).kind).toBe("none");
  expect(harmonicEvents(model, 0, { from: 0, to: 2, direction: "positive" }).kind).toBe("none");
  expect(harmonicEvents(model, .1, { from: 0, to: 2 }).kind).toBe("none");
  const tiny = harmonicModel({ mass: 1, stiffness: 1, position: 1e-200, velocity: 0 });
  expect(tiny.amplitude).toBe(1e-200); expect(tiny.phase).toBe(0); expect(tiny.trajectoryPeriod).toBe(2 * Math.PI);
  expect(harmonicModel({ mass: 1, stiffness: 1, position: -.2, velocity: 0 }).phase).toBe(-Math.PI);
});

it("keeps sparse samples on their actual grid and exposes aliasing without altering the model", () => {
  const input = { mass: .5, stiffness: 8, position: .03, velocity: -.16, cycles: 2.25, samplesPerPeriod: 1 as const, probeCycles: .25, targetFraction: 0 };
  const coarse = harmonicRun(input), fine = harmonicRun({ ...input, samplesPerPeriod: 32 });
  expect(coarse.model.amplitude).toBeCloseTo(.05, 14);
  expect(coarse.trajectory).toEqual(fine.trajectory); expect(coarse.probe).toEqual(fine.probe);
  expect(coarse.sampled).toHaveLength(3);
  coarse.sampled.forEach((state, index) => { expect(state.time).toBe(index * Math.PI / 2); expect(state.position).toBeCloseTo(.03, 13); });
  expect(coarse.sampled.at(-1)!.time).toBeLessThan(coarse.duration);
  expect(Math.max(...coarse.trajectory.map(state => state.position)) - Math.min(...coarse.trajectory.map(state => state.position))).toBeGreaterThan(.099);
  expect(fine.sampled).toHaveLength(73); expect(coarse.sampleRate).toBeCloseTo(2 / Math.PI, 14);
  expect(coarse.probe).toMatchObject({ direction: "negative" });
  expect(coarse.probe.position).toBeCloseTo(-.04, 13); expect(coarse.probe.velocity).toBeCloseTo(-.12, 13);
});

it("rejects invalid parameters, nonfinite data and unreasonable event requests", () => {
  const initial = { mass: .5, stiffness: 8, position: .03, velocity: -.16 };
  for (const invalid of [{ mass: 0 }, { mass: -1 }, { stiffness: 0 }, { stiffness: Infinity }, { position: NaN }, { velocity: "" }, { extra: 1 }]) expect(harmonicModelInputSchema.safeParse({ ...initial, ...invalid }).success).toBe(false);
  const activity = { ...initial, cycles: 2, samplesPerPeriod: 8, probeCycles: 1, targetFraction: 0 };
  for (const invalid of [{ cycles: 0 }, { probeCycles: 3 }, { samplesPerPeriod: 0 }, { samplesPerPeriod: 3 }, { targetFraction: 2 }, { cycles: Infinity }]) expect(harmonicInputSchema.safeParse({ ...activity, ...invalid }).success).toBe(false);
  const model = harmonicModel(initial);
  expect(() => harmonicState(model, Infinity)).toThrow(); expect(() => harmonicState(model, model.naturalPeriod * 1001)).toThrow();
  expect(() => harmonicEvents(model, NaN, { from: 0, to: 1 })).toThrow();
  expect(() => harmonicEvents(model, 0, { from: 2, to: 1 })).toThrow();
  expect(() => harmonicEvents(model, 0, { from: 0, to: 101 * model.naturalPeriod })).toThrow();
});
