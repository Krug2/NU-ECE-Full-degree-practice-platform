import { expect, it } from "vitest";
import { analyzeRightTriangleInvestigation, rightTriangleCaseSchema } from "../lib/learning/right-triangle-investigation";
import { equalExact, parseExact } from "../lib/learning/exact-number";
const item = { title: "A survey triangle", AB: "8", AC: "15", BC: "17", angleAt: "B" as const, scale: "2" };
it("calculates both reference angles and all scaled sides exactly", () => {
  const result = analyzeRightTriangleInvestigation(item);
  expect(result.selected).toEqual(result.B);
  expect(result.B).toMatchObject({ sin: "15/17", cos: "8/17", tan: "15/8" });
  expect(result.C).toMatchObject({ sin: "8/17", cos: "15/17", tan: "8/15" });
  expect(result.scaled).toEqual({ AB: "16", AC: "30", BC: "34" });
  const changed = analyzeRightTriangleInvestigation({ ...item, angleAt: "C", scale: "1/2" });
  expect(changed.selected).toEqual(result.C);
  expect(changed.scaled).toEqual({ AB: "4", AC: "15/2", BC: "17/2" });
});
it("preserves exact special triangles and a rational scale", () => {
  const result = analyzeRightTriangleInvestigation({ ...item, AB: "6*sqrt(3)", AC: "6", BC: "12", scale: "3/2" });
  expect(equalExact(parseExact(result.selected.tan), parseExact("1/sqrt(3)"))).toBe(true);
  expect(equalExact(parseExact(result.scaled.AB), parseExact("9*sqrt(3)"))).toBe(true);
  expect(result.scaled.BC).toBe("18");
});
it("rejects inconsistent geometry, nonreal inputs and exact out-of-range bounds", () => {
  for (const change of [{ AB: "0" }, { AB: "-8" }, { AB: "i" }, { BC: "16" }, { AB: "101" }, { AB: "1/11" }, { scale: "0" }, { scale: "10.0000000001" }, { scale: "0.09999999999" }, { scale: "sqrt(2)" }, { scale: "1/0" }]) expect(rightTriangleCaseSchema.safeParse({ ...item, ...change }).success, JSON.stringify(change)).toBe(false);
  for (const scale of ["1/10", "10", "2/3"]) expect(rightTriangleCaseSchema.safeParse({ ...item, scale }).success).toBe(true);
  expect(rightTriangleCaseSchema.safeParse({ ...item, angleAt: "A" }).success).toBe(false);
});
