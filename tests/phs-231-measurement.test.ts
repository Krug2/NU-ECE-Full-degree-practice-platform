import { expect, it } from "vitest";
import katex from "katex";
import { phs231MeasurementQuestion, phs231MeasurementVariants } from "../lib/learning/families/phs-231-measurement";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { parseRational } from "../lib/learning/rational";
import { measurementInputsSchema, speedBounds } from "../lib/learning/phs-231-measurement";
import type { Question, Response } from "../lib/learning/contracts";

const fraction = (a: number, b = 1) => `${a}/${b}`;
function check(q: Question, response: Response) {
  expect(gradeQuestion(q, response).correct, q.prompt).toBe(true);
  for (const field of q.fields) {
    expect(gradeField(field, "").valid).toBe(false);
    expect(gradeField(field, "Infinity").valid).toBe(false);
    expect(gradeField(field, "1/0").valid).toBe(false);
    expect(gradeField(field, "alert(1)").valid).toBe(false);
    if (field.kind !== "choice") {
      expect(gradeField(field, "3 m/s").valid).toBe(false);
      const v = parseRational(response[field.id]);
      expect(gradeField(field, `${v.numerator*7n}/${v.denominator*7n}`).correct).toBe(true);
      expect(gradeField(field, fraction(Number(v.numerator)*10+Number(v.denominator), Number(v.denominator))).correct).toBe(false);
    } else {
      for (const option of field.options) if (option.id !== response[field.id]) expect(gradeField(field, option.id).correct).toBe(false);
    }
  }
}

it("independently checks every measurement variant over 50 deterministic seeds", () => {
  const positions = new Set<number>();
  for (const [family, variants] of Object.entries(phs231MeasurementVariants)) for (const variant of variants) for (let seed = 0; seed < 50; seed++) {
    const q = phs231MeasurementQuestion(family, variant, String(seed), "fixture");
    expect(q).toEqual(phs231MeasurementQuestion(family, variant, String(seed), "fixture"));
    const visit = (x: unknown): void => {
      if (typeof x === "string") for (const match of x.matchAll(/\$([^$]+)\$/g)) expect(() => katex.renderToString(match[1], { strict: "error", trust: false })).not.toThrow();
      else if (x && typeof x === "object") Object.values(x).forEach(visit);
    };
    visit(q);
    const p = q.parameters;
    let answer: Response;
    if (family === "phs231-unit-conversion") {
      const values: Record<string, [string, string, string]> = {
        area: [fraction(p.n, 1000*1000), "square", "m²"],
        volume: [fraction(p.n, 100*100*100), "cube", "m³"],
        speed: [fraction(p.n*1000, 60*60), "ratio", "m/s"],
        density: [fraction(p.n*100*100*100, 10*1000), "ratio", "kg/m³"],
        force: [fraction(p.n*p.a, 1000*1000), "product", "N"],
      };
      const [value, reason, unit] = values[variant];
      expect(q.fields[0]).toMatchObject({ unit });
      answer = { value, reason };
    } else if (family === "phs231-dimensional-audit") {
      if (variant === "sufficiency") answer = { claim: "necessary", coefficient: "1/2" };
      else {
        const input = variant === "position" ? [0, 0, p.power] : [0, p.power, -p.power];
        const output = variant === "position" ? [0, 1, 0] : [1, 1, -2];
        const required = output.map((dimension, axis) => dimension - input[axis]);
        answer = { mass: String(required[0]), length: String(required[1]), time: String(required[2]) };
        expect(required.map((dimension, axis) => dimension + input[axis])).toEqual(output);
      }
    } else if (variant === "speed") {
      const corners = [-1, 1].flatMap(ds => [-1, 1].map(dt => ({ numerator: p.distanceCm+ds*p.distanceBoundCm, denominator: p.timeCs+dt*p.timeBoundCs })));
      corners.sort((a,b) => a.numerator*b.denominator-b.numerator*a.denominator);
      answer = { central: fraction(p.distanceCm, p.timeCs), lower: fraction(corners[0].numerator, corners[0].denominator), upper: fraction(corners[3].numerator, corners[3].denominator) };
      expect(gradeQuestion(q, { ...answer, lower: answer.upper, upper: answer.lower }).correct).toBe(false);
    } else if (variant === "standard") {
      const s=p.distanceCm/100, t=p.timeCs/100, us=p.distanceBoundCm/100, ut=p.timeBoundCs/100;
      const ds=1/t, dt=-s/(t*t);
      const variance=ds*ds*us*us + dt*dt*ut*ut;
      answer = { uncertainty: Math.sqrt(variance).toFixed(6), interpretation: "standard" };
    } else answer = { correction: String(p.trueMm-(p.trueMm+p.offsetMm)), claim: "bias" };
    check(q, answer);
    for (const f of q.fields) if (f.kind === "choice") positions.add(f.options.findIndex(o => o.id === f.correct));
  }
  expect(positions.size).toBeGreaterThanOrEqual(3);
});

it("uses independently derived conversion and measurement anchors", () => {
  expect(3*0.001*0.001).toBeCloseTo(0.000003, 15);
  expect(72*1000/(60*60)).toBe(20);
  const result = speedBounds({ distance: 2, distanceUncertainty: 0.02, time: 1, timeUncertainty: 0.05 });
  expect(result.central).toBe(2);
  expect(result.lower).toBeCloseTo(66/35, 14);
  expect(result.upper).toBeCloseTo(202/95, 14);
  for (let distance=1.98; distance<=2.020001; distance+=0.002) for (let time=.95; time<=1.050001; time+=.005) {
    expect(distance/time).toBeGreaterThanOrEqual(result.lower-1e-12);
    expect(distance/time).toBeLessThanOrEqual(result.upper+1e-12);
  }
  expect(result.upper-result.central).not.toBeCloseTo(result.central-result.lower, 5);
});

it("handles zero uncertainty, zero distance, domain limits, and invalid data", () => {
  expect(speedBounds({ distance: 0, distanceUncertainty: 0, time: 1, timeUncertainty: 0 })).toEqual({ central: 0, lower: 0, upper: 0 });
  expect(speedBounds({ distance: 3, distanceUncertainty: 0, time: 2, timeUncertainty: 0 })).toEqual({ central: 1.5, lower: 1.5, upper: 1.5 });
  expect(speedBounds({ distance: 1, distanceUncertainty: 1, time: 2, timeUncertainty: 1 }).lower).toBe(0);
  const baseline = { distance: 2, distanceUncertainty: .1, time: 1, timeUncertainty: .1 };
  for (const patch of [{time:0},{timeUncertainty:1},{timeUncertainty:2},{distanceUncertainty:3},{distance:-1},{time:NaN},{distance:Infinity},{distanceUncertainty:-.1},{time:10001}]) {
    expect(measurementInputsSchema.safeParse({ ...baseline, ...patch }).success).toBe(false);
    expect(() => speedBounds({ ...baseline, ...patch })).toThrow();
  }
  for (const family of Object.keys(phs231MeasurementVariants)) expect(() => phs231MeasurementQuestion(family, "unknown", "1", "q")).toThrow();
  expect(() => phs231MeasurementQuestion("other", "area", "1", "q")).toThrow();
});
