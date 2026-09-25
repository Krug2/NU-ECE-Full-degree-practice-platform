import { expect, it } from "vitest";
import { standingModeEnergy, standingModeInputSchema, standingModeModel, standingModePoint, standingModeRun, type StandingModeInput } from "../lib/learning/phs-232-standing-modes";

const base: StandingModeInput = { tension: 8, density: .02, length: 2, amplitude: .02, mode: 3, rightBoundary: "fixed" };
function fixture(seed: number, rightBoundary: "fixed" | "free"): StandingModeInput {
  return { tension: 1 + seed % 9, density: .005 + seed % 8 / 100, length: .75 + seed % 9 / 3, amplitude: .001 + seed % 3 / 1000, mode: 1 + seed % 8, rightBoundary };
}
function profile(p: StandingModeInput, x: number, t: number) {
  const halfWaves = p.rightBoundary === "fixed" ? p.mode : (2 * p.mode - 1) / 2;
  const c = Math.sqrt(p.tension / p.density);
  return p.amplitude / 2 * (Math.sin(Math.PI * halfWaves * (x - c * t) / p.length) + Math.sin(Math.PI * halfWaves * (x + c * t) / p.length));
}
const integral = (f: (x: number) => number, length: number, n = 4096) => { const h = length / n; let sum = 0; for (let i = 0; i < n; i++) sum += f((i + .5) * h); return sum * h; };

it("checks fifty states per boundary against counterwave sums, derivatives and endpoint conditions", () => {
  for (let seed = 0; seed < 50; seed++) for (const boundary of ["fixed", "free"] as const) {
    const input = fixture(seed, boundary), p = standingModeModel(input), dx = p.wavelength * 1e-5, dt = p.period * 1e-5;
    for (const [position, time] of [[.317 * p.length, .231 * p.period], [.731 * p.length, .713 * p.period]]) {
      const y = profile(input, position, time), actual = standingModePoint(p, position, time);
      const slope = (profile(input, position + dx, time) - profile(input, position - dx, time)) / (2 * dx), velocity = (profile(input, position, time + dt) - profile(input, position, time - dt)) / (2 * dt);
      expect(actual.displacement).toBeCloseTo(y, 13); expect(actual.rightward + actual.leftward).toBeCloseTo(y, 13);
      expect(Math.abs(actual.slope - slope) / (p.amplitude / p.wavelength)).toBeLessThan(5e-8);
      expect(Math.abs(actual.velocity - velocity) / (p.amplitude / p.period)).toBeLessThan(5e-8);
      expect(actual.acceleration).toBeCloseTo(p.speed ** 2 * actual.curvature, 11);
    }
    for (const fraction of [.137, .39, .71]) {
      const left = standingModePoint(p, 0, p.period * fraction), right = standingModePoint(p, p.length, p.period * fraction);
      expect(left.displacement).toBeCloseTo(0, 13); expect(left.velocity).toBeCloseTo(0, 13); expect(left.power).toBeCloseTo(0, 13);
      if (boundary === "fixed") expect(right.displacement).toBeCloseTo(0, 13); else expect(right.slope).toBeCloseTo(0, 13);
      expect(right.power).toBeCloseTo(0, 13);
    }
  }
});

it("enumerates boundary roots rather than assuming all integer harmonics for fifty strings", () => {
  for (let seed = 0; seed < 50; seed++) for (const boundary of ["fixed", "free"] as const) {
    const p = standingModeModel(fixture(seed, boundary)), roots: number[] = [];
    const residual = (k: number) => boundary === "fixed" ? Math.sin(k * p.length) : Math.cos(k * p.length);
    for (let j = 1; j <= 8; j++) {
      let left = (j - (boundary === "fixed" ? .49 : .99)) * Math.PI / p.length, right = (j + (boundary === "fixed" ? .49 : -.01)) * Math.PI / p.length;
      for (let n = 0; n < 50; n++) { const mid = (left + right) / 2; if (residual(left) * residual(mid) <= 0) right = mid; else left = mid; }
      roots.push((left + right) / 2);
    }
    p.spectrum.forEach((row, i) => {
      expect(row.frequency).toBeCloseTo(roots[i] * Math.sqrt(p.tension / p.density) / (2 * Math.PI), 10);
      expect(row.frequency / p.spectrum[0].frequency).toBeCloseTo(row.harmonic, 12);
      expect(row.internalNodes).toBe(i);
    });
    const frequency = p.spectrum[p.mode - 1].frequency;
    expect(frequency).toBeCloseTo(p.frequency, 13);
    if (boundary === "free") expect(p.spectrum.map(row => row.harmonic)).toEqual([1, 3, 5, 7, 9, 11, 13, 15]);
    expect(Math.abs(residual(.73 * roots[0]))).toBeGreaterThan(.1);
  }
});

it("checks fifty spatial node and antinode sets and a zero-displacement frame with nonzero motion", () => {
  for (let seed = 0; seed < 50; seed++) for (const boundary of ["fixed", "free"] as const) {
    const input = fixture(seed, boundary), p = standingModeModel(input);
    expect(p.shapeNodes).toHaveLength(p.mode + (boundary === "fixed" ? 1 : 0)); expect(p.shapeAntinodes).toHaveLength(p.mode);
    for (const x of p.shapeNodes) for (const t of [.17, .37, .73]) expect(profile(input, x, t * p.period)).toBeCloseTo(0, 13);
    for (const x of p.shapeAntinodes) {
      expect(Math.abs(profile(input, x, 0))).toBeCloseTo(p.amplitude, 13);
      const row = standingModePoint(p, Math.min(x, p.length), p.period / 4);
      expect(row.displacement).toBeCloseTo(0, 13); expect(Math.abs(row.velocity)).toBeCloseTo(p.amplitude * p.omega, 12);
      expect(row.kinetic).toBeGreaterThan(0); expect(row.potential).toBeLessThan(1e-25);
    }
    const spacing = p.shapeAntinodes.length > 1 ? p.shapeAntinodes[1] - p.shapeAntinodes[0] : p.wavelength / 2;
    expect(spacing).toBeCloseTo(p.wavelength / 2, 12);
  }
});

it("integrates kinetic and geometric stretch energy independently for fifty cases per boundary", () => {
  for (let seed = 0; seed < 50; seed++) for (const boundary of ["fixed", "free"] as const) {
    const input = fixture(seed, boundary), p = standingModeModel(input), dx = p.wavelength * 1e-5, dt = p.period * 1e-5;
    for (const fraction of [0, .137, .25, .413]) {
      const time = fraction * p.period;
      const kinetic = integral(x => p.density / 2 * ((profile(input, x, time + dt) - profile(input, x, time - dt)) / (2 * dt)) ** 2, p.length);
      const potential = integral(x => p.tension / 2 * ((profile(input, x + dx, time) - profile(input, x - dx, time)) / (2 * dx)) ** 2, p.length);
      const actual = standingModeEnergy(p, time, 128), fine = standingModeEnergy(p, time, 256);
      expect(Math.abs(actual.kinetic - kinetic) / p.totalEnergy).toBeLessThan(2e-9);
      expect(Math.abs(actual.potential - potential) / p.totalEnergy).toBeLessThan(2e-9);
      expect((kinetic + potential) / p.totalEnergy).toBeCloseTo(1, 8);
      expect(Math.abs(actual.residual) / p.totalEnergy).toBeLessThan(1e-13);
      expect(Math.abs(fine.total - actual.total) / p.totalEnergy).toBeLessThan(1e-13);
      const geometric = integral(x => { const slope = (profile(input, x + dx / 2, time) - profile(input, x - dx / 2, time)) / dx; return p.tension * slope ** 2 / (Math.sqrt(1 + slope ** 2) + 1); }, p.length);
      expect(Math.abs(potential - geometric) / p.totalEnergy).toBeLessThan(.01);
    }
  }
});

it("checks the full time ledger, instantaneous internal flux and the failure of pointwise traveling-wave energy equality", () => {
  for (const boundary of ["fixed", "free"] as const) {
    const run = standingModeRun({ ...base, rightBoundary: boundary }), p = run.model;
    expect(run.coarse).toHaveLength(257); expect(run.fine).toHaveLength(257);
    for (const row of run.fine) {
      expect(row.kinetic + row.potential).toBeCloseTo(p.totalEnergy, 12);
      expect(row.kinetic / p.totalEnergy).toBeCloseTo(Math.sin(p.omega * row.time) ** 2, 12);
    }
    expect(run.fine[0].kinetic).toBe(0); expect(run.fine[64].potential).toBeLessThan(1e-25);
    const point = standingModePoint(p, .173 * p.length, .113 * p.period);
    expect(Math.abs(point.power)).toBeGreaterThan(1e-5);
    expect(Math.abs(point.kinetic - point.potential)).toBeGreaterThan(1e-5);
    const net = integral(t => standingModePoint(p, .173 * p.length, t).power, p.period);
    expect(net).toBeCloseTo(0, 13);
    expect(run.difference / p.totalEnergy).toBeLessThan(1e-13);
  }
});

it("retains zero-amplitude mode shapes without implying observed motion and rejects invalid domains", () => {
  const p = standingModeModel({ ...base, amplitude: 0 });
  expect(p.atRest).toBe(true); expect(p.shapeNodes).toHaveLength(4);
  expect(standingModeEnergy(p, 0, 128)).toEqual({ kinetic: 0, potential: 0, total: 0, residual: 0 });
  for (const patch of [{ mode: 0 }, { mode: 1.5 }, { mode: 9 }, { rightBoundary: "free-free" }, { density: 0 }, { tension: NaN }, { length: .1 }, { amplitude: -.01 }, { extra: 1 }]) expect(standingModeInputSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  const edge = { ...base, amplitude: .2 * base.length / (base.mode * Math.PI) };
  expect(standingModeInputSchema.safeParse(edge).success).toBe(true);
  expect(standingModeInputSchema.safeParse({ ...edge, amplitude: edge.amplitude * 1.001 }).success).toBe(false);
  for (const [x, t] of [[-.1, 0], [p.length + .1, 0], [0, -1], [0, 9 * p.period], [NaN, 0]]) expect(() => standingModePoint(p, x, t)).toThrow();
  for (const n of [0, 31, 33, 4098, NaN]) expect(() => standingModeEnergy(p, 0, n)).toThrow();
});
