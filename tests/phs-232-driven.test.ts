import { expect, it } from "vitest";
import { drivenInputSchema, drivenModel, drivenModelSchema, drivenPeaks, drivenResponse, drivenRun, drivenState, type DrivenModelInput } from "../lib/learning/phs-232-driven";

const base = { mass: 1, stiffness: 25, dampingRatio: .2, force: 1, frequencyRatio: .8, position: .04, velocity: -.1 };
function integrate(p: DrivenModelInput, duration: number, steps = 16384) {
  const b = 2 * p.dampingRatio * Math.sqrt(p.mass * p.stiffness), omega = p.frequencyRatio * Math.sqrt(p.stiffness / p.mass), h = duration / steps;
  let state = [p.position, p.velocity, 0, 0];
  const rate = (t: number, y: number[]) => { const force = p.force * Math.cos(omega * t); return [y[1], (force - b * y[1] - p.stiffness * y[0]) / p.mass, force * y[1], b * y[1] ** 2]; };
  const shifted = (a: number[], scale: number) => state.map((y, i) => y + scale * a[i]);
  for (let n = 0; n < steps; n++) {
    const t = n * h, k1 = rate(t, state), k2 = rate(t + h / 2, shifted(k1, h / 2)), k3 = rate(t + h / 2, shifted(k2, h / 2)), k4 = rate(t + h, shifted(k3, h));
    state = state.map((y, i) => y + h * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
  }
  return { position: state[0], velocity: state[1], inputWork: state[2], dissipated: state[3] };
}

it("checks 50 forced initial-value problems against independent time integration across all damping regimes", () => {
  for (let seed = 0; seed < 50; seed++) {
    const p = { mass: .1 + seed % 10 / 5, stiffness: .5 + seed % 20, dampingRatio: [0, 1e-6, .05, .4, 1, 1.00001, 2, 3][seed % 8], force: seed % 9 / 4, frequencyRatio: [0, .25, .8, .999999, 1, 1.000001, 2, 4][seed * 3 % 8], position: (seed % 7 - 3) / 20, velocity: (seed % 11 - 5) / 5 };
    const model = drivenModel(p), scale = 1 + Math.abs(p.position) + Math.abs(p.velocity / model.omega0) + p.force / p.stiffness;
    for (const cycles of [0, .02, .25, 1, 3]) {
      const time = cycles * 2 * Math.PI * Math.sqrt(p.mass / p.stiffness), reference = integrate(p, time), actual = drivenState(model, time);
      expect(Math.abs(actual.position - reference.position) / scale).toBeLessThan(2e-9);
      expect(Math.abs(actual.velocity - reference.velocity) / (scale * model.omega0)).toBeLessThan(2e-9);
      expect(actual.energy).toBeCloseTo((p.mass * reference.velocity ** 2 + p.stiffness * reference.position ** 2) / 2, 7);
      expect(actual.dissipativePower).toBeGreaterThanOrEqual(0);
    }
  }
});

it("preserves the finite-time resonant limit without subtracting huge particular and homogeneous states", () => {
  for (let seed = 0; seed < 50; seed++) {
    const p = { ...base, mass: .2 + seed % 4 / 5, stiffness: 2 + seed % 9, dampingRatio: 0, frequencyRatio: 1, force: .2 + seed % 5 / 10, position: (seed % 5 - 2) / 10, velocity: (seed % 3 - 1) / 4 };
    const model = drivenModel(p), w = Math.sqrt(p.stiffness / p.mass), f = p.force / (2 * p.mass * w);
    expect(drivenResponse(model)).toMatchObject({ kind: "resonant", amplitude: null, lag: null, meanPower: null, cosine: null });
    for (const cycles of [0, .00001, .25, 1, 6, 12]) {
      const t = cycles * model.naturalPeriod, phase = w * t, actual = drivenState(model, t);
      const x = p.position * Math.cos(phase) + p.velocity / w * Math.sin(phase) + f * t * Math.sin(phase);
      const v = -p.position * w * Math.sin(phase) + p.velocity * Math.cos(phase) + f * (Math.sin(phase) + w * t * Math.cos(phase));
      expect(actual.position).toBeCloseTo(x, 9); expect(actual.velocity).toBeCloseTo(v, 8); expect(actual.particularPosition).toBeNull();
    }
    const t = (seed % 5 + .37) * model.naturalPeriod, reference = drivenState(model, t);
    for (const offset of [-1e-10, 1e-10]) {
      const near = drivenState(drivenModel({ ...p, frequencyRatio: 1 + offset }), t);
      expect(Math.abs(near.position - reference.position)).toBeLessThan(2e-7); expect(Math.abs(near.velocity - reference.velocity)).toBeLessThan(1e-6);
    }
    const damped = drivenModel({ ...p, dampingRatio: 1e-6 }), response = drivenResponse(damped);
    expect(response.amplitude!).toBeGreaterThan(10000); expect(drivenState(damped, 0).position).toBe(p.position);
    const nearZero = drivenState(damped, 1e-7 / w); expect(Math.abs(nearZero.position - p.position - p.velocity * 1e-7 / w)).toBeLessThan(1e-12);
  }
});

it("keeps the static, zero-force, near-critical and persistent undamped cases distinct", () => {
  const staticInput = { mass: 1, stiffness: 4, dampingRatio: 1, force: .8, frequencyRatio: 0, position: .03, velocity: -.2 }, staticModel = drivenModel(staticInput);
  expect(drivenResponse(staticModel)).toMatchObject({ kind: "constant", amplitude: .2, meanPower: 0, period: null, cycleWork: null, lag: 0 });
  for (const t of [0, .1, 1, 4]) {
    const actual = drivenState(staticModel, t), x = .2 + (-.17 - .54 * t) * Math.exp(-2 * t), v = (-.2 + 1.08 * t) * Math.exp(-2 * t);
    expect(actual.position).toBeCloseTo(x, 12); expect(actual.velocity).toBeCloseTo(v, 12);
    for (const offset of [-1e-9, 1e-9]) { const near = drivenState(drivenModel({ ...staticInput, dampingRatio: 1 + offset }), t); expect(Math.abs(near.position - actual.position)).toBeLessThan(1e-8); }
  }
  const p = { ...base, dampingRatio: 0, frequencyRatio: .5 }, model = drivenModel(p), particular = drivenResponse(model);
  const initialCorrection = p.position - particular.cosine!, initialSpeed = p.velocity - model.omega * particular.sine!;
  for (const cycles of [0, 1, 4, 12]) {
    const t = cycles * model.naturalPeriod, actual = drivenState(model, t), correction = initialCorrection * Math.cos(model.omega0 * t) + initialSpeed / model.omega0 * Math.sin(model.omega0 * t);
    expect(actual.position - actual.particularPosition!).toBeCloseTo(correction, 11);
  }
  expect(Math.abs(initialCorrection)).toBeGreaterThan(.01);
  for (const dampingRatio of [0, .5, 1, 3]) {
    const zero = drivenModel({ ...base, dampingRatio, force: 0, frequencyRatio: 1, position: 0, velocity: 0 });
    expect(drivenResponse(zero)).toMatchObject({ kind: "zero-force", amplitude: 0, lag: null, meanPower: 0, period: null });
    expect(drivenPeaks(zero).kind).toBe("zero-force"); expect(drivenState(zero, 2).energy).toBe(0);
  }
});

it("checks 50 coefficient substitutions, phase quadrants and independently integrated periodic work accounts", () => {
  for (let seed = 0; seed < 50; seed++) {
    const model = drivenModel({ ...base, mass: .5 + seed % 5 / 2, stiffness: 3 + seed % 9, dampingRatio: .02 + seed % 7 / 5, force: .2 + seed % 8 / 10, frequencyRatio: [.2, .7, 1, 1.3, 3][seed % 5] });
    const r = drivenResponse(model), C = r.cosine!, D = r.sine!, w = r.omega, real = model.stiffness - model.mass * w * w;
    expect(real * C + model.b * w * D).toBeCloseTo(model.force, 11); expect(real * D - model.b * w * C).toBeCloseTo(0, 11);
    expect(r.amplitude! * Math.cos(r.lag!)).toBeCloseTo(C, 12); expect(r.amplitude! * Math.sin(r.lag!)).toBeCloseTo(D, 12);
    if (model.frequencyRatio < 1) expect(r.lag!).toBeLessThan(Math.PI / 2); else if (model.frequencyRatio > 1) expect(r.lag!).toBeGreaterThan(Math.PI / 2); else expect(r.lag).toBe(Math.PI / 2);
    let input = 0, loss = 0; const count = 2048, h = r.period! / count;
    for (let i = 0; i < count; i++) { const t = (i + .5) * h + .123, v = w * (-C * Math.sin(w * t) + D * Math.cos(w * t)); input += model.force * Math.cos(w * t) * v * h; loss += model.b * v * v * h; }
    expect(input).toBeCloseTo(loss, 10); expect(input / r.period!).toBeCloseTo(r.meanPower!, 10); expect(input).toBeCloseTo(r.cycleWork!, 10);
    const hTime = 1e-5 / model.omega0, time = .31 * model.naturalPeriod, state = drivenState(model, time);
    const derivative = (drivenState(model, time + hTime).energy - drivenState(model, time - hTime).energy) / (2 * hTime);
    expect(derivative).toBeCloseTo(state.inputPower - state.dissipativePower, 6);
  }
});

it("locates output-specific peaks and exact half-power points using independent derivative signs over 50 cases", () => {
  for (let seed = 0; seed < 50; seed++) {
    const model = drivenModel({ ...base, dampingRatio: [.000001, .03, .2, .6, 1 / Math.sqrt(2), .8, 1, 3][seed % 8], mass: .2 + seed % 7 / 4, stiffness: 2 + seed % 11 }), p = drivenPeaks(model);
    expect(p.kind).toBe("damped");
    const w0Squared = model.stiffness / model.mass, slope = (w: number) => -4 * model.mass * w * (model.stiffness - model.mass * w * w) + 2 * model.b * model.b * w;
    if (p.displacementRatio! > 0) {
      const peak = p.displacementRatio! * model.omega0; expect(slope(peak * .999)).toBeLessThan(0); expect(slope(peak * 1.001)).toBeGreaterThan(0);
    } else { for (const ratio of [.0001, .1, 1, 4]) expect(slope(ratio * model.omega0)).toBeGreaterThan(0); }
    const powerDerivativeSign = (w: number) => model.stiffness ** 2 - model.mass ** 2 * w ** 4;
    expect(powerDerivativeSign(.99 * model.omega0)).toBeGreaterThan(0); expect(powerDerivativeSign(1.01 * model.omega0)).toBeLessThan(0);
    const peakPower = model.force ** 2 / (2 * model.b), peakVelocity = model.force / model.b;
    expect(drivenResponse(model, 1).meanPower).toBeCloseTo(peakPower, 6); expect(drivenResponse(model, 1).velocityAmplitude).toBeCloseTo(peakVelocity, 7);
    const half = p.halfPower!;
    for (const ratio of [half.lower, half.upper]) { const w = ratio * model.omega0; expect(Math.abs(w0Squared - w * w)).toBeCloseTo(model.b / model.mass * w, 8); expect(drivenResponse(model, ratio).meanPower! / peakPower).toBeCloseTo(.5, 9); }
    expect((half.upper - half.lower) * model.omega0).toBeCloseTo(model.b / model.mass, 11); expect(p.quality! / (model.omega0 / (model.b / model.mass))).toBeCloseTo(1, 14);
  }
  const narrow = drivenRun({ ...base, dampingRatio: 1e-6, cycles: .25, intervals: 64 });
  expect(narrow.events.map(event => event.response.ratio)).toContain(1); expect(narrow.sweep).toHaveLength(129);
  expect(drivenPeaks(drivenModel({ ...base, dampingRatio: 0 }))).toMatchObject({ kind: "undamped", halfPower: null });
});

it("compares independent signed work and viscous integrals at two resolutions without forcing energy agreement", () => {
  for (let seed = 0; seed < 50; seed++) {
    const p = { ...base, dampingRatio: [0, .05, .5, 1, 2][seed % 5], frequencyRatio: [.5, .8, 1, 1.2, 2][seed * 3 % 5], position: (seed % 5 - 2) / 20, velocity: (seed % 7 - 3) / 10, cycles: 2, intervals: 128 as const };
    const run = drivenRun(p), reference = integrate(p, run.duration), final = run.fine.states.at(-1)!;
    expect(final.inputWork).toBeCloseTo(reference.inputWork, 5); expect(final.dissipated).toBeCloseTo(reference.dissipated, 5);
    expect(run.fine.maxBalanceResidual).toBeLessThan(run.coarse.maxBalanceResidual * .12 + 1e-12);
    expect(run.maxWorkDifference).toBeGreaterThan(0);
    expect(final.energy - run.model.initialEnergy).toBeCloseTo(reference.inputWork - reference.dissipated, 8);
    for (let i = 1; i < run.fine.states.length; i++) expect(run.fine.states[i].dissipated).toBeGreaterThanOrEqual(run.fine.states[i - 1].dissipated);
    const cycle = run.cycle!, record = cycle.fine.states, elapsed = cycle.end - cycle.start;
    expect(elapsed * run.model.omega).toBeCloseTo(2 * Math.PI, 12);
    expect(record.at(-1)!.inputWork - record.at(-1)!.dissipated).toBeCloseTo(record.at(-1)!.energy - record[0].energy, 6);
  }
  const startup = drivenRun({ ...base, position: 0, velocity: 0, frequencyRatio: 1, cycles: 1, intervals: 256 });
  const cycle = startup.cycle!, mean = cycle.fine.states.at(-1)!.inputWork / (cycle.end - cycle.start);
  expect(Math.abs(mean - startup.response.meanPower!)).toBeGreaterThan(.03); expect(cycle.fine.states.at(-1)!.energy).toBeGreaterThan(0);
  expect(drivenRun({ ...base, frequencyRatio: .25, cycles: .25, intervals: 64 }).cycle).toBeNull();
  expect(drivenRun({ ...base, frequencyRatio: 0, cycles: 2, intervals: 64 }).cycle).toBeNull();
  const reverse = drivenRun({ ...base, position: 0, velocity: -1, cycles: 1, intervals: 64 }); expect(reverse.fine.states.some(s => s.inputPower < 0)).toBe(true);
});

it("enforces the disclosed numerical domains and checks limiting response scales", () => {
  for (const change of [{ mass: 0 }, { stiffness: 0 }, { dampingRatio: -1 }, { dampingRatio: 1e-9 }, { frequencyRatio: 4.01 }, { force: 21 }, { force: 1e-9 }, { position: NaN }, { velocity: Infinity }, { extra: 1 }]) expect(drivenModelSchema.safeParse({ ...base, ...change }).success).toBe(false);
  for (const change of [{ cycles: 0 }, { cycles: 12.01 }, { intervals: 65 }]) expect(drivenInputSchema.safeParse({ ...base, cycles: 1, intervals: 64, ...change }).success).toBe(false);
  const model = drivenModel(base);
  for (const time of [-1, NaN, Infinity, 13 * model.naturalPeriod]) expect(() => drivenState(model, time)).toThrow();
  for (const ratio of [-1, NaN, Infinity, 8.01]) expect(() => drivenResponse(model, ratio)).toThrow();
  expect(drivenResponse(model, 1e-9).amplitude).toBeCloseTo(base.force / base.stiffness, 13);
  const high = drivenResponse(model, 8); expect(high.amplitude! * base.mass * high.omega ** 2 / base.force).toBeCloseTo(1, 1); expect(high.lag!).toBeGreaterThan(3);
  const extreme = drivenModel({ mass: .05, stiffness: 200, dampingRatio: 3, force: 20, frequencyRatio: 4, position: -.5, velocity: 5 });
  const time = 12 * extreme.naturalPeriod, reference = integrate({ mass: .05, stiffness: 200, dampingRatio: 3, force: 20, frequencyRatio: 4, position: -.5, velocity: 5 }, time, 65536), actual = drivenState(extreme, time);
  expect(actual.position).toBeCloseTo(reference.position, 9); expect(actual.velocity).toBeCloseTo(reference.velocity, 8);
});
