import { expect, it } from "vitest";
import { phs232HarmonicStateQuestion, phs232HarmonicStateVariants } from "../lib/learning/families/phs-232-harmonic-state";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import type { Question } from "../lib/learning/contracts";

function expectedAnswers(q: Question, variant: string): Record<string, string> {
  const p = q.parameters;
  if (variant === "parameter-frequency") return { omega: String(Math.sqrt((p.massNumerator * p.omega * p.omega / 2) / (p.massNumerator / 2))), period: `pi/(${p.omega}/2)`, frequency: `${p.omega}/pi/2`, amplitude: "unchanged" };
  if (variant === "state-from-phase") {
    const n = ((p.phaseQuarter + p.timeQuarter) % 8 + 8) % 8;
    const geometricCosine = (value: number) => { const j = (value % 8 + 8) % 8; return j % 2 === 0 ? String([1, 0, -1, 0][j / 2]) : `${j === 1 || j === 7 ? 1 : -1}/sqrt(2)`; };
    return { position: `(${geometricCosine(n)})*${p.scale}/100`, velocity: `(${geometricCosine(2 - n)})*${-p.omega * p.scale}/100`, acceleration: `(${geometricCosine(n)})*${-p.omega * p.omega * p.scale}/100`, direction: n % 4 === 0 ? "zero" : Math.sin(n * Math.PI / 4) > 0 ? "negative" : "positive" };
  }
  if (variant === "initial-state-inverse") {
    const x = p.sx * (p.swap ? 4 : 3) * p.scale / 100, v = p.sv * (p.swap ? 3 : 4) * p.scale * p.omega / 100;
    const magnitude = Math.hypot(x, v / p.omega);
    let phase = Math.acos(x / magnitude); if (v > 0) phase = -phase;
    return { omega: String(p.omega), amplitude: `${p.scale}/20`, phase: phase.toFixed(8) };
  }
  if (variant === "derivative-sign") {
    const theta = (p.phaseQuarter + p.timeQuarter) * Math.PI / 4;
    const x = p.scale / 100 * Math.cos(theta), v = -p.omega * p.scale / 100 * Math.sin(theta), a = -p.omega * p.omega * x;
    const sign = (x: number) => Math.abs(x) < 1e-12 ? "zero" : x > 0 ? "positive" : "negative";
    return { velocity: sign(v), acceleration: sign(a), speed: sign(v) === "zero" ? "corner" : sign(a) === "zero" ? "zero-rate" : v * a > 0 ? "increasing" : "decreasing" };
  }
  if (variant === "phase-equivalence") {
    const amplitude = (p.representation === 2 ? -1 : 1) * p.scale / 100, angular = (p.representation === 3 ? -1 : 1) * p.omega;
    const coefficient = p.representation === 0 ? p.phaseQuarter + 8 * p.turns : p.representation === 3 ? -p.phaseQuarter : p.phaseQuarter + 4;
    const x = amplitude * Math.cos(coefficient * Math.PI / 4), v = -amplitude * angular * Math.sin(coefficient * Math.PI / 4);
    let principal = Math.round(Math.atan2(-v / p.omega, x) * 4 / Math.PI); if (principal === 4) principal = -4;
    const oldX = p.scale / 100 * Math.cos(p.phaseQuarter * Math.PI / 4), oldV = -p.scale * p.omega / 100 * Math.sin(p.phaseQuarter * Math.PI / 4);
    const same = Math.abs(x - oldX) < 1e-12 && Math.abs(v - oldV) < 1e-12;
    return { same: same ? "yes" : "no", amplitude: `${p.scale}/100`, phase: `pi*(${principal}/4)` };
  }
  return { amplitude: "0/17", "natural-period": `pi*2/${p.omega}`, phase: "unidentified", period: "none" };
}

it.each(phs232HarmonicStateVariants)("independently checks harmonic state variant %s over 50 deterministic seeds", variant => {
  const parameterSets = new Set<string>();
  for (let seed = 0; seed < 50; seed++) {
    const q = phs232HarmonicStateQuestion("phs232-harmonic-state", variant, `state-${seed}`, "q"), p = q.parameters;
    expect(q).toEqual(phs232HarmonicStateQuestion(q.familyId, variant, `state-${seed}`, "q"));
    expect(q).toMatchObject({ courseId: "phs-232", objectiveId: "m01-l01", familyVersion: 1 });
    const response = expectedAnswers(q, variant);
    expect(gradeQuestion(q, response).correct, JSON.stringify({ variant, seed, response })).toBe(true);
    for (const field of q.fields) {
      expect(gradeField(field, "").valid).toBe(false);
      expect(gradeField(field, "not a value").valid).toBe(false);
      if (field.kind === "choice") {
        for (const option of field.options.filter(option => option.id !== response[field.id])) {
          expect(gradeQuestion(q, { ...response, [field.id]: option.id }).correct).toBe(false);
          expect(option.feedback.length).toBeGreaterThan(20);
        }
      } else {
        for (const input of ["NaN", "Infinity", "1/0"]) expect(gradeField(field, input).valid).toBe(false);
        expect(gradeQuestion(q, { ...response, [field.id]: `(${response[field.id]})+1` }).correct).toBe(false);
      }
    }
    if (variant === "state-from-phase") {
      const time = p.timeQuarter * Math.PI / (4 * p.omega), theta = p.omega * time + p.phaseQuarter * Math.PI / 4;
      const values = { position: p.scale / 100 * Math.cos(theta), velocity: -p.omega * p.scale / 100 * Math.sin(theta), acceleration: -(p.omega ** 2) * p.scale / 100 * Math.cos(theta) };
      for (const field of q.fields) if (field.kind === "exact") expect(approximateExact(parseExact(field.expected)).real).toBeCloseTo(values[field.id as keyof typeof values], 11);
    }
    if (variant === "initial-state-inverse") {
      const phase = Number(response.phase), amplitude = p.scale / 20;
      expect(amplitude * Math.cos(phase)).toBeCloseTo(p.sx * (p.swap ? 4 : 3) * p.scale / 100, 7);
      expect(-p.omega * amplitude * Math.sin(phase)).toBeCloseTo(p.sv * (p.swap ? 3 : 4) * p.scale * p.omega / 100, 7);
      expect(gradeQuestion(q, { ...response, phase: String(phase + 2 * Math.PI) }).correct).toBe(false);
    }
    parameterSets.add(JSON.stringify(p));
  }
  expect(parameterSets.size).toBeGreaterThan(40);
});

it("keeps exact angular quantities distinct from rounded decimals and checks all phase representations", () => {
  const representations = new Set<number>(), signs = new Set<string>(), derivativeCases = new Set<string>();
  for (let seed = 0; seed < 100; seed++) {
    const phase = phs232HarmonicStateQuestion("phs232-harmonic-state", "phase-equivalence", String(seed), "q"); representations.add(phase.parameters.representation);
    const inverse = phs232HarmonicStateQuestion("phs232-harmonic-state", "initial-state-inverse", String(seed), "q"); signs.add(`${inverse.parameters.sx},${inverse.parameters.sv}`);
    const derivative = phs232HarmonicStateQuestion("phs232-harmonic-state", "derivative-sign", String(seed), "q"); derivativeCases.add(expectedAnswers(derivative, "derivative-sign").speed);
  }
  expect(representations.size).toBe(4); expect(signs.size).toBe(4); expect(derivativeCases).toEqual(new Set(["corner", "zero-rate", "increasing", "decreasing"]));
  const q = phs232HarmonicStateQuestion("phs232-harmonic-state", "parameter-frequency", "units", "q"), response = expectedAnswers(q, "parameter-frequency");
  expect(gradeQuestion(q, { ...response, period: String(2 * Math.PI / q.parameters.omega) }).correct).toBe(false);
  expect(gradeQuestion(q, { ...response, frequency: String(q.parameters.omega) }).correct).toBe(false);
  expect(() => phs232HarmonicStateQuestion("other", "parameter-frequency", "x", "q")).toThrow();
  expect(() => phs232HarmonicStateQuestion("phs232-harmonic-state", "other", "x", "q")).toThrow();
});
