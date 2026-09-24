import { expect, it } from "vitest";
import { analyzeRotation, angleRadians, areCoterminal, type AngleUnit } from "../lib/learning/rotation";
import { equalPiNumbers, parsePiNumber } from "../lib/learning/pi-number";

const exact = (actual: string, expected: string) => expect(equalPiNumbers(parsePiNumber(actual), parsePiNumber(expected)), actual + " = " + expected).toBe(true);
it("preserves arbitrary radian values and equivalent angle units", () => {
  for (const [source, unit, radians, degrees, turns] of [
    ["-450", "degrees", "-5pi/2", "-450", "-5/4"],
    ["1", "radians", "1", "180/pi", "1/(2pi)"],
    ["7/5", "radians", "7/5", "252/pi", "7/(10pi)"],
    ["-0.125", "turns", "-pi/4", "-45", "-1/8"],
    ["180/pi", "degrees", "1", "180/pi", "1/(2pi)"],
  ]) {
    const result = analyzeRotation(source, unit as AngleUnit);
    exact(result.radians, radians); exact(result.degrees, degrees); exact(result.turns, turns);
  }
});
it("distinguishes the floor quotient from traveled whole turns", () => {
  const partial = analyzeRotation("-pi/6");
  expect(partial).toMatchObject({ quotient: "-1", fullTraveledTurns: 0, direction: "clockwise", location: "quadrant-iv" });
  exact(partial.representative, "11pi/6"); exact(partial.travelRemainder, "pi/6"); exact(partial.referenceAngle!, "pi/6");
  const multiple = analyzeRotation("-25pi/6");
  expect(multiple).toMatchObject({ quotient: "-3", fullTraveledTurns: 2 });
  exact(multiple.representative, "11pi/6"); exact(multiple.travelRemainder, "pi/6");
});
it("keeps quadrantal rays out of open quadrants and distinguishes interval conventions", () => {
  for (const [angle, location, positive, symmetric] of [
    ["0", "positive-x", "2pi", "0"], ["-4pi", "positive-x", "2pi", "0"],
    ["pi/2", "positive-y", "pi/2", "pi/2"], ["-pi", "negative-x", "pi", "pi"],
    ["7pi/2", "negative-y", "3pi/2", "-pi/2"],
  ]) {
    const result = analyzeRotation(angle);
    expect(result.location).toBe(location); expect(result.referenceAngle).toBeNull();
    exact(result.leastPositive, positive); exact(result.symmetric, symmetric);
  }
  expect(analyzeRotation("0")).toMatchObject({ direction: "none", quotient: "0", fullTraveledTurns: 0 });
});
it("normalizes ordinary radians without rounding completed turns", () => {
  const positive = analyzeRotation("20"), negative = analyzeRotation("-20");
  exact(positive.representative, "20-6pi"); exact(positive.referenceAngle!, "20-6pi");
  expect(positive).toMatchObject({ quotient: "3", fullTraveledTurns: 3, location: "quadrant-i" });
  exact(negative.representative, "8pi-20"); exact(negative.referenceAngle!, "20-6pi");
  expect(negative).toMatchObject({ quotient: "-4", fullTraveledTurns: 3, location: "quadrant-iv" });
});
it("decides which side of a ray or full turn an exact value occupies", () => {
  const lower = "3.1415926535897932384626433", upper = "3.1415926535897932384626434";
  expect(Number(lower)).toBe(Number(upper));
  expect(analyzeRotation(lower).location).toBe("quadrant-ii");
  expect(analyzeRotation(upper).location).toBe("quadrant-iii");
  expect(analyzeRotation("2*(" + lower + ")").fullTraveledTurns).toBe(0);
  expect(analyzeRotation("2*(" + upper + ")").fullTraveledTurns).toBe(1);
});
it("tests terminal equality instead of travel or reference-angle equality", () => {
  expect(areCoterminal("-30", "degrees", "11pi/6", "radians")).toBe(true);
  expect(areCoterminal("0", "turns", "4", "turns")).toBe(true);
  expect(areCoterminal("30", "degrees", "150", "degrees")).toBe(false);
  expect(areCoterminal("1", "radians", "1", "degrees")).toBe(false);
});
it("checks every fifteen-degree boundary over many signed revolutions", () => {
  const axes = ["positive-x", "positive-y", "negative-x", "negative-y"];
  for (let degrees = -2160; degrees <= 2160; degrees += 15) {
    const result = analyzeRotation(String(degrees), "degrees"), representative = ((degrees % 360) + 360) % 360;
    exact(result.representativeDegrees, String(representative));
    expect(Number(result.quotient)).toBe(Math.floor(degrees / 360) || 0);
    expect(result.fullTraveledTurns).toBe(Math.floor(Math.abs(degrees) / 360));
    if (representative % 90 === 0) { expect(result.location).toBe(axes[representative / 90]); expect(result.referenceAngle).toBeNull(); }
    else {
      expect(result.location).toBe(["quadrant-i", "quadrant-ii", "quadrant-iii", "quadrant-iv"][Math.floor(representative / 90)]);
      const acute = Math.min(representative % 180, 180 - representative % 180);
      expect(equalPiNumbers(parsePiNumber(result.referenceAngle!), angleRadians(String(acute), "degrees"))).toBe(true);
    }
  }
});
it("reports unsupported controls and invalid arithmetic explicitly", () => {
  for (const angle of ["1000001", "-1000001", "1/0", "sqrt(pi)"]) expect(() => analyzeRotation(angle)).toThrow();
  expect(() => angleRadians("1", "gradians" as AngleUnit)).toThrow("Choose");
  expect(analyzeRotation("1000000").fullTraveledTurns).toBe(159154);
});
