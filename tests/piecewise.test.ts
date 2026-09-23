import { expect, it } from "vitest";
import katex from "katex";
import { evaluatePiecewise, piecewiseDomain, piecewiseLatex, piecewiseRange, piecewiseSchema } from "../lib/learning/piecewise";
import { formatIntervals } from "../lib/learning/intervals";
import { formatRational } from "../lib/learning/rational";

const model = piecewiseSchema.parse({ name: "f", pieces: [
  { id: "left", label: "Low input", slope: "1/2", intercept: "1", lower: "-4", upper: "0", lowerClosed: true, upperClosed: false },
  { id: "right", label: "High input", slope: "-1", intercept: "3", lower: "0", upper: "4", lowerClosed: true, upperClosed: true },
] });
it("selects exactly the included branch, including exact fractional inputs and zero outputs", () => {
  expect(evaluatePiecewise(model, "0")?.pieceId).toBe("right");
  expect(formatRational(evaluatePiecewise(model, "-1/2")!.output)).toBe("3/4");
  expect(formatRational(evaluatePiecewise(model, "-2")!.output)).toBe("0");
  expect(evaluatePiecewise(model, "-4")).not.toBeNull();
  expect(evaluatePiecewise(model, "4")).not.toBeNull();
  expect(evaluatePiecewise(model, "4.0001")).toBeNull();
  expect(evaluatePiecewise(model, "-4.0001")).toBeNull();
  expect(() => evaluatePiecewise(model, "1/0")).toThrow();
});
it("distinguishes gaps from zero and rejects branch overlap at a single endpoint or across an interval", () => {
  const gap = piecewiseSchema.parse({ ...model, pieces: [model.pieces[0], { ...model.pieces[1], lowerClosed: false }] });
  expect(evaluatePiecewise(gap, "0")).toBeNull();
  expect(formatIntervals(piecewiseDomain(gap))).toBe("[-4, 0) U (0, 4]");
  for (const patch of [{ upperClosed: true }, { upper: "1" }, { lower: "2", upper: "1" }, { slope: "51" }, { lower: "-51" }, { intercept: "Infinity" }]) {
    expect(piecewiseSchema.safeParse({ ...model, pieces: [{ ...model.pieces[0], ...patch }, model.pieces[1]] }).success).toBe(false);
  }
  expect(piecewiseSchema.safeParse({ ...model, pieces: [model.pieces[0], { ...model.pieces[1], id: "left" }] }).success).toBe(false);
});
it("maps decreasing endpoints and constant branches to the actual attained range", () => {
  expect(formatIntervals(piecewiseDomain(model))).toBe("[-4, 4]");
  expect(formatIntervals(piecewiseRange(model))).toBe("[-1, 3]");
  const changed = piecewiseSchema.parse({ ...model, pieces: [
    { ...model.pieces[0], slope: "0", intercept: "7", lowerClosed: false },
    { ...model.pieces[1], slope: "-2", intercept: "2", upperClosed: false },
  ] });
  expect(formatIntervals(piecewiseRange(changed))).toBe("(-6, 2] U [7, 7]");
  const reversed = piecewiseSchema.parse({ ...model, pieces: [...model.pieces].reverse() });
  expect(piecewiseRange(reversed)).toEqual(piecewiseRange(model));
  expect(evaluatePiecewise(reversed, "0")).toEqual(evaluatePiecewise(model, "0"));
});
it("renders exact fractional coefficients and non-overlapping branch conditions", () => {
  const latex = piecewiseLatex(model);
  expect(latex).toContain("\\le");
  expect(() => katex.renderToString(latex, { strict: "error", trust: false })).not.toThrow();
});
