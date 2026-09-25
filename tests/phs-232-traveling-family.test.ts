import { expect, it } from "vitest";
import { phs232TravelingWaveQuestion, phs232TravelingWaveVariants } from "../lib/learning/families/phs-232-traveling-wave";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import { parsePiNumber } from "../lib/learning/pi-number";
import type { Question } from "../lib/learning/contracts";

const exactValue = (value: string) => approximateExact(parseExact(value)).real;
const piValue = (text: string) => { const p = parsePiNumber(text), evaluate = (poly: typeof p.numerator) => poly.reduce((sum, r, i) => sum + Number(r.numerator) / Number(r.denominator) * Math.PI ** i, 0); return evaluate(p.numerator) / evaluate(p.denominator); };
function trig(index: number, cosine = false) {
  const angle = index * Math.PI / 4, value = cosine ? Math.cos(angle) : Math.sin(angle);
  return index % 2 ? (value > 0 ? "1/sqrt(2)" : "-1/sqrt(2)") : String(Math.round(value));
}
function answers(q: Question, variant: string): Record<string, string> {
  const p = q.parameters, w = p.k * p.c;
  if (variant === "direction") return { crest: String(p.direction * w / p.k), ratio: String(-p.direction * w / p.k), snapshot: "no" };
  if (variant === "phase-speed") return { wavelength: "pi/(" + p.k + "/2)", period: "2*pi/(" + p.k + "*" + p.c + ")", frequency: "1/(2*pi/" + w + ")", speed: String(w / p.k), particle: "(" + p.a + "/1000)*" + w };
  if (variant === "local-velocity") { const s = Math.round(1e6 * Math.sin(p.phaseIndex * Math.PI / 4)), sign = p.direction * s; return { velocity: "(" + p.a + "/1000)*" + p.direction * w + "*(" + trig(p.phaseIndex) + ")", slope: "(" + -p.a + "/1000)*" + p.k + "*(" + trig(p.phaseIndex) + ")", motion: sign === 0 ? "rest" : sign > 0 ? "up" : "down" }; }
  if (variant === "local-acceleration") { const y = "(" + p.a + "/1000)*(" + trig(p.phaseIndex, true) + ")"; return { displacement: y, acceleration: "-(" + w + ")^2*(" + y + ")", curvature: "-(" + p.k + ")^2*(" + y + ")", reversal: "same" }; }
  if (variant === "phase-delay") return { tracked: "(" + p.cycles + "+" + p.quarter + "/4)*(2*pi/" + w + ")", first: (p.quarter || 4) + "/4*(2*pi/" + w + ")", phase: p.direction + "*(" + p.cycles + "+" + p.quarter + "/4)*2*pi" };
  const v = p.mode % 2 ? 2 * p.c : p.c, mu = p.densityNumerator + "/100";
  return { residual: v + "^2-(" + p.densityNumerator * p.c * p.c + "/100)/(" + mu + ")", tension: "(" + mu + ")*" + v + "^2", solution: v === p.c ? "yes" : "no", point: "no" };
}

it.each(phs232TravelingWaveVariants)("checks %s over 50 seeds with independent profile evidence and exact equivalents", variant => {
  for (let seed = 0; seed < 50; seed++) {
    const q = phs232TravelingWaveQuestion("phs232-traveling-wave", variant, "travel-" + seed, "q"), response = answers(q, variant), p = q.parameters, A = p.a / 1000, w = p.k * p.c, phi = p.phaseIndex * Math.PI / 4;
    expect(q).toEqual(phs232TravelingWaveQuestion(q.familyId, variant, "travel-" + seed, "q"));
    expect(gradeQuestion(q, response).correct, JSON.stringify({ variant, seed, response })).toBe(true);
    expect(q).toMatchObject({ courseId: "phs-232", objectiveId: "m02-l01", familyVersion: 1, critical: true });
    expect(A * p.k).toBeLessThan(.2);
    for (const field of q.fields) {
      for (const invalid of ["", "NaN", "Infinity", "1/0", "2 m"]) expect(gradeField(field, invalid).valid).toBe(false);
      if (field.kind === "choice") for (const option of field.options.filter(o => o.id !== response[field.id])) expect(gradeField(field, option.id).correct).toBe(false);
      else { expect(gradeField(field, "(" + response[field.id] + ")+1").correct).toBe(false); expect(gradeField(field, "sqrt(-1)").correct).toBe(false); }
    }
    const shape = (x: number, t: number) => A * Math.cos(p.k * x - p.direction * w * t + phi), dt = 1e-5 / w, dx = 1e-5 / p.k;
    if (variant === "direction") {
      const x0 = -phi / p.k, end = .317 / w, x1 = x0 + exactValue(response.crest) * end;
      expect(shape(x0, 0)).toBeCloseTo(shape(x1, end), 12);
      const x = .173 / p.k, t = .319 / w, vy = (shape(x, t + dt) - shape(x, t - dt)) / (2 * dt), slope = (shape(x + dx, t) - shape(x - dx, t)) / (2 * dx);
      expect(vy / slope).toBeCloseTo(exactValue(response.ratio), 8);
      expect(gradeField(q.fields[0], String(-p.direction * p.c)).correct).toBe(false);
    }
    if (variant === "phase-speed") {
      const lambda = piValue(response.wavelength), tau = piValue(response.period), f = piValue(response.frequency);
      expect(shape(.137 + lambda, .19)).toBeCloseTo(shape(.137, .19), 12);
      expect(shape(.137, .19 + tau)).toBeCloseTo(shape(.137, .19), 12);
      expect(lambda * f).toBeCloseTo(p.c, 12); expect(f * tau).toBeCloseTo(1, 12);
      const t = (phi - Math.PI / 2) / (p.direction * w), velocity = (shape(0, t + dt) - shape(0, t - dt)) / (2 * dt);
      expect(Math.abs(velocity)).toBeCloseTo(exactValue(response.particle), 10);
      expect(gradeField(q.fields.find(f => f.id === "frequency")!, String(w)).correct).toBe(false);
    }
    if (variant === "local-velocity") {
      expect((shape(0, dt) - shape(0, -dt)) / (2 * dt)).toBeCloseTo(exactValue(response.velocity), 10);
      expect((shape(dx, 0) - shape(-dx, 0)) / (2 * dx)).toBeCloseTo(exactValue(response.slope), 10);
    }
    if (variant === "local-acceleration") {
      const ht = 1e-4 / w, hx = 1e-4 / p.k;
      expect(shape(0, 0)).toBeCloseTo(exactValue(response.displacement), 12);
      expect((shape(0, ht) - 2 * shape(0, 0) + shape(0, -ht)) / ht ** 2).toBeCloseTo(exactValue(response.acceleration), 5);
      expect((shape(hx, 0) - 2 * shape(0, 0) + shape(-hx, 0)) / hx ** 2).toBeCloseTo(exactValue(response.curvature), 7);
    }
    if (variant === "phase-delay") {
      const distance = (p.cycles + p.quarter / 4) * 2 * Math.PI / p.k, x = p.direction * distance, arrival = piValue(response.tracked);
      expect(arrival * p.c).toBeCloseTo(distance, 10);
      const roots: number[] = [];
      for (let n = -20; n <= 20; n++) { const t = (p.k * x - 2 * Math.PI * n) / (p.direction * w); if (t > 1e-10) roots.push(t); }
      expect(piValue(response.first)).toBeCloseTo(Math.min(...roots), 10);
      expect(piValue(response.phase)).toBeCloseTo(p.k * x, 11);
      const first = q.fields.find(f => f.id === "first")!;
      expect(gradeField(first, "(" + response.first + ")+2*pi/" + w).correct).toBe(false);
      if (p.quarter === 0) expect(gradeField(first, "0").correct).toBe(false);
    }
    if (variant === "wave-equation") {
      const v = p.mode % 2 ? 2 * p.c : p.c, candidate = (x: number, t: number) => p.mode < 2 ? A * Math.cos(p.k * (x - p.direction * v * t) + phi) : A * Math.exp(-.5 * (p.k * (x - p.direction * v * t)) ** 2);
      const x = .173 / p.k, t = .291 / (p.k * v), hx = 1e-3 / p.k, ht = hx / v, y = candidate(x, t);
      const tt = (candidate(x, t + ht) - 2 * y + candidate(x, t - ht)) / ht ** 2, xx = (candidate(x + hx, t) - 2 * y + candidate(x - hx, t)) / hx ** 2;
      expect(Math.abs(tt - p.c ** 2 * xx - exactValue(response.residual) * xx) / (A * (p.k * v) ** 2)).toBeLessThan(1e-7);
      expect(Math.sqrt(exactValue(response.tension) / (p.densityNumerator / 100))).toBeCloseTo(v, 12);
    }
  }
});

it("covers all phase quadrants, travel directions, strict-event endpoints and PDE candidate types", () => {
  const phases = new Set<number>(), directions = new Set<number>(), quarters = new Set<number>(), modes = new Set<number>(), positions = new Set<number>();
  for (let seed = 0; seed < 160; seed++) for (const variant of phs232TravelingWaveVariants) {
    const q = phs232TravelingWaveQuestion("phs232-traveling-wave", variant, "coverage-" + seed, "q");
    phases.add(q.parameters.phaseIndex); directions.add(q.parameters.direction); quarters.add(q.parameters.quarter); modes.add(q.parameters.mode);
    for (const f of q.fields) if (f.kind === "choice") positions.add(f.options.findIndex(o => o.id === f.correct));
  }
  expect(phases.size).toBe(8); expect(directions.size).toBe(2); expect(quarters.size).toBe(4); expect(modes.size).toBe(4); expect(positions.size).toBeGreaterThan(1);
  expect(() => phs232TravelingWaveQuestion("wrong", "direction", "s", "q")).toThrow();
  expect(() => phs232TravelingWaveQuestion("phs232-traveling-wave", "wrong", "s", "q")).toThrow();
});
