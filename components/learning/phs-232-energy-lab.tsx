"use client";

import { useId, useState } from "react";
import { pendulumInputSchema, pendulumRun, type OscillatorEnergyActivity } from "@/lib/learning/phs-232-oscillator-energy";
import { approximateExact, parseExact, realExact } from "@/lib/learning/exact-number";
import { MathText } from "./math-text";
import "./phs-232.css";

type Run = ReturnType<typeof pendulumRun>;
const display = (n: number) => String(Number(n.toPrecision(8)));
const tick = (n: number) => n !== 0 && (Math.abs(n) < .01 || Math.abs(n) >= 10000) ? n.toExponential(1).replace(".0e", "e") : String(Number(n.toPrecision(3)));
const nullable = (n: number | null, unit = "") => n === null ? "not defined for this run" : `${display(n)}${unit ? ` ${unit}` : ""}`;
const controls = [
  ["mass", "Point mass (kg)", .05, 10, .05], ["length", "Rigid rod length (m)", .1, 5, .025],
  ["gravity", "Gravity (m/s²)", .1, 20, .1], ["amplitudeDegrees", "Release angle (degrees)", 0, 170, .1],
  ["cycles", "Window length (small-angle natural periods)", 1, 6, 1],
] as const;

function EnergyPlots({ run, probeIndex }: { run: Run; probeIndex: number }) {
  const id = useId(), probe = run.fine.states[probeIndex], x = (time: number) => 90 + 285 * time / run.duration;
  const angleExtent = run.model.amplitude || 1, y = (value: number) => 105 - 65 * value / angleExtent;
  const energyExtent = run.model.initialEnergy * 1.05 || 1, ye = (value: number) => 180 - 140 * value / energyExtent;
  return <div className="phs232-plots">
    <figure><svg viewBox="0 0 400 265" role="img" aria-labelledby={`${id}-angle`}>
      <title id={`${id}-angle`}>Nonlinear and linear pendulum angles versus time. Solid blue uses sine torque; dashed brown uses linear torque. Both use the refined time step. The paginated state table gives every plotted value.</title>
      <path d="M90 35V180H385 M90 105H385" fill="none" stroke="#a1aba7"/>
      <text x="90" y="25">Angle (rad)</text><text x="8" y="46">{tick(angleExtent)}</text><text x="8" y="111">0</text><text x="8" y="176">{tick(-angleExtent)}</text>
      <text x="87" y="215">0</text><text x="375" y="215" textAnchor="end">{tick(run.duration)}</text><text x="232" y="248" textAnchor="middle">Time (s)</text>
      <polyline points={run.fine.states.map(s => `${x(s.time)},${y(s.linearAngle)}`).join(" ")} fill="none" stroke="#8c411e" strokeWidth="2.5" strokeDasharray="6 4"/>
      <polyline points={run.fine.states.map(s => `${x(s.time)},${y(s.angle)}`).join(" ")} fill="none" stroke="#176582" strokeWidth="2.5"/>
      <line x1={x(probe.time)} x2={x(probe.time)} y1="35" y2="180" stroke="#293f36" strokeDasharray="2 3"/><circle cx={x(probe.time)} cy={y(probe.angle)} r="4" fill="#176582"/>
    </svg><figcaption>Angle: solid blue = nonlinear sine model; dashed brown = linear model. The dotted vertical line locates the probe. For zero release angle both trajectories remain at zero; display bounds then use ±1 rad.</figcaption></figure>
    <figure><svg viewBox="0 0 400 265" role="img" aria-labelledby={`${id}-energy`}>
      <title id={`${id}-energy`}>Nonlinear kinetic, potential and total energies versus time at the refined step. Kinetic is solid blue, potential dashed brown, total dotted green. The state table provides all three energies for both models.</title>
      <path d="M90 35V180H385" fill="none" stroke="#a1aba7"/>
      <text x="90" y="25">Energy (J)</text><text x="8" y="46">{tick(energyExtent)}</text><text x="8" y="186">0</text>
      <text x="87" y="215">0</text><text x="375" y="215" textAnchor="end">{tick(run.duration)}</text><text x="232" y="248" textAnchor="middle">Time (s)</text>
      <polyline points={run.fine.states.map(s => `${x(s.time)},${ye(s.kinetic)}`).join(" ")} fill="none" stroke="#176582" strokeWidth="2.5"/>
      <polyline points={run.fine.states.map(s => `${x(s.time)},${ye(s.potential)}`).join(" ")} fill="none" stroke="#8c411e" strokeWidth="2.5" strokeDasharray="6 4"/>
      <polyline points={run.fine.states.map(s => `${x(s.time)},${ye(s.energy)}`).join(" ")} fill="none" stroke="#293f36" strokeWidth="2.5" strokeDasharray="2 3"/>
      <line x1={x(probe.time)} x2={x(probe.time)} y1="35" y2="180" stroke="#293f36" strokeDasharray="2 3"/><circle cx={x(probe.time)} cy={ye(probe.kinetic)} r="4" fill="#176582"/>
    </svg><figcaption>Nonlinear energy: solid blue = K; dashed brown = U; dotted green = K+U. The near-horizontal total is a numerical conservation check. This vertical scale does not resolve tiny drift; use the drift table below.</figcaption></figure>
  </div>;
}

function StateTable({ run }: { run: Run }) {
  const id = useId(), [resolution, setResolution] = useState<"coarse" | "fine">("fine"), [page, setPage] = useState(0);
  const states = run[resolution].states, pages = Math.ceil(states.length / 64);
  return <details><summary>All model states and both energy accounts</summary><p>Each page contains at most 64 successive states; every computed state is available. Angles are radians and angular velocities are rad/s. All energies use zero at downward equilibrium within their own model. These are simulations, not measurements.</p>
    <div className="phs232-controls"><div className="field"><label htmlFor={`${id}-resolution`}>State table resolution</label><select id={`${id}-resolution`} value={resolution} onChange={e => { setResolution(e.target.value as "coarse" | "fine"); setPage(0); }}><option value="coarse">Coarse step</option><option value="fine">Refined step</option></select></div><div className="field"><label htmlFor={`${id}-page`}>State table page</label><select id={`${id}-page`} value={page} onChange={e => setPage(Number(e.target.value))}>{Array.from({ length: pages }, (_, i) => <option key={i} value={i}>{i + 1} of {pages}: states {64 * i}–{Math.min(states.length - 1, 64 * i + 63)}</option>)}</select></div></div>
    <div className="form-actions"><button className="button secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous state page</button><button className="button secondary" disabled={page === pages - 1} onClick={() => setPage(page + 1)}>Next state page</button></div>
    <div className="phs232-table" role="region" aria-label="Pendulum state table; scroll horizontally if needed" tabIndex={0}><table><caption>{resolution === "fine" ? "Refined" : "Coarse"} solution: {states.length} states; page {page + 1} of {pages}</caption><thead><tr><th scope="col">State</th><th scope="col">Time (s)</th><th scope="col">θ nonlinear</th><th scope="col">θ̇ nonlinear</th><th scope="col">θ linear</th><th scope="col">θ̇ linear</th><th scope="col">K nonlinear (J)</th><th scope="col">U nonlinear (J)</th><th scope="col">E nonlinear (J)</th><th scope="col">K linear (J)</th><th scope="col">U linear (J)</th><th scope="col">E linear (J)</th></tr></thead><tbody>{states.slice(page * 64, page * 64 + 64).map((s, i) => <tr key={page * 64 + i}><th scope="row">{page * 64 + i}</th>{[s.time, s.angle, s.angularVelocity, s.linearAngle, s.linearAngularVelocity, s.kinetic, s.potential, s.energy, s.linearKinetic, s.linearPotential, s.linearEnergy].map((value, j) => <td key={j}>{display(value)}</td>)}</tr>)}</tbody></table></div>
  </details>;
}

export function Phs232EnergyLab({ activity }: { activity: OscillatorEnergyActivity }) {
  const id = useId(), initial = controls.map(([key]) => String(activity.initial[key]));
  const [values, setValues] = useState(initial), [steps, setSteps] = useState(String(activity.initial.stepsPerPeriod));
  const [predictions, setPredictions] = useState(["", ""]), [periodPrediction, setPeriodPrediction] = useState("");
  const [run, setRun] = useState<Run | null>(null), [probeIndex, setProbeIndex] = useState(0), [message, setMessage] = useState("");
  const clear = () => { setRun(null); setProbeIndex(0); setMessage(""); };
  const check = () => {
    try {
      if (values.some(value => !value.trim())) throw Error("Complete every model input; an empty input is not zero.");
      const parsed = pendulumInputSchema.safeParse({ ...Object.fromEntries(controls.map(([key], i) => [key, Number(values[i])])), stepsPerPeriod: Number(steps) });
      if (!parsed.success) throw Error("Use the labeled ranges: positive mass, length and gravity; angle exactly 0 or 0.1 to 170 degrees; an integer window from 1 to 6.");
      if (predictions.some(value => !value.trim()) || !periodPrediction) throw Error("Predict the small-angle period, nonlinear release energy and period comparison before revealing.");
      const numbers = predictions.map(value => { const exact = parseExact(value); if (!realExact(exact)) throw Error("Predictions must be finite real numbers."); return approximateExact(exact).real; });
      if (numbers.some(value => !Number.isFinite(value))) throw Error("Predictions must be finite real numbers.");
      const result = pendulumRun(parsed.data), expectedComparison = result.model.amplitude === 0 ? "stationary" : "longer";
      const missed = [Math.abs(numbers[0] - result.model.linearPeriod) <= 1e-6 ? "" : "small-angle period", Math.abs(numbers[1] - result.model.initialEnergy) <= 1e-6 ? "" : "release energy", periodPrediction === expectedComparison ? "" : "period comparison"].filter(Boolean);
      setRun(result); setProbeIndex(0);
      setMessage(missed.length ? `Revisit ${missed.join(", ")}. T0=2*pi*sqrt(L/g); the nonlinear release energy is mgL(1-cos(theta0)). A nonzero finite-angle period exceeds T0; zero amplitude is stationary. Use the model and convergence tables to explain the differences.` : "Your predictions agree with the model. Now compare amplitude, step size and the two distinct error measures.");
    } catch (error) { setRun(null); setMessage(error instanceof Error ? error.message : "Check the inputs."); }
  };
  const probe = run?.fine.states[probeIndex];
  return <div className="phs232-investigation"><p><MathText>{activity.prompt}</MathText></p>
    <p className="muted">Simulation: a point mass on a massless rigid rod, pivoted without friction, released from rest at a positive angle from downward vertical. The rod can push or pull; this is not a flexible-string model. Gravity is uniform, with no drag or drive. Both models are integrated at each step size. Controls reset on reload; save your predictions and comparisons in lesson notes. No physical experiment or equipment is assigned.</p>
    <div className="phs232-controls">{controls.map(([key, label, min, max, step], i) => <div className="field" key={key}><label htmlFor={`${id}-${key}`}>{label}</label><input id={`${id}-${key}`} type="number" min={min} max={max} step={step} value={values[i]} onChange={e => { setValues(current => current.map((value, j) => j === i ? e.target.value : value)); clear(); }}/><small>{key === "amplitudeDegrees" ? "Allowed: exactly 0, or 0.1 to 170 degrees." : `Allowed: ${min} to ${max}${key === "cycles" ? ", whole numbers only" : ""}.`}</small></div>)}
      <div className="field"><label htmlFor={`${id}-steps`}>Coarse steps per small-angle period</label><select id={`${id}-steps`} value={steps} onChange={e => { setSteps(e.target.value); clear(); }}>{[32, 64, 128, 256].map(n => <option key={n} value={n}>{n}</option>)}</select><small>The refined solution uses twice this count over the same physical window.</small></div>
    </div>
    <fieldset className="phs232-predictions"><legend>Predict before revealing</legend><p>Use a calculator in radian mode after converting the release angle. Enter decimal predictions within 0.000001 in the labeled units; fractions and exact radicals are also accepted. The small-angle period is a system property even at zero amplitude.</p><div className="phs232-controls">{["Predicted small-angle period (s)", "Predicted nonlinear release energy (J)"].map((label, i) => <div className="field" key={label}><label htmlFor={`${id}-prediction-${i}`}>{label}</label><input id={`${id}-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={e => { setPredictions(current => current.map((value, j) => i === j ? e.target.value : value)); clear(); }}/></div>)}<div className="field"><label htmlFor={`${id}-comparison`}>Predicted nonlinear period compared with T0</label><select id={`${id}-comparison`} value={periodPrediction} onChange={e => { setPeriodPrediction(e.target.value); clear(); }}><option value="">Choose a prediction</option><option value="longer">Longer</option><option value="equal">Exactly equal for this nonzero motion</option><option value="shorter">Shorter</option><option value="stationary">Stationary: no least positive trajectory period</option></select></div></div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check pendulum predictions</button><button className="button secondary" onClick={() => { setValues(initial); setSteps(String(activity.initial.stepsPerPeriod)); setPredictions(["", ""]); setPeriodPrediction(""); clear(); }}>Reset pendulum model</button></div>
    <p role="status" className="form-status">{message}</p>
    {run && probe && <div className="notice">
      <p>Small-angle period T0: <strong>{display(run.model.linearPeriod)} s</strong>. Nonlinear reference period: <strong>{nullable(run.model.referencePeriod, "s")}</strong>. Window: <strong>{display(run.duration)} s</strong>. The window counts small-angle periods; it need not contain that many nonlinear cycles.</p>
      <p>Release-force discrepancy relative to the linear magnitude: <strong>{nullable(run.model.forceDifferenceRelativeToLinearPercent, "%")}</strong>. Nonlinear period increase relative to T0: <strong>{nullable(run.model.periodIncreasePercent, "%")}</strong>. These compare models, not numerical step sizes.</p>
      <p>Nonlinear initial energy: <strong>{display(run.model.initialEnergy)} J</strong>; linear initial energy: <strong>{display(run.model.initialLinearEnergy)} J</strong>. The same release angle gives different energies because mgL(1−cos θ) and mgLθ²/2 are different potentials. Track each model against its own initial energy.</p>
      {run.model.amplitude === 0 && <p>The state remains at equilibrium. No crossing period or least positive trajectory period exists. Relative energy drift and the release-force percentage have zero denominators and are not defined; absolute drift is zero.</p>}
      <div className="field"><label htmlFor={`${id}-probe`}>Pendulum time probe (refined state index): {probeIndex}</label><input id={`${id}-probe`} type="range" min="0" max={run.fine.states.length - 1} step="1" value={probeIndex} aria-valuetext={`State ${probeIndex}; ${display(probe.time)} seconds`} onChange={e => setProbeIndex(Number(e.target.value))}/></div>
      <div className="form-actions"><button className="button secondary" disabled={probeIndex === 0} onClick={() => setProbeIndex(probeIndex - 1)}>Previous refined state</button><button className="button secondary" disabled={probeIndex === run.fine.states.length - 1} onClick={() => setProbeIndex(probeIndex + 1)}>Next refined state</button></div>
      <p>Use the slider’s arrows, Home and End, or the state buttons. Each step selects a computed state; it does not alter the integration.</p>
      <p className="phs232-probe" aria-live="polite">Probe at {display(probe.time)} s: nonlinear θ={display(probe.angle)} rad, θ̇={display(probe.angularVelocity)} rad/s; linear θ={display(probe.linearAngle)} rad, θ̇={display(probe.linearAngularVelocity)} rad/s. Nonlinear K={display(probe.kinetic)} J, U={display(probe.potential)} J, E={display(probe.energy)} J. Linear K={display(probe.linearKinetic)} J, U={display(probe.linearPotential)} J, E={display(probe.linearEnergy)} J.</p>
      <EnergyPlots run={run} probeIndex={probeIndex}/>
      <div className="phs232-table" role="region" aria-label="Pendulum convergence table; scroll horizontally if needed" tabIndex={0}><table><caption>Same models and physical window, two step sizes</caption><thead><tr><th scope="col">Numerical measure</th><th scope="col">Coarse</th><th scope="col">Refined</th></tr></thead><tbody>
        <tr><th scope="row">Time step (s)</th><td>{display(run.coarse.step)}</td><td>{display(run.fine.step)}</td></tr>
        <tr><th scope="row">Nonlinear crossing period (s)</th><td>{nullable(run.coarse.periodEstimate)}</td><td>{nullable(run.fine.periodEstimate)}</td></tr>
        <tr><th scope="row">Signed period error versus nonlinear reference (%)</th><td>{nullable(run.coarse.periodErrorPercent)}</td><td>{nullable(run.fine.periodErrorPercent)}</td></tr>
        <tr><th scope="row">Maximum nonlinear absolute energy drift (J)</th><td>{display(run.coarse.energyDrift)}</td><td>{display(run.fine.energyDrift)}</td></tr>
        <tr><th scope="row">Maximum nonlinear relative energy drift (%)</th><td>{nullable(run.coarse.relativeEnergyDrift === null ? null : 100 * run.coarse.relativeEnergyDrift)}</td><td>{nullable(run.fine.relativeEnergyDrift === null ? null : 100 * run.fine.relativeEnergyDrift)}</td></tr>
        <tr><th scope="row">Maximum linear absolute energy drift (J)</th><td>{display(run.coarse.linearEnergyDrift)}</td><td>{display(run.fine.linearEnergyDrift)}</td></tr>
        <tr><th scope="row">Maximum linear relative energy drift (%)</th><td>{nullable(run.coarse.relativeLinearEnergyDrift === null ? null : 100 * run.coarse.relativeLinearEnergyDrift)}</td><td>{nullable(run.fine.relativeLinearEnergyDrift === null ? null : 100 * run.fine.relativeLinearEnergyDrift)}</td></tr>
      </tbody></table></div>
      <p>Maximum nonlinear angle difference at aligned coarse times: {display(run.maxAngleDifference)} rad. Refined minus coarse crossing period: {nullable(run.periodDifference, "s")}. Neither difference is a guaranteed error bound. Repeat with a finer step and check whether the quantity of interest settles.</p>
      <p>The reference period comes from the conserved-energy integral, evaluated to floating-point convergence by an arithmetic–geometric mean. Time trajectories use fourth-order Runge–Kutta integration; crossings use an interpolant within each step. A crossing period averages intervals between successive zero crossings with negative angular velocity. It needs at least two such crossings.</p>
      {run.fine.periodEstimate === null && run.model.amplitude > 0 && <p>Insufficient window for a crossing-period estimate. Extend the window to include at least two negative-velocity zero crossings; a missing estimate does not mean that this nonzero motion lacks a period.</p>}
      <details><summary>Zero-crossing evidence</summary><div className="phs232-table" role="region" aria-label="Pendulum crossing table; scroll horizontally if needed" tabIndex={0}><table><caption>All interpolated zero crossings; only negative-velocity crossings define the displayed period</caption><thead><tr><th scope="col">Resolution</th><th scope="col">Time (s)</th><th scope="col">Angular velocity direction</th></tr></thead><tbody>{(["coarse", "fine"] as const).flatMap(key => run[key].crossings.map((event, i) => <tr key={`${key}-${i}`}><th scope="row">{key === "fine" ? "Refined" : "Coarse"}</th><td>{display(event.time)}</td><td>{event.direction}</td></tr>))}</tbody></table>{run.fine.crossings.length === 0 && <p>No zero crossing is recorded in this window.</p>}</div></details>
      <StateTable run={run}/>
      <p>Numbers are rounded for display. Floating-point and step errors can create small nonzero drift in this conservative model; they are not evidence of physical friction. Energy conservation alone also does not guarantee correct phase timing.</p>
      <ol><li>Begin at 15°. Predict T0 and the nonlinear release energy. Compare the force and period percentages against a 1% criterion and explain why the decisions differ.</li><li>Repeat at 90° with the same mass, rod length, gravity, window and coarse step count. Locate where the two angle predictions separate and compare both models’ energy accounts.</li><li>At a fixed angle, compare coarse counts 32, 64 and 128. Record period estimates, reference error, absolute energy drift and aligned angle differences. Decide which reported digits are supported.</li><li>Double the mass only. Check unchanged angular motion and periods alongside doubled energies. Then change rod length and use T0 proportional to sqrt(L) to predict the change.</li><li>Use 170° and a one-T0 window. Explain the missing crossing estimate, then extend the window. Finally use zero release angle and distinguish its stationary state from the system’s natural period.</li></ol>
      <p>Save at least three contrasting runs and one step-refinement comparison in lesson notes: inputs with units, predictions, evidence from times and energies, an error calculation with its denominator, and a conclusion limited to this model.</p>
      <details><summary>Pendulum investigation self-check rubric</summary><p>For each criterion use 0 for missing or incorrect evidence, 1 for partially correct evidence, and 2 for the complete description below. Revise any criterion below 2. This proposed self-check does not award objective evidence or an official grade.</p><ol>
        <li><strong>Reproducible model:</strong> record mass, rigid rod length, gravity, release angle, rest initial condition, physical window and both step sizes; identify the rigid constraint and absence of damping.</li>
        <li><strong>Energy reasoning:</strong> calculate both initial energies, compare K+U with the correct initial value and show how mass scaling changes energy without changing angle timing.</li>
        <li><strong>Approximation decision:</strong> calculate force and period percentages with stated denominators and apply a stated tolerance separately to each.</li>
        <li><strong>Numerical evidence:</strong> compare at least two coarse resolutions, reference and crossing periods, energy drift and aligned angle differences; explain what the comparison cannot guarantee.</li>
        <li><strong>Limits and revision:</strong> explain the short-window and zero-amplitude cases, correct at least one initial prediction or justify it with evidence, and distinguish simulation evidence from a physical measurement.</li>
      </ol></details>
    </div>}
  </div>;
}
