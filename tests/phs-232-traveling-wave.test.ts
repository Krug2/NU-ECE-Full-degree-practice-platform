import { expect, it } from "vitest";
import { travelingWaveInputSchema, travelingWaveModel, travelingWaveModelSchema, travelingWavePatternPosition, travelingWavePoint, travelingWaveRecording, travelingWaveRegionEnergy, travelingWaveRun, type TravelingWaveModelInput } from "../lib/learning/phs-232-traveling-wave";

const base: TravelingWaveModelInput = { profile: "harmonic", direction: 1, tension: 8, density: .02, amplitude: .02, frequency: 5, phase: .3, width: .5 };
function fixture(seed: number, profile: "harmonic" | "gaussian"): TravelingWaveModelInput {
  return { profile, direction: seed % 2 ? -1 : 1, tension: 1 + seed % 10, density: .005 + seed % 9 / 100, amplitude: .001 * (1 + seed % 4), frequency: .2 + seed % 7, phase: (seed % 7 - 3) / 5, width: .15 + seed % 8 / 10 };
}
function profile(p: TravelingWaveModelInput, x: number, t: number) {
  const c = Math.sqrt(p.tension / p.density);
  return p.profile === "harmonic"
    ? p.amplitude * Math.cos(2 * Math.PI * p.frequency * (x / c - p.direction * t) + p.phase)
    : p.amplitude * Math.exp(-.5 * ((x + p.direction * 2.5 * p.width - p.direction * c * t) / p.width) ** 2);
}
const midpoint = (f: (v: number) => number, a: number, b: number, n = 8192) => { const h = (b - a) / n; let sum = 0; for (let j = 0; j < n; j++) sum += f(a + (j + .5) * h); return sum * h; };
function reference(p: TravelingWaveModelInput, x: number, t: number) {
  const c = Math.sqrt(p.tension / p.density), length = p.profile === "harmonic" ? c / p.frequency : p.width, h = length * 1e-5;
  const slope = (profile(p, x + h, t) - profile(p, x - h, t)) / (2 * h);
  const dt = h / c, velocity = (profile(p, x, t + dt) - profile(p, x, t - dt)) / (2 * dt);
  return { energy: .5 * (p.density * velocity ** 2 + p.tension * slope ** 2), power: -p.tension * slope * velocity };
}

it("checks 50 varied states per profile using shifted shapes and independent finite partial derivatives", () => {
  for (let seed = 0; seed < 50; seed++) for (const kind of ["harmonic", "gaussian"] as const) {
    const input = fixture(seed, kind), p = travelingWaveModel(input), dt = p.timeUnit * 1e-4, dx = p.scale * 1e-4;
    for (const fraction of [-1.13, -.37, 0, .61, 1.42]) {
      const x = fraction * p.scale, t = .713 * p.timeUnit, actual = travelingWavePoint(p, x, t), y = profile(input, x, t);
      expect(actual.displacement).toBeCloseTo(profile(input, x - p.direction * p.speed * t, 0), 13);
      const yt = (profile(input, x, t + dt) - profile(input, x, t - dt)) / (2 * dt), yx = (profile(input, x + dx, t) - profile(input, x - dx, t)) / (2 * dx);
      const ytt = (profile(input, x, t + dt) - 2 * y + profile(input, x, t - dt)) / dt ** 2, yxx = (profile(input, x + dx, t) - 2 * y + profile(input, x - dx, t)) / dx ** 2;
      expect(Math.abs(actual.velocity - yt) / (p.amplitude / p.timeUnit)).toBeLessThan(5e-7);
      expect(Math.abs(actual.slope - yx) / (p.amplitude / p.scale)).toBeLessThan(5e-7);
      expect(Math.abs(actual.acceleration - ytt) / (p.amplitude / p.timeUnit ** 2)).toBeLessThan(3e-6);
      expect(Math.abs(actual.curvature - yxx) / (p.amplitude / p.scale ** 2)).toBeLessThan(3e-6);
      expect(actual.power * p.direction).toBeGreaterThanOrEqual(0); expect(actual.energyDensity).toBeGreaterThanOrEqual(0);
    }
    const t = 3.5 * p.timeUnit, pattern = travelingWavePatternPosition(p, t)!;
    expect(travelingWavePoint(p, pattern, t).displacement).toBeCloseTo(p.amplitude, 12);
    expect(travelingWavePoint(p, pattern, t).velocity).toBeCloseTo(0, 10);
    expect(travelingWavePatternPosition(p, t + .1 * p.timeUnit)! - pattern).toBeCloseTo(p.direction * p.speed * .1 * p.timeUnit, 10);
  }
});

it("derives local stretch energy from neighboring points and distinguishes a crest from an isolated oscillator", () => {
  for (let seed = 0; seed < 50; seed++) {
    const input = { ...fixture(seed, "harmonic"), phase: .3 + seed / 11 }, p = travelingWaveModel(input), x = .31 * p.scale, t = .27 * p.timeUnit, dx = p.scale * 1e-5;
    const dy = profile(input, x + dx / 2, t) - profile(input, x - dx / 2, t), measuredSlope = dy / dx;
    const stretchPerLength = p.tension * measuredSlope ** 2 / (Math.sqrt(1 + measuredSlope ** 2) + 1), state = travelingWavePoint(p, x, t);
    expect(Math.abs(state.potential - stretchPerLength) / (state.potential || 1)).toBeLessThan(.01);
    expect(state.potential / stretchPerLength).toBeCloseTo((Math.sqrt(1 + measuredSlope ** 2) + 1) / 2, 6);
    expect(state.kinetic).toBeCloseTo(state.potential, 12);
    const crest = travelingWavePoint(p, travelingWavePatternPosition(p, t)!, t);
    expect(crest.energyDensity).toBeLessThan(1e-20);
    expect(Math.abs(crest.acceleration)).toBeGreaterThan(0);
    const crossing = travelingWavePoint(p, travelingWavePatternPosition(p, t)! + p.scale / 4, t);
    expect(crossing.energyDensity).toBeCloseTo(p.density * (p.amplitude * 2 * Math.PI * p.frequency) ** 2, 12);
  }
});

it("checks harmonic energy per wavelength and signed cycle work with 50 independent spatial and temporal quadratures", () => {
  for (let seed = 0; seed < 50; seed++) {
    const input = fixture(seed, "harmonic"), p = travelingWaveModel(input), x = .23 * p.scale, t = .17 * p.timeUnit;
    const energy = midpoint(q => reference(input, q, t).energy, x, x + p.scale, 4096);
    const work = midpoint(q => reference(input, x, q).power, t, t + p.timeUnit, 4096);
    expect(energy / (p.meanDensity! * p.scale)).toBeCloseTo(1, 7);
    expect(work / (p.meanPower! * p.timeUnit)).toBeCloseTo(1, 7);
    expect(Math.abs(work) / energy).toBeCloseTo(1, 10);
    expect(travelingWaveRegionEnergy(p, x, x + p.scale, t, 64) / energy).toBeCloseTo(1, 7);
  }
});

it("checks 50 finite-energy pulses without assigning them a wavelength or oscillation period", () => {
  for (let seed = 0; seed < 50; seed++) {
    const input = fixture(seed, "gaussian"), p = travelingWaveModel(input), t = 2.5 * p.timeUnit;
    const energy = midpoint(x => reference(input, x, t).energy, -12 * p.width, 12 * p.width);
    expect(energy / p.totalPulseEnergy!).toBeCloseTo(1, 8);
    expect(p.period).toBeNull(); expect(p.wavelength).toBeNull(); expect(p.meanPower).toBeNull();
    expect(travelingWavePoint(p, 0, t).energyDensity).toBeCloseTo(0, 12);
    const flank = travelingWavePoint(p, p.width, t);
    expect(flank.energyDensity).toBeCloseTo(p.tension * (p.amplitude / p.width) ** 2 / Math.E, 12);
    expect(() => travelingWaveRecording(p, .125, .125, 0)).toThrow();
  }
});

it("checks 50 independently integrated finite-region energy ledgers, signed boundaries and refinement", () => {
  for (let seed = 0; seed < 50; seed++) {
    const input = fixture(seed, seed % 3 ? "harmonic" : "gaussian");
    const run = travelingWaveRun({ ...input, regionWidth: .37 + .013 * seed, duration: input.profile === "harmonic" ? .37 + seed % 8 * .19 : 4.1 + seed % 7 * .23, intervals: 64 }), p = run.model;
    const initial = midpoint(x => reference(input, x, 0).energy, run.left, run.right, 4096);
    const energy = midpoint(x => reference(input, x, run.end).energy, run.left, run.right, 4096);
    const leftWork = midpoint(t => reference(input, run.left, t).power, 0, run.end), rightWork = midpoint(t => reference(input, run.right, t).power, 0, run.end);
    const scale = p.tension * (p.amplitude / p.scale) ** 2 * (run.right - run.left), actual = run.fine.at(-1)!;
    expect(Math.abs(actual.energy - energy) / scale).toBeLessThan(2e-6);
    expect(Math.abs(actual.leftWork - leftWork) / scale).toBeLessThan(3e-6);
    expect(Math.abs(actual.rightWork - rightWork) / scale).toBeLessThan(3e-6);
    expect(Math.abs(energy - initial - leftWork + rightWork) / scale).toBeLessThan(2e-6);
    expect(run.fineResidual / scale).toBeLessThan(2e-5);
    expect(run.fineResidual).toBeLessThan(run.coarseResidual * .08 + scale * 1e-12);
    expect(actual.leftWork * p.direction).toBeGreaterThanOrEqual(0); expect(actual.rightWork * p.direction).toBeGreaterThanOrEqual(0);
    expect(run.coarse).toHaveLength(65); expect(run.fine).toHaveLength(129);
    for (let i = 0; i < run.coarse.length; i++) expect(run.coarse[i].time).toBeCloseTo(run.fine[2 * i].time, 12);
  }
});

it("checks local energy continuity and same-state direction reversal at 50 off-grid locations", () => {
  for (let seed = 0; seed < 50; seed++) {
    const p = travelingWaveModel(fixture(seed, seed % 2 ? "harmonic" : "gaussian")), x = .183 * p.scale, t = .613 * p.timeUnit, h = 1e-5;
    const ut = (travelingWavePoint(p, x, t + h * p.timeUnit).energyDensity - travelingWavePoint(p, x, t - h * p.timeUnit).energyDensity) / (2 * h * p.timeUnit);
    const px = (travelingWavePoint(p, x + h * p.scale, t).power - travelingWavePoint(p, x - h * p.scale, t).power) / (2 * h * p.scale);
    expect(Math.abs(ut + px) / (p.tension * (p.amplitude / p.scale) ** 2 / p.timeUnit)).toBeLessThan(1e-7);
    const source = fixture(seed, "harmonic"), right = travelingWavePoint(travelingWaveModel({ ...source, direction: 1 }), x, 0), left = travelingWavePoint(travelingWaveModel({ ...source, direction: -1 }), x, 0);
    expect(right.displacement).toBe(left.displacement); expect(right.energyDensity).toBe(left.energyDensity);
    expect(right.velocity).toBe(-left.velocity); expect(right.power).toBe(-left.power);
  }
});

it("enumerates periodic snapshot aliases over 50 phases with resolved, reversed, frozen and half-cycle records", () => {
  for (let seed = 0; seed < 50; seed++) {
    const p = travelingWaveModel(fixture(seed, "harmonic"));
    for (const timeStep of [.125, .5, .75, 1, 1.25]) for (const spaceStep of [.125, .5, .75, 1]) {
      const r = travelingWaveRecording(p, timeStep, spaceStep, .13 * p.scale);
      const candidates = Array.from({ length: 33 }, (_, i) => (i - 16) / 8).filter(shift =>
        [.017, .173, .491].every(x => Math.abs(profile(p, (x - shift) * p.scale, 0) - profile(p, x * p.scale, timeStep * p.timeUnit)) < 1e-10));
      expect(candidates.length).toBeGreaterThan(2);
      const best = Math.min(...candidates.map(Math.abs)), principal = candidates.filter(v => Math.abs(Math.abs(v) - best) < 1e-10);
      if (principal.length > 1) { expect(r.halfAmbiguity).toBe(true); expect(r.principalShift).toBeNull(); }
      else { expect(r.halfAmbiguity).toBe(false); expect(r.principalShift! / p.scale).toBeCloseTo(principal[0], 11); }
      if (timeStep === 1) for (const row of r.temporal) expect(row.displacement).toBeCloseTo(r.temporal[0].displacement, 12);
      if (timeStep === .75) expect(r.apparentVelocity! * p.direction).toBeLessThan(0);
      if (spaceStep === 1) for (const row of r.spatial) expect(row.first).toBeCloseTo(r.spatial[0].first, 12);
      expect(r.spatial).toHaveLength(17); expect(r.temporal).toHaveLength(9);
    }
  }
});

it("handles zero amplitude, physical-domain limits, invalid input and the explicit small-slope guard", () => {
  for (const profile of ["harmonic", "gaussian"] as const) {
    const run = travelingWaveRun({ ...base, profile, amplitude: 0, regionWidth: .7, duration: 4, intervals: 64 });
    expect(travelingWavePatternPosition(run.model, 0)).toBeNull();
    for (const row of run.fine) { expect(row.energy).toBe(0); expect(row.netWork).toBe(0); }
    if (profile === "harmonic") expect(travelingWaveRecording(run.model, .5, 1, 0)).toMatchObject({ principalShift: null, halfAmbiguity: false, apparentVelocity: null });
  }
  const harmonicLimit = { ...base, tension: 1, density: 1, frequency: 1, amplitude: .2 / (2 * Math.PI) };
  const pulseLimit = { ...base, profile: "gaussian" as const, width: .1, amplitude: .02 * Math.sqrt(Math.E) };
  for (const p of [harmonicLimit, pulseLimit]) { expect(travelingWaveModelSchema.safeParse(p).success).toBe(true); expect(travelingWaveModelSchema.safeParse({ ...p, amplitude: p.amplitude * 1.000001 }).success).toBe(false); }
  for (const [key, value] of [["tension", 0], ["density", 0], ["frequency", 0], ["amplitude", -.01], ["width", 0], ["direction", 0], ["phase", Infinity], ["density", NaN], ["amplitude", ""], ["extra", 1]] as const) expect(travelingWaveModelSchema.safeParse({ ...base, [key]: value }).success).toBe(false);
  const input = { ...base, regionWidth: .7, duration: 4, intervals: 64 };
  for (const invalid of [{ duration: 4.01 }, { intervals: 65 }, { regionWidth: 0 }]) expect(travelingWaveInputSchema.safeParse({ ...input, ...invalid }).success).toBe(false);
  const p = travelingWaveModel(base);
  expect(() => travelingWavePoint(p, 0, -1)).toThrow(); expect(() => travelingWavePoint(p, Infinity, 0)).toThrow();
  expect(() => travelingWaveRegionEnergy(p, 1, 0, 0, 64)).toThrow(); expect(() => travelingWaveRegionEnergy(p, 0, 1, 0, 63)).toThrow();
  expect(() => travelingWaveRecording(p, 0, 1, 0)).toThrow(); expect(() => travelingWaveRecording(p, 1, .2, 0)).toThrow();
  for (const extremes of [{ tension: 100, density: .001, frequency: .1, amplitude: .1 }, { tension: .1, density: 2, frequency: 20, amplitude: .0001 }]) {
    const model = travelingWaveModel({ ...base, ...extremes });
    for (const t of [0, 16 * model.timeUnit]) for (const x of [-100, 0, 100]) {
      const values = travelingWavePoint(model, x * model.scale, t);
      expect(Object.values(values).every(Number.isFinite)).toBe(true);
    }
  }
});
