import { expect, it } from "vitest";
import { phs232HarmonicEventsQuestion, phs232HarmonicEventsVariants } from "../lib/learning/families/phs-232-harmonic-events";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import type { Question } from "../lib/learning/contracts";

function answers(q: Question, variant: string): Record<string, string> {
  const p = q.parameters, x = (eighth: number) => p.scale / 100 * Math.cos(p.phaseQuarter * Math.PI / 4 + eighth * Math.PI / 8);
  const v = (eighth: number) => -p.omega * p.scale / 100 * Math.sin(p.phaseQuarter * Math.PI / 4 + eighth * Math.PI / 8);
  const sign = (n: number) => Math.abs(n) < 1e-10 ? 0 : Math.sign(n);
  const first = (test: (eighth: number) => boolean) => { for (let eighth = 1; eighth <= 16; eighth++) if (test(eighth)) return eighth; throw new Error("No event in one period"); };
  const time = (eighth: number) => `pi*${eighth}/${8 * p.omega}`;
  if (variant === "first-crossing") {
    const target = p.scale / 100 * Math.cos(p.targetQuarter * Math.PI / 4), firstTime = first(n => Math.abs(x(n) - target) < 1e-10);
    return { time: time(firstTime), direction: sign(v(firstTime)) === 0 ? "zero" : v(firstTime) > 0 ? "positive" : "negative" };
  }
  if (variant === "directed-crossing") {
    const target = p.scale / 100 * Math.cos(p.interiorQuarter * Math.PI / 4);
    return { requested: time(first(n => Math.abs(x(n) - target) < 1e-10 && sign(v(n)) === p.direction)), opposite: time(first(n => Math.abs(x(n) - target) < 1e-10 && sign(v(n)) === -p.direction)) };
  }
  if (variant === "turning-point") {
    const n = first(n => sign(v(n)) === 0), position = Math.round(x(n) * 100);
    return { time: time(n), position: `${position}/100`, acceleration: `${-position * p.omega * p.omega}/100`, after: v(n + .001) > 0 ? "positive" : "negative" };
  }
  if (variant === "window-count") {
    const target = p.scale / 100 * Math.cos(p.targetQuarter * Math.PI / 4);
    const events = Array.from({ length: p.spanEighth + 1 }, (_, i) => p.fromEighth + i).filter(n => {
      if (n === p.fromEighth && !p.includeFrom || n === p.fromEighth + p.spanEighth && !p.includeTo) return false;
      return Math.abs(x(n) - target) < 1e-10 && (p.filter === 0 || sign(v(n)) === p.filter);
    });
    return { count: String(events.length) };
  }
  if (variant === "state-recurrence") {
    if (p.stationary) return { position: "none", state: "none" };
    const position = first(n => Math.abs(x(n) - x(0)) < 1e-10), state = first(n => Math.abs(x(n) - x(0)) < 1e-10 && Math.abs(v(n) - v(0)) < 1e-10);
    return { position: time(position), state: time(state), same: position === state ? "yes" : "no" };
  }
  const sample = (frequency: number, n: number) => Math.cos(2 * Math.PI * frequency * n / p.sampleRate);
  let alias = -1;
  for (let candidate = 0; candidate <= p.sampleRate; candidate++) if (Array.from({ length: 32 }, (_, n) => Math.abs(sample(candidate, n) - sample(p.frequency, n)) < 1e-10).every(Boolean)) { alias = candidate; break; }
  const angleIndex = ((8 * p.frequency / p.sampleRate) % 8 + 8) % 8;
  const unit = angleIndex % 2 === 0 ? String([1, 0, -1, 0][angleIndex / 2]) : `${angleIndex === 1 || angleIndex === 7 ? 1 : -1}/sqrt(2)`;
  expect(alias).toBeGreaterThanOrEqual(0);
  for (let n = 0; n < 100; n++) expect(sample(p.frequency + p.aliasTurns * p.sampleRate, n)).toBeCloseTo(sample(p.frequency, n), 10);
  return { alias: String(alias), sample: `${p.scale}/100*(${unit})`, alternative: "yes", unique: "no" };
}

it.each(phs232HarmonicEventsVariants)("independently enumerates %s for 50 deterministic seeds", variant => {
  for (let seed = 0; seed < 50; seed++) {
    const q = phs232HarmonicEventsQuestion("phs232-harmonic-events", variant, `events-${seed}`, "q"), response = answers(q, variant);
    expect(q).toEqual(phs232HarmonicEventsQuestion(q.familyId, variant, `events-${seed}`, "q"));
    expect(q).toMatchObject({ courseId: "phs-232", objectiveId: "m01-l01", familyVersion: 1 });
    expect(gradeQuestion(q, response).correct, JSON.stringify({ variant, seed, response })).toBe(true);
    for (const field of q.fields) {
      for (const invalid of ["", "not an answer", "NaN", "Infinity", "1/0"]) expect(gradeField(field, invalid).valid).toBe(false);
      if (field.kind === "choice") for (const option of field.options.filter(option => option.id !== response[field.id])) {
        expect(gradeQuestion(q, { ...response, [field.id]: option.id }).correct).toBe(false);
        expect(option.feedback.length).toBeGreaterThan(20);
      }
      else {
        expect(gradeQuestion(q, { ...response, [field.id]: `(${response[field.id]})+1` }).correct).toBe(false);
        if (field.kind === "pi-expression") expect(gradeQuestion(q, { ...response, [field.id]: `(${response[field.id]})+2*pi/${q.parameters.omega}` }).correct).toBe(false);
      }
    }
    if (variant === "sample-alias") {
      const sample = q.fields.find(field => field.id === "sample");
      if (sample?.kind !== "exact") throw new Error("Expected exact sample field");
      expect(approximateExact(parseExact(sample.expected)).real).toBeCloseTo(q.parameters.scale / 100 * Math.cos(2 * Math.PI * q.parameters.frequency / q.parameters.sampleRate), 12);
    }
  }
});

it("covers endpoint rules, excluded initial roots, unreachable directed touches, equilibrium and constant samples", () => {
  const boundaryCases = new Set<string>(), recurrence = new Set<string>(), aliasCases = new Set<string>();
  let excludedInitial = false, directedTouch = false, nonintegerWindow = false;
  for (let seed = 0; seed < 300; seed++) {
    const window = phs232HarmonicEventsQuestion("phs232-harmonic-events", "window-count", String(seed), "q"), p = window.parameters;
    expect(gradeQuestion(window, answers(window, "window-count")).correct).toBe(true);
    const startOnTarget = Math.abs(Math.cos((2 * p.phaseQuarter + p.fromEighth) * Math.PI / 8) - Math.cos(p.targetQuarter * Math.PI / 4)) < 1e-10;
    if (startOnTarget && p.filter === 0) boundaryCases.add(`${p.includeFrom},${p.includeTo}`);
    if ((p.targetQuarter === 0 || p.targetQuarter === 4) && p.filter !== 0) { expect(answers(window, "window-count").count).toBe("0"); directedTouch = true; }
    if (p.fromEighth % 2 && p.spanEighth % 2) nonintegerWindow = true;
    const first = phs232HarmonicEventsQuestion("phs232-harmonic-events", "first-crossing", String(seed), "q");
    if (Math.abs(Math.cos(first.parameters.phaseQuarter * Math.PI / 4) - Math.cos(first.parameters.targetQuarter * Math.PI / 4)) < 1e-10) {
      expect(gradeQuestion(first, { ...answers(first, "first-crossing"), time: "0" }).correct).toBe(false); excludedInitial = true;
    }
    const state = phs232HarmonicEventsQuestion("phs232-harmonic-events", "state-recurrence", String(seed), "q");
    recurrence.add(state.parameters.stationary ? "stationary" : answers(state, "state-recurrence").same);
    const sampled = phs232HarmonicEventsQuestion("phs232-harmonic-events", "sample-alias", String(seed), "q");
    const f = Number(answers(sampled, "sample-alias").alias);
    aliasCases.add(f === 0 ? "constant" : f === sampled.parameters.sampleRate / 2 ? "nyquist" : "interior");
  }
  expect(boundaryCases.size).toBe(4); expect(recurrence).toEqual(new Set(["stationary", "yes", "no"])); expect(aliasCases).toEqual(new Set(["constant", "nyquist", "interior"]));
  expect(excludedInitial && directedTouch && nonintegerWindow).toBe(true);
  expect(() => phs232HarmonicEventsQuestion("other", "first-crossing", "x", "q")).toThrow();
  expect(() => phs232HarmonicEventsQuestion("phs232-harmonic-events", "other", "x", "q")).toThrow();
});
