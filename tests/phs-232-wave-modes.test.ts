import { expect, it } from "vitest";
import { phs232WaveModesQuestion, phs232WaveModesVariants } from "../lib/learning/families/phs-232-wave-modes";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import type { Question } from "../lib/learning/contracts";

const value = (s: string) => approximateExact(parseExact(s)).real;
function response(q: Question, variant: string): Record<string, string> {
  const p = q.parameters, length = "(" + p.lengthNumerator + "/2)";
  if (variant === "fixed-spectrum") return { wavelength: "2*" + length + "/" + p.n, frequency: p.c + "/(2*" + length + "/" + p.n + ")", period: "(2*" + length + "/" + p.n + ")/" + p.c, internal: String(p.n - 1), node: p.nodeIndex + "*" + length + "/" + p.n };
  if (variant === "mixed-spectrum") return { wavelength: "4*" + length + "/(2*" + p.n + "-1)", frequency: p.c + "/(4*" + length + "/(2*" + p.n + "-1))", harmonic: String(2 * p.n - 1), internal: String(p.n - 1), node: "2*" + (p.n - 1) + "*" + length + "/(2*" + p.n + "-1)" };
  if (variant === "mode-index") {
    const h = p.boundary === 0 ? p.mode === 0 ? 0 : p.n : p.mode % 2 === 0 ? 2 * p.n : 2 * p.n - 1, factor = p.boundary === 0 ? Math.sin(h * Math.PI) : Math.cos(h * Math.PI / 2);
    const index = p.boundary === 0 ? h : (h + 1) / 2, valid = h > 0 && Math.abs(factor) < 1e-12;
    return { phase: h + "/" + (p.boundary === 0 ? 1 : 2), residual: String(Math.round(factor)), index: valid ? "mode-" + index : "none" };
  }
  if (variant.startsWith("coupled-")) {
    const sign = variant === "coupled-symmetric" ? 1 : -1, displacement = p.a + sign * p.sign * p.b, velocity = p.u + sign * p.v, omega = sign === 1 ? p.lower : p.upper;
    const answers: Record<string, string> = { position: "(" + p.a + "+" + sign * p.sign * p.b + ")/200", velocity: "(" + p.u + "+" + sign * p.v + ")/200", omega: String(omega), energy: "(" + p.m + "/10)*((" + velocity + "/200)^2+" + omega + "^2*(" + displacement + "/200)^2)" };
    if (sign === 1) answers.shape = "same";
    else { answers.extension = "(" + p.sign * p.b + "-" + p.a + ")/100"; answers.force = "(" + p.m + "/20)*(" + p.upper + "^2-" + p.lower + "^2)*(" + answers.extension + ")"; }
    return answers;
  }
  const answers: Record<string, string> = { frequency: String(p.difference), mean: "(" + p.frequencyBase + "+" + (p.frequencyBase + p.difference) + ")/2", maximum: "(" + p.a + "+" + p.b + ")/1000", minimum: (p.difference ? Math.abs(p.a - p.b) : p.a + p.b) + "/1000", period: p.difference ? "1/" + p.difference : "none" };
  if (p.a === p.b && p.difference) answers.signed = "2/" + p.difference;
  return answers;
}
function trajectory(p: Question["parameters"], end: number) {
  const mass = p.m / 10, k = mass * p.lower ** 2, coupling = mass * (p.upper ** 2 - p.lower ** 2) / 2, h = end / 4096;
  let y = [p.a / 100, p.u / 100, p.sign * p.b / 100, p.v / 100];
  const derivative = (state: number[]) => [state[1], (-(k + coupling) * state[0] + coupling * state[2]) / mass, state[3], (coupling * state[0] - (k + coupling) * state[2]) / mass];
  for (let i = 0; i < 4096; i++) {
    const a = derivative(y), b = derivative(y.map((v, j) => v + h * a[j] / 2)), c = derivative(y.map((v, j) => v + h * b[j] / 2)), d = derivative(y.map((v, j) => v + h * c[j]));
    y = y.map((v, j) => v + h * (a[j] + 2 * b[j] + 2 * c[j] + d[j]) / 6);
  }
  return y;
}

it.each(phs232WaveModesVariants)("checks %s across fifty deterministic seeds with boundary, force-equation and modulation evidence", variant => {
  for (let seed = 0; seed < 50; seed++) {
    const q = phs232WaveModesQuestion("phs232-wave-modes", variant, "modes-" + seed, "q"), answers = response(q, variant), p = q.parameters;
    expect(q).toEqual(phs232WaveModesQuestion(q.familyId, variant, "modes-" + seed, "q"));
    expect(q).toMatchObject({ courseId: "phs-232", objectiveId: "m02-l02", familyVersion: 1, critical: true });
    expect(gradeQuestion(q, answers).correct, JSON.stringify({ variant, seed, answers })).toBe(true);
    for (const f of q.fields) {
      for (const invalid of ["", "NaN", "Infinity", "1/0", "2 Hz"]) expect(gradeField(f, invalid).valid).toBe(false);
      if (f.kind === "choice") for (const option of f.options.filter(o => o.id !== answers[f.id])) expect(gradeField(f, option.id).correct).toBe(false);
      else { expect(gradeField(f, "(" + answers[f.id] + ")+1").correct).toBe(false); expect(gradeField(f, "sqrt(-1)").correct).toBe(false); }
    }
    if (variant === "fixed-spectrum" || variant === "mixed-spectrum") {
      const length = p.lengthNumerator / 2, lambda = value(answers.wavelength), frequency = value(answers.frequency), k = 2 * Math.PI / lambda, amplitude = .001;
      const y = (x: number, t: number) => amplitude * Math.sin(k * x) * Math.cos(2 * Math.PI * frequency * t), dx = length * 1e-5;
      expect(frequency * lambda).toBeCloseTo(Math.sqrt((p.m * p.c * p.c / 1000) / (p.m / 1000)), 12);
      for (const t of [.137, .391, .73]) {
        expect(Math.abs(y(0, t / frequency))).toBe(0);
        if (variant === "fixed-spectrum") expect(y(length, t / frequency)).toBeCloseTo(0, 12);
        else expect((y(length + dx, t / frequency) - y(length - dx, t / frequency)) / (2 * dx)).toBeCloseTo(0, 10);
      }
      expect(y(value(answers.node), .173 / frequency)).toBeCloseTo(0, 12);
      const nodes: number[] = [];
      for (let j = 1; j < 32; j++) { const x = j * Math.PI / k; if (x < length - 1e-12) nodes.push(x); }
      expect(nodes).toHaveLength(value(answers.internal));
      if (variant === "mixed-spectrum") {
        expect(y(length, 0) ** 2).toBeCloseTo(amplitude ** 2, 14);
        expect(frequency / (p.c / (4 * length))).toBeCloseTo(value(answers.harmonic), 12);
        expect(length - value(answers.node)).toBeCloseTo(lambda / 4, 12);
        expect(gradeField(q.fields.find(f => f.id === "frequency")!, p.c * p.n + "/" + p.lengthNumerator).correct).toBe(false);
      } else expect(value(answers.period) * frequency).toBeCloseTo(1, 12);
    }
    if (variant === "mode-index") {
      const kL = value(answers.phase) * Math.PI, factor = p.boundary === 0 ? Math.sin(kL) : Math.cos(kL);
      expect(factor).toBeCloseTo(value(answers.residual), 12);
      const nontrivial = [.137, .271, .819].some(x => Math.abs(Math.sin(kL * x)) > 1e-10);
      expect(answers.index !== "none").toBe(nontrivial && Math.abs(factor) < 1e-10);
      if (answers.index !== "none") {
        const index = Number(answers.index.slice(5)), crossings = Array.from({ length: 20 }, (_, i) => (i + 1) * Math.PI).filter(z => z < kL - 1e-12);
        expect(crossings).toHaveLength(index - 1);
      }
    }
    if (variant.startsWith("coupled-")) {
      const mass = p.m / 10, k = mass * p.lower ** 2, coupling = mass * (p.upper ** 2 - p.lower ** 2) / 2, direction = variant === "coupled-symmetric" ? 1 : -1;
      const q0 = value(answers.position), v0 = value(answers.velocity), omega = value(answers.omega), time = 1.137 * 2 * Math.PI / p.lower, end = trajectory(p, time);
      const qt = (end[0] + direction * end[2]) / 2, vt = (end[1] + direction * end[3]) / 2;
      expect(qt).toBeCloseTo(q0 * Math.cos(omega * time) + v0 / omega * Math.sin(omega * time), 9);
      expect(vt).toBeCloseTo(-q0 * omega * Math.sin(omega * time) + v0 * Math.cos(omega * time), 8);
      const force1 = -(k + coupling) + direction * coupling, force2 = coupling - direction * (k + coupling);
      expect(force1 / mass).toBeCloseTo(-(omega ** 2), 12); expect(force2 / mass).toBeCloseTo(-direction * omega ** 2, 12);
      expect(mass * vt * vt + (k + (direction < 0 ? 2 * coupling : 0)) * qt * qt).toBeCloseTo(value(answers.energy), 9);
      const plusX = (end[0] + end[2]) / 2, minusX = (end[0] - end[2]) / 2, plusV = (end[1] + end[3]) / 2, minusV = (end[1] - end[3]) / 2;
      const physical = mass / 2 * (end[1] ** 2 + end[3] ** 2) + k / 2 * (end[0] ** 2 + end[2] ** 2) + coupling / 2 * (end[2] - end[0]) ** 2;
      expect(mass * (plusV ** 2 + minusV ** 2) + k * plusX ** 2 + (k + 2 * coupling) * minusX ** 2).toBeCloseTo(physical, 12);
      if (direction < 0) {
        expect(value(answers.extension)).toBeCloseTo((p.sign * p.b - p.a) / 100, 12);
        expect(value(answers.force)).toBeCloseTo(coupling * (p.sign * p.b - p.a) / 100, 12);
      }
      if (value(answers.energy)) expect(gradeField(q.fields.find(f => f.id === "energy")!, "(" + answers.energy + ")/2").correct).toBe(false);
    }
    if (variant === "beat-envelope") {
      const a = p.a / 1000, b = p.b / 1000, first = p.frequencyBase, second = first + p.difference;
      const magnitude = (t: number) => Math.hypot(a * Math.cos(2 * Math.PI * first * t) + b * Math.cos(2 * Math.PI * second * t), a * Math.sin(2 * Math.PI * first * t) + b * Math.sin(2 * Math.PI * second * t));
      const duration = p.difference ? value(answers.period) : 1 / first, samples = Array.from({ length: 4097 }, (_, i) => magnitude(i * duration / 4096));
      expect(Math.max(...samples)).toBeCloseTo(value(answers.maximum), 11); expect(Math.min(...samples)).toBeCloseTo(value(answers.minimum), 11);
      if (p.difference) {
        expect(magnitude(duration)).toBeCloseTo(magnitude(0), 12); expect(magnitude(duration / 2)).toBeCloseTo(value(answers.minimum), 12);
        expect(value(answers.frequency) * duration).toBeCloseTo(1, 12);
        expect(gradeField(q.fields.find(f => f.id === "frequency")!, p.difference + "/2").correct).toBe(false);
        if (answers.signed) {
          const signedPeriod = value(answers.signed), mean = value(answers.mean);
          expect(Math.cos(Math.PI * p.difference * duration)).toBeCloseTo(-1, 12); expect(Math.cos(Math.PI * p.difference * signedPeriod)).toBeCloseTo(1, 12);
          for (const t of [.137, .413, .731]) {
            const actual = a * Math.cos(2 * Math.PI * first * t) + b * Math.cos(2 * Math.PI * second * t);
            expect(2 * a * Math.cos(2 * Math.PI * mean * t) * Math.cos(Math.PI * p.difference * t)).toBeCloseTo(actual, 12);
          }
        }
      } else { expect(answers.period).toBe("none"); expect(value(answers.minimum)).toBe(value(answers.maximum)); }
    }
  }
});

it("covers excluded mode candidates, zero coupling, phase-space signs and equal/unequal beat magnitudes", () => {
  const indexes = new Set<string>(), couplings = new Set<string>(), beats = new Set<string>(), signs = new Set<number>(), choices = new Set<number>();
  for (let seed = 0; seed < 160; seed++) for (const variant of phs232WaveModesVariants) {
    const q = phs232WaveModesQuestion("phs232-wave-modes", variant, "coverage-" + seed, "q"), p = q.parameters, answers = response(q, variant);
    if (variant === "mode-index") indexes.add(answers.index);
    if (variant.startsWith("coupled-")) { couplings.add(p.upper === p.lower ? "zero" : "positive"); signs.add(Math.sign(value(answers.velocity))); }
    if (variant === "beat-envelope") beats.add(p.difference === 0 ? "none" : p.a === p.b ? "complete" : "incomplete");
    for (const f of q.fields) if (f.kind === "choice") choices.add(f.options.findIndex(o => o.id === f.correct));
  }
  expect(indexes.size).toBe(7); expect(couplings.size).toBe(2); expect(beats.size).toBe(3); expect(signs.size).toBe(3); expect(choices.size).toBeGreaterThan(1);
  expect(() => phs232WaveModesQuestion("bad", "beat-envelope", "s", "q")).toThrow();
  expect(() => phs232WaveModesQuestion("phs232-wave-modes", "bad", "s", "q")).toThrow();
});
