import { expect, it } from "vitest";
import { reflectionCyclePowers, reflectionInputSchema, reflectionModel, reflectionPoint, superpositionInputSchema, superpositionMeanPower, superpositionModel, superpositionNodes, superpositionPoint, type ReflectionInput, type SuperpositionInput } from "../lib/learning/phs-232-superposition";

const base: SuperpositionInput = { tension: 8, density: .02, frequency: 5, firstAmplitude: .01, secondAmplitude: .015, secondDirection: -1, phasePi: .3 };
function fixture(seed: number, secondDirection: 1 | -1): SuperpositionInput {
  return { tension: 1 + seed % 9, density: .005 + seed % 7 / 100, frequency: .25 + seed % 4, firstAmplitude: .001 * (1 + seed % 4), secondAmplitude: .001 * (1 + seed % 5), secondDirection, phasePi: (seed % 17 - 8) / 5 };
}
function profile(p: SuperpositionInput, x: number, t: number) {
  const transit = x / Math.sqrt(p.tension / p.density), cycle = 2 * Math.PI * p.frequency;
  return p.firstAmplitude * Math.cos(cycle * (transit - t)) + p.secondAmplitude * Math.cos(cycle * (transit - p.secondDirection * t) + p.phasePi * Math.PI);
}
const integral = (f: (v: number) => number, a: number, b: number, n = 4096) => { const h = (b - a) / n; let sum = 0; for (let i = 0; i < n; i++) sum += f(a + (i + .5) * h); return sum * h; };
function localReference(p: SuperpositionInput, x: number, t: number) {
  const period = 1 / p.frequency, wavelength = Math.sqrt(p.tension / p.density) * period, dt = period * 1e-5, dx = wavelength * 1e-5;
  const velocity = (profile(p, x, t + dt) - profile(p, x, t - dt)) / (2 * dt), slope = (profile(p, x + dx, t) - profile(p, x - dx, t)) / (2 * dx);
  return { power: -p.tension * slope * velocity, energy: .5 * (p.density * velocity ** 2 + p.tension * slope ** 2) };
}

it("checks fifty varied fields in each direction against independent partial differences and local continuity", () => {
  for (let seed = 0; seed < 50; seed++) for (const direction of [-1, 1] as const) {
    const input = fixture(seed, direction), p = superpositionModel(input), dt = p.period * 1e-4, dx = p.wavelength * 1e-4, amplitude = p.firstAmplitude + p.secondAmplitude;
    for (const fraction of [-.713, .173, 1.137]) {
      const x = fraction * p.wavelength, t = .317 * p.period, actual = superpositionPoint(p, x, t), y = profile(input, x, t);
      expect(actual.displacement).toBeCloseTo(y, 13);
      const velocity = (profile(input, x, t + dt) - profile(input, x, t - dt)) / (2 * dt), slope = (profile(input, x + dx, t) - profile(input, x - dx, t)) / (2 * dx);
      const acceleration = (profile(input, x, t + dt) - 2 * y + profile(input, x, t - dt)) / dt ** 2, curvature = (profile(input, x + dx, t) - 2 * y + profile(input, x - dx, t)) / dx ** 2;
      expect(Math.abs(actual.velocity - velocity) / (amplitude / p.period)).toBeLessThan(5e-7);
      expect(Math.abs(actual.slope - slope) / (amplitude / p.wavelength)).toBeLessThan(5e-7);
      expect(Math.abs(actual.acceleration - acceleration) / (amplitude / p.period ** 2)).toBeLessThan(3e-6);
      expect(Math.abs(actual.curvature - curvature) / (amplitude / p.wavelength ** 2)).toBeLessThan(3e-6);
      expect(actual.acceleration).toBeCloseTo(p.speed ** 2 * actual.curvature, 10);
      const h = 1e-5, ut = (superpositionPoint(p, x, t + h * p.period).energyDensity - superpositionPoint(p, x, t - h * p.period).energyDensity) / (2 * h * p.period);
      const px = (superpositionPoint(p, x + h * p.wavelength, t).power - superpositionPoint(p, x - h * p.wavelength, t).power) / (2 * h * p.wavelength);
      expect(Math.abs(ut + px) / (p.tension * (amplitude / p.wavelength) ** 2 / p.period)).toBeLessThan(2e-7);
    }
  }
});

it("integrates fifty coherent and counterwave cycle powers from finite derivatives at three positions", () => {
  for (let seed = 0; seed < 50; seed++) for (const direction of [-1, 1] as const) {
    const input = fixture(seed, direction), p = superpositionModel(input), scale = p.impedance * (p.omega * (p.firstAmplitude + p.secondAmplitude)) ** 2;
    for (const fraction of [-.13, .23, 1.19]) {
      const x = fraction * p.wavelength, mean = integral(t => localReference(input, x, t).power, 0, p.period) / p.period;
      expect(Math.abs(p.meanPower - mean) / scale).toBeLessThan(1e-8);
      expect(Math.abs(superpositionMeanPower(p, x, 128) - mean) / scale).toBeLessThan(1e-8);
      expect(superpositionMeanPower(p, x, 256)).toBeCloseTo(superpositionMeanPower(p, x, 128), 13);
    }
  }
  const coherent = superpositionModel({ ...base, secondDirection: 1, secondAmplitude: .01, phasePi: 0 });
  expect(coherent.meanPower / coherent.isolatedMeanPower).toBeCloseTo(2, 13);
  const opposed = superpositionModel({ ...base, secondAmplitude: .01, phasePi: .3 });
  expect(opposed.meanPower).toBe(0);
  expect(Math.abs(superpositionPoint(opposed, .137 * opposed.wavelength, .173 * opposed.period).power)).toBeGreaterThan(1e-5);
});

it("finds permanent nodes from independently sampled time coefficients and separates all-zero frames", () => {
  for (let seed = 0; seed < 50; seed++) {
    const input = { ...fixture(seed, -1), secondAmplitude: fixture(seed, -1).firstAmplitude, phasePi: .137 + seed * .023 }, p = superpositionModel(input);
    const left = -2 * p.wavelength, right = 2 * p.wavelength, nodes: number[] = [];
    const component = (x: number) => profile(input, x, 0);
    for (let j = 0; j < 1024; j++) {
      let a = left + (right - left) * j / 1024, b = left + (right - left) * (j + 1) / 1024;
      if (component(a) * component(b) >= 0) continue;
      for (let n = 0; n < 50; n++) { const mid = (a + b) / 2; if (component(a) * component(mid) <= 0) b = mid; else a = mid; }
      const root = (a + b) / 2;
      expect(profile(input, root, p.period / 4)).toBeCloseTo(0, 12); nodes.push(root);
    }
    const actual = superpositionNodes(p); expect(actual).toHaveLength(nodes.length);
    actual.forEach((x, i) => { expect(x / p.wavelength).toBeCloseTo(nodes[i] / p.wavelength, 11); for (const t of [.137, .391, .813]) expect(superpositionPoint(p, x, t * p.period).displacement).toBeCloseTo(0, 12); });
    const unequal = superpositionModel({ ...input, secondAmplitude: input.firstAmplitude / 2 });
    expect(superpositionNodes(unequal)).toEqual([]);
    for (const x of nodes) expect(superpositionPoint(unequal, x, .2 * p.period).envelope).toBeCloseTo(input.firstAmplitude / 2, 12);
  }
  const p = superpositionModel({ ...base, secondAmplitude: .01, phasePi: 0 }), zeroFrame = superpositionPoint(p, 0, p.period / 4);
  expect(zeroFrame.displacement).toBeCloseTo(0, 13); expect(Math.abs(zeroFrame.velocity)).toBeGreaterThan(.1);
  expect(zeroFrame.potential).toBe(0); expect(zeroFrame.kinetic).toBeGreaterThan(0);
  expect(superpositionNodes(p).some(x => Math.abs(x) < 1e-9)).toBe(false);
});

it("checks resultant magnitudes and time envelopes against fifty sampled sums including cancellation and phase quadrants", () => {
  for (let seed = 0; seed < 50; seed++) for (const direction of [1, -1] as const) {
    const input = fixture(seed, direction), p = superpositionModel(input), x = .217 * p.wavelength;
    let maximum = 0;
    for (let i = 0; i < 8192; i++) maximum = Math.max(maximum, Math.abs(profile(input, x, p.period * i / 8192)));
    const envelope = superpositionPoint(p, x, .317 * p.period).envelope;
    expect(Math.abs(envelope - maximum) / (p.firstAmplitude + p.secondAmplitude)).toBeLessThan(8e-8);
    if (direction === 1 && p.resultantPhase !== null) for (const t of [0, .23, .713]) expect(p.resultantAmplitude! * Math.cos(p.waveNumber * x - p.omega * t * p.period + p.resultantPhase)).toBeCloseTo(profile(input, x, t * p.period), 12);
  }
  for (const phasePi of [-1, 1]) {
    const p = superpositionModel({ ...base, secondDirection: 1, secondAmplitude: .01, phasePi });
    expect(p.resultantAmplitude).toBe(0); expect(p.resultantPhase).toBeNull(); expect(p.atRest).toBe(true);
    expect(superpositionPoint(p, .117 * p.wavelength, .391 * p.period).energyDensity).toBe(0);
  }
  const p = superpositionModel({ ...base, firstAmplitude: .001, secondAmplitude: .003, secondDirection: 1, phasePi: 1 });
  expect(p.resultantAmplitude).toBe(.002); expect(Math.abs(p.resultantPhase!)).toBe(Math.PI);
  expect(superpositionModel({ ...base, firstAmplitude: 0, secondAmplitude: 0 }).atRest).toBe(true);
});

function junction(seed: number): ReflectionInput {
  return { boundary: "junction", tension: 2 + seed % 7, density: .01 * (1 + seed % 5), secondDensity: .01 * (1 + (seed * 7) % 13), amplitude: .001 * (1 + seed % 3), frequency: .5 + seed % 4 };
}
function solve(matrix: number[][]) {
  const rows = matrix.map(row => [...row]);
  for (let column = 0; column < 2; column++) {
    const pivot = rows[column][column]; for (let j = column; j < 3; j++) rows[column][j] /= pivot;
    for (let i = 0; i < 2; i++) if (i !== column) { const factor = rows[i][column]; for (let j = column; j < 3; j++) rows[i][j] -= factor * rows[column][j]; }
  }
  return rows.map(row => row[2]);
}

it("solves fifty junction matching systems and checks displacement, force and instantaneous power at independent phases", () => {
  for (let seed = 0; seed < 50; seed++) {
    const input = junction(seed), p = reflectionModel(input), z1 = Math.sqrt(input.tension * input.density), z2 = Math.sqrt(input.tension * input.secondDensity);
    const [r, transmitted] = solve([[1, -1, -1], [-z1, -z2, -z1]]);
    expect(p.reflection).toBeCloseTo(r, 13); expect(p.transmission).toBeCloseTo(transmitted, 13);
    for (const phase of [.113, .279, .731, 1.317]) {
      const time = phase * p.period, left = reflectionPoint(p, "left", 0, time), right = reflectionPoint(p, "right", 0, time);
      expect(left.displacement).toBeCloseTo(right.displacement, 13);
      expect(p.tension * left.slope).toBeCloseTo(p.tension * right.slope, 13);
      expect(left.velocity).toBeCloseTo(right.velocity, 13);
      expect(left.power).toBeCloseTo(right.power, 13);
      expect(left.acceleration).toBeCloseTo(right.acceleration, 11);
    }
    expect(p.reflectionFraction + p.transmissionFraction).toBeCloseTo(1, 13);
    expect(Math.sign(p.reflection)).toBe(Math.sign(input.density - input.secondDensity));
    expect(p.reflectedMeanPower).toBeLessThanOrEqual(0);
    expect(p.secondWavelength! * p.frequency).toBeCloseTo(Math.sqrt(input.tension / input.secondDensity), 13);
  }
});

it("integrates junction power independently from finite-difference profiles for fifty impedance pairs", () => {
  for (let seed = 0; seed < 50; seed++) {
    const input = junction(seed), p = reflectionModel(input);
    const [r, transmitted] = solve([[1, -1, -1], [-Math.sqrt(input.tension * input.density), -Math.sqrt(input.tension * input.secondDensity), -Math.sqrt(input.tension * input.density)]]);
    const means = [1, r, transmitted].map((factor, i) => {
      const speed = Math.sqrt(input.tension / (i === 2 ? input.secondDensity : input.density)), direction = i === 1 ? -1 : 1;
      const f = (x: number, t: number) => input.amplitude * factor * Math.cos(2 * Math.PI * input.frequency * (x / speed - direction * t));
      const dx = speed * p.period * 1e-5, dt = p.period * 1e-5;
      return integral(t => -input.tension * (f(dx, t) - f(-dx, t)) / (2 * dx) * (f(0, t + dt) - f(0, t - dt)) / (2 * dt), 0, p.period) / p.period;
    });
    const actual = reflectionCyclePowers(p), scale = p.incidentMeanPower;
    for (const [measured, expected] of [[actual.incident, means[0]], [actual.reflected, means[1]], [actual.transmitted, means[2]]]) expect(Math.abs(measured - expected) / scale).toBeLessThan(2e-9);
    expect(Math.abs(actual.residual) / scale).toBeLessThan(1e-13);
    expect(actual.incident).toBeCloseTo(p.incidentMeanPower, 13); expect(actual.reflected).toBeCloseTo(p.reflectedMeanPower, 13); expect(actual.transmitted).toBeCloseTo(p.transmittedMeanPower, 13);
  }
  const lower = reflectionModel({ ...junction(0), density: .08, secondDensity: .02 });
  expect(lower.transmission).toBeCloseTo(4 / 3, 13); expect(lower.transmissionFraction).toBeCloseTo(8 / 9, 13);
  expect(lower.transmittedMeanPower).toBeLessThan(lower.incidentMeanPower);
});

it("checks fifty fixed and free endpoints for all-time displacement or force conditions and finite-impedance limits", () => {
  for (let seed = 0; seed < 50; seed++) for (const boundary of ["fixed", "free"] as const) {
    const p = reflectionModel({ ...junction(seed), boundary });
    for (let i = 0; i < 13; i++) {
      const time = (.037 + i / 13) * p.period, row = reflectionPoint(p, "left", 0, time);
      if (boundary === "fixed") { expect(row.displacement).toBe(0); expect(row.velocity).toBe(0); }
      else { expect(row.slope).toBe(0); expect(row.displacement).toBeCloseTo(2 * p.amplitude * Math.cos(2 * Math.PI * p.frequency * time), 13); }
      expect(row.power).toBeCloseTo(0, 13);
    }
    expect(p.transmission).toBeNull(); expect(p.transmissionFraction).toBe(0); expect(p.reflectionFraction).toBe(1);
    expect(reflectionCyclePowers(p).residual).toBeCloseTo(0, 13);
    expect(() => reflectionPoint(p, "right", 0, 0)).toThrow();
  }
  const high = reflectionModel({ ...junction(0), density: .001, secondDensity: 2 }), low = reflectionModel({ ...junction(0), density: 2, secondDensity: .001 });
  expect(high.reflection).toBeLessThan(-.95); expect(low.reflection).toBeGreaterThan(.95);
  expect(low.boundaryAmplitude / low.amplitude).toBeGreaterThan(1.95);
});

it("handles zero waves, guards, nonfinite inputs, invalid sides and quadrature bounds without false node claims", () => {
  for (const patch of [{ tension: 0 }, { density: 0 }, { frequency: 0 }, { phasePi: 2.1 }, { firstAmplitude: -.01 }, { secondAmplitude: NaN }, { secondDirection: 0 }, { extra: 1 }]) expect(superpositionInputSchema.safeParse({ ...base, ...patch }).success).toBe(false);
  for (const patch of [{ secondDensity: 0 }, { boundary: "moving" }, { amplitude: -.01 }, { frequency: Infinity }, { amplitude: .1, frequency: 20, tension: .1, density: 2 }]) expect(reflectionInputSchema.safeParse({ ...junction(0), ...patch }).success).toBe(false);
  const edge = { ...base, frequency: 10, firstAmplitude: .2 / (20 * Math.PI * Math.sqrt(base.density / base.tension)), secondAmplitude: 0 };
  expect(superpositionInputSchema.safeParse(edge).success).toBe(true);
  expect(superpositionInputSchema.safeParse({ ...edge, firstAmplitude: edge.firstAmplitude * 1.0001 }).success).toBe(false);
  const zero = superpositionModel({ ...base, firstAmplitude: 0, secondAmplitude: 0 });
  expect(superpositionNodes(zero)).toEqual([]); expect(zero.nontrivialStanding).toBe(false); expect(superpositionMeanPower(zero, 0)).toBe(0);
  expect(() => superpositionPoint(zero, 5 * zero.wavelength, 0)).toThrow(); expect(() => superpositionPoint(zero, 0, -1)).toThrow();
  expect(() => superpositionPoint(zero, NaN, 0)).toThrow(); expect(() => superpositionPoint(zero, 0, 9 * zero.period)).toThrow();
  expect(() => superpositionNodes(zero, 1, -1)).toThrow();
  for (const n of [0, 15, 17, 4097, NaN]) expect(() => superpositionMeanPower(zero, 0, n)).toThrow();
  const reflection = reflectionModel({ ...junction(0), amplitude: 0 });
  expect(reflectionCyclePowers(reflection)).toEqual({ incident: 0, reflected: 0, transmitted: 0, residual: 0 });
  expect(() => reflectionPoint(reflection, "left", 1, 0)).toThrow(); expect(() => reflectionPoint(reflection, "right", -1, 0)).toThrow();
});
