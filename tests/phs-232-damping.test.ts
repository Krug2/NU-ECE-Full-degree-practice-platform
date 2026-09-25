import { expect, it } from "vitest";
import { dampingEvents, dampingInputSchema, dampingModel, dampingModelSchema, dampingRun, dampingState, type DampingModelInput } from "../lib/learning/phs-232-damping";

type Matrix = [number, number, number, number];
const multiply = (a: Matrix, b: Matrix): Matrix => [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3]];
function matrixState(p: DampingModelInput, time: number) {
  const stiffnessPerMass = p.stiffness / p.mass, dampingPerMass = 2 * p.dampingRatio * Math.sqrt(stiffnessPerMass);
  const matrix: Matrix = [0, time, -stiffnessPerMass * time, -dampingPerMass * time];
  const norm = Math.max(Math.abs(matrix[0]) + Math.abs(matrix[1]), Math.abs(matrix[2]) + Math.abs(matrix[3]));
  const squarings = Math.max(0, Math.ceil(Math.log2(norm || 1))), scaled = matrix.map(v => v / 2 ** squarings) as Matrix;
  let term: Matrix = [1, 0, 0, 1], exponential: Matrix = [1, 0, 0, 1];
  for (let n = 1; n <= 26; n++) { term = multiply(term, scaled).map(v => v / n) as Matrix; exponential = exponential.map((v, i) => v + term[i]) as Matrix; }
  for (let n = 0; n < squarings; n++) exponential = multiply(exponential, exponential);
  return [exponential[0] * p.position + exponential[1] * p.velocity, exponential[2] * p.position + exponential[3] * p.velocity];
}

it("checks 50 varied damped trajectories against an independent matrix exponential across every regime", () => {
  const ratios = [0, .01, .2, .6, .999999999, 1, 1.000000001, 1.6, 3];
  for (let seed = 0; seed < 50; seed++) {
    const input = { mass: .1 + seed % 9 / 10, stiffness: .5 + 7 * seed % 40, dampingRatio: ratios[seed % ratios.length], position: (seed % 7 - 3) * .03, velocity: (3 * seed % 11 - 5) * .08 };
    const model = dampingModel(input);
    for (const cycles of [0, .01, .1, .25, .5, 1, 2, 4]) {
      const time = cycles * 2 * Math.PI * Math.sqrt(input.mass / input.stiffness), reference = matrixState(input, time), actual = dampingState(model, time);
      expect(actual.position).toBeCloseTo(reference[0], 10); expect(actual.velocity).toBeCloseTo(reference[1], 9);
      expect(actual.energy).toBeCloseTo((input.mass * reference[1] ** 2 + input.stiffness * reference[0] ** 2) / 2, 9);
      expect(actual.dissipativePower).toBeGreaterThanOrEqual(0);
      if (actual.envelope !== null) expect(Math.abs(actual.position)).toBeLessThanOrEqual(actual.envelope + 1e-12);
      if (cycles === 0) { expect(actual.position).toBe(input.position); expect(actual.velocity).toBe(input.velocity); }
    }
  }
});

it("remains continuous near critical damping and handles pure modes and long-time decay without hyperbolic overflow", () => {
  const base = { mass: 1, stiffness: 25, position: -.07, velocity: .11 };
  for (let seed = 0; seed < 50; seed++) {
    const offset = 10 ** (-(3 + seed % 12)), direction = seed % 2 ? -1 : 1;
    const model = dampingModel({ ...base, dampingRatio: 1 + direction * offset }), critical = dampingModel({ ...base, dampingRatio: 1 });
    expect(model.regime).toBe(direction < 0 ? "underdamped" : "overdamped");
    for (const time of [0, .001, .1, .5, 2, 8]) {
      const actual = dampingState(model, time), reference = matrixState({ ...base, dampingRatio: 1 + direction * offset }, time), limit = dampingState(critical, time);
      expect(actual.position).toBeCloseTo(reference[0], 11); expect(actual.velocity).toBeCloseTo(reference[1], 10);
      expect(Math.abs(actual.position - limit.position)).toBeLessThan(20 * offset + 5e-13);
      expect(Math.abs(actual.velocity - limit.velocity)).toBeLessThan(100 * offset + 5e-13);
    }
  }
  for (const rate of [-2, -8]) {
    const model = dampingModel({ mass: 1, stiffness: 16, dampingRatio: 1.25, position: .1, velocity: rate * .1 });
    for (const t of [0, .1, 1, 3]) { const state = dampingState(model, t); expect(state.position).toBeCloseTo(.1 * Math.exp(rate * t), 13); expect(state.velocity).toBeCloseTo(rate * .1 * Math.exp(rate * t), 13); }
    for (const t of [1, 3, 5, 8]) { const state = dampingState(model, t), expected = .1 * Math.exp(rate * t); expect(Math.abs((state.position - expected) / expected)).toBeLessThan(1e-11); expect(Math.abs((state.velocity - rate * expected) / (rate * expected))).toBeLessThan(1e-11); }
    expect(dampingEvents(model, 8).zeros.times).toEqual([]); expect(dampingEvents(model, 8).peaks).toEqual([]);
    const final = dampingState(model, 1e6 * model.naturalPeriod); expect(Math.abs(final.position)).toBe(0); expect(Math.abs(final.velocity)).toBe(0); expect(final.energy).toBe(0);
  }
});

it("preserves both pure overdamped modes without inventing late crossings or extrema over 50 parameter sets", () => {
  for (let seed = 0; seed < 50; seed++) {
    const base = { mass: .4 + seed % 3 * .3, stiffness: 5 + seed % 5, dampingRatio: 1.01 + seed % 10 * .19, position: .04, velocity: 0 };
    const initial = dampingModel(base);
    for (const rate of [initial.slowRoot!, initial.fastRoot!]) {
      const model = dampingModel({ ...base, velocity: rate * base.position }), events = dampingEvents(model, 6 * model.naturalPeriod);
      expect(events.zeros.times, JSON.stringify({ seed, rate })).toEqual([]); expect(events.peaks, JSON.stringify({ seed, rate })).toEqual([]);
      for (const t of [.2, 1, 3, 6].map(n => n * model.naturalPeriod)) {
        const state = dampingState(model, t), x = base.position * Math.exp(rate * t);
        expect(Math.abs((state.position - x) / x)).toBeLessThan(1e-12); expect(Math.abs((state.velocity - rate * x) / (rate * x))).toBeLessThan(1e-12);
      }
    }
  }
});

function independentPowerIntegral(p: DampingModelInput, duration: number) {
  const b = 2 * p.dampingRatio * Math.sqrt(p.mass * p.stiffness), n = 16384, h = duration / n;
  let x = p.position, v = p.velocity, work = 0;
  const acceleration = (x: number, v: number) => (-p.stiffness * x - b * v) / p.mass;
  for (let i = 0; i < n; i++) {
    const a1 = acceleration(x, v), v2 = v + h * a1 / 2, a2 = acceleration(x + h * v / 2, v2);
    const v3 = v + h * a2 / 2, a3 = acceleration(x + h * v2 / 2, v3);
    const v4 = v + h * a3, a4 = acceleration(x + h * v3, v4);
    work += h * b * (v * v + 2 * v2 * v2 + 2 * v3 * v3 + v4 * v4) / 6;
    x += h * (v + 2 * v2 + 2 * v3 + v4) / 6; v += h * (a1 + 2 * a2 + 2 * a3 + a4) / 6;
  }
  return { x, v, work };
}

it("checks 50 independent dissipative-power accounts and quadrature refinements without defining loss as energy difference", () => {
  for (let seed = 0; seed < 50; seed++) {
    const input = { mass: .2 + seed % 8 / 5, stiffness: 2 + seed % 20, dampingRatio: .03 + seed % 10 * .3, position: (seed % 5 - 2) * .04, velocity: (seed % 7 - 3) * .1, cycles: 2, intervals: 256 as const, bandFraction: .05 };
    const run = dampingRun(input), reference = independentPowerIntegral(input, run.duration), last = run.fine.states.at(-1)!;
    const scale = run.model.initialEnergy || 1;
    expect(last.position).toBeCloseTo(reference.x, 9); expect(last.velocity).toBeCloseTo(reference.v, 9);
    expect(Math.abs(last.dissipated - reference.work) / scale).toBeLessThan(.00002);
    expect(run.fine.maxBalanceResidual).toBeLessThanOrEqual(.2 * run.coarse.maxBalanceResidual + 1e-12 * scale);
    for (let i = 1; i < run.fine.states.length; i++) {
      expect(run.fine.states[i].energy).toBeLessThanOrEqual(run.fine.states[i - 1].energy + 1e-12 * scale);
      expect(run.fine.states[i].dissipated).toBeGreaterThanOrEqual(run.fine.states[i - 1].dissipated);
    }
    const time = .317 * run.model.naturalPeriod, h = 1e-5 * run.model.naturalPeriod, state = dampingState(run.model, time);
    const derivative = (dampingState(run.model, time + h).energy - dampingState(run.model, time - h).energy) / (2 * h);
    expect(Math.abs(derivative + state.dissipativePower) / (scale * run.model.omega)).toBeLessThan(1e-7);
  }
});

it("locates true extrema and signed crossings, including nonoscillatory overshoot and exact window endpoints", () => {
  const input = { mass: 1, stiffness: 25, dampingRatio: .6, position: .2, velocity: 0 }, model = dampingModel(input), events = dampingEvents(model, 4 * model.naturalPeriod);
  expect(events.peaks[0]).toEqual({ time: 0, position: .2, kind: "maximum" });
  events.peaks.forEach((peak, n) => { expect(peak.time).toBeCloseTo(n * Math.PI / 4, 12); expect(peak.position).toBeCloseTo(.2 * (-1) ** n * Math.exp(-3 * peak.time), 12); });
  events.zeros.times.forEach((time, n) => expect(time).toBeCloseTo((Math.PI - Math.atan(4 / 3)) / 4 + n * Math.PI / 4, 12));
  const maxima = events.peaks.filter(p => p.kind === "maximum");
  for (let n = 1; n < maxima.length; n++) { expect(maxima[n].time - maxima[n - 1].time).toBeCloseTo(Math.PI / 2, 12); expect(Math.log(maxima[n - 1].position / maxima[n].position)).toBeCloseTo(3 * Math.PI / 2, 12); }
  expect(model.displacementEnvelope).toBeCloseTo(.25, 14); expect(events.peaks[0].position).not.toBe(model.displacementEnvelope);
  const critical = dampingModel({ mass: 1, stiffness: 25, dampingRatio: 1, position: .1, velocity: -1 });
  const criticalEvents = dampingEvents(critical, 1); expect(criticalEvents.zeros.times).toHaveLength(1); expect(criticalEvents.zeros.times[0]).toBeCloseTo(.2, 14);
  expect(criticalEvents.peaks).toHaveLength(1); expect(criticalEvents.peaks[0].time).toBeCloseTo(.4, 14); expect(criticalEvents.peaks[0].kind).toBe("minimum");
  const over = dampingModel({ mass: 1, stiffness: 16, dampingRatio: 1.25, position: .1, velocity: -1 }), overEvents = dampingEvents(over, 2);
  expect(overEvents.zeros.times).toHaveLength(1); expect(overEvents.zeros.times[0]).toBeCloseTo(Math.log(4) / 6, 13);
  expect(overEvents.peaks).toHaveLength(1); expect(overEvents.peaks[0].time).toBeCloseTo(Math.log(16) / 6, 13);
  const undamped = dampingModel({ mass: 1, stiffness: 4, dampingRatio: 0, position: 0, velocity: 1 });
  expect(dampingEvents(undamped, 2 * Math.PI).zeros.times).toEqual([0, Math.PI / 2, Math.PI, 3 * Math.PI / 2, 2 * Math.PI]);
});

it("checks crossing and extremum times against independent matrix-state bracketing for 50 initial-value problems", () => {
  for (let seed = 0; seed < 50; seed++) {
    const input = { mass: .5 + seed % 4 / 2, stiffness: 5 + seed % 11, dampingRatio: [0, .2, .7, 1, 1.1, 2][seed % 6], position: (seed % 5 - 2) / 20, velocity: (seed % 7 - 3) / 10 };
    const model = dampingModel(input), duration = 3 * model.naturalPeriod, actual = dampingEvents(model, duration);
    if (model.stationary) continue;
    const references: number[][] = [[], []];
    for (const key of [0, 1]) {
      let leftTime = 0, leftValue = [input.position, input.velocity][key];
      if (leftValue === 0) references[key].push(0);
      for (let i = 1; i <= 1024; i++) {
        const rightTime = i * duration / 1024, rightValue = matrixState(input, rightTime)[key];
        if (leftValue * rightValue < 0) {
          let low = leftTime, high = rightTime;
          for (let j = 0; j < 38; j++) { const middle = (low + high) / 2; if (matrixState(input, middle)[key] * leftValue > 0) low = middle; else high = middle; }
          references[key].push((low + high) / 2);
        }
        leftTime = rightTime; leftValue = rightValue;
      }
      const computed = key === 0 ? actual.zeros.times : actual.peaks.map(p => p.time);
      const interior = computed.filter(t => t < duration - 1e-9);
      const referenceInterior = references[key].filter(t => t < duration - 1e-9);
      expect(interior.length, JSON.stringify({ seed, key, computed, referenceInterior })).toBe(referenceInterior.length);
      interior.forEach((t, i) => expect(Math.abs(t - referenceInterior[i])).toBeLessThan(1e-8 * Math.max(1, duration)));
    }
  }
});

it("distinguishes a temporary band entry, a finite-record suffix and an energy-based sufficient future bound", () => {
  const run = dampingRun({ mass: 1, stiffness: 25, dampingRatio: .05, position: .1, velocity: 0, cycles: 8, intervals: 512, bandFraction: .2 });
  expect(run.fine.firstInBand).not.toBeNull(); expect(run.fine.sampledRemainderSince).toBeGreaterThan(run.fine.firstInBand!);
  expect(run.fine.states.some(state => state.time > run.fine.firstInBand! && !state.inBand)).toBe(true);
  expect(run.energySufficientSince).not.toBeNull();
  for (let i = 0; i <= 200; i++) {
    const t = run.energySufficientSince! + i * run.model.naturalPeriod / 10, state = dampingState(run.model, t);
    expect(Math.abs(state.position)).toBeLessThanOrEqual(run.positionBand + 1e-13); expect(Math.abs(state.velocity)).toBeLessThanOrEqual(run.velocityBand + 1e-13);
  }
  const short = dampingRun({ mass: 1, stiffness: 25, dampingRatio: .05, position: .1, velocity: 0, cycles: .25, intervals: 64, bandFraction: .2 });
  expect(short.energySufficientSince).toBeNull(); expect(short.fine.sampledRemainderSince).toBeNull();
  const noDamping = dampingRun({ mass: 1, stiffness: 25, dampingRatio: 0, position: .1, velocity: 0, cycles: 2, intervals: 64, bandFraction: .2 });
  expect(noDamping.energySufficientSince).toBeNull(); expect(noDamping.fine.states.every(s => s.dissipated === 0)).toBe(true);
});

it("rejects unsupported inputs and keeps stationary and near-critical cases explicit", () => {
  const base = { mass: 1, stiffness: 25, dampingRatio: .5, position: .1, velocity: 0, cycles: 2, intervals: 64 as const, bandFraction: .05 };
  for (const change of [{ mass: 0 }, { stiffness: -1 }, { dampingRatio: -1 }, { dampingRatio: 3.1 }, { position: 1e-12 }, { velocity: Infinity }, { cycles: .1 }, { intervals: 32 }, { bandFraction: 0 }]) expect(dampingInputSchema.safeParse({ ...base, ...change }).success).toBe(false);
  expect(dampingModelSchema.safeParse({ mass: 1, stiffness: 1, dampingRatio: NaN, position: 0, velocity: 0 }).success).toBe(false);
  for (const ratio of [0, .5, 1, 2]) {
    const run = dampingRun({ ...base, dampingRatio: ratio, position: 0, velocity: 0 });
    expect(run.model.stationary).toBe(true); expect(run.events.zeros.kind).toBe("continuous"); expect(run.events.peaks).toEqual([]);
    expect(run.energySufficientSince).toBe(0); expect(run.fine.firstInBand).toBe(0); expect(run.fine.sampledRemainderSince).toBe(0);
    expect(run.fine.states.every(s => s.position === 0 && s.velocity === 0 && s.energy === 0 && s.dissipated === 0)).toBe(true);
  }
  const model = dampingModel({ mass: 1, stiffness: 25, dampingRatio: 1, position: .1, velocity: 0 });
  for (const t of [-1, NaN, Infinity, 1e8]) expect(() => dampingState(model, t)).toThrow();
  for (const t of [0, -1, Infinity, 13 * model.naturalPeriod]) expect(() => dampingEvents(model, t)).toThrow();
});
