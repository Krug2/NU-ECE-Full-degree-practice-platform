import { questionSchema, type AnswerField, type Question } from "../contracts";
import { randomFrom } from "../random";
import { acuteAngle } from "../right-triangle";
import { choose, exactLength, measured, rightBase } from "./right-fields";

export const rightModelFamilyIds = ["mth-right-model"];
export const rightModelVariants = ["elevation", "eye-height", "depression", "ramp", "cable", "shadow", "mixed-units", "assumptions"];
export function rightModelQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  if (!rightModelFamilyIds.includes(familyId)) throw new Error("Unknown right-triangle model family.");
  const rng = randomFrom(seed);
  if (variant === "mixed") variant = rightModelVariants[rng.integer(0, rightModelVariants.length - 1)];
  if (!rightModelVariants.includes(variant)) throw new Error("Unknown right-triangle model variant.");
  const degrees = rng.integer(21, 64), distance = rng.integer(8, 38), height = rng.integer(3, 18), eye = rng.integer(14, 19) / 10;
  const centimeters = rng.integer(9, 40) * 100, radians = degrees * Math.PI / 180;
  let prompt = "", fields: AnswerField[] = [], explanation: string[] = [];
  if (variant === "elevation" || variant === "eye-height") {
    const offset = variant === "eye-height" ? eye : 0, result = offset + distance * Math.tan(radians);
    prompt = "A vertical mast stands on level ground. A sighting instrument is " + distance + " m horizontally from its base, with its lens " + (offset ? offset + " m above" : "at") + " the base's ground level. The elevation of the top above the lens's horizontal is " + degrees + " degrees. Find the total mast height H.";
    fields = [choose("model", "Height model", offset ? "offset" : "tangent", [
      ["tangent", "H = d tan(theta)", "This is the vertical rise from the lens, equal to total height only when the lens is at base level."],
      ["offset", "H = eye height + d tan(theta)", "Add the lens height to the vertical rise when the lens is above base level."],
      ["sine", "H = d sin(theta)", "The stated distance d is horizontal, not the sloping line of sight."],
    ].filter(option => offset || option[0] !== "offset") as [string, string, string][]), measured("height", "Total mast height", result, "m")];
    explanation = ["The horizontal distance is adjacent to the elevation angle.", "The opposite leg measures height above the lens: rise = " + distance + " tan(" + degrees + " degrees).", "Add the lens elevation " + offset + " m: H ≈ " + result.toFixed(4) + " m. The model assumes a vertical mast and a level baseline."];
  } else if (variant === "depression") {
    const result = height / Math.tan(radians);
    prompt = "An observer is " + height + " m above a level target surface. The angle of depression to a target is " + degrees + " degrees below horizontal. Find the horizontal distance to the target and the angle the sight line makes with the downward vertical.";
    fields = [measured("distance", "Horizontal distance", result, "m"), exactLength("vertical", "Angle from downward vertical", String(90 - degrees), "degrees"),
      choose("relation", "Why may the depression angle be used at the target?", "parallel", [["parallel", "The observer and target horizontals are parallel", "Alternate interior angles give equal elevation and depression angles."], ["vertical", "Depression is measured from vertical", "Depression is measured below horizontal; the vertical angle is its complement."], ["equal", "All acute angles in a right triangle are equal", "They are complementary and need not be equal."]])];
    explanation = ["The depression angle equals the elevation from the target because the horizontals are parallel.", "tan(theta) = height/distance, so distance = " + height + "/tan(" + degrees + " degrees) ≈ " + result.toFixed(4) + " m.", "The angle from downward vertical is " + (90 - degrees) + " degrees."];
  } else if (variant === "ramp") {
    prompt = "A straight ramp is " + distance + " m along its slope and rises at " + degrees + " degrees above level horizontal ground. Find its vertical rise and horizontal run. This is a geometry model, not a design recommendation.";
    fields = [choose("slope", "Role of the sloping ramp length", "hyp", [["hyp", "Hypotenuse", "The slope is opposite the right angle between horizontal and vertical."], ["adjacent", "Horizontal run", "The slope and the horizontal run are different segments."], ["opposite", "Vertical rise", "The vertical rise is the side opposite the ground angle."]]), measured("rise", "Vertical rise", distance * Math.sin(radians), "m"), measured("run", "Horizontal run", distance * Math.cos(radians), "m")];
    explanation = ["The sloping length is the hypotenuse.", "Rise = " + distance + " sin(" + degrees + " degrees); run = " + distance + " cos(" + degrees + " degrees).", "Both positive legs are shorter than the ramp and their squared sum equals the ramp length squared."];
  } else if (variant === "cable") {
    prompt = "An ideal straight cable joins the top of a vertical " + height + " m mast to a ground anchor. Level ground and the mast are perpendicular; the cable makes " + degrees + " degrees with the ground. Find the cable length and horizontal distance from anchor to mast. Ignore sag and attachment allowances.";
    fields = [measured("cable", "Cable length", height / Math.sin(radians), "m"), measured("run", "Horizontal anchor distance", height / Math.tan(radians), "m")];
    explanation = ["The mast height is opposite the ground angle; the cable is the hypotenuse.", "Cable = height/sin(theta), whereas horizontal distance = height/tan(theta).", "The straight cable must be longer than the vertical mast. Physical allowances lie outside this ideal model."];
  } else if (variant === "shadow") {
    prompt = "A vertical " + height + " m pole casts a " + distance + " m horizontal shadow on level ground. Treat the sun's rays as straight. Find the sun's elevation above horizontal and identify the ratio used.";
    fields = [measured("angle", "Sun elevation", acuteAngle("tan", height, distance), "degrees"),
      choose("ratio", "Ratio before applying the inverse function", "height-run", [["height-run", "height / horizontal shadow", "This is opposite/adjacent, so apply inverse tangent."], ["run-height", "horizontal shadow / height", "This returns the complementary angle if used with inverse tangent."], ["height-hyp", "height / horizontal shadow, then inverse sine", "The horizontal shadow is a leg, not the hypotenuse."]])];
    explanation = ["The shadow forms the adjacent leg and the pole the opposite leg.", "Elevation = arctan(" + height + "/" + distance + ") in degree-output mode.", "The result is a strictly acute angle; taking the reciprocal of a ratio does not produce it."];
  } else if (variant === "mixed-units") {
    const run = centimeters / 100;
    prompt = "A right-triangle survey has a vertical rise of " + height + " m and a horizontal run of " + centimeters + " cm. Find the rise-to-run ratio exactly after conversion and the angle above horizontal.";
    fields = [exactLength("ratio", "Dimensionless rise-to-run ratio", height + "/" + run), measured("angle", "Elevation angle", acuteAngle("tan", height, run), "degrees")];
    explanation = ["Convert " + centimeters + " cm to " + run + " m before division.", "tan(theta) = " + height + "/" + run + ". Both length units cancel.", "Apply inverse tangent in degree-output mode. Dividing the unmatched numbers would understate the ratio by a factor of 100."];
  } else {
    prompt = "A survey records a vertical pole of height " + height + " m and " + distance + " m along sloping ground from its base to an observer. The ground slope and horizontal separation are unknown. May elevation be calculated as arctan(" + height + "/" + distance + ") from these numbers alone? Assume the sighting point is on that sloping surface.";
    fields = [choose("claim", "Is the proposed calculation justified?", "no", [["no", "No, the measured ground segment is not established as a horizontal adjacent leg", "The slope also changes the observer's elevation. Resolve horizontal and vertical separations first."], ["yes", "Yes, any two lengths define opposite and adjacent legs", "Right-triangle ratios require perpendicular legs and the correct reference angle."]]),
      choose("repair", "Useful additional information", "slope", [["slope", "Ground slope with direction, so horizontal and vertical separations can be resolved", "The slope gives the ground segment's horizontal and signed vertical components."], ["round", "More decimal places in the same two lengths", "Precision does not supply missing geometry."], ["mode", "Changing the calculator from DEG to RAD", "Changing units does not supply missing geometry."]])];
    explanation = ["A distance measured along a slope is not the horizontal separation.", "The observer may also be above or below the pole's base. The opposite leg is the vertical difference from observer to top.", "Obtain the slope and direction or measure the horizontal and vertical separations directly before applying a right-triangle ratio."];
  }
  return questionSchema.parse({ ...rightBase(familyId, id), category: "application", parameters: { degrees, distance, height, eye, centimeters }, prompt, fields: fields.map(field => field.kind === "choice" ? { ...field, options: rng.shuffle(field.options) } : field),
    hints: ["Sketch the horizontal, vertical and sloping segments and mark the reference angle.", explanation[0], explanation.slice(1).join(" ")],
    explanation, answerSummary: fields.map(field => field.label + ": " + (field.kind === "choice" ? field.options.find(option => option.id === field.correct)!.label : field.kind === "numeric" ? field.expected.toFixed(field.unit === "degrees" ? 1 : 2) + " " + field.unit : "expected" in field ? field.expected : "")).join("; "),
  });
}
