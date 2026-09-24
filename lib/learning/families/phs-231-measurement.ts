import { questionSchema, type AnswerField } from "../contracts";
import { randomFrom } from "../random";

export const phs231MeasurementVariants = {
  "phs231-unit-conversion": ["area", "volume", "speed", "density", "force"],
  "phs231-dimensional-audit": ["position", "drag", "sufficiency"],
  "phs231-measurement-bounds": ["speed", "standard", "instrument"],
} as const;
export const phs231MeasurementFamilyIds = Object.keys(phs231MeasurementVariants);

function exact(id: string, label: string, expected: string, unit = "") {
  return { id, kind: "rational", label, expected, unit, help: "Enter an exact number or fraction in the labeled unit; omit the unit from the input." };
}

export function phs231MeasurementQuestion(familyId: string, variant: string, seed: string, id: string) {
  const variants = phs231MeasurementVariants[familyId as keyof typeof phs231MeasurementVariants];
  if (!variants || !(variants as readonly string[]).includes(variant)) throw new Error("Unknown PHS 231 measurement family or variant.");
  const rng = randomFrom(`${familyId}:${variant}:${seed}`);
  const base = { id, familyId, familyVersion: 1, courseId: "phs-231", objectiveId: "m01-l01", category: "application", critical: true };
  const choice = (id: string, label: string, correct: string, options: { id: string; label: string; feedback: string }[]) => ({ id, label, kind: "choice", correct, options: rng.shuffle(options) });
  if (familyId === "phs231-unit-conversion") {
    const n = rng.integer(2, 240), a = rng.integer(2, 25);
    const cases = {
      area: { prompt: `A sensor support has a stated cross-sectional area of ${n} mm². Convert it to m² before calculating stress. Treat this input as exact for the conversion exercise.`, expected: `${n}/1000000`, unit: "m²", rule: "square", calculation: `$${n}\\,(10^{-3})^2=${n}/1000000$ square meters.`, meaning: "The area contains two length factors, so each contributes a factor of 1/1000." },
      volume: { prompt: `A small housing has a stated volume of ${n} cm³. Convert it to m³. Treat this input as exact for the conversion exercise.`, expected: `${n}/1000000`, unit: "m³", rule: "cube", calculation: `$${n}\\,(10^{-2})^3=${n}/1000000$ cubic meters.`, meaning: "The volume contains three length factors, so each contributes a factor of 1/100." },
      speed: { prompt: `A cart's stated speed is ${n} km/h. Convert it to m/s. Treat this input as exact for the conversion exercise.`, expected: `${n}*1000/3600`, unit: "m/s", rule: "ratio", calculation: `$${n}\\,(1000/3600)=${5*n}/18$ meters per second.`, meaning: "Kilometers cancel in the numerator and hours cancel in the denominator; both units must change." },
      density: { prompt: `A model uses a density of ${n}/10 g/cm³. Convert the density to kg/m³. Treat the input as exact.`, expected: `${n}*100`, unit: "kg/m³", rule: "ratio", calculation: `$(${n}/10)\\,(10^{-3}/10^{-6})=${n*100}$ kilograms per cubic meter.`, meaning: "A gram contributes 1/1000 kilogram, but a cubic centimeter in the denominator contributes 1/1000000 cubic meter." },
      force: { prompt: `A mass of ${n} g has acceleration ${a} mm/s² along +x. Calculate the net x force in newtons. Treat the inputs as exact and use F = ma.`, expected: `${n}*${a}/1000000`, unit: "N", rule: "product", calculation: `$(${n}/1000)(${a}/1000)=${n*a}/1000000$ newtons.`, meaning: "Convert mass and acceleration separately. A newton is one kilogram meter per second squared." },
    };
    const c = cases[variant as keyof typeof cases];
    return questionSchema.parse({ ...base, parameters: { n, a }, prompt: c.prompt,
      fields: [exact("value", "Converted value", c.expected, c.unit), choice("reason", "Which conversion operation applies?", c.rule, [
        { id: "square", label: "Square the length conversion factor", feedback: "An area contains two factors of length. Apply the conversion to both." },
        { id: "cube", label: "Cube the length conversion factor", feedback: "A volume contains three factors of length. A prefix by itself is only a linear conversion." },
        { id: "ratio", label: "Convert numerator and denominator separately", feedback: "A rate or density changes according to both units in the quotient." },
        { id: "product", label: "Convert both factors before multiplying", feedback: "For force, convert mass to kg and acceleration to m/s² before multiplying." },
      ])], hints: ["Write a conversion factor equal to one with the desired unit on the surviving side.", c.meaning, c.calculation],
      explanation: [c.meaning, c.calculation, "Reverse the conversion to recover the stated input. A unit conversion changes a number's representation, not the underlying physical quantity."], answerSummary: `Value: ${c.expected} ${c.unit}. ${c.meaning}` });
  }
  if (familyId === "phs231-dimensional-audit") {
    const power = rng.integer(2, 6), coefficient = rng.integer(2, 19);
    if (variant === "sufficiency") {
      return questionSchema.parse({ ...base, category: "conceptual", parameters: { coefficient },
        prompt: `Someone proposes the exact constant-acceleration displacement rule Δx = ${coefficient} a t², starting from rest. Here a is acceleration and t is elapsed time. The units are meters. What does this establish?`,
        fields: [choice("claim", "Conclusion from the unit check", "necessary", [
          { id: "necessary", label: "The dimensions match, but the coefficient still needs a physical derivation", feedback: "Dimensions constrain units but cannot determine a dimensionless coefficient. Integration from rest gives a coefficient of 1/2." },
          { id: "proved", label: "The rule is correct because the units match", feedback: "Many incorrect models have the right units. Integrating acceleration and then velocity checks the coefficient." },
          { id: "wrong-unit", label: "The right side has velocity units", feedback: "Acceleration contributes m/s² and t² contributes s², leaving meters." },
        ]), exact("coefficient", "Correct coefficient multiplying a t²", "1/2")],
        hints: ["Multiply dimensions of acceleration by dimensions of time squared.", "For constant a and initial velocity zero, v(t)=at.", "Integrating at from 0 to t gives at²/2."],
        explanation: ["Both the proposed and correct expressions have length dimensions.", "$\\Delta x=\\int_0^t a\\tau\\,d\\tau=at^2/2$ for constant a and zero initial velocity. The dummy variable is tau; the upper limit is the requested elapsed time.", "A dimensional check can reject an inconsistent model but cannot prove a consistent one."], answerSummary: "Dimensions match; the physically derived coefficient is 1/2." });
    }
    const position = variant === "position";
    const powers = position ? [0, 1, -power] : [1, 1-power, power-2];
    const formula = position ? `x(t) = x₀ + v₀t + C t^${power}` : `F = C v^${power}`;
    return questionSchema.parse({ ...base, category: "procedural", parameters: { power, coefficient },
      prompt: `In the model ${formula}, use SI dimensions. C has a numerical value of ${coefficient} in its required units. Write its dimensions as M^p L^q T^r and enter the three signed exponents. ${position ? "x is position, v₀ is initial velocity, and t is time." : "F is force and v is speed; this is a dimensional exercise, not a claim that this drag law applies universally."}`,
      fields: [exact("mass", "Mass exponent p", String(powers[0])), exact("length", "Length exponent q", String(powers[1])), exact("time", "Time exponent r", String(powers[2]))],
      hints: ["Each term in an addition must have the same dimensions; both sides of an equality must agree.", position ? "Divide length dimensions by time raised to the stated power." : "Divide force dimensions M L T^-2 by speed dimensions raised to the stated power.", `The dimensional exponents are p=${powers[0]}, q=${powers[1]}, r=${powers[2]}.`],
      explanation: [position ? `$[C]=[x]/[t]^{${power}}=L T^{-${power}}$.` : `$[C]=[F]/[v]^{${power}}=M L^{${1-power}} T^{${power-2}}$.`, "The coefficient's numerical value does not determine its dimensions. Check by multiplying these dimensions back into the original term."],
      answerSummary: `p=${powers[0]}, q=${powers[1]}, r=${powers[2]}.` });
  }
  const distanceCm = rng.integer(120, 900), distanceBoundCm = rng.integer(1, 8), timeCs = rng.integer(70, 350), timeBoundCs = rng.integer(1, 6);
  const parameters = { distanceCm, distanceBoundCm, timeCs, timeBoundCs };
  if (variant === "speed") {
    return questionSchema.parse({ ...base, parameters,
      prompt: `A traveled distance is (${distanceCm}/100 ± ${distanceBoundCm}/100) m and elapsed time is (${timeCs}/100 ± ${timeBoundCs}/100) s. The ± values are independent allowed bounds, not standard deviations. Every combination inside the two intervals is allowed. Find the central speed and the smallest and largest possible speeds. Give exact fractions in m/s.`,
      fields: [exact("central", "Central speed", `${distanceCm}/${timeCs}`, "m/s"), exact("lower", "Minimum speed", `${distanceCm-distanceBoundCm}/${timeCs+timeBoundCs}`, "m/s"), exact("upper", "Maximum speed", `${distanceCm+distanceBoundCm}/${timeCs-timeBoundCs}`, "m/s")],
      hints: ["For positive elapsed time, speed increases with distance and decreases with time.", "Use minimum distance with maximum time for the minimum speed; reverse the endpoints for the maximum.", `The lower bound is (${distanceCm-distanceBoundCm})/(${timeCs+timeBoundCs}); the upper is (${distanceCm+distanceBoundCm})/(${timeCs-timeBoundCs}) m/s.`],
      explanation: ["All distance and time endpoints are positive, so the quotient is monotone in each input over the allowed rectangle.", `$v_0=${distanceCm}/${timeCs},\\quad v_{\\min}=${distanceCm-distanceBoundCm}/${timeCs+timeBoundCs},\\quad v_{\\max}=${distanceCm+distanceBoundCm}/${timeCs-timeBoundCs}\\;\\mathrm{m/s}$.`, "The factors of 1/100 cancel because both inputs used the same decimal scale. Bounds are generally not symmetric around the central quotient.", "Adding relative uncertainties in quadrature would answer a different question about independent random standard uncertainty, not these worst-case bounds."],
      answerSummary: `Central ${distanceCm}/${timeCs}, minimum ${distanceCm-distanceBoundCm}/${timeCs+timeBoundCs}, maximum ${distanceCm+distanceBoundCm}/${timeCs-timeBoundCs} m/s.` });
  }
  if (variant === "standard") {
    const speed = distanceCm/timeCs;
    const uncertainty = speed*Math.hypot(distanceBoundCm/distanceCm, timeBoundCs/timeCs);
    const field: AnswerField = { id: "uncertainty", kind: "numeric", label: "Approximate standard uncertainty of speed", expected: uncertainty, absoluteTolerance: 0.00005, relativeTolerance: 0, unit: "m/s", help: "Give at least four decimal places; accepted absolute error is 0.00005 m/s." };
    return questionSchema.parse({ ...base, parameters,
      prompt: `Independent distance and time estimates have means ${distanceCm}/100 m and ${timeCs}/100 s, with small standard uncertainties ${distanceBoundCm}/100 m and ${timeBoundCs}/100 s. Use first-order propagation for v=s/t: u(v)=v sqrt((u(s)/s)²+(u(t)/t)²). Find u(v) in m/s to four decimal places. Is this a guaranteed maximum error?`,
      fields: [field, choice("interpretation", "Meaning of this uncertainty", "standard", [
        { id: "standard", label: "A standard uncertainty under the stated assumptions, not a guaranteed bound", feedback: "Quadrature propagation describes small independent random uncertainties. It is not a promise that every result lies within one u." },
        { id: "bound", label: "A guaranteed bound on every possible speed error", feedback: "A standard deviation does not bound every outcome; bounded errors require an interval model." },
        { id: "resolution", label: "Exactly the smallest display increment of the instrument", feedback: "Resolution is one instrument property. A propagated uncertainty also depends on the measurement process and both inputs." },
      ])], hints: ["Compute the central speed using the supplied means.", "Square each relative standard uncertainty, add, and take a square root; multiply by central speed.", `The propagated value is approximately ${uncertainty.toFixed(6)} m/s.`],
      explanation: [`The central speed is ${speed.toFixed(6)} m/s.`, "The partial derivatives of s/t are 1/t and -s/t². Independence removes a covariance term in the first-order variance calculation.", `The square root of the summed variance contributions gives u(v) ≈ ${uncertainty.toFixed(6)} m/s.`, "This formula is an approximation for small relative uncertainties; correlation, large uncertainty, or systematic errors require a more suitable model."],
      answerSummary: `u(v) ≈ ${uncertainty.toFixed(6)} m/s; not a guaranteed bound.` });
  }
  const trueMm = rng.integer(30, 100), offsetMm = rng.integer(2, 9);
  return questionSchema.parse({ ...base, category: "conceptual", parameters: { trueMm, offsetMm },
    prompt: `A length instrument with 1 mm display steps repeatedly reports ${trueMm+offsetMm} mm for a certified ${trueMm} mm reference. For this idealized exercise the reference is exact and the instrument's offset is constant. Find the additive correction in mm and assess whether identical repeats establish accuracy.`,
    fields: [exact("correction", "Correction added to displayed readings", String(-offsetMm), "mm"), choice("claim", "Interpretation of repeatability", "bias", [
      { id: "bias", label: "The repeats are consistent but share an offset; averaging cannot remove that constant offset", feedback: "Repeatability describes scatter, while the reference comparison reveals a bias. Subtract the positive offset." },
      { id: "accurate", label: "The instrument is accurate because the repeats are identical", feedback: "Identical repeats can all be displaced from a reference by the same bias." },
      { id: "average", label: "Enough repeats make the constant offset disappear", feedback: "A constant additive offset survives averaging. A calibration correction and its own uncertainty must be considered." },
    ])], hints: ["Compare the displayed reference reading with its stated true value.", "Choose a correction that restores the reference when added to the reading.", `Add ${-offsetMm} mm; identical repeated readings do not remove a common offset.`],
    explanation: [`The displayed value exceeds the reference by ${offsetMm} mm. The needed additive correction is therefore ${-offsetMm} mm.`, "A 1 mm display increment is resolution, not a guarantee of 1 mm accuracy.", "The exact, constant correction is a classroom assumption. Real reference values and calibration corrections have uncertainty, and bias may vary across a range."],
    answerSummary: `Correction ${-offsetMm} mm; repeatability alone does not establish accuracy.` });
}
