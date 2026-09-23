import { expect, it } from "vitest";
import katex from "katex";
import { foundationTriangleQuestion } from "../lib/learning/families/mth-foundation-triangles";
import { gradeQuestion } from "../lib/learning/grading";
import { approximateExact, parseExact } from "../lib/learning/exact-number";

function question(family: string, variant: string, seed: number) {
  const item = foundationTriangleQuestion(family, variant, String(seed), "q1");
  const visit = (value: unknown): void => {
    if (typeof value === "string") for (const match of value.matchAll(/\$([^$]+)\$/g)) expect(() => katex.renderToString(match[1], { strict: "error", trust: false })).not.toThrow();
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(item); expect(foundationTriangleQuestion(family, variant, String(seed), "q1")).toEqual(item); return item;
}
it("checks reference-side roles and the Pythagorean relation on fifty seeded triangles", () => {
  const references = new Set<string>();
  for (let seed = 0; seed < 50; seed++) {
    const labels = question("mth-triangle-geometry", "labels", seed), figure = labels.figure!;
    if (figure.kind !== "right-triangle") throw new Error("Expected triangle");
    references.add(figure.angleAt);
    const opposite = figure.angleAt === "B" ? "ac" : "ab", adjacent = figure.angleAt === "B" ? "ab" : "ac";
    expect(gradeQuestion(labels, { hypotenuse: "bc", opposite, adjacent }).correct).toBe(true);
    expect(gradeQuestion(labels, { hypotenuse: "bc", opposite: adjacent, adjacent: opposite }).correct).toBe(false);
    const hyp = question("mth-triangle-geometry", "hypotenuse", seed), field = hyp.fields[0];
    if (field.kind !== "exact") throw new Error("Expected exact length");
    const answer = approximateExact(parseExact(field.expected));
    expect(answer.imaginary).toBe(0); expect(answer.real**2).toBeCloseTo(hyp.parameters.legA**2+hyp.parameters.legB**2, 9);
    expect(gradeQuestion(hyp, { length: `-(${field.expected})` }).correct).toBe(false);
    const leg = question("mth-triangle-geometry", "leg", seed), { a, b, h } = leg.parameters;
    expect(a*a+b*b).toBe(h*h);
    expect(gradeQuestion(leg, { length: `sqrt(${h*h-b*b})`, formula: "difference" }).correct).toBe(true);
    expect(gradeQuestion(leg, { length: String(a), formula: "outside" }).correct).toBe(false);
  }
  expect([...references].sort()).toEqual(["B", "C"]);
});
it("matches trigonometric ratios to the indicated vertex across fifty seeds per function", () => {
  for (let seed = 0; seed < 50; seed++) for (const variant of ["sin", "cos", "tan"]) {
    const item = question("mth-triangle-ratios", variant, seed), { a, b, h } = item.parameters, figure = item.figure!;
    if (figure.kind !== "right-triangle") throw new Error("Expected triangle");
    const opposite = figure.angleAt === "B" ? b : a, adjacent = figure.angleAt === "B" ? a : b, opp = figure.angleAt === "B" ? "ac" : "ab", adj = figure.angleAt === "B" ? "ab" : "ac";
    const ratio = variant === "sin" ? `${opp}-bc` : variant === "cos" ? `${adj}-bc` : `${opp}-${adj}`, value = variant === "sin" ? `${opposite}/${h}` : variant === "cos" ? `${adjacent}/${h}` : `${opposite}/${adjacent}`;
    expect(gradeQuestion(item, { ratio, value }).correct).toBe(true);
    expect((opposite/h)**2+(adjacent/h)**2).toBeCloseTo(1, 12);
  }
});
it("preserves exact angle units and recognizes equivalent calculator inputs", () => {
  for (let seed = 0; seed < 50; seed++) {
    for (const variant of ["to-radians", "to-degrees"]) {
      const item = question("mth-angle-conversion", variant, seed), { degrees } = item.parameters;
      expect(gradeQuestion(item, { angle: variant === "to-radians" ? `${degrees}*pi/180` : String(degrees) }).correct).toBe(true);
    }
    for (const variant of ["matched", "mismatch"]) {
      const item = question("mth-calculator-mode", variant, seed), degrees = item.parameters.degrees, value = Math.cos((90-degrees)*Math.PI/180).toFixed(3);
      expect(gradeQuestion(item, variant === "matched" ? { degrees: value, radians: value } : { correction: "mode", value }).correct).toBe(true);
      if (variant === "matched") expect(gradeQuestion(item, { degrees: value, radians: Math.sin(degrees).toFixed(3) }).correct).toBe(false);
    }
  }
});
it("solves complete right triangles and checks inverse angles by independent identities", () => {
  for (let seed = 0; seed < 50; seed++) for (const variant of ["sides", "angles"]) {
    const item = question("mth-triangle-solve", variant, seed), { a, b, h, atB, degrees, hypotenuse } = item.parameters;
    if (variant === "angles") {
      const theta = Math.acos((atB ? a : b)/h)*180/Math.PI;
      expect(gradeQuestion(item, { angle: theta.toFixed(1), other: (90-theta).toFixed(1) }).correct).toBe(true);
    } else {
      const opp = hypotenuse*Math.cos((90-degrees)*Math.PI/180), adj = Math.sqrt(hypotenuse**2-opp**2), ab = atB ? adj : opp, ac = atB ? opp : adj;
      expect(gradeQuestion(item, { ab: ab.toFixed(2), ac: ac.toFixed(2), other: String(90-degrees) }).correct).toBe(true);
      expect(ab*ab+ac*ac).toBeCloseTo(hypotenuse*hypotenuse, 9);
      expect(gradeQuestion(item, { ab: ab.toFixed(2), ac: ac.toFixed(2), other: String(180-degrees) }).correct).toBe(false);
    }
  }
});
