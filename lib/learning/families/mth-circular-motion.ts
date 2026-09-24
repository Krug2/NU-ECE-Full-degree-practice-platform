import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";
import { angleChoice, angleExact, angleMath, angleNumber, angleYesNo } from "./mth-angle-fields";

export const circularMotionFamilyIds = ["mth-circular-motion"] as const;
export const circularMotionVariants = ["angular-rate", "rpm", "tangential-speed", "inverse-motion", "period", "wheel-distance", "reversal-path", "rest", "validity"];
export function circularMotionQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  if (familyId !== "mth-circular-motion") throw new Error("Unknown circular motion family");
  const rng = randomFrom(seed);
  if (variant === "mixed") variant = circularMotionVariants[rng.integer(0, circularMotionVariants.length - 1)];
  const mode = circularMotionVariants.indexOf(variant);
  if (mode < 0) throw new Error("Unknown circular motion variant");
  const r = rng.integer(2, 9), p = rng.integer(1, 9), q = rng.integer(2, 8), n = rng.integer(1, 4), flag = rng.integer(0, 3), sign = flag % 2 ? -1 : 1;
  const base = { id, familyId, familyVersion: 1, courseId: "mth-215", objectiveId: "m06-l01", critical: true, category: "application", parameters: { mode, r, p, q, n, flag, sign } };
  const finish = (prompt: string, fields: unknown[], explanation: string[]) => questionSchema.parse({ ...base, prompt, fields: fields.map(field => {
    const item = field as { kind: string; options?: unknown[] };
    return item.kind === "choice" ? { ...item, options: rng.shuffle(item.options!) } : item;
  }), hints: ["Convert rotation to radians, lengths to compatible units and all times to the requested unit.", "Signed average angular rate is net rotation divided by elapsed time. Average angular speed uses total angular travel instead.", "For a fixed radius, tip distance is radius times angular travel. A finite revolution time requires nonzero uniform angular speed; wheel travel requires a supplied no-slip premise."], explanation, answerSummary: explanation.join(" ") });
  if (mode === 0 || mode === 1) {
    const angle = mode === 0 ? sign * p + "*pi" : sign * p * 30 + "*pi", time = mode === 0 ? q : 60;
    return finish("A point stays at radius " + r + "/10 m. It rotates uniformly " + (mode === 0 ? "through " + angleMath(angle) + " radians in " + time + " seconds" : "at a signed rate of " + sign * p * 15 + " revolutions per minute") + ". Positive rotation is counterclockwise. Find signed angular rate, nonnegative angular speed, and tangential speed in SI units.", [
      angleExact("rate", "Signed angular rate", "(" + angle + ")/" + time, "rad/s"),
      angleExact("angular-speed", "Angular speed", "(" + p * (mode === 0 ? 1 : 30) + "*pi)/" + time, "rad/s"),
      angleExact("speed", "Tangential speed", r * p * (mode === 0 ? 1 : 30) + "*pi/" + (10 * time), "m/s"),
    ], ["The signed rotation in the stated interval is " + angle + " radians; the interval lasts " + time + " seconds.", "Divide by elapsed seconds for the signed angular rate, then take its magnitude for angular speed.", "Multiply angular speed by " + r + "/10 m for tangential speed. A clockwise direction changes the signed rate, not the speed's sign."]);
  }
  if (mode === 2) return finish("Two points on the same rigid disk rotate uniformly at angular speed " + p + "/" + q + " rad/s. Their radii are " + r + " cm and " + r * n + " cm. Find their tangential speeds in m/s and the ratio of the second speed to the first.", [
    angleNumber("first", "First tangential speed", r * p + "/" + (100 * q), "m/s"),
    angleNumber("second", "Second tangential speed", r * n * p + "/" + (100 * q), "m/s"),
    angleNumber("ratio", "Second speed divided by first speed", String(n)),
    angleYesNo("same", "Do the points have the same angular speed?", true, "Points fixed on one rigid rotating disk traverse the same angle in the same time; their tangential speeds depend on radius."),
  ], ["Convert the radii to " + r + "/100 m and " + r * n + "/100 m.", "Multiplying each by " + p + "/" + q + " rad/s gives speeds " + r * p + "/" + (100 * q) + " and " + r * n * p + "/" + (100 * q) + " m/s.", "The speed ratio is " + n + ", while angular speed is shared."]);
  if (mode === 3) return finish("A point rotates uniformly at angular speed " + angleMath(p + "*pi/" + q) + " rad/s. Its tangential speed is " + r + " m/s. Recover its positive radius and the time needed to sweep " + n + "*pi radians without reversing.", [
    angleExact("radius", "Radius", r * q + "/(" + p + "*pi)", "m"),
    angleNumber("time", "Time for the requested sweep", n * q + "/" + p, "s"),
    angleYesNo("pi", "Must every exact radius be a rational number?", false, "A radius can be any positive real length. These data produce a reciprocal-pi expression; rounding pi would lose the exact value."),
  ], ["Solve v=r*omega for r=v/omega=" + r * q + "/(" + p + "*pi) m.", "Solve theta=omega*t for t=" + n * q + "/" + p + " seconds.", "The radius is positive and substitution reproduces the supplied tangential speed."]);
  if (mode === 4) return finish("A uniformly rotating ray sweeps " + angleMath(sign * p + "*pi/" + q) + " radians in " + n + " seconds. Compute its nonnegative angular speed, time to complete one revolution, and revolutions per minute.", [
    angleExact("angular-speed", "Angular speed", p + "*pi/" + (q * n), "rad/s"),
    angleNumber("period", "Time for one complete revolution", 2 * q * n + "/" + p, "s"),
    angleNumber("rpm", "Revolutions per minute as a nonnegative frequency", 30 * p + "/" + (q * n), "rev/min"),
    angleYesNo("uniform", "Is constant nonzero angular speed part of this calculation's premises?", true, "Using one period 2pi/omega assumes the nonzero angular speed remains constant through the revolution."),
  ], ["Angular speed is the magnitude of rotation divided by time: " + p + "*pi/" + (q * n) + " rad/s.", "A full revolution takes 2pi divided by that speed, or " + 2 * q * n + "/" + p + " seconds.", "Dividing 60 seconds per minute by that revolution time gives " + 30 * p + "/" + (q * n) + " rev/min."]);
  if (mode === 5) return finish("A wheel with diameter " + (2 * r) + " cm rolls without slipping in a straight line for " + n + "+" + p + "/" + q + " revolutions in one direction. Find its radius in meters and the distance its axle advances. Then recover the number of revolutions from your distance divided by the circumference.", [
    angleNumber("radius", "Radius", r + "/100", "m"),
    angleExact("distance", "Axle travel distance", r + "*pi/50*(" + n + "+" + p + "/" + q + ")", "m"),
    angleNumber("turns", "Recovered number of revolutions", n + "+" + p + "/" + q, "turns"),
    angleYesNo("slip", "Would rotation alone determine axle travel if slipping were unspecified?", false, "The supplied rolling-without-slipping condition equates one revolution of axle travel to one circumference."),
  ], ["The radius is " + r + "/100 m and the circumference is " + r + "*pi/50 m.", "Multiplying by the complete turn count gives the axle distance.", "Dividing that distance by the circumference returns " + n + "+" + p + "/" + q + " turns. No-slip rolling is essential to this relationship."]);
  if (mode === 6) {
    const back = flag % 2 ? p : n, total = 2 * q + 1;
    return finish("At fixed radius " + r + " m, a point first sweeps counterclockwise through " + p + "*pi radians in " + q + " s, then clockwise through " + back + "*pi radians in " + (q + 1) + " s. It does not reverse within either segment. Give net rotation, total distance and average rates over the entire journey.", [
      angleExact("net", "Signed net rotation", (p - back) + "*pi", "rad"),
      angleExact("travel", "Total angular travel", (p + back) + "*pi", "rad"),
      angleExact("distance", "Total traveled distance", r * (p + back) + "*pi", "m"),
      angleNumber("time", "Total elapsed time", String(total), "s"),
      angleExact("rate", "Average signed angular rate", (p - back) + "*pi/" + total, "rad/s"),
      angleExact("speed", "Average tangential speed", r * (p + back) + "*pi/" + total, "m/s"),
    ], ["Signed net rotation is (" + p + "-" + back + ")*pi, whereas total angular travel is (" + p + "+" + back + ")*pi.", "Multiplying travel by radius gives " + r * (p + back) + "*pi m distance.", "The total duration is " + total + " seconds. Divide net rotation by it for signed average angular rate, and total distance by it for average tangential speed."]);
  }
  if (mode === 7) return finish("A point at radius " + r + " m remains stationary for " + q + " minutes. Find its traveled distance and average angular rate in radians per second. Decide whether this stationary motion completes a full revolution after any finite waiting time.", [
    angleNumber("time", "Elapsed seconds", String(60 * q), "s"),
    angleNumber("distance", "Distance traveled", "0", "m"), angleNumber("rate", "Average signed angular rate", "0", "rad/s"),
    angleYesNo("revolution", "Does the stationary motion complete a revolution in finite time?", false, "It accumulates zero angular travel for every finite waiting time. Dividing 2pi by zero does not produce a finite revolution time."),
  ], ["The duration is " + 60 * q + " seconds, but both net rotation and angular travel are zero.", "Distance and average angular rate are zero.", "No finite waiting time produces a completed revolution for this stationary motion."]);
  const cases = [
    { prompt: "A report divides a nonzero rotation by an elapsed time of zero and calls the result a finite average angular rate.", key: "time", label: "Elapsed time must be positive", reason: "The average-rate quotient is undefined at zero elapsed time." },
    { prompt: "A report assigns a negative radius to a physical circle and uses it to compute speed.", key: "radius", label: "A physical circle radius must be positive", reason: "Signed direction belongs in the rotation; radius is a positive length." },
    { prompt: "A wheel's rotation is measured, but slipping is unrestricted. A report asserts that the axle must advance by radius times angular travel.", key: "slip", label: "The rolling-without-slipping relationship has not been supplied", reason: "Wheel rotation alone does not determine axle travel when slipping is unrestricted." },
    { prompt: "A clockwise rotation has negative signed angular rate. A report multiplies it by radius and labels the negative result a nonnegative tangential speed.", key: "magnitude", label: "Speed needs the magnitude of the angular rate", reason: "Signed circumferential rate can be negative, while tangential speed is nonnegative." },
  ];
  const item = cases[flag];
  return finish(item.prompt + " Identify the failed premise or interpretation.", [
    angleChoice("reason", "What needs correction?", item.key, cases.map(entry => [entry.key, entry.label, entry.reason])),
    angleYesNo("rounding", "Could rounding the numerical answer fix this issue?", false, "This is a premise or quantity error. Changing decimal precision cannot repair it."),
  ], [item.reason, "Check the meaning and premises of the requested quantity before performing arithmetic."]);
}
