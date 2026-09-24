import { questionSchema, type AnswerField } from "../contracts";
import { randomFrom } from "../random";
import { phs232Choice, phs232Exact, phs232Pi, phs232Rational } from "./phs-232-fields";

export const phs232HarmonicEventsFamilyIds = ["phs232-harmonic-events"] as const;
export const phs232HarmonicEventsVariants = ["first-crossing", "directed-crossing", "turning-point", "window-count", "state-recurrence", "sample-alias"] as const;
const mod = (n: number, base = 8) => (n % base + base) % base;
const cosine = ["1", "sqrt(2)/2", "0", "-sqrt(2)/2", "-1", "-sqrt(2)/2", "0", "sqrt(2)/2"];
const directionOptions: [string, string, string][] = [
  ["positive", "Positive x direction", "Direction is the sign of velocity. Just after the negative displacement extreme, the restoring acceleration produces positive velocity."],
  ["negative", "Negative x direction", "Direction is the sign of velocity. Just after the positive displacement extreme, the restoring acceleration produces negative velocity."],
  ["zero", "Zero velocity at the event", "At an extreme of displacement the velocity is zero at the event, even though the restoring acceleration is nonzero."],
];

export function phs232HarmonicEventsQuestion(familyId: string, variant: string, seed: string, id: string) {
  if (familyId !== "phs232-harmonic-events" || !(phs232HarmonicEventsVariants as readonly string[]).includes(variant)) throw new Error("Unknown PHS 232 harmonic event family or variant.");
  const rng = randomFrom(`${familyId}:${variant}:${seed}`);
  const scale = rng.integer(1, 8), omega = rng.integer(1, 6), phaseQuarter = rng.integer(-4, 3), targetQuarter = rng.integer(0, 4);
  const interiorQuarter = rng.integer(1, 3), direction = rng.integer(0, 1) ? 1 : -1, fromEighth = rng.integer(0, 24), spanEighth = rng.integer(1, 48);
  const includeFrom = rng.integer(0, 1), includeTo = rng.integer(0, 1), filter = rng.integer(-1, 1), stationary = rng.integer(0, 4) === 0 ? 1 : 0;
  const frequency = rng.integer(1, 24), sampleRate = 2 ** rng.integer(1, 3), aliasTurns = rng.integer(1, 4);
  const parameters = { scale, omega, phaseQuarter, targetQuarter, interiorQuarter, direction, fromEighth, spanEighth, includeFrom, includeTo, filter, stationary, frequency, sampleRate, aliasTurns };
  const choice = (id: string, label: string, correct: string, options: [string, string, string][]) => phs232Choice(id, label, correct, rng.shuffle(options));
  const finish = (prompt: string, fields: AnswerField[], hints: string[], explanation: string[], answerSummary: string) => questionSchema.parse({
    id, familyId, familyVersion: 1, courseId: "phs-232", objectiveId: "m01-l01", category: "application", critical: true, parameters, prompt, fields, hints, explanation, answerSummary,
  });
  const model = `x(t)=(${scale}/100) cos(${omega}t+(${phaseQuarter})pi/4) m, with t in seconds and angles in radians`;
  const delay = (phase: number) => mod(phase - phaseQuarter) || 8;
  const time = (quarters: number) => `${quarters}*pi/${4 * omega}`;
  if (variant === "first-crossing") {
    const roots = [...new Set([targetQuarter, mod(-targetQuarter)])];
    const earliest = Math.min(...roots.map(delay)), phase = mod(phaseQuarter + earliest);
    const motion = phase === 0 || phase === 4 ? "zero" : phase < 4 ? "negative" : "positive";
    return finish(`The oscillator follows ${model}. Find the first strictly positive time at which x=(${scale}/100)*(${cosine[targetQuarter]}) m. Exclude t=0 even if it already has that position. State the velocity direction at the event; reaching a displacement extreme is a touch with zero instantaneous velocity, not a passage through that position.`,
      [phs232Pi("time", "First strictly positive event time", time(earliest), "s"), choice("direction", "Velocity direction at that instant", motion, directionOptions)],
      ["Solve cos(theta)=x_target/A with both theta=+alpha+2*pi*n and theta=-alpha+2*pi*n.", "Subtract the initial phase and divide by positive omega. Discard every time ≤0 before choosing the earliest remaining event.", `The target has alpha=${targetQuarter}pi/4. At the selected event use v=-A*omega*sin(theta), including zero at an extreme.`],
      [`The permitted phase residues are ${roots.map(root => `${root}pi/4`).join(" and ")} modulo 2*pi. At an extreme these branches coincide and count only once.`, `After subtracting (${phaseQuarter})pi/4, the first strictly positive phase advance is ${earliest}pi/4. Thus t=${time(earliest)} s.`, `The event phase is equivalent to ${phase}pi/4, giving ${motion} velocity. Keeping only the principal arccos root could miss an earlier event or the required direction.`],
      `t=${time(earliest)} s; velocity direction=${motion}.`);
  }
  if (variant === "directed-crossing") {
    const root = direction < 0 ? interiorQuarter : 8 - interiorQuarter, earliest = delay(root);
    const opposite = delay(direction < 0 ? 8 - interiorQuarter : interiorQuarter);
    return finish(`The oscillator follows ${model}. Find the first t>0 at which x=(${scale}/100)*(${cosine[interiorQuarter]}) m while moving in the ${direction > 0 ? "positive" : "negative"} x direction. Also find the first t>0 at the same position moving in the opposite direction. Neither event may use t=0.`,
      [phs232Pi("requested", "First crossing in the requested direction", time(earliest), "s"), phs232Pi("opposite", "First crossing in the opposite direction", time(opposite), "s")],
      ["This target is strictly inside the amplitude bounds, so there are two distinct direction branches per cycle.", "Because v=-A*omega*sin(theta), positive sine gives negative motion, and negative sine gives positive motion.", "Choose a branch by direction before reducing its time to the first strictly positive occurrence."],
      [`The two phase residues are ${interiorQuarter}pi/4 (negative velocity) and ${8 - interiorQuarter}pi/4 (positive velocity).`, `For the requested direction the residue is ${root}pi/4. The positive phase advance from the initial phase is ${earliest}pi/4, giving t=${time(earliest)} s.`, `The opposite branch first occurs at t=${time(opposite)} s. Direction distinguishes events that a position measurement alone cannot separate.`],
      `Requested direction: ${time(earliest)} s; opposite direction: ${time(opposite)} s.`);
  }
  if (variant === "turning-point") {
    const earliest = Math.min(delay(0), delay(4)), sign = mod(phaseQuarter + earliest) === 0 ? 1 : -1;
    return finish(`The oscillator follows ${model}. Find its next turning point strictly after t=0, its signed position and acceleration there, and its direction immediately after that event. A turning point at the initial instant is excluded.`,
      [phs232Pi("time", "Next turning time", time(earliest), "s"), phs232Rational("position", "Turning position", `${sign * scale}/100`, "m"), phs232Rational("acceleration", "Acceleration at the turning point", `${-sign * scale * omega * omega}/100`, "m/s²"), choice("after", "Motion immediately after the turning point", sign > 0 ? "negative" : "positive", [...directionOptions.slice(0, 2), ["zero", "Remains at rest after the event", "Zero velocity holds only at the turning instant. The nonzero restoring acceleration immediately produces motion toward equilibrium."]])],
      ["Turning points have v=0, so the phase is an integer multiple of pi.", "Select the first such phase strictly after the initial phase. The position is then either +A or -A.", "Use a=-omega²*x. At the turning instant v=0; immediately afterward the restoring acceleration determines the direction."],
      [`The first positive phase advance to either 0 or pi modulo 2*pi is ${earliest}pi/4, so t=${time(earliest)} s.`, `At that event x=${sign * scale}/100 m and a=${-sign * scale * omega * omega}/100 m/s². The acceleration is not zero.`, `Immediately afterward the velocity becomes ${sign > 0 ? "negative" : "positive"}. Zero velocity at one instant does not mean that the oscillator stays at rest.`],
      `t=${time(earliest)} s; x=${sign * scale}/100 m; a=${-sign * scale * omega * omega}/100 m/s²; then ${sign > 0 ? "negative" : "positive"} motion.`);
  }
  if (variant === "window-count") {
    const toEighth = fromEighth + spanEighth, roots = [...new Set([2 * targetQuarter, mod(-2 * targetQuarter, 16)])];
    let count = 0;
    for (const root of roots) {
      const velocitySign = root === 0 || root === 8 ? 0 : root < 8 ? -1 : 1;
      if (filter !== 0 && velocitySign !== filter) continue;
      const base = root - 2 * phaseQuarter;
      const low = includeFrom ? Math.ceil((fromEighth - base) / 16) : Math.floor((fromEighth - base) / 16) + 1;
      const high = includeTo ? Math.floor((toEighth - base) / 16) : Math.ceil((toEighth - base) / 16) - 1;
      count += Math.max(0, high - low + 1);
    }
    const bounds = `${includeFrom ? "[" : "("}${fromEighth}pi/${8 * omega}, ${toEighth}pi/${8 * omega}${includeTo ? "]" : ")"}`;
    return finish(`The oscillator follows ${model}. Count distinct instants at x=(${scale}/100)*(${cosine[targetQuarter]}) m inside the time interval ${bounds} s. The left endpoint is ${includeFrom ? "included" : "excluded"}; the right endpoint is ${includeTo ? "included" : "excluded"}. ${filter === 0 ? "Count either motion direction and touches at turning points." : `Count only events with strictly ${filter > 0 ? "positive" : "negative"} velocity; a zero-velocity touch does not qualify.`} Coincident trigonometric branches describe one event, not two.`,
      [phs232Rational("count", "Number of qualifying distinct instants", String(count))],
      ["List both cosine phase branches, with full 2*pi turns. At ±A the two branches coincide.", "Convert the time interval into a phase interval by multiplying by omega and adding the initial phase. Preserve its open or closed ends.", "Apply the velocity filter, check each endpoint, and count each remaining instant only once."],
      [`The distinct phase residues, in units of pi/8, are ${roots.join(" and ")}. The phase interval endpoints in these units are ${2 * phaseQuarter + fromEighth} and ${2 * phaseQuarter + toEighth}.`, "Each surviving residue repeats every 16 of these phase units. The velocity is negative for residues between 0 and 8, positive between 8 and 16, and zero at 0 or 8.", `Applying the ${filter === 0 ? "all-direction" : filter > 0 ? "positive-velocity" : "negative-velocity"} filter and the stated endpoint rules leaves ${count} distinct events. An empty count can be correct even when the position is physically reachable outside the window.`],
      `${count} distinct qualifying instants.`);
  }
  if (variant === "state-recurrence") {
    if (stationary) return finish("A positive-mass, positive-stiffness ideal undamped oscillator starts at x=0 and v=0 with no drive. Compare the first strictly positive return time to its initial position and the first strictly positive return time to its complete state (x,v). Ask for a smallest positive time, not merely one possible repeating shift.",
      [choice("position", "Smallest positive position return", "none", [["none", "No smallest positive return time exists", "The constant zero position repeats after every positive time, so any proposed positive minimum has a smaller one."], ["natural", "One natural period", "The natural period is a valid repeating shift, but so is every smaller positive shift for this stationary state."], ["zero", "Zero seconds", "Zero is excluded by the request for a strictly positive time."]]), choice("state", "Smallest positive complete-state return", "none", [["none", "No smallest positive return time exists", "Both position and velocity stay zero. Every positive shift repeats the complete state."], ["half", "Half a natural period", "That shift repeats the state, but it is not the smallest positive one."], ["natural", "One natural period", "The natural period belongs to nonzero oscillations of the model; the equilibrium trajectory has no least positive period."]])],
      ["Use the initial conditions in x(t)=x0*cos(omega*t)+(v0/omega)*sin(omega*t).", "Both terms vanish for every t. The velocity also stays zero.", "If every positive time works, any proposed smallest one can be halved."],
      ["The unique trajectory is x(t)=v(t)=0 at all times.", "For any proposed positive return time r, r/2 also repeats both position and velocity. Neither return set has a least positive element.", "This does not erase the system's natural frequency: a nonzero perturbation would reveal that response."], "Neither return has a smallest positive time.");
    const firstPosition = Math.min(delay(mod(phaseQuarter)), delay(mod(-phaseQuarter))), same = firstPosition === 8;
    return finish(`The oscillator follows ${model}, with nonzero amplitude. Find the first strictly positive return to x(0) and the first strictly positive return to the complete initial state (x(0),v(0)). Does the first position return already reproduce the full state? Keep the original time origin.`,
      [phs232Pi("position", "First positive return to initial position", time(firstPosition), "s"), phs232Pi("state", "First positive return to initial position and velocity", time(8), "s"), choice("same", "Does the first position return reproduce the full state?", same ? "yes" : "no", [["yes", "Yes", "When the initial state is a displacement extreme, that position is reached only once per cycle and the return also has zero velocity."], ["no", "No", "At an interior position the earlier return has the opposite velocity. A full cycle is needed to recover both state coordinates."]])],
      ["Equal cosines can come from the original phase or its negative, modulo 2*pi.", "Velocity also depends on sine. Reversing the phase generally reverses velocity while keeping position.", "For nonzero amplitude the complete state traces an ellipse once per natural period. Check whether the initial state is a turning point."],
      [`The first strictly positive position recurrence follows a phase advance ${firstPosition}pi/4, giving ${time(firstPosition)} s.`, `Recovering both cosine and sine requires a full 2*pi advance, so the first complete-state return is T=${time(8)} s.`, same ? "The initial state is a turning point. The other cosine branch coincides with it, so there is no earlier position recurrence." : "The earlier position return lies on the other side of the phase-space ellipse and has the opposite velocity. It is not a full state recurrence."],
      `Position return=${time(firstPosition)} s; complete-state return=${time(8)} s; first position return is ${same ? "already" : "not"} the full state.`);
  }
  const remainder = mod(frequency, sampleRate), folded = Math.min(remainder, sampleRate - remainder), sampleIndex = mod(8 * frequency / sampleRate), alternative = frequency + aliasTurns * sampleRate;
  return finish(`A simulation has x(t)=(${scale}/100) cos(2*pi*${frequency}*t) m, where t is in seconds. Its recorder samples at t=n/${sampleRate} s for every integer n≥0, with no noise and the same time origin. Find the lowest nonnegative frequency among cosine signals A*cos(2*pi*g*t) with this same positive amplitude and zero phase that reproduce every recorded sample. Give the sample at n=1. Does the alternative frequency g=${alternative} Hz reproduce every sample, and do these samples alone identify the true physical frequency?`,
    [phs232Rational("alias", "Lowest nonnegative equivalent sampled frequency", String(folded), "Hz"), phs232Exact("sample", "Position recorded at n=1", `${scale}/100*(${cosine[sampleIndex]})`, "m"), choice("alternative", "Does the stated alternative match every sample?", "yes", [["yes", "Yes", "Adding an integer multiple of the sample rate adds an integer number of full phase turns at every sample."], ["no", "No", "A higher physical frequency can still produce exactly the same uniformly sampled positions. Evaluate the phase at n/sampleRate."]]), choice("unique", "Unique physical frequency from these samples alone?", "no", [["no", "No", "The unrestricted candidate set contains infinitely many aliases. A bandwidth bound or other information is needed for unique identification."], ["yes", "Yes", "The lowest folded frequency is a convenient representative, not proof of the underlying physical frequency."]])],
    ["At sample n, the phase is 2*pi*f*n/fs. Frequencies f+j*fs add 2*pi*j*n and leave every cosine sample unchanged.", "Cosine is even, so reflection from the remainder r to fs-r gives another equal sample sequence. Fold the remainder into [0,fs/2].", "Keep the actual simulation frequency distinct from what the sampled positions can identify. A folded value of zero means constant samples, not necessarily a stationary oscillator."],
    [`The remainder of ${frequency} Hz modulo ${sampleRate} Hz is ${remainder} Hz. Cosine's evenness gives lowest nonnegative representative min(${remainder},${sampleRate - remainder})=${folded} Hz.`, `At n=1 the phase is equivalent to ${sampleIndex}pi/4, so the recorded position is (${scale}/100)*(${cosine[sampleIndex]}) m.`, `The alternative ${alternative} Hz differs from ${frequency} Hz by ${aliasTurns} times the sampling rate. It therefore reproduces every sample, although its continuous trajectory has a different period.`, "The recorder alone cannot select the true frequency from these aliases. Changing its sampling rate changes the evidence, not the oscillator's equation of motion."],
    `Lowest alias=${folded} Hz; sample=(${scale}/100)*(${cosine[sampleIndex]}) m; alternative matches; physical frequency is not uniquely identified.`);
}
