import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { angleChoice, angleExact, angleMath, angleNumber, angleYesNo } from "./mth-angle-fields";

export const angleMeasureFamilyIds = ["mth-angle-measure"] as const;
export const angleMeasureVariants = ["degrees-to-radians", "radians-to-degrees", "ordinary-radians", "turns", "decimal-degrees", "dms", "radian-definition", "unit-equivalence", "directed-definition"];
export function angleMeasureQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  if (familyId !== "mth-angle-measure") throw new Error("Unknown angle measure family");
  const rng = randomFrom(seed);
  if (variant === "mixed") variant = angleMeasureVariants[rng.integer(0, angleMeasureVariants.length - 1)];
  const mode = angleMeasureVariants.indexOf(variant);
  if (mode < 0) throw new Error("Unknown angle measure variant");
  const sign = rng.integer(0, 1) ? 1 : -1, p = rng.integer(1, 19), q = rng.integer(2, 8), r = rng.integer(2, 12), flag = rng.integer(0, 3);
  const degrees = sign * rng.integer(1, 1080), minutes = rng.integer(0, 59), seconds = rng.integer(0, 59), whole = flag === 0 ? 0 : rng.integer(1, 80);
  const base = { id, familyId, familyVersion: 1, courseId: "mth-215", objectiveId: "m06-l01", category: "procedural", critical: true, parameters: { mode, sign, p, q, r, flag, degrees, minutes, seconds, whole } };
  const finish = (prompt: string, fields: unknown[], hints: string[], explanation: string[]) => questionSchema.parse({ ...base, prompt, fields: fields.map(field => {
    const item = field as { kind: string; options?: unknown[] };
    return item.kind === "choice" ? { ...item, options: rng.shuffle(item.options!) } : item;
  }), hints, explanation, answerSummary: explanation.join(" ") });
  if (mode <= 3) {
    const source = mode === 0 ? String(degrees) : sign * p + "/" + q;
    const radians = mode === 0 ? degrees + "*pi/180" : mode === 1 ? source + "*pi" : mode === 2 ? source : "2*pi*(" + source + ")";
    const description = mode === 0 ? angleMath(source) + " degrees" : mode === 1 ? angleMath(radians) + " radians" : mode === 2 ? angleMath(source) + " radians, with no hidden factor of pi" : angleMath(source) + " turns";
    const direction = sign > 0 ? "counterclockwise" : "clockwise";
    return finish("A directed rotation measures " + description + ". Give the same complete rotation in radians, degrees and turns. Keep completed turns and signs; do not reduce to a principal angle.", [
      angleExact("radians", "Complete radian measure", radians, "rad"),
      angleExact("degrees", "Complete degree measure", "(" + radians + ")*180/pi", "degrees"),
      angleExact("turns", "Signed number of turns", "(" + radians + ")/(2pi)", "turns"),
      angleChoice("direction", "Direction of this rotation", direction, [["clockwise", "Clockwise", "Clockwise rotation has negative signed measure."], ["counterclockwise", "Counterclockwise", "Counterclockwise rotation has positive signed measure."]]),
    ], ["One full turn equals 360 degrees and 2pi radians.", "Multiply degrees by pi/180 or radians by 180/pi. A bare radian value stays bare until conversion.", "Divide radian measure by 2pi for turns. Preserve the complete signed rotation."],
    ["The radian measure is " + radians + ".", "The degree measure is (" + radians + ")*180/pi, and the turn measure is (" + radians + ")/(2pi).", "The sign identifies " + direction + " motion. A coterminal angle would describe a different amount of rotation."]);
  }
  if (mode === 4 || mode === 5) {
    const value = mode === 4 ? degrees + "/8" : sign + "*(" + whole + "+" + minutes + "/60+" + seconds + "/3600)";
    const magnitudeSeconds = Math.abs(degrees) * 450;
    const d = Math.floor(magnitudeSeconds / 3600), m = Math.floor((magnitudeSeconds % 3600) / 60), s = magnitudeSeconds % 60;
    const description = mode === 4 ? String(degrees / 8) + " degrees" : (sign < 0 ? "negative " : "positive ") + "(" + whole + " degrees, " + minutes + " minutes, " + seconds + " seconds), with the sign applying to the entire measurement";
    return finish("Convert " + description + ". " + (mode === 4 ? "Also give the nonnegative DMS components; the original sign applies to all of them together." : "Keep the fractional degree value exact, even when its decimal repeats."), [
      angleNumber("degrees", "Signed degree measure", value, "degrees"),
      angleExact("radians", "Signed radian measure", "(" + value + ")*pi/180", "rad"),
      ...(mode === 4 ? [angleNumber("whole", "Whole degrees in the magnitude", String(d)), angleNumber("minutes", "Remaining minutes", String(m)), angleNumber("seconds", "Remaining seconds", String(s))] : [angleYesNo("sign", "Does the sign apply to the minutes and seconds too?", true, "The DMS components describe one magnitude. Negate their entire sum for a negative angle, including when the whole-degree component is zero.")]),
    ], ["There are 60 minutes per degree and 60 seconds per minute.", "Combine a signed DMS measure as sign*(degrees + minutes/60 + seconds/3600). For the reverse conversion, work with the magnitude.", "Convert the complete signed degree value to radians by multiplying by pi/180."],
    ["The signed degree value is " + value + ".", "Its radian value is (" + value + ")*pi/180.", mode === 4 ? "The magnitude has " + d + " whole degrees, " + m + " minutes and " + s + " seconds; retain the original sign on the whole angle." : "Negating only the whole-degree component would change this angle."]);
  }
  if (mode === 6 || mode === 7) {
    const arc = mode === 6 ? String(p) : p + "/10", radians = "(" + arc + ")/" + r;
    return finish("A circle has radius " + r + " cm. A counterclockwise arc has length " + p + (mode === 6 ? " cm" : " mm") + ". Find the compatible arc length and central angle. Then scale every length by " + q + " while retaining the same shape.", [
      angleNumber("arc", "Arc length in centimeters", arc, "cm"), angleExact("radians", "Central angle", radians, "rad"),
      angleExact("degrees", "Central angle in degrees", "(" + radians + ")*180/pi", "degrees"),
      angleExact("scaled", "Angle after both lengths are scaled", radians, "rad"),
      angleYesNo("ratio", "Is the arc-to-radius ratio dimensionless after matching units?", true, "Compatible length units cancel in s/r. The unit name radian records that this ratio measures an angle."),
    ], ["Convert the arc and radius to the same length unit.", "Radian measure is arc length divided by radius.", "Multiplying numerator and denominator by the same positive scale leaves their ratio unchanged."],
    ["The arc is " + arc + " cm and the radius is " + r + " cm.", "The angle is " + radians + " radians, or (" + radians + ")*180/pi degrees.", "The scaled circle has the same angle because the common length scale cancels."]);
  }
  const turns = sign * p + "/" + q;
  return finish("In standard position, a ray rotates " + (sign < 0 ? "clockwise" : "counterclockwise") + " through " + p + "/" + q + " turns from the positive x-axis. Identify the initial ray and signed rotation. Decide what a picture of only the final ray can tell you.", [
    angleChoice("initial", "Initial ray in standard position", "positive-x", [["positive-x", "Positive x-axis", "Standard position places the vertex at the origin and the initial ray on the positive x-axis."], ["positive-y", "Positive y-axis", "The positive y-axis is a possible terminal ray, but it is not the standard initial ray."], ["terminal", "Whichever ray is reached last", "The terminal ray is reached after rotating away from the initial ray."]]),
    angleExact("radians", "Signed complete rotation", "2pi*(" + turns + ")", "rad"),
    angleYesNo("recover", "Does the final ray alone uniquely determine the completed rotation?", false, "Adding any integer number of full turns leaves the same terminal ray. The picture alone cannot recover traveled turns or direction."),
  ], ["Standard position fixes the vertex at the origin and the initial ray on the positive x-axis.", "A clockwise turn is negative; a counterclockwise turn is positive.", "Different complete rotations can end on the same ray."],
  ["The initial ray is the positive x-axis.", "The full signed rotation is 2pi*(" + turns + ") radians.", "The terminal ray alone does not determine how the ray traveled to that position."]);
}
