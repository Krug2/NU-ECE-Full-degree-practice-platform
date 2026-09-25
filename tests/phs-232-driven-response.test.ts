import { expect, it } from "vitest";
import { phs232DrivenResponseQuestion, phs232DrivenResponseVariants } from "../lib/learning/families/phs-232-driven-response";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import { parseRational } from "../lib/learning/rational";
import type { Question } from "../lib/learning/contracts";

const decimal = (x: number) => x.toFixed(12);
const rationalValue = (text: string) => { const value = parseRational(text); return Number(value.numerator) / Number(value.denominator); };
function integrate(m: number, b: number, k: number, force: number, omega: number, x0: number, v0: number, end: number) {
  const n = 8192, h = end / n; let x = x0, v = v0;
  const acceleration = (t: number, x: number, v: number) => (force * Math.cos(omega * t) - b * v - k * x) / m;
  for (let i = 0; i < n; i++) {
    const t = i * h, a1 = acceleration(t, x, v), v2 = v + h * a1 / 2, a2 = acceleration(t + h / 2, x + h * v / 2, v2), v3 = v + h * a2 / 2, a3 = acceleration(t + h / 2, x + h * v2 / 2, v3), v4 = v + h * a3, a4 = acceleration(t + h, x + h * v3, v4);
    x += h * (v + 2 * v2 + 2 * v3 + v4) / 6; v += h * (a1 + 2 * a2 + 2 * a3 + a4) / 6;
  }
  return { x, v };
}

function answer(q: Question, variant: string): Record<string, string> {
  const p = q.parameters, m = p.massNumerator / 2, s = p.scale, w = p.ratioNumerator * s, k = 4 * m * s * s, b = m * s, F = p.a / 10;
  const real = k - m * w * w, imaginary = b * w, denom = real * real + imaginary * imaginary, C = F * real / denom, D = F * imaginary / denom;
  if (variant === "amplitude") {
    const magnitude = `sqrt((${p.massNumerator}/2*(${4 * s * s}-${w * w}))^2+(${p.massNumerator * s * w}/2)^2)`, A = `(${p.a}/10)/(${magnitude})`;
    return { real: decimal(real), imaginary: decimal(imaginary), amplitude: A, "speed-amplitude": `${w}*(${A})`, "peak-velocity": "0" };
  }
  if (variant === "phase") return { cosine: `(${p.a}/10)*(${p.massNumerator * s * s * (4 - p.ratioNumerator ** 2)}/2)/(${p.massNumerator * s * s}/2)^2/(${(4 - p.ratioNumerator ** 2) ** 2 + p.ratioNumerator ** 2})`, sine: `${p.a * p.ratioNumerator}/${5 * p.massNumerator * s * s * ((4 - p.ratioNumerator ** 2) ** 2 + p.ratioNumerator ** 2)}`, lag: decimal(Math.acos(C / Math.hypot(C, D))), "initial-velocity": `${p.a * p.ratioNumerator * w}/${5 * p.massNumerator * s * s * ((4 - p.ratioNumerator ** 2) ** 2 + p.ratioNumerator ** 2)}`, interval: w < 2 * s ? "below" : w === 2 * s ? "quarter" : "above" };
  if (variant === "static-limit") return { displacement: `(${p.a}/10)/(${2 * p.massNumerator * s * s})`, acceleration: `(${p.a}/10)/(${p.massNumerator}/2)`, power: "0", cycle: "none", initial: "no" };
  if (variant === "high-frequency-limit") return { "displacement-ratio": "1/2^2", "velocity-ratio": "1/2", "acceleration-limit": `(${p.a}/10)/(${p.massNumerator}/2)`, lag: "2*pi/2" };
  if (variant === "transient-condition") {
    const pc = p.mode === 2 ? `(${p.a}/10)/((${p.massNumerator}/2)*(4*${s}^2-${s}^2))` : "0", pv = p.mode === 2 ? "0" : `(${p.a}/10)/(${p.massNumerator * s}/2)`;
    return { "particular-position": pc, "particular-velocity": pv, "correction-position": p.mode === 1 ? "0" : `${p.sign * p.a}/100-(${pc})`, "correction-velocity": p.mode === 1 ? "0" : `-(${pv})`, behavior: ["decays", "absent", "persists"][p.mode] };
  }
  const reference = integrate(m, 0, k, F, 2 * s, 0, 0, p.quarter * Math.PI / (4 * s));
  return { coefficient: `(${p.a}/10)/(2*(${p.massNumerator}/2)*${2 * s})`, position: decimal(reference.x), velocity: decimal(reference.v), bounded: "none" };
}

it.each(phs232DrivenResponseVariants)("independently checks %s for 50 deterministic seeds, equivalents and invalid input", variant => {
  for (let seed = 0; seed < 50; seed++) {
    const q = phs232DrivenResponseQuestion("phs232-driven-response", variant, `forced-${seed}`, "q"), response = answer(q, variant), p = q.parameters;
    expect(q).toEqual(phs232DrivenResponseQuestion(q.familyId, variant, `forced-${seed}`, "q"));
    expect(gradeQuestion(q, response).correct, JSON.stringify({ variant, seed, response })).toBe(true);
    expect(q).toMatchObject({ courseId: "phs-232", objectiveId: "m01-l04", familyVersion: 1, critical: true });
    for (const field of q.fields) {
      for (const invalid of ["", "NaN", "Infinity", "1/0", "2 m"]) expect(gradeField(field, invalid).valid).toBe(false);
      expect(gradeField(field, "sqrt(-1)").correct).toBe(false);
      if (field.kind === "choice") for (const option of field.options.filter(o => o.id !== response[field.id])) expect(gradeField(field, option.id).correct).toBe(false);
      else expect(gradeField(field, `(${response[field.id]})+1`).correct).toBe(false);
    }
    const m = p.massNumerator / 2, s = p.scale, k = m * 4 * s * s, b = m * s, F = p.a / 10, w = p.ratioNumerator * s;
    if (variant === "amplitude" || variant === "phase") {
      const re = k - m * w * w, im = b * w;
      const C = F * re / (re * re + im * im), D = F * im / (re * re + im * im), t = .73 * 2 * Math.PI / w;
      const propagated = integrate(m, b, k, F, w, C, w * D, t);
      expect(propagated.x).toBeCloseTo(C * Math.cos(w * t) + D * Math.sin(w * t), 10);
      expect(propagated.v).toBeCloseTo(w * (-C * Math.sin(w * t) + D * Math.cos(w * t)), 10);
      if (variant === "amplitude") {
        const A = approximateExact(parseExact(response.amplitude)).real, V = approximateExact(parseExact(response["speed-amplitude"])).real;
        expect(Math.hypot(C, D)).toBeCloseTo(A, 13); expect(Math.hypot(w * C, w * D)).toBeCloseTo(V, 13);
        expect(gradeField(q.fields.find(f => f.id === "amplitude")!, `-(${response.amplitude})`).correct).toBe(false);
      } else {
        const phase = Number(response.lag); expect(Math.hypot(C, D) * Math.cos(phase)).toBeCloseTo(C, 11); expect(Math.hypot(C, D) * Math.sin(phase)).toBeCloseTo(D, 11);
        if (re < 0) expect(gradeField(q.fields.find(f => f.id === "lag")!, decimal(Math.atan(im / re))).correct).toBe(false);
      }
    }
    if (variant === "static-limit") { expect(k * rationalValue(response.displacement)).toBeCloseTo(F, 13); expect(m * rationalValue(response.acceleration)).toBeCloseTo(F, 13); }
    if (variant === "high-frequency-limit") {
      const frequency = 1e5 * s, amplitude = (o: number) => F / Math.hypot(k - m * o * o, b * o);
      expect(amplitude(2 * frequency) / amplitude(frequency)).toBeCloseTo(.25, 8); expect(2 * amplitude(2 * frequency) / amplitude(frequency)).toBeCloseTo(.5, 8); expect(frequency ** 2 * amplitude(frequency)).toBeCloseTo(F / m, 8);
    }
    if (variant === "transient-condition") {
      const C = rationalValue(response["particular-position"]), V = rationalValue(response["particular-velocity"]), X = rationalValue(response["correction-position"]), H = rationalValue(response["correction-velocity"]);
      expect(C + X).toBeCloseTo(p.mode === 1 ? 0 : p.sign * p.a / 100, 13); expect(V + H).toBeCloseTo(p.mode === 1 ? F / b : 0, 13);
      const omega = p.mode === 2 ? s : 2 * s, time = 8 * Math.PI / s;
      const full = integrate(m, p.mode === 2 ? 0 : b, k, F, omega, C + X, V + H, time);
      const particularX = C * Math.cos(omega * time) + V / omega * Math.sin(omega * time);
      if (p.mode === 2) expect(full.x - particularX).toBeCloseTo(X, 7);
      else { const bound = Math.exp(-s * time / 2) * Math.hypot(X, (H + s * X / 2) / (Math.sqrt(15) * s / 2)); expect(Math.abs(full.x - particularX)).toBeLessThan(bound + 1e-8); }
    }
  }
});

it("covers both phase quadrants, resonance zeros, transient alternatives, tolerances and unsupported names", () => {
  const intervals = new Set<string>(), behaviors = new Set<string>(), quarters = new Set<number>();
  for (let seed = 0; seed < 150; seed++) {
    const phase = phs232DrivenResponseQuestion("phs232-driven-response", "phase", String(seed), "q"), response = answer(phase, "phase"); intervals.add(response.interval);
    const field = phase.fields.find(f => f.id === "lag")!; expect(gradeField(field, decimal(Number(response.lag) + .4e-6)).correct).toBe(true); expect(gradeField(field, decimal(Number(response.lag) + 2e-6)).correct).toBe(false);
    const transient = phs232DrivenResponseQuestion("phs232-driven-response", "transient-condition", String(seed), "q"); behaviors.add(answer(transient, "transient-condition").behavior);
    const resonant = phs232DrivenResponseQuestion("phs232-driven-response", "undamped-resonance", String(seed), "q"), r = answer(resonant, "undamped-resonance"); quarters.add(resonant.parameters.quarter);
    if (resonant.parameters.quarter % 2 === 0) { expect(Math.abs(Number(r.position))).toBeLessThan(1e-10); expect(Math.abs(Number(r.velocity))).toBeGreaterThan(.001); expect(gradeField(resonant.fields.find(f => f.id === "velocity")!, "0").correct).toBe(false); }
  }
  expect(intervals.size).toBe(3); expect(behaviors.size).toBe(3); expect(quarters.size).toBe(4);
  expect(() => phs232DrivenResponseQuestion("other", "phase", "x", "q")).toThrow(); expect(() => phs232DrivenResponseQuestion("phs232-driven-response", "other", "x", "q")).toThrow();
});
