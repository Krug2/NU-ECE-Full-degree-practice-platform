import { expect, it } from "vitest";
import { phs232FreeDecayQuestion, phs232FreeDecayVariants } from "../lib/learning/families/phs-232-free-decay";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import type { Question } from "../lib/learning/contracts";

function integrate(initialPosition: number, initialVelocity: number, stiffnessPerMass: number, dampingPerMass: number, time: number) {
  const n = 8192, h = time / n;
  let x = initialPosition, v = initialVelocity;
  const acceleration = (x: number, v: number) => -stiffnessPerMass * x - dampingPerMass * v;
  for (let i = 0; i < n; i++) {
    const a1 = acceleration(x, v), v2 = v + h * a1 / 2, a2 = acceleration(x + h * v / 2, v2);
    const v3 = v + h * a2 / 2, a3 = acceleration(x + h * v2 / 2, v3), v4 = v + h * a3, a4 = acceleration(x + h * v3, v4);
    x += h * (v + 2 * v2 + 2 * v3 + v4) / 6; v += h * (a1 + 2 * a2 + 2 * a3 + a4) / 6;
  }
  return { x, v, a: acceleration(x, v) };
}
const decimal = (value: number) => value.toFixed(12);

function answerFor(q: Question, variant: string): Record<string, string> {
  const p = q.parameters, s = p.scale;
  if (variant === "regime") {
    const b = p.massNumerator * 2 * s * [0, .6, 1, 1.25][p.regimeIndex], m = p.massNumerator / 2, w0Squared = 4 * s * s;
    return { "critical-b": String(2 * m * Math.sqrt(w0Squared)), beta: decimal(b / (2 * m)), regime: ["undamped", "under", "critical", "over"][p.regimeIndex], frequency: p.regimeIndex < 2 ? decimal(Math.sqrt(w0Squared - (b / (2 * m)) ** 2)) : "none" };
  }
  if (variant === "underdamped-state") {
    const state = integrate(p.sx * p.a / 100, 0, 25 * s * s, 6 * s, p.quarter * Math.PI / (8 * s));
    return { frequency: String(4 * s), position: decimal(state.x), velocity: decimal(state.v), acceleration: decimal(state.a), periodic: "no" };
  }
  if (variant === "critical-state") {
    const x0 = p.sx * p.a / 20, vNumerator = p.mode === 0 ? 0 : p.mode === 1 ? -s * p.sx * p.a : p.sv * p.c * s, v0 = vNumerator / 20;
    const state = integrate(x0, v0, s * s, 2 * s, p.timeIndex / s);
    return { c: `${p.sx * p.a}/20`, d: `${vNumerator + s * p.sx * p.a}/20`, position: decimal(state.x), velocity: decimal(state.v), crossing: p.sx * p.a * (vNumerator + s * p.sx * p.a) < 0 ? "yes" : "no" };
  }
  if (variant === "overdamped-state") {
    const slow = p.mode === 2 ? 0 : p.sx * p.a, fast = p.mode === 1 ? 0 : p.sv * p.c, x0 = (slow + fast) / 100, v0 = -s * (slow + 4 * fast) / 100;
    const state = integrate(x0, v0, 4 * s * s, 5 * s, p.timeIndex / s);
    return { rates: `${-4 * s},${-s}`, slow: `${slow}/100`, fast: `${fast}/100`, position: decimal(state.x), velocity: decimal(state.v) };
  }
  if (variant === "initial-constants") {
    const C = p.sx * p.a / 100, velocity = p.sv * p.c * s / 100, D = (velocity + 3 * s * C) / (4 * s), R = Math.hypot(C, D);
    const cosinePhase = Math.max(-1, Math.min(1, C / R));
    let phase = Math.acos(cosinePhase) * (D > 0 ? -1 : 1); if (phase >= Math.PI) phase -= 2 * Math.PI;
    return { c: `${p.sx * p.a}/100`, d: `(${p.sv * p.c}+3*${p.sx * p.a})/400`, amplitude: `sqrt(16*${p.a}^2+(${p.sv * p.c}+3*${p.sx * p.a})^2)/400`, phase: decimal(phase) };
  }
  const cos = [1, 0, -1, 0, 1][p.quarter], sin = [0, 1, 0, -1, 0][p.quarter], w0 = 2 * s;
  return { position: `(${p.sx * p.a}*${cos}+${p.sv * p.c}*${sin})/100`, velocity: `${w0}*(${p.sv * p.c}*${cos}-${p.sx * p.a}*${sin})/100`, energy: `${p.massNumerator}/4*((${p.sv * p.c * w0}/100)^2+${w0 * w0}*(${p.sx * p.a}/100)^2)`, period: `pi/${s}`, decay: "constant" };
}

it.each(phs232FreeDecayVariants)("checks %s over 50 deterministic seeds against independent state integration or initial-condition equations", variant => {
  for (let seed = 0; seed < 50; seed++) {
    const q = phs232FreeDecayQuestion("phs232-free-decay", variant, `decay-${seed}`, "q"), response = answerFor(q, variant), p = q.parameters;
    expect(q).toEqual(phs232FreeDecayQuestion(q.familyId, variant, `decay-${seed}`, "q"));
    expect(q).toMatchObject({ courseId: "phs-232", objectiveId: "m01-l03", familyVersion: 1, critical: true });
    expect(gradeQuestion(q, response).correct, JSON.stringify({ variant, seed, response })).toBe(true);
    for (const field of q.fields) {
      for (const invalid of ["", "NaN", "Infinity", "1/0", "3 kg/s"]) expect(gradeField(field, invalid).valid).toBe(false);
      if (field.kind === "choice") for (const option of field.options.filter(option => option.id !== response[field.id])) expect(gradeQuestion(q, { ...response, [field.id]: option.id }).correct).toBe(false);
      else if (field.kind === "roots") { expect(gradeQuestion(q, { ...response, [field.id]: String(-p.scale) }).correct).toBe(false); expect(gradeQuestion(q, { ...response, [field.id]: `${response[field.id]},0` }).correct).toBe(false); }
      else expect(gradeQuestion(q, { ...response, [field.id]: `(${response[field.id]})+1` }).correct).toBe(false);
    }
    if (variant === "initial-constants") {
      const field = q.fields.find(f => f.id === "amplitude"); if (field?.kind !== "exact") throw Error("Missing exact envelope");
      const R = approximateExact(parseExact(field.expected)).real, phase = Number(response.phase), beta = 3 * p.scale, wd = 4 * p.scale;
      expect(R * Math.cos(phase)).toBeCloseTo(p.sx * p.a / 100, 11);
      expect(-beta * R * Math.cos(phase) - wd * R * Math.sin(phase)).toBeCloseTo(p.sv * p.c * p.scale / 100, 10);
      const wrongD = `${p.sv * p.c}/400`;
      expect(gradeQuestion(q, { ...response, d: wrongD }).correct).toBe(false);
    }
    if (variant === "overdamped-state") {
      const slow = Number(p.mode === 2 ? 0 : p.sx * p.a) / 100, fast = Number(p.mode === 1 ? 0 : p.sv * p.c) / 100;
      expect(-p.scale * slow - 4 * p.scale * fast).toBeCloseTo(-p.scale * ((p.mode === 2 ? 0 : p.sx * p.a) + 4 * (p.mode === 1 ? 0 : p.sv * p.c)) / 100, 14);
      expect(gradeQuestion(q, { ...response, position: "0" }).correct).toBe(false);
      expect(gradeQuestion(q, { ...response, velocity: "0" }).correct).toBe(false);
    }
  }
});

it("covers all regimes, phase quadrants, critical repeated-root coefficients, single crossings and pure exponential states", () => {
  const regimes = new Set<number>(), modes = new Set<number>(), phaseSigns = new Set<string>(), criticalOutcomes = new Set<string>();
  let lateFast = false, repeatedTerm = false, pureCritical = false;
  for (let seed = 0; seed < 200; seed++) {
    regimes.add(phs232FreeDecayQuestion("phs232-free-decay", "regime", String(seed), "q").parameters.regimeIndex);
    const critical = phs232FreeDecayQuestion("phs232-free-decay", "critical-state", String(seed), "q"), ca = answerFor(critical, "critical-state");
    criticalOutcomes.add(ca.crossing); const cp = critical.parameters, dNumerator = cp.mode === 0 ? cp.scale * cp.sx * cp.a : cp.mode === 1 ? 0 : cp.scale * (cp.sv * cp.c + cp.sx * cp.a);
    if (dNumerator === 0) pureCritical = true; else repeatedTerm = true;
    const over = phs232FreeDecayQuestion("phs232-free-decay", "overdamped-state", String(seed), "q"); modes.add(over.parameters.mode);
    if (over.parameters.mode === 2 && over.parameters.timeIndex === 3) {
      lateFast = true; const response = answerFor(over, "overdamped-state");
      expect(Math.abs(Number(response.position))).toBeGreaterThan(1e-9); expect(Math.abs(Number(response.position))).toBeLessThan(1e-6);
      expect(gradeQuestion(over, { ...response, position: "0" }).correct).toBe(false);
      const field = over.fields.find(f => f.id === "position")!;
      expect(gradeField(field, (Number(response.position) + .4e-9).toFixed(12)).correct).toBe(true);
      expect(gradeField(field, (Number(response.position) + 2e-9).toFixed(12)).correct).toBe(false);
    }
    const initial = phs232FreeDecayQuestion("phs232-free-decay", "initial-constants", String(seed), "q"), p = initial.parameters;
    phaseSigns.add(`${Math.sign(p.sx * p.a)},${Math.sign(-(p.sv * p.c + 3 * p.sx * p.a))}`);
  }
  expect(regimes.size).toBe(4); expect(modes.size).toBe(3); expect(phaseSigns.size).toBeGreaterThanOrEqual(4);
  expect(criticalOutcomes).toEqual(new Set(["yes", "no"])); expect(lateFast && repeatedTerm && pureCritical).toBe(true);
  expect(() => phs232FreeDecayQuestion("other", "regime", "x", "q")).toThrow(); expect(() => phs232FreeDecayQuestion("phs232-free-decay", "other", "x", "q")).toThrow();
});
