import { expect, it } from "vitest";
import { phs232DampingEvidenceQuestion, phs232DampingEvidenceVariants } from "../lib/learning/families/phs-232-damping-evidence";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import type { Question } from "../lib/learning/contracts";
import { parseRational } from "../lib/learning/rational";
import { approximateLogarithmic, parseLogarithmic } from "../lib/learning/logarithmic-number";

const decimal = (value: number) => value.toFixed(12);
const number = (text: string) => { const value = parseRational(text); return Number(value.numerator) / Number(value.denominator); };
function integrate(x: number, v: number, stiffness: number, damping: number, time: number) {
  const n = 4096, h = time / n;
  const acceleration = (x: number, v: number) => -stiffness * x - damping * v;
  for (let i = 0; i < n; i++) {
    const a1 = acceleration(x, v), v2 = v + h * a1 / 2, a2 = acceleration(x + h * v / 2, v2);
    const v3 = v + h * a2 / 2, a3 = acceleration(x + h * v2 / 2, v3), v4 = v + h * a3, a4 = acceleration(x + h * v3, v4);
    x += h * (v + 2 * v2 + 2 * v3 + v4) / 6; v += h * (a1 + 2 * a2 + 2 * a3 + a4) / 6;
  }
  return { x, v };
}
function answers(q: Question, variant: string): Record<string, string> {
  const p = q.parameters, s = p.scale;
  if (variant === "decrement") {
    const ratio = 2 ** p.ratioPower, beta = Math.log(ratio) / p.elapsed, frequency = 2 * Math.PI / (p.elapsed / p.cycles);
    return { beta: `ln((${p.a}/100)/(${p.a}/${100 * ratio}))/${p.elapsed}`, decrement: `ln(${ratio})/${p.cycles}`, frequency: `2*pi/(${p.elapsed}/${p.cycles})`, natural: decimal(Math.sqrt(frequency * frequency + beta * beta)), coefficient: `${p.massNumerator}*ln(${ratio})/${p.elapsed}` };
  }
  if (variant === "peak-spacing") {
    let low = 0, high = Math.PI / (4 * s);
    for (let i = 0; i < 36; i++) { const middle = (low + high) / 2; if (integrate(p.a / 100, 0, 25 * s * s, 6 * s, middle).x > 0) low = middle; else high = middle; }
    const period = Math.PI / (2 * s), next = integrate(p.a / 100, 0, 25 * s * s, 6 * s, period);
    expect(Math.abs(next.v)).toBeLessThan(1e-12);
    return { period: `2*pi/${4 * s}`, zero: decimal((low + high) / 2), peak: decimal(next.x), envelope: `${p.a}/100*5/4`, touches: "no" };
  }
  if (variant === "energy-balance") {
    const v = p.mode === 0 ? 0 : p.sv * p.c * s, k = 25 * p.massNumerator * s * s / 2, m = p.massNumerator / 2, b = 3 * p.massNumerator * s;
    const E = `${m}/2*(${v}/100)^2+${k}/2*(${p.sx * p.a}/100)^2`, power = `${b}*(${v}/100)^2`;
    return { energy: E, power, derivative: `-(${power})`, transferred: `(${E})-(${E})/4`, law: "velocity" };
  }
  if (variant === "envelope-limit") {
    const time = p.quarter * Math.PI / (8 * s), state = integrate(p.a / 100, 0, 25 * s * s, 6 * s, time), initial = 25 * s * s * (p.a / 100) ** 2;
    const actual = (state.v * state.v + 25 * s * s * state.x * state.x) / initial, guess = Math.exp(-6 * s * time);
    expect(actual / guess).toBeCloseTo(p.quarter % 2 ? 17 / 8 : 1, 10);
    return { actual: decimal(actual), guess: decimal(guess), ratio: p.quarter % 2 ? "34/16" : "2/2", initial: "0", universal: "no" };
  }
  if (variant === "settling-definition") {
    if (q.figure?.kind !== "data-table") throw Error("Missing sampled record");
    const rows = q.figure.rows, inside = rows.map(row => Math.max(Math.abs(Number(row[1])), Math.abs(Number(row[2]))) <= p.bandNumerator / 10);
    const first = inside.indexOf(true), suffix = inside.lastIndexOf(false) + 1;
    expect(first).toBeLessThan(suffix); expect(suffix).toBeLessThan(rows.length);
    return { first: rows[first][0], suffix: rows[suffix][0], outside: String(inside.filter(value => !value).length), inference: "record" };
  }
  if (q.figure?.kind !== "data-table") throw Error("Missing peak record");
  const rows = q.figure.rows, times = rows.map(row => Number(row[1])), peaks = rows.map(row => Number(row[2]));
  const ratios = peaks.slice(1).map((value, i) => [(peaks[i] - .01) / (value + .01), (peaks[i] + .01) / (value - .01)]);
  const intervals = times.slice(1).map((value, i) => [value - times[i] - .002, value - times[i] + .002]);
  const disjoint = (bounds: number[][]) => Math.max(...bounds.map(bound => bound[0])) > Math.min(...bounds.map(bound => bound[1]));
  return { beta: `ln(${peaks[0]}/${peaks[1]})/(${times[1]}-${times[0]})`, last: `ln(${peaks[2]}/${peaks[3]})`, diagnosis: disjoint(ratios) ? "decay" : disjoint(intervals) ? "spacing" : "compatible", unique: "no" };
}

it.each(phs232DampingEvidenceVariants)("checks %s across 50 seeds with independent state, energy or record reasoning", variant => {
  for (let seed = 0; seed < 50; seed++) {
    const q = phs232DampingEvidenceQuestion("phs232-damping-evidence", variant, `evidence-${seed}`, "q"), response = answers(q, variant);
    expect(q).toEqual(phs232DampingEvidenceQuestion(q.familyId, variant, `evidence-${seed}`, "q"));
    expect(q).toMatchObject({ courseId: "phs-232", objectiveId: "m01-l03", critical: true, familyVersion: 1 });
    expect(gradeQuestion(q, response).correct, JSON.stringify({ variant, seed, response })).toBe(true);
    for (const field of q.fields) {
      for (const invalid of ["", "NaN", "Infinity", "1/0", "3 kg/s"]) expect(gradeField(field, invalid).valid).toBe(false);
      if (field.kind === "choice") for (const option of field.options.filter(option => option.id !== response[field.id])) expect(gradeField(field, option.id).correct).toBe(false);
      else {
        expect(gradeField(field, `(${response[field.id]})+1`).correct).toBe(false);
        expect(gradeField(field, `(${response[field.id]})*2/2`).correct).toBe(true);
      }
      if (field.kind === "logarithmic") {
        for (const invalid of ["ln(0)", "ln(-2)", "log(1,2)"]) expect(gradeField(field, invalid).valid).toBe(false);
        expect(gradeField(field, decimal(approximateLogarithmic(parseLogarithmic(field.expected)))).correct).toBe(false);
      }
    }
    if (variant === "decrement" && q.parameters.cycles > 1) expect(gradeQuestion(q, { ...response, decrement: `ln(${2 ** q.parameters.ratioPower})` }).correct).toBe(false);
    if (variant === "peak-spacing") { expect(gradeField(q.fields[0], `pi/${4 * q.parameters.scale}`).correct).toBe(false); expect(gradeField(q.fields[2], "0").correct).toBe(false); }
    if (variant === "energy-balance" && q.parameters.mode !== 0) expect(gradeQuestion(q, { ...response, derivative: response.power }).correct).toBe(false);
    if (variant === "settling-definition") expect(gradeQuestion(q, { ...response, suffix: response.first }).correct).toBe(false);
  }
});

it("checks every printed simulated state independently and requires both position and velocity bands", () => {
  const parameters = new Set<string>(); let velocityOnlyExit = 0, positionOnlyExit = 0;
  for (let seed = 0; seed < 50; seed++) {
    const q = phs232DampingEvidenceQuestion("phs232-damping-evidence", "settling-definition", `table-${seed}`, "q"), gamma = q.parameters.gammaNumerator / 100, band = q.parameters.bandNumerator / 10;
    if (q.figure?.kind !== "data-table") throw Error("Missing record");
    parameters.add(`${gamma}:${band}`);
    for (const row of q.figure.rows) {
      const state = integrate(1, 0, 1 + gamma * gamma, 2 * gamma, number(row[0]) * 2 * Math.PI);
      expect(Number(row[1])).toBeCloseTo(state.x, 5); expect(Number(row[2])).toBeCloseTo(state.v / Math.sqrt(1 + gamma * gamma), 5);
      expect(Math.abs(Number(row[1]) - state.x)).toBeLessThan(.000000501);
      expect(Math.abs(Number(row[2]) - state.v / Math.sqrt(1 + gamma * gamma))).toBeLessThan(.000000501);
      const positionInside = Math.abs(Number(row[1])) <= band, velocityInside = Math.abs(Number(row[2])) <= band;
      if (positionInside && !velocityInside) velocityOnlyExit++; if (velocityInside && !positionInside) positionOnlyExit++;
    }
  }
  expect(parameters.size).toBeGreaterThanOrEqual(13); expect(velocityOnlyExit).toBeGreaterThan(20); expect(positionOnlyExit).toBeGreaterThan(20);
});

it("covers all model diagnoses, stationary power instants and phase coincidences, without changing dimensional quantities", () => {
  const diagnoses = new Set<string>(), quarters = new Set<number>(), modes = new Set<number>();
  for (let seed = 0; seed < 80; seed++) {
    const q = phs232DampingEvidenceQuestion("phs232-damping-evidence", "model-rejection", `branches-${seed}`, "q"), response = answers(q, "model-rejection");
    diagnoses.add(response.diagnosis); expect(gradeQuestion(q, response).correct).toBe(true);
    expect(q.figure?.kind).toBe("data-table"); expect(q.prompt).toContain("stated bounds");
    const energy = phs232DampingEvidenceQuestion(q.familyId, "energy-balance", `branches-${seed}`, "q");
    modes.add(energy.parameters.mode);
    expect(energy.fields.filter(field => "unit" in field).map(field => field.unit)).toEqual(["J", "W", "W", "J"]);
    const envelope = phs232DampingEvidenceQuestion(q.familyId, "envelope-limit", `branches-${seed}`, "q"); quarters.add(envelope.parameters.quarter);
  }
  expect([...diagnoses].sort()).toEqual(["compatible", "decay", "spacing"]); expect(modes.size).toBe(3); expect(quarters.size).toBe(4);
  expect(() => phs232DampingEvidenceQuestion("unknown", "decrement", "bad", "q")).toThrow();
  expect(() => phs232DampingEvidenceQuestion("phs232-damping-evidence", "unknown", "bad", "q")).toThrow();
});

it("rejects small-peak rounding beyond the printed tolerance while accepting sufficient precision", () => {
  const q = phs232DampingEvidenceQuestion("phs232-damping-evidence", "peak-spacing", "tolerance", "q");
  const field = q.fields.find(field => field.id === "peak"); if (field?.kind !== "numeric") throw Error("Missing peak");
  expect(field.absoluteTolerance).toBe(.00000001); expect(field.help).toContain("8 digits");
  expect(gradeField(field, decimal(field.expected + .4e-8)).correct).toBe(true);
  expect(gradeField(field, decimal(field.expected + 2e-8)).correct).toBe(false);
});
