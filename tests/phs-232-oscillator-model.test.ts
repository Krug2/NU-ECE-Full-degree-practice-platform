import { expect, it } from "vitest";
import { phs232OscillatorModelQuestion, phs232OscillatorModelVariants } from "../lib/learning/families/phs-232-oscillator-model";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import { parseRational } from "../lib/learning/rational";
import type { Question } from "../lib/learning/contracts";

function integral(f: (x: number) => number, a: number, b: number, n = 1000) {
  const h = (b - a) / n;
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * f(a + i * h);
  return h * sum / 3;
}
function responseFor(q: Question, variant: string): Record<string, string> {
  const p = q.parameters, m = p.massNumerator / 4, L = p.lengthNumerator / 5;
  if (variant === "simple-pendulum") return { inertia: `${p.massNumerator}/4*(${p.lengthNumerator}/5)^2`, curvature: `${p.massNumerator}/4*${p.gravity}*${p.lengthNumerator}/5`, omega: `sqrt(${p.gravity}/(${p.lengthNumerator}/5))`, period: String(Math.sqrt(L / p.gravity) * 2 * Math.PI), approximation: "sine" };
  if (variant === "physical-pendulum") {
    const d = p.shape ? L : L / 2;
    const Icm = p.shape ? integral(r => 2 * m * r ** 3 / L ** 2, 0, L) : integral(x => m / L * x * x, -L / 2, L / 2);
    const I = Icm + m * d * d;
    return { distance: p.shape ? `${p.lengthNumerator}/5` : `${p.lengthNumerator}/10`, inertia: p.shape ? `${p.massNumerator}/4*(${p.lengthNumerator}/5)^2*3/2` : `${p.massNumerator}/4*(${p.lengthNumerator}/5)^2/3`, omega: p.shape ? `sqrt(2*${p.gravity}/(3*${p.lengthNumerator}/5))` : `sqrt(3*${p.gravity}/(2*${p.lengthNumerator}/5))`, period: String(2 * Math.PI * Math.sqrt(I / (m * p.gravity * d))) };
  }
  if (variant === "torsion") return { omega: String(p.omega), period: `pi*2/${p.omega}`, energy: `${p.massNumerator}/20*${p.omega}^2*(${p.scale}/10)^2/2`, speed: `${p.omega}*${p.scale}/10` };
  if (variant === "potential-curvature") return { equilibrium: `${p.lengthNumerator}/10`, curvature: `${p.massNumerator}/4*${p.omega}^2`, omega: String(p.omega), force: `-(${p.massNumerator}/4*${p.omega}^2+4*${p.beta}*(${p.scale}/10)^2)*${p.scale}/10`, range: "local" };
  if (variant === "unstable-equilibrium") return { curvature: p.caseIndex === 0 ? "negative" : "zero", character: ["unstable", "quartic-minimum", "unstable", "neutral"][p.caseIndex], frequency: "no" };
  const theta = p.angleDegrees * Math.PI / 180;
  let sine = 0, term = theta;
  for (let i = 0; i < 24; i++) { sine += term; term *= -theta * theta / ((2 * i + 2) * (2 * i + 3)); }
  const force = 100 * (theta - sine) / theta;
  const ratio = 2 / Math.PI * integral(u => 1 / Math.sqrt(1 - Math.sin(theta / 2) ** 2 * Math.sin(u) ** 2), 0, Math.PI / 2);
  const period = 100 * (ratio - 1);
  return { "force-error": String(force), "period-error": String(period), passes: force <= p.tolerance ? period <= p.tolerance ? "both" : "force" : period <= p.tolerance ? "period" : "neither" };
}
function expectedNumber(q: Question, id: string) {
  const field = q.fields.find(field => field.id === id);
  if (field?.kind === "exact") return approximateExact(parseExact(field.expected)).real;
  if (field?.kind === "rational") { const r = parseRational(field.expected); return Number(r.numerator) / Number(r.denominator); }
  throw Error(`Unexpected field ${id}`);
}

it.each(phs232OscillatorModelVariants)("checks %s across 50 seeds with torque, inertia, derivative or quadrature references", variant => {
  for (let seed = 0; seed < 50; seed++) {
    const q = phs232OscillatorModelQuestion("phs232-oscillator-model", variant, `model-${seed}`, "q"), response = responseFor(q, variant), p = q.parameters;
    expect(q).toEqual(phs232OscillatorModelQuestion(q.familyId, variant, `model-${seed}`, "q"));
    expect(q).toMatchObject({ courseId: "phs-232", objectiveId: "m01-l02", critical: true, familyVersion: 1 });
    expect(gradeQuestion(q, response).correct, JSON.stringify({ variant, seed, response })).toBe(true);
    for (const field of q.fields) {
      for (const invalid of ["", "NaN", "Infinity", "1/0", "2 rad/s"]) expect(gradeField(field, invalid).valid).toBe(false);
      if (field.kind === "choice") for (const option of field.options.filter(option => option.id !== response[field.id])) expect(gradeQuestion(q, { ...response, [field.id]: option.id }).correct).toBe(false);
      else expect(gradeQuestion(q, { ...response, [field.id]: `(${response[field.id]})+1` }).correct).toBe(false);
    }
    if (variant === "physical-pendulum" || variant === "simple-pendulum") {
      const m = p.massNumerator / 4, L = p.lengthNumerator / 5, d = variant === "simple-pendulum" || p.shape ? L : L / 2;
      const inertia = expectedNumber(q, "inertia"), omega = expectedNumber(q, "omega"), perturbation = 1e-5;
      const acceleration = -m * p.gravity * d * Math.sin(perturbation) / inertia;
      expect(-acceleration / perturbation / (omega * omega)).toBeCloseTo(1, 9);
      expect(inertia).toBeGreaterThan(0);
      if (variant === "physical-pendulum") expect(inertia).toBeGreaterThan(m * d * d);
    }
    if (variant === "potential-curvature") {
      const k = p.massNumerator / 4 * p.omega ** 2, qx = p.scale / 10, h = 1e-5;
      const U = (x: number) => k * x * x / 2 + p.beta * x ** 4;
      expect(-(U(qx + h) - U(qx - h)) / (2 * h)).toBeCloseTo(expectedNumber(q, "force"), 6);
      expect((U(h) - 2 * U(0) + U(-h)) / h ** 2).toBeCloseTo(expectedNumber(q, "curvature"), 7);
      expect(4 * p.beta * qx ** 3).toBeGreaterThan(0);
    }
    if (variant === "torsion") {
      const kappa = p.massNumerator / 20 * p.omega ** 2, angle = p.scale / 10;
      expect(integral(t => kappa * t, 0, angle)).toBeCloseTo(expectedNumber(q, "energy"), 11);
      expect(p.massNumerator / 40 * expectedNumber(q, "speed") ** 2).toBeCloseTo(expectedNumber(q, "energy"), 11);
    }
  }
});

it("covers each equilibrium character, extended-body inertia and tolerance outcome without equating force and period errors", () => {
  const cases = new Set<number>(), shapes = new Set<number>(), angles = new Set<number>(), passes = new Set<string>();
  let fifteenChecked = false;
  for (let i = 0; i < 200; i++) {
    cases.add(phs232OscillatorModelQuestion("phs232-oscillator-model", "unstable-equilibrium", String(i), "q").parameters.caseIndex);
    shapes.add(phs232OscillatorModelQuestion("phs232-oscillator-model", "physical-pendulum", String(i), "q").parameters.shape);
    const q = phs232OscillatorModelQuestion("phs232-oscillator-model", "small-angle-error", String(i), "q"), response = responseFor(q, "small-angle-error");
    angles.add(q.parameters.angleDegrees); passes.add(response.passes);
    if (q.parameters.angleDegrees === 15 && q.parameters.tolerance === 1) {
      expect(Number(response["force-error"])).toBeCloseTo(1.138407053463, 9);
      expect(Number(response["period-error"])).toBeCloseTo(.4300579173465, 9);
      expect(response.passes).toBe("period"); fifteenChecked = true;
      expect(gradeQuestion(q, { ...response, "force-error": response["period-error"] }).correct).toBe(false);
    }
  }
  expect(cases.size).toBe(4); expect(shapes.size).toBe(2); expect(angles.size).toBe(7);
  expect(passes).toEqual(new Set(["both", "period", "neither"])); expect(fifteenChecked).toBe(true);
  expect(() => phs232OscillatorModelQuestion("bad", "torsion", "x", "q")).toThrow();
  expect(() => phs232OscillatorModelQuestion("phs232-oscillator-model", "bad", "x", "q")).toThrow();
});
