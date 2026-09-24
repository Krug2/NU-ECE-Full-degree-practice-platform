import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { angleChoice, angleExact, angleMath, angleNumber, angleYesNo } from "./mth-angle-fields";

export const circularMeasureFamilyIds = ["mth-circular-measure"] as const;
export const circularMeasureVariants = ["arc-length", "angle-from-arc", "radius-from-arc", "sector-area", "angle-from-area", "radius-from-area", "unit-audit", "radius-scaling", "multi-turn-distance", "arc-versus-chord", "sector-overlap"];
export function circularMeasureQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  if (familyId !== "mth-circular-measure") throw new Error("Unknown circular measure family");
  const rng = randomFrom(seed);
  if (variant === "mixed") variant = circularMeasureVariants[rng.integer(0, circularMeasureVariants.length - 1)];
  const mode = circularMeasureVariants.indexOf(variant);
  if (mode < 0) throw new Error("Unknown circular measure variant");
  const r = rng.integer(2, 12), p = rng.integer(2, 9), q = rng.integer(2, 8), n = rng.integer(1, 4), flag = rng.integer(0, 3), sign = flag % 2 ? -1 : 1, degrees = rng.integer(1, 11) * 30;
  const base = { id, familyId, familyVersion: 1, courseId: "mth-215", objectiveId: "m06-l01", critical: true, category: "application", parameters: { mode, r, p, q, n, flag, sign, degrees } };
  const finish = (prompt: string, fields: unknown[], explanation: string[]) => questionSchema.parse({ ...base, prompt, fields: fields.map(field => {
    const item = field as { kind: string; options?: unknown[] };
    return item.kind === "choice" ? { ...item, options: rng.shuffle(item.options!) } : item;
  }), hints: ["Match length units, distinguish radius from diameter, and express the angle in radians.", "Use signed arc r*theta, distance r*|theta| for one directed sweep, and sector area r^2*|theta|/2 for at most one full sweep.", "Before dividing or taking a root, check zero cases and radius positivity. Repeatedly swept area differs from the unique covered region."], explanation, answerSummary: explanation.join(" ") });
  if (mode === 0) return finish("A point moves once, without reversing, through " + sign * degrees + " degrees around a circle of radius " + r + " m. Find the radian rotation, signed circumferential displacement and nonnegative distance traveled.", [
    angleExact("angle", "Signed rotation", sign * degrees + "*pi/180", "rad"),
    angleExact("signed", "Signed circumferential displacement", r * sign * degrees + "*pi/180", "m"),
    angleExact("distance", "Distance traveled", r * degrees + "*pi/180", "m"),
  ], ["The signed rotation is " + sign * degrees + "*pi/180 radians.", "Multiplying by radius gives " + r * sign * degrees + "*pi/180 m signed along the circumference.", "Distance is the magnitude, " + r * degrees + "*pi/180 m; it is not a chord length."]);
  if (mode === 1) return finish("A positive arc is " + p + " mm long on a circle of radius " + r + " cm. Find the arc in centimeters and the angle in radians and degrees. No factor of pi was supplied in either length.", [
    angleNumber("arc", "Arc length", p + "/10", "cm"),
    angleExact("angle", "Central angle", p + "/" + (10 * r), "rad"),
    angleExact("degrees", "Central angle", 18 * p + "/(" + r + "*pi)", "degrees"),
  ], ["The compatible lengths are " + p + "/10 cm and " + r + " cm.", "Their ratio is " + p + "/" + (10 * r) + " radians.", "Multiply that ratio by 180/pi for " + 18 * p + "/(" + r + "*pi) degrees."]);
  if (mode === 2) {
    const kind = flag < 2 ? "unique" : flag === 2 ? "underdetermined" : "inconsistent";
    return finish(flag < 2 ? "A monotone " + (sign < 0 ? "clockwise" : "counterclockwise") + " rotation has signed angle " + angleMath(sign * p + "*pi/" + q) + " radians and signed circumferential displacement " + angleMath(sign * r + "*pi") + " m. Recover the positive radius." : "A proposed circle has positive but unknown radius, zero rotation, and signed circumferential displacement " + (flag === 2 ? "0" : String(r)) + " m. Determine whether the radius is identified.", [
      angleChoice("kind", "What do these data determine?", kind, [["unique", "One positive radius", "This requires a nonzero angle and a positive displacement-to-angle ratio."], ["underdetermined", "Every positive radius fits", "With zero angle and zero arc, s=r*theta becomes 0=0 for every positive radius."], ["inconsistent", "No positive radius fits", "A zero angle produces zero circumferential displacement for every finite radius."]]),
      ...(flag < 2 ? [angleNumber("radius", "Positive radius", r * q + "/" + p, "m")] : []),
    ], [flag < 2 ? "Divide the signed arc by the nonzero signed radian angle. The pi factors and equal signs cancel, leaving radius " + r * q + "/" + p + " m." : flag === 2 ? "The equation 0=r*0 holds for every positive radius; dividing 0 by 0 is undefined and cannot identify one." : "The equation " + r + "=r*0 is impossible, so the data are inconsistent."]);
  }
  if (mode === 3) return finish("A sector of radius " + r + " m sweeps " + degrees + " degrees counterclockwise. Find its radian sweep, its area, and the rest of the disk's area.", [
    angleExact("angle", "Sector sweep", degrees + "*pi/180", "rad"),
    angleExact("area", "Sector area", r * r * degrees + "*pi/360", "m²"),
    angleExact("complement", "Area of the rest of the disk", r * r * (360 - degrees) + "*pi/360", "m²"),
  ], ["The sweep occupies " + degrees + "/360 of a full disk.", "Multiplying that fraction by pi*" + r * r + " gives " + r * r * degrees + "*pi/360 m².", "Subtracting from the full disk gives " + r * r * (360 - degrees) + "*pi/360 m²."]);
  if (mode === 4) {
    const factor = ["1/4", "1/2", "1", "3/2"][flag];
    return finish("A proposed ordinary sector has radius " + r + " m and area " + angleMath(r * r + "*pi*(" + factor + ")") + " m². Solve A=r^2*theta/2 for its nonnegative sweep. Then decide whether that sweep describes an ordinary sector of at most one disk.", [
      angleExact("angle", "Sweep implied by the area equation", "2pi*(" + factor + ")", "rad"),
      angleYesNo("ordinary", "Can this be an ordinary sector of one disk?", flag !== 3, "An ordinary sector has sweep between zero and 2pi and area no greater than pi*r^2. Repeated area with multiplicity is a different quantity."),
    ], ["Solving gives theta=2A/r²=2pi*(" + factor + ") radians.", flag === 3 ? "This is 3pi radians and the proposed area exceeds one disk, so it cannot be an ordinary sector." : "This sweep is at most 2pi, so the ordinary-sector premises are consistent."]);
  }
  if (mode === 5) return finish("A sector sweeps pi/" + q + " radians and has area " + p + "*pi m². Find its positive radius exactly, retaining a radical if needed. Cancel pi in r²=2A/theta before entering the square root.", [
    { id: "radius", label: "Positive radius", kind: "exact", expected: "sqrt(" + (2 * p * q) + ")", unit: "m", help: "Give the positive exact square root. Cancel pi first; sqrt(12) and 2*sqrt(3) are equivalent." },
    angleYesNo("negative", "Is the negative algebraic square root also a circle radius?", false, "The equation for r² has two algebraic square roots, but the geometric premise requires r>0."),
  ], ["Isolating r² gives 2*(" + p + "*pi)/(pi/" + q + ")=" + (2 * p * q) + " m².", "The positive radius is sqrt(" + (2 * p * q) + ") m. The negative root is excluded by the radius premise."]);
  if (mode === 6) return finish("A disk has diameter " + (2 * r) + " cm and a sector angle of " + degrees + " degrees. Someone substitutes diameter times degrees for the arc length. Repair the calculation using meters and radians, and give the sector area.", [
    angleNumber("radius", "Radius", r + "/100", "m"),
    angleExact("angle", "Radian angle", degrees + "*pi/180", "rad"),
    angleExact("distance", "Arc length", r * degrees + "*pi/18000", "m"),
    angleExact("area", "Sector area", r * r * degrees + "*pi/3600000", "m²"),
    angleChoice("repair", "Why did the proposed substitution fail?", "both", [["both", "It used diameter as radius and degrees as radians", "The formula s=r*theta needs the radius and the radian measure."], ["units", "Only the length-unit label needs to change", "The numerical radius and angle both require correction."], ["sign", "Every sector must use a negative angle", "A positive sector sweep is valid; its direction does not repair the wrong quantities."]]),
  ], ["The radius is half the diameter: " + r + " cm, or " + r + "/100 m.", "Convert the angle by multiplying by pi/180.", "Arc length is " + r * degrees + "*pi/18000 m; area is " + r * r * degrees + "*pi/3600000 m²."]);
  if (mode === 7) return finish("Two sectors have the same angle pi/" + q + ". Their radii are " + r + " m and " + r * p + " m. Give the first arc length, the second arc length, and the ratios of the second sector's area and angle to the first.", [
    angleExact("first", "First arc length", r + "*pi/" + q, "m"), angleExact("second", "Second arc length", r * p + "*pi/" + q, "m"),
    angleNumber("area-ratio", "Second area divided by first area", String(p * p)), angleNumber("angle-ratio", "Second angle divided by first angle", "1"),
  ], ["At a fixed angle, arc length is proportional to radius: the lengths are " + r + "*pi/" + q + " and " + r * p + "*pi/" + q + " m.", "Area scales as the square of the radius, so its ratio is " + p * p + ".", "The angle ratio is one because both arc and radius scale together."]);
  if (mode === 8 || mode === 10) {
    const turns = n + "+1/" + q, angle = (mode === 8 ? sign : 1) + "*2pi*(" + turns + ")";
    return finish("A radius-" + r + "-m ray sweeps monotonically through " + (mode === 8 && sign < 0 ? "clockwise " : "counterclockwise ") + "(" + turns + ") turns. Retain all completed turns. " + (mode === 8 ? "Find the signed rotation and total tip distance." : "Compare total area swept counting repeated coverage with the unique area of the disk touched by the sweep."), [
      ...(mode === 8 ? [angleExact("angle", "Complete signed rotation", angle, "rad")] : [angleExact("accumulated", "Area swept counting repeats", r * r + "*pi*(" + turns + ")", "m²"), angleExact("unique", "Unique disk area covered", r * r + "*pi", "m²")]),
      angleExact("distance", "Total distance traveled by the tip", 2 * r + "*pi*(" + turns + ")", "m"),
      angleYesNo("ordinary", "Does this entire motion bound one ordinary sector without repeated coverage?", false, "The sweep exceeds one full turn. A single ordinary sector cannot count overlaps repeatedly."),
    ], ["The magnitude of the complete angle is 2pi*(" + turns + ") radians.", "Total tip distance is " + 2 * r + "*pi*(" + turns + ") m.", "The accumulated area is " + r * r + "*pi*(" + turns + ") m², whereas the unique region is the disk with area " + r * r + "*pi m². Reducing the angle first would discard traveled motion."]);
  }
  return finish("A point traverses a semicircle of radius " + r + " m from one end of a diameter to the other. Compare the traveled arc with the straight chord joining the same endpoints.", [
    angleExact("arc", "Traveled semicircular arc", r + "*pi", "m"), angleNumber("chord", "Straight chord length", String(2 * r), "m"),
    angleExact("ratio", "Arc length divided by chord length", "pi/2"), angleYesNo("equal", "Are these two lengths equal?", false, "The arc follows half the circumference. The chord is the diameter; since pi>2 the arc is longer."),
  ], ["A semicircle subtends pi radians, so its arc length is " + r + "*pi m.", "The chord is the diameter, " + 2 * r + " m.", "Their ratio is pi/2>1. Matching endpoints do not make the traveled paths equal."]);
}
