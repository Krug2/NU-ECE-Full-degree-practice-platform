import { expect, it } from "vitest";
import { coordinateFigureSchema, coordinatePixel, coordinateValue, describeCoordinate } from "../lib/learning/figures";
import { generateQuestions } from "../lib/learning/generate";

const figure = { kind: "coordinates", title: "A scaled point", xLabel: "Voltage (V)", yLabel: "Current (mA)", xStep: 2, yStep: 5, points: [{ name: "A", xTicks: -2, yTicks: 3 }] };
it("keeps graph position, numerical scale, and accessible directions consistent", () => {
  const parsed = coordinateFigureSchema.parse(figure), point = parsed.points[0];
  expect(coordinateValue(parsed, point)).toEqual({ x: -4, y: 15 });
  const origin = coordinatePixel({ xTicks: 0, yTicks: 0 }), position = coordinatePixel(point);
  expect(position.x).toBeLessThan(origin.x); expect(position.y).toBeLessThan(origin.y);
  expect(describeCoordinate(point)).toBe("A is 2 horizontal tick intervals left of the vertical axis, and 3 vertical tick intervals above the horizontal axis.");
  expect(describeCoordinate({ name: "B", xTicks: 0, yTicks: 0 })).toContain("on the vertical axis, and on the horizontal axis");
});
it("rejects misleading axes, out-of-bounds points, duplicate labels, and degenerate lines", () => {
  for (const patch of [{ xStep: 0 }, { yStep: -1 }, { xStep: Infinity }, { points: [{ name: "A", xTicks: 5, yTicks: 0 }] }, { points: [figure.points[0], figure.points[0]] }, { line: true }, { line: true, points: [figure.points[0], { ...figure.points[0], name: "B" }] }]) expect(coordinateFigureSchema.safeParse({ ...figure, ...patch }).success).toBe(false);
  expect(coordinateFigureSchema.safeParse({ ...figure, line: true, points: [figure.points[0], { name: "B", xTicks: -2, yTicks: -3 }] }).success).toBe(true);
});
it("treats different saved graphs as distinct questions even when their instructions match", () => {
  const questions = generateQuestions([{ familyId: "mth-coordinate-read", variant: "scaled" }, { familyId: "mth-coordinate-read", variant: "axes" }], "distinct-graphs");
  expect(questions).toHaveLength(2);
  expect(questions[0].prompt).toBe(questions[1].prompt);
  expect(questions[0].figure).not.toEqual(questions[1].figure);
});
