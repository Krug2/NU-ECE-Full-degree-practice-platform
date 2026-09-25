import { expect, it } from "vitest";
import { phs232ResonancePowerQuestion, phs232ResonancePowerVariants } from "../lib/learning/families/phs-232-resonance-power";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import { parseRational } from "../lib/learning/rational";
import { parsePiNumber } from "../lib/learning/pi-number";
import type { Question } from "../lib/learning/contracts";

const exactValue = (text: string) => approximateExact(parseExact(text)).real;
const rationalValue = (text: string) => { const r = parseRational(text); return Number(r.numerator) / Number(r.denominator); };
function piValue(text: string) {
  const p = parsePiNumber(text), value = (poly: typeof p.numerator) => poly.reduce((sum, r, i) => sum + Number(r.numerator) / Number(r.denominator) * Math.PI ** i, 0);
  return value(p.numerator) / value(p.denominator);
}
function physical(q: Question) {
  const p = q.parameters, m = p.massNumerator / 2, k = m * (5 * p.scale) ** 2, b = 2 * m * p.dampingNumerator * p.scale, F = p.a / 10;
  const amplitude = (w: number, coefficient = b) => F / Math.hypot(k - m * w * w, coefficient * w);
  const power = (w: number) => b * (w * amplitude(w)) ** 2 / 2;
  return { m, k, b, F, amplitude, power, w0: Math.sqrt(k / m) };
}
function answer(q: Question, variant: string): Record<string, string> {
  const p = q.parameters, s = p.scale, d = p.dampingNumerator, n = p.massNumerator, B = n * d * s, W = 5 * s;
  if (variant === "displacement-peak") return { natural: String(W), beta: String(B / n), "free-frequency": `sqrt(${25 * s * s}-${d * d * s * s})`, "peak-frequency": `sqrt(${25 * s * s}-${2 * d * d * s * s})`, amplitude: `(${p.a}/10)/(${B}*sqrt(${25 * s * s}-${d * d * s * s}))` };
  if (variant === "velocity-peak") return { frequency: String(Math.sqrt(25 * s * s)), velocity: `(${p.a}/10)/${B}`, power: `(${p.a}/10)^2/(2*${B})`, same: "different" };
  if (variant === "average-power") {
    const w = [2, 3, 5, 7][p.frequencyIndex] * s, R = `${25 * n * s * s}/2-(${n}/2)*${w}^2`, I = `${B}*${w}`, P = `${B}*${w}^2*(${p.a}/10)^2/(2*((${R})^2+(${I})^2))`;
    return { input: P, loss: P, "energy-change": "0", negative: w === W ? "no" : "yes" };
  }
  if (variant === "cycle-work") return { period: `pi/(${W}/2)`, power: `(${p.a}/10)^2/(2*${B})`, work: `(${p.a}/10)^2*pi/(${B}*${W})`, net: "0", startup: "not-guaranteed" };
  if (variant === "quality-factor") return { quality: `(${n}/2)*${W}/${B}`, lower: `sqrt(${W}^2+(${B}/${n})^2)-${B}/${n}`, upper: `sqrt(${W}^2+(${B}/${n})^2)+${B}/${n}`, width: `2*${B}/${n}`, "loss-definition": "approximation" };
  return { threshold: `sqrt(2*(${n}/2)*(${25 * n * s * s}/2))`, frequency: "0", amplitude: `(${p.a}/10)/(${25 * n * s * s}/2)`, "velocity-frequency": String(W), interior: "none" };
}
function maximum(f: (x: number) => number, left: number, right: number) {
  for (let i = 0; i < 90; i++) { const a = left + (right - left) / 3, b = right - (right - left) / 3; if (f(a) < f(b)) left = a; else right = b; }
  return (left + right) / 2;
}

it.each(phs232ResonancePowerVariants)("checks %s over 50 deterministic seeds with independent response and power fixtures", variant => {
  for (let seed = 0; seed < 50; seed++) {
    const q = phs232ResonancePowerQuestion("phs232-resonance-power", variant, `power-${seed}`, "q"), response = answer(q, variant), p = q.parameters, model = physical(q);
    expect(q).toEqual(phs232ResonancePowerQuestion(q.familyId, variant, `power-${seed}`, "q")); expect(q).toMatchObject({ courseId: "phs-232", objectiveId: "m01-l04", familyVersion: 1, critical: true });
    expect(gradeQuestion(q, response).correct, JSON.stringify({ variant, seed, response })).toBe(true);
    for (const field of q.fields) {
      for (const invalid of ["", "NaN", "Infinity", "1/0", "2 J"]) expect(gradeField(field, invalid).valid).toBe(false);
      expect(gradeField(field, "sqrt(-1)").correct).toBe(false);
      if (field.kind === "choice") for (const option of field.options.filter(o => o.id !== response[field.id])) expect(gradeField(field, option.id).correct).toBe(false);
      else expect(gradeField(field, `(${response[field.id]})+1`).correct).toBe(false);
    }
    if (variant === "displacement-peak") {
      const peak = maximum(model.amplitude, 0, 2 * model.w0), actual = exactValue(response["peak-frequency"]);
      expect(Math.abs(peak - actual) / model.w0).toBeLessThan(1e-7); expect(model.amplitude(peak)).toBeCloseTo(exactValue(response.amplitude), 11);
      expect(actual).toBeLessThan(exactValue(response["free-frequency"])); expect(exactValue(response["free-frequency"])).toBeLessThan(model.w0);
      expect(gradeField(q.fields.find(f => f.id === "peak-frequency")!, response["free-frequency"]).correct).toBe(false);
      expect(gradeField(q.fields.find(f => f.id === "peak-frequency")!, response.natural).correct).toBe(false);
    }
    if (variant === "velocity-peak") {
      const peak = maximum(w => w * model.amplitude(w), 0, 2 * model.w0), powerPeak = maximum(model.power, 0, 2 * model.w0);
      expect(Math.abs(peak - model.w0) / model.w0).toBeLessThan(1e-7); expect(Math.abs(powerPeak - model.w0) / model.w0).toBeLessThan(1e-7);
      expect(peak * model.amplitude(peak)).toBeCloseTo(rationalValue(response.velocity), 12); expect(model.power(powerPeak)).toBeCloseTo(rationalValue(response.power), 12);
    }
    if (variant === "average-power" || variant === "cycle-work") {
      const w = variant === "cycle-work" ? model.w0 : [2, 3, 5, 7][p.frequencyIndex] * p.scale, period = 2 * Math.PI / w;
      const re = model.k - model.m * w * w, im = model.b * w, C = model.F * re / (re * re + im * im), D = model.F * im / (re * re + im * im);
      let input = 0, loss = 0, minimumPower = Infinity; const n = 4096, h = period / n;
      for (let i = 0; i < n; i++) { const t = (i + .5) * h, v = w * (-C * Math.sin(w * t) + D * Math.cos(w * t)), power = model.F * Math.cos(w * t) * v; input += power * h; loss += model.b * v * v * h; minimumPower = Math.min(minimumPower, power); }
      expect(input).toBeCloseTo(loss, 11); expect(input / period).toBeCloseTo(rationalValue(response[variant === "cycle-work" ? "power" : "input"]), 11);
      if (variant === "cycle-work") { expect(period).toBeCloseTo(piValue(response.period), 12); expect(input).toBeCloseTo(piValue(response.work), 11); expect(input).toBeGreaterThan(0); }
      else { expect(minimumPower < 0).toBe(response.negative === "yes"); expect(rationalValue(response["energy-change"])).toBe(0); }
    }
    if (variant === "quality-factor") {
      const target = model.power(model.w0) / 2;
      const root = (lo: number, hi: number, rising: boolean) => { for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if ((model.power(mid) < target) === rising) lo = mid; else hi = mid; } return (lo + hi) / 2; };
      const lower = root(0, model.w0, true), upper = root(model.w0, 4 * model.w0, false);
      expect(lower).toBeCloseTo(exactValue(response.lower), 10); expect(upper).toBeCloseTo(exactValue(response.upper), 10); expect(upper - lower).toBeCloseTo(rationalValue(response.width), 10);
      expect(model.w0 / (upper - lower)).toBeCloseTo(rationalValue(response.quality), 11);
      const beta = model.b / (2 * model.m), dampedPeriod = 2 * Math.PI / Math.sqrt(model.k / model.m - beta * beta), finiteLossQ = 2 * Math.PI / (1 - Math.exp(-2 * beta * dampedPeriod));
      expect(Math.abs(finiteLossQ - rationalValue(response.quality))).toBeGreaterThan(1);
    }
    if (variant === "no-interior-peak") {
      const coefficient = p.mode === 0 ? 4 * p.massNumerator * p.scale : p.mode === 1 ? 5 * p.massNumerator * p.scale : Math.sqrt(2 * model.m * model.k);
      expect(exactValue(response.threshold)).toBeCloseTo(Math.sqrt(2 * model.m * model.k), 12); expect(coefficient).toBeGreaterThanOrEqual(exactValue(response.threshold) - 1e-12);
      const endpoint = model.amplitude(0, coefficient); expect(endpoint).toBeCloseTo(rationalValue(response.amplitude), 12);
      for (const ratio of [.01, .1, .5, 1, 2, 4]) expect(model.amplitude(ratio * model.w0, coefficient)).toBeLessThan(endpoint);
      const peak = maximum(w => w * model.amplitude(w, coefficient), 0, 2 * model.w0); expect(Math.abs(peak - model.w0) / model.w0).toBeLessThan(1e-7);
    }
  }
});

it("covers threshold equality, larger damping, both power-sign cases and rejects unsupported names", () => {
  const modes = new Set<number>(), frequencies = new Set<number>();
  for (let seed = 0; seed < 100; seed++) { modes.add(phs232ResonancePowerQuestion("phs232-resonance-power", "no-interior-peak", String(seed), "q").parameters.mode); frequencies.add(phs232ResonancePowerQuestion("phs232-resonance-power", "average-power", String(seed), "q").parameters.frequencyIndex); }
  expect(modes.size).toBe(3); expect(frequencies.size).toBe(4);
  expect(() => phs232ResonancePowerQuestion("other", "average-power", "x", "q")).toThrow(); expect(() => phs232ResonancePowerQuestion("phs232-resonance-power", "other", "x", "q")).toThrow();
});
