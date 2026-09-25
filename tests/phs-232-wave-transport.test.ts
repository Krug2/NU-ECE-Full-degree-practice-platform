import { expect, it } from "vitest";
import { phs232WaveTransportQuestion, phs232WaveTransportVariants } from "../lib/learning/families/phs-232-wave-transport";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import { parsePiNumber } from "../lib/learning/pi-number";
import type { Question } from "../lib/learning/contracts";

const exactValue = (text: string) => approximateExact(parseExact(text)).real;
const piValue = (text: string) => { const p = parsePiNumber(text), at = (poly: typeof p.numerator) => poly.reduce((sum, r, i) => sum + Number(r.numerator) / Number(r.denominator) * Math.PI ** i, 0); return at(p.numerator) / at(p.denominator); };
const midpoint = (f: (x: number) => number, end: number, steps = 4096) => { let sum = 0; for (let i = 0; i < steps; i++) sum += f((i + .5) * end / steps); return sum * end / steps; };
const changes = [[4, 1], [1, 4], [9, 4], [.25, 9]];
function answers(q: Question, variant: string): Record<string, string> {
  const p = q.parameters, mu = "(" + p.m + "/1000)", amp = "(" + p.a + "/1000)", w = p.k * p.c, T = p.m * p.c * p.c + "/1000", speed = "sqrt((" + T + ")/" + mu + ")", density = mu + "*" + amp + "^2*" + w + "^2/2";
  if (variant === "string-speed") return { speed, wavelength: "2*pi*" + p.c + "/" + w, tension: mu + "*(2*" + p.c + ")^2" };
  if (variant === "density-unit") return { density: "(" + p.m * p.length + "/1000)/" + p.length, speed, bias: "sqrt(1/1000)" };
  if (variant === "average-power") return { density, power: p.direction * p.c + "*(" + density + ")", stored: "(" + density + ")*(2*pi*" + p.c + "/" + w + ")", crossing: "(" + density + ")*" + p.direction * p.c + "*(2*pi/" + w + ")" };
  if (variant === "energy-density") {
    const sin2 = Math.round(2 * Math.sin(p.phaseIndex * Math.PI / 4) ** 2) + "/2", K = "(" + density + ")*(" + sin2 + ")";
    return { kinetic: K, potential: "(" + T + ")*" + amp + "^2*" + p.k + "^2*(" + sin2 + ")/2", total: "2*(" + K + ")", power: p.direction * p.c + "*2*(" + K + ")", isolated: "no" };
  }
  if (variant === "amplitude-scaling") return { power: p.amplitudeFactor + "^2*" + p.frequencyFactor + "^2", particle: String(p.amplitudeFactor * p.frequencyFactor), wave: "1", wavelength: "1/" + p.frequencyFactor };
  const [tensionRatio, densityRatio] = changes[p.mode], speedRatio = Math.sqrt(tensionRatio / densityRatio), ratio = speedRatio === 1 / 6 ? "1/6" : String(speedRatio);
  return { speed: ratio, wavelength: ratio, frequency: "1", density: String(densityRatio), power: "(" + ratio + ")*" + densityRatio };
}
function numerical(p: Question["parameters"], x: number, t: number, amplitudeScale = 1, omegaScale = 1, tensionScale = 1, densityScale = 1) {
  const mu = p.m / 1000 * densityScale, tension = p.m * p.c ** 2 / 1000 * tensionScale, speed = Math.sqrt(tension / mu), omega = p.k * p.c * omegaScale, waveNumber = omega / speed, amp = p.a / 1000 * amplitudeScale, phase = p.phaseIndex * Math.PI / 4;
  const shape = (position: number, time: number) => amp * Math.cos(waveNumber * position - p.direction * omega * time + phase);
  const dx = 1e-5 / waveNumber, dt = 1e-5 / omega, slope = (shape(x + dx, t) - shape(x - dx, t)) / (2 * dx), velocity = (shape(x, t + dt) - shape(x, t - dt)) / (2 * dt);
  const kinetic = mu * velocity ** 2 / 2, potential = tension * slope ** 2 / 2;
  return { speed, omega, waveNumber, amplitude: amp, kinetic, potential, power: -tension * slope * velocity };
}

it.each(phs232WaveTransportVariants)("checks %s across 50 deterministic seeds with independent units, geometry and flux", variant => {
  for (let seed = 0; seed < 50; seed++) {
    const q = phs232WaveTransportQuestion("phs232-wave-transport", variant, "transport-" + seed, "q"), response = answers(q, variant), p = q.parameters;
    expect(q).toEqual(phs232WaveTransportQuestion(q.familyId, variant, "transport-" + seed, "q"));
    expect(gradeQuestion(q, response).correct, JSON.stringify({ variant, seed, response })).toBe(true);
    expect(q).toMatchObject({ courseId: "phs-232", objectiveId: "m02-l01", familyVersion: 1, critical: true });
    for (const field of q.fields) {
      for (const invalid of ["", "NaN", "Infinity", "1/0", "2 J"]) expect(gradeField(field, invalid).valid).toBe(false);
      if (field.kind === "choice") for (const option of field.options.filter(o => o.id !== response[field.id])) expect(gradeField(field, option.id).correct).toBe(false);
      else { expect(gradeField(field, "(" + response[field.id] + ")+1").correct).toBe(false); expect(gradeField(field, "sqrt(-1)").correct).toBe(false); }
    }
    const density = p.m / 1000, tension = density * p.c ** 2, omega = p.k * p.c, period = 2 * Math.PI / omega, wavelength = 2 * Math.PI / p.k;
    if (variant === "string-speed") {
      expect(density * exactValue(response.speed) ** 2).toBeCloseTo(tension, 12);
      expect(piValue(response.wavelength) / period).toBeCloseTo(exactValue(response.speed), 12);
      expect(Math.sqrt(exactValue(response.tension) / density)).toBeCloseTo(2 * p.c, 12);
      expect(gradeField(q.fields[0], String(-p.c)).correct).toBe(false);
    }
    if (variant === "density-unit") {
      expect(exactValue(response.density) * p.length * 1000).toBeCloseTo(p.m * p.length, 12);
      const wrong = Math.sqrt(tension / p.m), correct = Math.sqrt(tension / density);
      expect(exactValue(response.bias)).toBeCloseTo(wrong / correct, 12);
      expect(gradeField(q.fields[0], String(p.m)).correct).toBe(false);
      expect(gradeField(q.fields[2], "sqrt(1000)").correct).toBe(false);
    }
    if (variant === "average-power") {
      const stored = midpoint(x => { const state = numerical(p, x, .13 * period); return state.kinetic + state.potential; }, wavelength);
      const crossing = midpoint(t => numerical(p, .23 * wavelength, t).power, period);
      expect(stored / wavelength).toBeCloseTo(exactValue(response.density), 11);
      expect(crossing / period).toBeCloseTo(exactValue(response.power), 10);
      expect(stored).toBeCloseTo(piValue(response.stored), 10);
      expect(crossing).toBeCloseTo(piValue(response.crossing), 10);
      expect(stored).toBeGreaterThan(0); expect(crossing * p.direction).toBeGreaterThan(0);
      expect(gradeField(q.fields.find(f => f.id === "power")!, "-(" + response.power + ")").correct).toBe(false);
    }
    if (variant === "energy-density") {
      const state = numerical(p, 0, 0), K = exactValue(response.kinetic), U = exactValue(response.potential);
      expect(state.kinetic).toBeCloseTo(K, 11); expect(state.potential).toBeCloseTo(U, 11);
      expect(state.power).toBeCloseTo(exactValue(response.power), 10);
      const dx = 1e-5 / p.k, A = p.a / 1000, phi = p.phaseIndex * Math.PI / 4;
      const dy = A * (Math.cos(phi + p.k * dx / 2) - Math.cos(phi - p.k * dx / 2)), slope = dy / dx;
      const geometry = tension * slope ** 2 / (Math.sqrt(1 + slope ** 2) + 1);
      expect(Math.abs(geometry - U)).toBeLessThan(Math.max(U * .00011, 1e-14));
      expect(exactValue(response.total)).toBeCloseTo(K + U, 12);
      if (p.phaseIndex === 0 || p.phaseIndex === 4) { expect(K).toBe(0); expect(U).toBe(0); }
    }
    if (variant === "amplitude-scaling") {
      const before = midpoint(t => numerical(p, 0, t).power, period) / period, newPeriod = period / p.frequencyFactor;
      const after = midpoint(t => numerical(p, 0, t, p.amplitudeFactor, p.frequencyFactor).power, newPeriod) / newPeriod;
      expect(after / before).toBeCloseTo(exactValue(response.power), 7);
      const state = numerical(p, 0, 0, p.amplitudeFactor, p.frequencyFactor);
      expect(state.amplitude * state.waveNumber).toBeLessThanOrEqual(.18);
      expect(state.speed / p.c).toBeCloseTo(1, 12);
      expect((state.amplitude * state.omega) / (p.a / 1000 * omega)).toBeCloseTo(exactValue(response.particle), 12);
      expect(p.k / state.waveNumber).toBeCloseTo(exactValue(response.wavelength), 12);
    }
    if (variant === "medium-change") {
      const [tensionScale, densityScale] = changes[p.mode], state = numerical(p, 0, 0, 1, 1, tensionScale, densityScale);
      const before = midpoint(t => numerical(p, 0, t).power, period) / period, after = midpoint(t => numerical(p, 0, t, 1, 1, tensionScale, densityScale).power, period) / period;
      const energy = midpoint(x => { const row = numerical(p, x, 0, 1, 1, tensionScale, densityScale); return row.kinetic + row.potential; }, 2 * Math.PI / state.waveNumber) / (2 * Math.PI / state.waveNumber);
      const originalEnergy = density * (p.a / 1000 * omega) ** 2 / 2;
      expect(state.speed / p.c).toBeCloseTo(exactValue(response.speed), 12);
      expect(p.k / state.waveNumber).toBeCloseTo(exactValue(response.wavelength), 12);
      expect(state.omega / omega).toBe(exactValue(response.frequency));
      expect(energy / originalEnergy).toBeCloseTo(exactValue(response.density), 8);
      expect(after / before).toBeCloseTo(exactValue(response.power), 8);
      expect(state.amplitude * state.waveNumber).toBeLessThan(.2);
    }
  }
});

it("covers zero and maximum local energy, both directions, every medium comparison and shuffled feedback", () => {
  const phases = new Set<number>(), directions = new Set<number>(), modes = new Set<number>();
  for (let seed = 0; seed < 150; seed++) {
    const q = phs232WaveTransportQuestion("phs232-wave-transport", "energy-density", "energy-coverage-" + seed, "q");
    phases.add(q.parameters.phaseIndex); directions.add(q.parameters.direction);
    modes.add(phs232WaveTransportQuestion("phs232-wave-transport", "medium-change", "media-" + seed, "q").parameters.mode);
  }
  expect(phases.size).toBe(8); expect(directions.size).toBe(2); expect(modes.size).toBe(4);
  expect(() => phs232WaveTransportQuestion("wrong", "string-speed", "s", "q")).toThrow();
  expect(() => phs232WaveTransportQuestion("phs232-wave-transport", "wrong", "s", "q")).toThrow();
});
