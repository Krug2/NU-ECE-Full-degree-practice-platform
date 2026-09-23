import { expect, it } from "vitest";
import katex from "katex";
import { foundationCoordinateQuestion } from "../lib/learning/families/mth-foundation-coordinates";
import { gradeQuestion } from "../lib/learning/grading";

function question(family: string, variant: string, seed: number) {
  const item = foundationCoordinateQuestion(family, variant, String(seed), "q1");
  const visit = (value: unknown): void => {
    if (typeof value === "string") for (const match of value.matchAll(/\$([^$]+)\$/g)) expect(() => katex.renderToString(match[1], { strict: "error", trust: false })).not.toThrow();
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(item); return item;
}
it("reads different scales and every quadrant from the actual saved graph", () => {
  const quadrants = new Set<string>();
  for (let seed = 0; seed < 50; seed++) for (const variant of ["scaled", "axes"]) {
    const item = question("mth-coordinate-read", variant, seed), figure = item.figure!;
    if (figure.kind !== "coordinates") throw new Error("Expected coordinate graph");
    const point = figure.points[0], x = point.xTicks*figure.xStep, y = point.yTicks*figure.yStep;
    expect(figure.xStep).not.toBe(figure.yStep);
    expect(gradeQuestion(item, { x: String(x), y: String(y) }).correct).toBe(true);
    if (x !== y) expect(gradeQuestion(item, { x: String(y), y: String(x) }).correct).toBe(false);
    if (variant === "axes") expect(x === 0 || y === 0).toBe(true);
    else if (x*y !== 0) quadrants.add(`${Math.sign(x)},${Math.sign(y)}`);
  }
  expect(quadrants.size).toBe(4);
});
it("checks signed slopes in coordinate units, including horizontal and vertical lines", () => {
  for (let seed = 0; seed < 50; seed++) for (const variant of ["general", "horizontal", "vertical"]) {
    const item = question("mth-line-slope", variant, seed), graph = item.figure!;
    if (graph.kind !== "coordinates") throw new Error("Expected coordinate graph");
    const [a, b] = graph.points;
    const rise = (b.yTicks-a.yTicks)*graph.yStep, run = (b.xTicks-a.xTicks)*graph.xStep;
    if (run === 0) {
      expect(rise).not.toBe(0);
      expect(gradeQuestion(item, { slope: "undefined", reason: "run" }).correct).toBe(true);
      expect(gradeQuestion(item, { slope: "zero", reason: "run" }).correct).toBe(false);
    } else {
      expect(gradeQuestion(item, { slope: `${rise}/${run}`, unit: "y-per-x" }).correct).toBe(true);
      expect(gradeQuestion(item, { slope: `${-rise}/${-run}`, unit: "y-per-x" }).correct).toBe(true);
      expect(gradeQuestion(item, { slope: `${rise}/${run}`, unit: "x-per-y" }).correct).toBe(false);
      if (variant === "horizontal") expect(rise).toBe(0);
    }
  }
});
it("keeps signed unit conversions, rates, and intercept meanings consistent for fifty seeds", () => {
  const signs = new Set<number>();
  for (let seed = 0; seed < 50; seed++) {
    for (const variant of ["ms-to-s", "s-to-ms", "mm-to-m", "rate"]) {
      const item = question("mth-measurement-units", variant, seed), { count, seconds, length, milliseconds } = item.parameters;
      const answer: Record<string,string> = variant === "rate" ? { time: `${milliseconds}/1000`, value: `${length*1000}/${milliseconds}` } : { value: variant === "s-to-ms" ? String(Math.round(seconds*1000)) : `${count}/1000` };
      expect(gradeQuestion(item, answer).correct).toBe(true);
      signs.add(Math.sign(count));
      if (variant === "rate") expect(gradeQuestion(item, { time: String(milliseconds), value: `${length}/${milliseconds}` }).correct).toBe(false);
    }
    const item = question("mth-linear-intercept", "position", seed), { velocity, initial, time } = item.parameters;
    expect(gradeQuestion(item, { initial: String(initial), meaning: "start", position: String(initial+time*velocity) }).correct).toBe(true);
    expect(gradeQuestion(item, { initial: String(initial), meaning: "rate", position: String(initial+time*velocity) }).correct).toBe(false);
  }
  expect([...signs].sort()).toEqual([-1, 0, 1]);
});
