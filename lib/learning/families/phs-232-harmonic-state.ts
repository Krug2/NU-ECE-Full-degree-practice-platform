import { questionSchema, type AnswerField } from "../contracts";
import { randomFrom } from "../random";
import { phs232Approximate, phs232Choice, phs232Exact, phs232Pi, phs232Rational } from "./phs-232-fields";

export const phs232HarmonicStateFamilyIds = ["phs232-harmonic-state"] as const;
export const phs232HarmonicStateVariants = ["parameter-frequency", "state-from-phase", "initial-state-inverse", "derivative-sign", "phase-equivalence", "zero-state"] as const;

export function phs232HarmonicStateQuestion(familyId: string, variant: string, seed: string, id: string) {
  if (familyId !== "phs232-harmonic-state" || !(phs232HarmonicStateVariants as readonly string[]).includes(variant)) throw new Error("Unknown PHS 232 harmonic state family or variant.");
  const rng = randomFrom(`${familyId}:${variant}:${seed}`);
  const scale = rng.integer(1, 8), massNumerator = rng.integer(1, 6), omega = rng.integer(1, 6);
  const phaseQuarter = rng.integer(-4, 3), timeQuarter = rng.integer(0, 24), swap = rng.integer(0, 1);
  const sx = rng.integer(0, 1) ? 1 : -1, sv = rng.integer(0, 1) ? 1 : -1, representation = rng.integer(0, 3), turns = rng.integer(1, 3);
  const parameters = { scale, massNumerator, omega, phaseQuarter, timeQuarter, swap, sx, sv, representation, turns };
  const choice = (id: string, label: string, correct: string, options: [string, string, string][]) => phs232Choice(id, label, correct, rng.shuffle(options));
  const finish = (prompt: string, fields: AnswerField[], hints: string[], explanation: string[], answerSummary: string) => questionSchema.parse({
    id, familyId, familyVersion: 1, courseId: "phs-232", objectiveId: "m01-l01", category: "application", critical: variant !== "state-from-phase", parameters,
    prompt, fields, hints, explanation, answerSummary,
  });
  if (variant === "parameter-frequency") return finish(
    `An ideal undamped horizontal oscillator has mass ${massNumerator}/2 kg and spring stiffness ${massNumerator * omega * omega}/2 N/m. Displacement x is measured from its equilibrium and the net force is F=-kx. Determine its angular frequency, natural period and cyclic frequency. Then compare the frequency after doubling a nonzero amplitude within this same ideal model.`,
    [phs232Rational("omega", "Angular frequency", String(omega), "rad/s"), phs232Pi("period", "Natural period", `2*pi/${omega}`, "s"), phs232Pi("frequency", "Cyclic frequency", `${omega}/(2*pi)`, "Hz"),
      choice("amplitude", "Effect of doubling amplitude on frequency", "unchanged", [["unchanged", "Frequency is unchanged", "In the stated linear undamped model, omega²=k/m contains no amplitude."], ["double", "Frequency doubles", "Amplitude sets displacement and speed scales, not k/m in this model."], ["half", "Frequency halves", "A larger travel distance is accompanied by a larger speed; this ideal period stays unchanged."]])],
    ["Divide stiffness by mass to obtain omega², with units s⁻².", "Take the positive square root, then use T=2*pi/omega and f=1/T.", `Here omega=${omega} rad/s. One radian of phase is not a complete cycle; a cycle needs 2*pi radians.`],
    [`omega²=k/m=(${massNumerator * omega * omega}/2)/(${massNumerator}/2)=${omega * omega} s⁻², so omega=${omega} rad/s.`, `T=2*pi/${omega} s and f=${omega}/(2*pi) Hz. Their product is one, while omega*T=2*pi.`, "Changing amplitude alone leaves this model's natural frequency unchanged. This conclusion does not automatically extend to nonlinear springs, large-angle pendulums or changing material properties."],
    `omega=${omega} rad/s; T=2*pi/${omega} s; f=${omega}/(2*pi) Hz; amplitude does not change this frequency.`);

  const index = ((phaseQuarter + timeQuarter) % 8 + 8) % 8;
  const cosines = ["1", "sqrt(2)/2", "0", "-sqrt(2)/2", "-1", "-sqrt(2)/2", "0", "sqrt(2)/2"];
  const sines = ["0", "sqrt(2)/2", "1", "sqrt(2)/2", "0", "-sqrt(2)/2", "-1", "-sqrt(2)/2"];
  const x = `${scale}/100*(${cosines[index]})`, v = `-${omega * scale}/100*(${sines[index]})`, acceleration = `-${omega * omega * scale}/100*(${cosines[index]})`;
  const velocitySign = index === 0 || index === 4 ? "zero" : index < 4 ? "negative" : "positive";
  if (variant === "state-from-phase") return finish(
    `An ideal oscillator follows x(t)=(${scale}/100) cos(${omega}t+(${phaseQuarter})pi/4) m, with t in seconds and the angle in radians. Find its signed position, velocity and acceleration at t=${timeQuarter}pi/(${4 * omega}) s. Identify the direction of motion at that instant; zero velocity is a turning instant here because amplitude is nonzero.`,
    [phs232Exact("position", "Position", x, "m"), phs232Exact("velocity", "Velocity", v, "m/s"), phs232Exact("acceleration", "Acceleration", acceleration, "m/s²"),
      choice("direction", "Instantaneous motion", velocitySign, [["positive", "Moving in the positive x direction", "The sign of velocity, not position, identifies the direction of motion."], ["negative", "Moving in the negative x direction", "Differentiate cosine: v=-A*omega*sin(omega*t+phi)."], ["zero", "Momentarily at rest at a turning point", "At either displacement extreme the velocity is zero, but restoring acceleration is nonzero."]])],
    ["Differentiate the complete phase: v=-A*omega*sin(omega*t+phi), a=-A*omega²*cos(omega*t+phi).", `The phase is (${phaseQuarter}+${timeQuarter})pi/4, equivalent to ${index}pi/4. Use exact unit-circle values.`, `Keep the separate scales A=${scale}/100 m, A*omega=${omega * scale}/100 m/s and A*omega²=${omega * omega * scale}/100 m/s².`],
    [`Substitution gives phase (${phaseQuarter + timeQuarter})pi/4, so cosine=${cosines[index]} and sine=${sines[index]}.`, `x=${x} m, v=${v} m/s and a=${acceleration} m/s². The minus sign on the derivative of cosine is essential.`, `The velocity is ${velocitySign}. Also a=-${omega * omega}x, independently checking the restoring direction and scale. A nonzero position does not tell us the direction of travel.`],
    `x=${x} m; v=${v} m/s; a=${acceleration} m/s²; velocity is ${velocitySign}.`);

  if (variant === "initial-state-inverse") {
    const xNumerator = sx * (swap ? 4 : 3) * scale, vNumerator = sv * (swap ? 3 : 4) * scale * omega;
    const phi = Math.atan2(-vNumerator / omega, xNumerator);
    return finish(`An ideal oscillator has mass ${massNumerator}/2 kg and stiffness ${massNumerator * omega * omega}/2 N/m. At t=0, x=${xNumerator}/100 m and v=${vNumerator}/100 m/s. Express its motion as x(t)=A cos(omega*t+phi), with A nonnegative, omega positive and -pi ≤ phi < pi. Find omega, A and the principal phase phi in radians.`,
      [phs232Rational("omega", "Angular frequency", String(omega), "rad/s"), phs232Rational("amplitude", "Amplitude", `${5 * scale}/100`, "m"), phs232Approximate("phase", "Principal phase", phi, "rad")],
      ["Use omega=sqrt(k/m). Both x(0)=A cos(phi) and v(0)=-A*omega*sin(phi) must hold.", "Square and add x(0) and v(0)/omega to obtain A. Use the signs of x(0) and -v(0)/omega to select the phase quadrant.", `A=${5 * scale}/100 m. Evaluate atan2(-v(0)/omega,x(0)); arccos alone cannot recover the velocity direction.`],
      [`omega=sqrt(k/m)=${omega} rad/s. A²=(${xNumerator}/100)²+(${vNumerator}/${100 * omega})²=(${5 * scale}/100)² m².`, `cos(phi)=${xNumerator}/${5 * scale} and sin(phi)=${-vNumerator}/${5 * scale * omega}. Their signs select the correct quadrant.`, `The phase in the requested interval is ${phi.toFixed(9)} rad. Substituting this phase recovers both initial position and initial velocity. Adding 2*pi describes the same motion but would not satisfy the requested principal interval.`],
      `omega=${omega} rad/s; A=${5 * scale}/100 m; phi≈${phi.toFixed(9)} rad.`);
  }
  if (variant === "derivative-sign") {
    const accelerationSign = index === 2 || index === 6 ? "zero" : index === 0 || index === 1 || index === 7 ? "negative" : "positive";
    const speed = velocitySign === "zero" ? "corner" : accelerationSign === "zero" ? "zero-rate" : velocitySign === accelerationSign ? "increasing" : "decreasing";
    const signOptions: [string, string, string][] = [["positive", "Positive", "Use the sign of the requested derivative, with the given positive x direction."], ["negative", "Negative", "A negative derivative is a direction or signed rate, not automatically a reduction in speed."], ["zero", "Zero", "A zero value of one derivative does not force the next derivative to be zero."]];
    return finish(`A nonzero-amplitude ideal oscillator has x=A cos(theta), v=-A*omega sin(theta) and a=-A*omega² cos(theta), with A=${scale}/100 m and omega=${omega} rad/s. At an interior time of the smooth trajectory, theta=${index}pi/4. Determine the signs of velocity and acceleration and the instantaneous behavior of speed |v|. Consider a two-sided derivative of speed.`,
      [choice("velocity", "Velocity sign", velocitySign, signOptions), choice("acceleration", "Acceleration sign", accelerationSign, signOptions), choice("speed", "Speed behavior", speed, [["increasing", "Speed has a positive derivative", "For v≠0, d|v|/dt=sign(v)*a, so equal nonzero signs make speed increase."], ["decreasing", "Speed has a negative derivative", "For v≠0, opposite signs of v and a make speed decrease."], ["zero-rate", "The instantaneous speed derivative is zero", "At equilibrium, acceleration is zero while speed is maximal. Zero instantaneous rate does not mean constant speed on an interval."], ["corner", "The two-sided speed derivative does not exist at this turning point", "With nonzero restoring acceleration, velocity passes through zero and |v| has a corner. The trajectory's position and velocity remain differentiable."]])],
      ["Read v from -sin(theta) and a from -cos(theta).", "When v is nonzero, multiply acceleration by sign(v) to obtain the speed derivative.", "At a turning point with nonzero acceleration, the left and right slopes of |v| disagree."],
      [`At ${index}pi/4, velocity is ${velocitySign} and acceleration is ${accelerationSign}.`, velocitySign === "zero" ? "Here v changes sign with nonzero slope. Absolute value turns that crossing into a corner, so the two-sided speed derivative is undefined." : accelerationSign === "zero" ? "Here v is nonzero and a=0, so d|v|/dt=0 at this instant. The speed has a local maximum, not a constant history." : `The signs of v and a are ${velocitySign === accelerationSign ? "equal" : "opposite"}; d|v|/dt is therefore ${speed === "increasing" ? "positive" : "negative"}.`, "The sign of acceleration alone cannot determine whether speed rises or falls."],
      `Velocity: ${velocitySign}; acceleration: ${accelerationSign}; speed: ${speed}.`);
  }
  if (variant === "phase-equivalence") {
    const candidateAmplitude = (representation === 2 ? -1 : 1) * scale, candidateOmega = (representation === 3 ? -1 : 1) * omega;
    const candidatePhase = representation === 0 ? phaseQuarter + 8 * turns : representation === 3 ? -phaseQuarter : phaseQuarter + 4;
    const canonicalPhase = representation === 1 ? phaseQuarter < 0 ? phaseQuarter + 4 : phaseQuarter - 4 : phaseQuarter;
    const same = representation !== 1;
    return finish(`At the same unchanged time origin, compare x1(t)=(${scale}/100) cos(${omega}t+(${phaseQuarter})pi/4) m with x2(t)=(${candidateAmplitude}/100) cos((${candidateOmega})t+(${candidatePhase})pi/4) m. Is x2 the same physical trajectory at every time? Rewrite x2 using A≥0, omega>0 and -pi≤phi<pi; give its amplitude and principal phase.`,
      [choice("same", "Same position and velocity at every time?", same ? "yes" : "no", [["yes", "Yes", "Use cosine periodicity, cosine's evenness and the pi shift associated with a negative amplitude; then check both position and velocity."], ["no", "No", "A half-turn phase shift with the same positive amplitude reverses the entire trajectory. Equal initial positions alone would not establish equality of the full state."]]), phs232Rational("amplitude", "Canonical amplitude of x2", `${scale}/100`, "m"), phs232Pi("phase", "Canonical principal phase of x2", `${canonicalPhase}*pi/4`, "rad")],
      ["Whole 2*pi phase shifts leave a cosine unchanged. A pi shift changes its sign.", "A negative amplitude can be made positive by adding pi to the phase. A negative angular coefficient can be made positive by negating the complete phase argument.", "Reduce the resulting phase to [-pi,pi), then compare the two expressions at the same time origin."],
      [`After the necessary amplitude or angular-sign conversion, x2 has amplitude ${scale}/100 m and positive angular frequency ${omega} rad/s.`, `Its principal phase is ${canonicalPhase}pi/4. x1's principal phase is ${phaseQuarter}pi/4.`, same ? "The canonical forms coincide, so both position and its derivative agree at every time." : "The canonical forms differ by pi modulo 2*pi. With nonzero amplitude they are opposite trajectories, even if both positions happen to be zero at a particular instant."],
      `Same trajectory: ${same ? "yes" : "no"}; A=${scale}/100 m; phi=${canonicalPhase}pi/4 rad.`);
  }
  return finish(`An ideal oscillator has mass ${massNumerator}/2 kg and stiffness ${massNumerator * omega * omega}/2 N/m. It is placed exactly at equilibrium with x(0)=0 m and v(0)=0 m/s, with no drive or damping. Find its amplitude and the system's natural period. What phase and least positive trajectory period can be identified from this stationary motion?`,
    [phs232Rational("amplitude", "Amplitude", "0", "m"), phs232Pi("natural-period", "System natural period", `2*pi/${omega}`, "s"),
      choice("phase", "Phase information in the stationary state", "unidentified", [["unidentified", "The phase is not uniquely identifiable", "When A=0, every phase gives the identical zero function. A chosen value would be a convention, not measured phase information."], ["zero", "The physical phase is uniquely zero", "Zero is one possible representation, but no phase is distinguished when the amplitude vanishes."], ["quarter", "The physical phase is uniquely pi/2", "Cos(pi/2)=0 at one instant, but a nonzero-amplitude oscillator would then have nonzero velocity."]]),
      choice("period", "Least positive period of this actual stationary trajectory", "none", [["none", "There is no least positive period; every positive shift repeats the state", "The constant zero state repeats after any positive time. The model's natural period describes nonzero perturbations."], ["natural", "It must be exactly the system's natural period", "The natural period is meaningful for nonzero oscillations, but the stationary trajectory also repeats after every smaller positive shift."], ["zero", "Its least positive period is zero", "Zero is not a positive period. There is no smallest positive repeating shift."]])],
    ["A²=x(0)²+[v(0)/omega]², so this initial state has A=0.", "The model still has omega=sqrt(k/m) and a natural period 2*pi/omega for nonzero perturbations.", "Ask whether any measurement of the constant zero trajectory distinguishes one phase or one smallest positive repeating interval."],
    [`A=0 and the solution is x=v=a=0 for all time. The system parameter omega=${omega} rad/s gives natural period 2*pi/${omega} s.`, "In A cos(omega*t+phi), zero amplitude erases every dependence on phi. Thus phase is not identifiable from this state.", "Every positive time shift leaves the stationary trajectory unchanged, so there is no least positive trajectory period. This does not change the spring-mass system's natural response to a nonzero perturbation."],
    `A=0; natural period=2*pi/${omega} s; phase unidentifiable; no least positive trajectory period.`);
}
