import { expect, it } from "vitest";
import { phs232WaveSuperpositionQuestion, phs232WaveSuperpositionVariants } from "../lib/learning/families/phs-232-wave-superposition";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import { parsePiNumber } from "../lib/learning/pi-number";
import type { Question } from "../lib/learning/contracts";

const value = (s: string) => approximateExact(parseExact(s)).real;
const piValue = (s: string) => { const p = parsePiNumber(s), evaluate = (poly: typeof p.numerator) => poly.reduce((sum, r, i) => sum + Number(r.numerator) / Number(r.denominator) * Math.PI ** i, 0); return evaluate(p.numerator) / evaluate(p.denominator); };
const average = (f: (t: number) => number, period: number, n = 2048) => { let total = 0; for (let i = 0; i < n; i++) total += f((i + .5) * period / n); return total / n; };
function response(q: Question, variant: string): Record<string, string> {
  const p = q.parameters, w = p.k * p.c, cosine = Math.round(Math.cos(p.phaseIndex * Math.PI / 2)), sine = Math.round(Math.sin(p.phaseIndex * Math.PI / 2));
  if (variant === "phase-resultant") {
    const x = p.a + p.b * cosine, y = p.b * sine, alpha = Math.atan2(y, x);
    return { real: "(" + p.a + "+" + p.b * cosine + ")/1000", imaginary: p.b * sine + "/1000", amplitude: "sqrt(" + (x * x + y * y) + ")/1000", phase: x === 0 && y === 0 ? "undefined" : y === 0 ? x > 0 ? "zero" : "pi" : alpha > 0 ? "first" : "fourth" };
  }
  if (variant === "fixed-reflection" || variant === "free-reflection") {
    const r = variant === "fixed-reflection" ? -1 : 1;
    return { reflection: String(r), reflected: r + "*(" + p.a + "/1000)", boundary: "(" + p.a + "/1000)*(1+" + r + ")", power: "-(" + p.m + "/1000)*" + p.c + "*" + w + "^2*(" + p.a + "/1000)^2/2", condition: r === -1 ? "displacement" : "slope", pulse: r === -1 ? "inverted" : "same" };
  }
  if (variant === "node-location") {
    const shape = (x: number, t: number) => Math.cos(p.k * x - w * t) + Math.cos(p.k * x + w * t + p.phaseIndex * Math.PI / 2);
    const nodes = Array.from({ length: 17 }, (_, i) => i).filter(i => [.137, .271, .819].every(t => Math.abs(shape(i * Math.PI / (4 * p.k), t / w)) < 1e-12));
    const times = Array.from({ length: 9 }, (_, i) => i).filter(i => [.113, .237, .917].every(x => Math.abs(shape(x / p.k, i * Math.PI / (4 * w))) < 1e-12));
    return { node: nodes[0] + "*pi/(4*" + p.k + ")", spacing: (nodes[1] - nodes[0]) + "*pi/(4*" + p.k + ")", flat: times[0] + "*pi/(4*" + w + ")", everywhere: "no" };
  }
  if (variant === "net-power") return { power: "(" + p.m + "/1000)*" + p.c + "*" + w + "^2*((" + p.a + "/1000)^2-(" + p.b + "/1000)^2)/2", minimum: Math.abs(p.a - p.b) + "/1000", maximum: "(" + p.a + "+" + p.b + ")/1000", nodes: p.a === p.b ? "yes" : "no" };
  if (variant === "coherent-intensity") return { ratio: "(" + p.a + "^2+" + p.b + "^2+2*" + p.a * p.b * cosine + ")/(" + p.a + "^2+" + p.b + "^2)", interference: "(" + p.m + "/1000)*" + p.c + "*" + w + "^2*(" + p.a + "/1000)*(" + p.b + "/1000)*" + cosine, additive: "no" };
  const r = "(" + p.zLeft + "-" + p.zRight + ")/(" + p.zLeft + "+" + p.zRight + ")", ta = "2*" + p.zLeft + "/(" + p.zLeft + "+" + p.zRight + ")";
  if (variant === "interface-amplitude") return { reflection: r, transmission: ta, reflected: "(" + r + ")*(" + p.a + "/1000)", wavelength: "(100/" + p.zRight + ")/(100/" + p.zLeft + ")", phase: p.zLeft === p.zRight ? "absent" : p.zLeft > p.zRight ? "same" : "inverted" };
  const incident = "(" + p.zLeft + "/10)*(" + 10 * p.frequencyScale + ")^2*(" + p.a + "/1000)^2/2";
  return { reflection: "(" + r + ")^2", transmission: "(" + p.zRight + "/" + p.zLeft + ")*(" + ta + ")^2", reflected: "-(" + incident + ")*(" + r + ")^2", transmitted: "(" + incident + ")*(" + p.zRight + "/" + p.zLeft + ")*(" + ta + ")^2", amplification: "yes" };
}
function power(y: (x: number, t: number) => number, tension: number, c: number, w: number, x: number, t: number) {
  const dt = 1e-5 / w, dx = c * dt;
  return -tension * (y(x + dx, t) - y(x - dx, t)) / (2 * dx) * (y(x, t + dt) - y(x, t - dt)) / (2 * dt);
}

it.each(phs232WaveSuperpositionVariants)("checks %s across fifty deterministic seeds with independent boundary, phase and power evidence", variant => {
  for (let seed = 0; seed < 50; seed++) {
    const q = phs232WaveSuperpositionQuestion("phs232-wave-superposition", variant, "superposition-" + seed, "q"), answers = response(q, variant), p = q.parameters, w = p.k * p.c;
    expect(q).toEqual(phs232WaveSuperpositionQuestion(q.familyId, variant, "superposition-" + seed, "q"));
    expect(q).toMatchObject({ courseId: "phs-232", objectiveId: "m02-l02", familyVersion: 1, critical: true });
    expect(gradeQuestion(q, answers).correct, JSON.stringify({ seed, variant, answers })).toBe(true);
    for (const f of q.fields) {
      for (const invalid of ["", "NaN", "Infinity", "1/0", "2 m"]) expect(gradeField(f, invalid).valid).toBe(false);
      if (f.kind === "choice") for (const option of f.options.filter(option => option.id !== answers[f.id])) expect(gradeField(f, option.id).correct).toBe(false);
      else { expect(gradeField(f, "(" + answers[f.id] + ")+1").correct).toBe(false); expect(gradeField(f, "sqrt(-1)").correct).toBe(false); }
    }
    expect((p.a + p.b) * p.k / 1000).toBeLessThan(.2);
    const phase = p.phaseIndex * Math.PI / 2, tension = p.m * p.c * p.c / 1000;
    const combined = (x: number, t: number, direction = 1) => p.a / 1000 * Math.cos(p.k * x - w * t) + p.b / 1000 * Math.cos(p.k * x - direction * w * t + phase);
    if (variant === "phase-resultant") {
      expect(value(answers.real)).toBeCloseTo(combined(0, 0), 12);
      expect(value(answers.imaginary)).toBeCloseTo(-combined(Math.PI / (2 * p.k), 0), 12);
      let peak = 0; for (let i = 0; i < 8192; i++) peak = Math.max(peak, Math.abs(combined(i * 2 * Math.PI / (8192 * p.k), 0)));
      expect(Math.abs(value(answers.amplitude) - peak)).toBeLessThan(2e-9);
      if (value(answers.amplitude) === 0) expect(answers.phase).toBe("undefined");
    }
    if (variant === "fixed-reflection" || variant === "free-reflection") {
      const r = value(answers.reflection), reflected = (x: number, t: number) => value(answers.reflected) * Math.cos(p.k * x + w * t), incident = (x: number, t: number) => p.a / 1000 * Math.cos(p.k * x - w * t);
      const mean = average(t => power(reflected, tension, p.c, w, -.173 / p.k, t), 2 * Math.PI / w);
      expect(mean).toBeCloseTo(value(answers.power), 10);
      const dx = 1e-5 / p.k;
      for (const t of [.17, .37, .91]) {
        const field = (x: number) => incident(x, t / w) + reflected(x, t / w);
        if (r < 0) expect(field(0)).toBeCloseTo(0, 13); else expect((field(dx) - field(-dx)) / (2 * dx)).toBeCloseTo(0, 10);
        const pulse = (x: number) => Math.exp(-((x - p.c * t) ** 2)) + r * Math.exp(-((-x - p.c * t) ** 2));
        if (r < 0) expect(pulse(0)).toBe(0); else expect((pulse(dx) - pulse(-dx)) / (2 * dx)).toBeCloseTo(0, 10);
      }
      expect(gradeField(q.fields.find(f => f.id === "power")!, "-(" + answers.power + ")").correct).toBe(false);
    }
    if (variant === "node-location") {
      const node = piValue(answers.node), flat = piValue(answers.flat), spacing = piValue(answers.spacing);
      const field = (x: number, t: number) => p.a / 1000 * (Math.cos(p.k * x - w * t) + Math.cos(p.k * x + w * t + phase));
      for (const t of [.17, .73, 1.19]) { expect(field(node, t / w)).toBeCloseTo(0, 12); expect(field(node + spacing, t / w)).toBeCloseTo(0, 12); }
      const x = node + spacing / 2, dt = 1e-5 / w;
      expect(field(x, flat)).toBeCloseTo(0, 12);
      expect(Math.abs((field(x, flat + dt) - field(x, flat - dt)) / (2 * dt))).toBeCloseTo(2 * p.a * w / 1000, 9);
      expect(gradeField(q.fields.find(f => f.id === "node")!, "(" + answers.node + ")+(" + answers.spacing + ")").correct).toBe(false);
      expect(gradeField(q.fields.find(f => f.id === "flat")!, "(" + answers.flat + ")+2*pi/" + w).correct).toBe(false);
    }
    if (variant === "net-power" || variant === "coherent-intensity") {
      const direction = variant === "net-power" ? -1 : 1, mean = average(t => power((x, time) => combined(x, time, direction), tension, p.c, w, .317 / p.k, t), 2 * Math.PI / w);
      if (variant === "net-power") {
        expect(mean).toBeCloseTo(value(answers.power), 10);
        const envelopes = Array.from({ length: 4096 }, (_, i) => { const x = i * 2 * Math.PI / (4096 * p.k); return Math.hypot(combined(x, 0, -1), combined(x, Math.PI / (2 * w), -1)); });
        expect(Math.min(...envelopes)).toBeCloseTo(value(answers.minimum), 11); expect(Math.max(...envelopes)).toBeCloseTo(value(answers.maximum), 11);
      } else {
        const isolated = average(t => power((x, time) => p.a / 1000 * Math.cos(p.k * x - w * time), tension, p.c, w, .317 / p.k, t) + power((x, time) => p.b / 1000 * Math.cos(p.k * x - w * time + phase), tension, p.c, w, .317 / p.k, t), 2 * Math.PI / w);
        expect(mean / isolated).toBeCloseTo(value(answers.ratio), 9); expect(mean - isolated).toBeCloseTo(value(answers.interference), 10);
      }
    }
    if (variant.startsWith("interface-")) {
      const z1 = Math.sqrt(10 * p.zLeft ** 2 / 1000), z2 = Math.sqrt(10 * p.zRight ** 2 / 1000), c1 = Math.sqrt(10 / (p.zLeft ** 2 / 1000)), c2 = Math.sqrt(10 / (p.zRight ** 2 / 1000)), wi = 10 * p.frequencyScale;
      const trans = 2 / (1 + z2 / z1), r = trans - 1, ar = p.a / 1000 * r, at = p.a / 1000 * trans;
      const incoming = (x: number, t: number) => p.a / 1000 * Math.cos(wi * (x / c1 - t)), reflected = (x: number, t: number) => ar * Math.cos(wi * (x / c1 + t)), transmitted = (x: number, t: number) => at * Math.cos(wi * (x / c2 - t));
      for (const t of [.173, .371, .813]) {
        const time = t / wi, dx = 1e-5;
        expect(incoming(0, time) + reflected(0, time)).toBeCloseTo(transmitted(0, time), 12);
        expect((incoming(dx, time) + reflected(dx, time) - incoming(-dx, time) - reflected(-dx, time)) / (2 * dx)).toBeCloseTo((transmitted(dx, time) - transmitted(-dx, time)) / (2 * dx), 9);
      }
      const incidentPower = average(t => power(incoming, 10, c1, wi, -.13, t), 2 * Math.PI / wi), reflectedPower = average(t => power(reflected, 10, c1, wi, -.13, t), 2 * Math.PI / wi), transmittedPower = average(t => power(transmitted, 10, c2, wi, .13, t), 2 * Math.PI / wi);
      expect(incidentPower + reflectedPower).toBeCloseTo(transmittedPower, 10);
      if (variant === "interface-amplitude") {
        expect(value(answers.reflection)).toBeCloseTo(r, 12); expect(value(answers.transmission)).toBeCloseTo(trans, 12);
        expect(value(answers.reflected)).toBeCloseTo(ar, 12); expect(value(answers.wavelength)).toBeCloseTo(c2 / c1, 12);
      } else {
        expect(value(answers.reflection)).toBeCloseTo(-reflectedPower / incidentPower, 9); expect(value(answers.transmission)).toBeCloseTo(transmittedPower / incidentPower, 9);
        expect(value(answers.reflected)).toBeCloseTo(reflectedPower, 10); expect(value(answers.transmitted)).toBeCloseTo(transmittedPower, 10);
        if (p.zLeft !== p.zRight) expect(gradeField(q.fields.find(f => f.id === "transmission")!, "(2*" + p.zLeft + "/(" + p.zLeft + "+" + p.zRight + "))^2").correct).toBe(false);
      }
    }
  }
});

it("covers cancellation, phase classifications, both impedance directions, matching and shuffled choices", () => {
  const phases = new Set<string>(), impedanceCases = new Set<number>(), signs = new Set<number>(), choices = new Set<number>();
  for (let seed = 0; seed < 160; seed++) for (const variant of phs232WaveSuperpositionVariants) {
    const q = phs232WaveSuperpositionQuestion("phs232-wave-superposition", variant, "coverage-" + seed, "q"), a = response(q, variant);
    if (variant === "phase-resultant") phases.add(a.phase);
    if (variant.startsWith("interface-")) impedanceCases.add(Math.sign(q.parameters.zLeft - q.parameters.zRight));
    if (variant === "net-power") signs.add(Math.sign(value(a.power)));
    for (const f of q.fields) if (f.kind === "choice") choices.add(f.options.findIndex(o => o.id === f.correct));
  }
  expect([...phases].sort()).toEqual(["first", "fourth", "pi", "undefined", "zero"]);
  expect(impedanceCases.size).toBe(3); expect(signs.size).toBe(3); expect(choices.size).toBeGreaterThan(1);
  expect(() => phs232WaveSuperpositionQuestion("bad", "net-power", "s", "q")).toThrow();
  expect(() => phs232WaveSuperpositionQuestion("phs232-wave-superposition", "bad", "s", "q")).toThrow();
});
