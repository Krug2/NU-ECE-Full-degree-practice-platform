"use client";

import { useId, useState } from "react";
import { dampingInputSchema, dampingRun, type DampingActivity } from "@/lib/learning/phs-232-damping";
import { approximateExact, parseExact, realExact } from "@/lib/learning/exact-number";
import { MathText } from "./math-text";
import "./phs-232.css";

type Run = ReturnType<typeof dampingRun>;
const display = (n: number) => n !== 0 && (Math.abs(n) < .001 || Math.abs(n) > 1e6) ? n.toExponential(6) : String(Number(n.toPrecision(8)));
const tick = (n: number) => n !== 0 && (Math.abs(n) < .01 || Math.abs(n) >= 10000) ? n.toExponential(1).replace(".0e", "e") : String(Number(n.toPrecision(3)));
const timeText = (time: number | null) => time === null ? "not reached in this window" : `${display(time)} s`;
const regimeText: Record<string, string> = { undamped: "undamped", underdamped: "underdamped", critical: "critically damped", overdamped: "overdamped" };
const controls = [
  ["mass", "Mass (kg)", .05, 10, .05], ["stiffness", "Spring stiffness (N/m)", .05, 200, .05],
  ["dampingRatio", "Damping ratio zeta", 0, 3, .01], ["position", "Initial position (m)", -.5, .5, .001],
  ["velocity", "Initial velocity (m/s)", -5, 5, .01], ["cycles", "Window length (natural periods T0)", .25, 12, .25],
  ["bandFraction", "Joint band fraction of the initial state scale", .001, .5, .001],
] as const;

function DampingPlots({ run, probeIndex }: { run: Run; probeIndex: number }) {
  const id = useId(), states = run.fine.states, probe = states[probeIndex], x = (time: number) => 90 + 285 * time / run.duration;
  const scale = run.model.initialStateScale || 1, extent = 1.1 * scale, y = (value: number) => 105 - 65 * value / extent;
  const energyExtent = 1.05 * Math.max(run.model.initialEnergy, ...states.map(s => s.energy + s.dissipated)) || 1, ye = (value: number) => 180 - 140 * value / energyExtent;
  const px = (position: number) => 235 + 120 * position / scale, py = (velocity: number) => 110 - 70 * velocity / (run.model.omega * scale);
  return <div className="phs232-plots">
    <figure><svg viewBox="0 0 400 265" role="img" aria-labelledby={`${id}-position`}>
      <title id={`${id}-position`}>Displacement and bounding envelope versus time. Solid blue is displacement, dashed brown is the positive and negative envelope when defined, dotted green lines mark the position band. All exact sampled values are in the state table.</title>
      <defs><clipPath id={`${id}-clip`}><rect x="90" y="35" width="285" height="145"/></clipPath></defs>
      <path d="M90 35V180H385 M90 105H385" fill="none" stroke="#a1aba7"/><text x="90" y="25">Position (m)</text>
      <text x="8" y="46">{tick(extent)}</text><text x="8" y="111">0</text><text x="8" y="176">{tick(-extent)}</text><text x="87" y="215">0</text><text x="375" y="215" textAnchor="end">{tick(run.duration)}</text><text x="232" y="248" textAnchor="middle">Time (s)</text>
      <g clipPath={`url(#${id}-clip)`}>
        {[-1, 1].map(sign => <line key={`band-${sign}`} x1="90" x2="375" y1={y(sign * run.positionBand)} y2={y(sign * run.positionBand)} stroke="#293f36" strokeDasharray="2 3"/>)}
        {run.model.displacementEnvelope !== null && [-1, 1].map(sign => <polyline key={sign} points={states.map(s => `${x(s.time)},${y(sign * s.envelope!)}`).join(" ")} fill="none" stroke="#8c411e" strokeWidth="2" strokeDasharray="6 4"/>)}
        <polyline points={states.map(s => `${x(s.time)},${y(s.position)}`).join(" ")} fill="none" stroke="#176582" strokeWidth="2.5"/>
        <line x1={x(probe.time)} x2={x(probe.time)} y1="35" y2="180" stroke="#293f36" strokeDasharray="2 3"/><circle cx={x(probe.time)} cy={y(probe.position)} r="4" fill="#176582"/>
      </g>
    </svg><figcaption>Solid blue = x; dashed brown = ±R exp(−βt), when an oscillatory envelope is defined; horizontal dotted green = position band. The vertical scale uses the initial energy bound. Envelope segments outside that scale are clipped; their uncut values remain in the probe and table. The envelope need not pass through the true extrema.</figcaption></figure>
    <figure><svg viewBox="0 0 400 265" role="img" aria-labelledby={`${id}-phase`}>
      <title id={`${id}-phase`}>Normalized position and velocity. The solid blue curve shows the state trajectory. The green rectangle is the joint band. The table gives position and velocity; divide by the printed initial state scales to reproduce this plot.</title>
      <path d="M95 35V185H380 M95 110H380 M235 35V185" fill="none" stroke="#a1aba7"/><text x="95" y="25">v / (ω0 A*)</text>
      <text x="20" y="46">1</text><text x="20" y="116">0</text><text x="20" y="181">−1</text><text x="115" y="215" textAnchor="middle">−1</text><text x="235" y="215" textAnchor="middle">0</text><text x="355" y="215" textAnchor="middle">1</text><text x="232" y="248" textAnchor="middle">x / A*</text>
      <rect x={px(-run.positionBand)} y={py(run.velocityBand)} width={240 * run.positionBand / scale} height={140 * run.velocityBand / (run.model.omega * scale)} fill="#e9f1eb" stroke="#293f36" strokeDasharray="2 3"/>
      <polyline points={states.map(s => `${px(s.position)},${py(s.velocity)}`).join(" ")} fill="none" stroke="#176582" strokeWidth="2.5"/><circle cx={px(probe.position)} cy={py(probe.velocity)} r="4" fill="#8c411e"/>
    </svg><figcaption>Normalized phase plane: the joint band requires both coordinates inside the dotted rectangle, including its boundary. A* = sqrt(x0²+(v0/ω0)²). The probe dot locates the selected state. For a stationary run, a display scale of 1 m replaces zero A* and the state stays at the origin.</figcaption></figure>
    <figure><svg viewBox="0 0 400 265" role="img" aria-labelledby={`${id}-energy`}>
      <title id={`${id}-energy`}>Mechanical energy, integrated dissipated energy and their sum versus time. Blue solid is E, brown dashed is D, green dotted is E plus D. The sum should equal initial energy; the residual table resolves numerical departures.</title>
      <path d="M90 35V180H385" fill="none" stroke="#a1aba7"/><text x="90" y="25">Energy (J)</text><text x="8" y="46">{tick(energyExtent)}</text><text x="8" y="186">0</text><text x="87" y="215">0</text><text x="375" y="215" textAnchor="end">{tick(run.duration)}</text><text x="232" y="248" textAnchor="middle">Time (s)</text>
      <polyline points={states.map(s => `${x(s.time)},${ye(s.energy)}`).join(" ")} fill="none" stroke="#176582" strokeWidth="2.5"/>
      <polyline points={states.map(s => `${x(s.time)},${ye(s.dissipated)}`).join(" ")} fill="none" stroke="#8c411e" strokeWidth="2.5" strokeDasharray="6 4"/>
      <polyline points={states.map(s => `${x(s.time)},${ye(s.energy + s.dissipated)}`).join(" ")} fill="none" stroke="#293f36" strokeWidth="2.5" strokeDasharray="2 3"/>
      <line x1={x(probe.time)} x2={x(probe.time)} y1="35" y2="180" stroke="#293f36" strokeDasharray="2 3"/>
    </svg><figcaption>Solid blue = mechanical E; dashed brown = independently integrated transfer D to the viscous environment; dotted green = E+D. A changing E is physical dissipation in this model. A changing E+D is numerical balance error, resolved in the table below.</figcaption></figure>
  </div>;
}

function DampingStateTable({ run }: { run: Run }) {
  const id = useId(), [resolution, setResolution] = useState<"coarse" | "fine">("fine"), [page, setPage] = useState(0), states = run[resolution].states, pages = Math.ceil(states.length / 64);
  return <details><summary>All sampled states and energy transfers</summary><p>Every computed endpoint state is available, at both resolutions. D integrates b v² with Simpson quadrature using an additional midpoint evaluation in each interval. State coordinates come from the analytic solution. Display rounding does not determine the model&apos;s band classification.</p>
    <div className="phs232-controls"><div className="field"><label htmlFor={`${id}-resolution`}>Damping table resolution</label><select id={`${id}-resolution`} value={resolution} onChange={e => { setResolution(e.target.value as "coarse" | "fine"); setPage(0); }}><option value="coarse">Coarse</option><option value="fine">Refined</option></select></div><div className="field"><label htmlFor={`${id}-page`}>Damping table page</label><select id={`${id}-page`} value={page} onChange={e => setPage(Number(e.target.value))}>{Array.from({ length: pages }, (_, i) => <option key={i} value={i}>{i + 1} of {pages}: states {64 * i}–{Math.min(states.length - 1, 64 * i + 63)}</option>)}</select></div></div>
    <div className="form-actions"><button className="button secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous damping table page</button><button className="button secondary" disabled={page === pages - 1} onClick={() => setPage(page + 1)}>Next damping table page</button></div>
    <div className="phs232-table" role="region" aria-label="Damping state table; scroll horizontally if needed" tabIndex={0}><table><caption>{resolution === "fine" ? "Refined" : "Coarse"} record: {states.length} states; page {page + 1} of {pages}</caption><thead><tr>{["State", "Time (s)", "x (m)", "v (m/s)", "a (m/s²)", "K (J)", "U (J)", "E (J)", "b v² (W)", "D (J)", "E+D−E0 (J)", "Upper envelope (m)", "Joint band"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{states.slice(page * 64, page * 64 + 64).map((s, i) => <tr key={page * 64 + i}><th scope="row">{page * 64 + i}</th>{[s.time, s.position, s.velocity, s.acceleration, s.kinetic, s.potential, s.energy, s.dissipativePower, s.dissipated, s.balanceResidual].map((value, column) => <td key={column}>{display(value)}</td>)}<td>{s.envelope === null ? "not defined" : display(s.envelope)}</td><td>{s.inBand ? "inside" : "outside"}</td></tr>)}</tbody></table></div>
  </details>;
}

export function Phs232DampingLab({ activity }: { activity: DampingActivity }) {
  const id = useId(), initial = controls.map(([key]) => String(activity.initial[key]));
  const [values, setValues] = useState(initial), [intervals, setIntervals] = useState(String(activity.initial.intervals)), [predictions, setPredictions] = useState(["", ""]), [regime, setRegime] = useState("");
  const [run, setRun] = useState<Run | null>(null), [probeIndex, setProbeIndex] = useState(0), [message, setMessage] = useState("");
  const clear = () => { setRun(null); setProbeIndex(0); setMessage(""); };
  const check = () => {
    try {
      if (values.some(value => !value.trim())) throw Error("Complete every model input; an empty input is not zero.");
      const parsed = dampingInputSchema.safeParse({ ...Object.fromEntries(controls.map(([key], i) => [key, Number(values[i])])), intervals: Number(intervals) });
      if (!parsed.success) throw Error("Use the labeled input ranges. Initial position and velocity must each be zero or have magnitude at least 0.000001 in their labeled units.");
      if (predictions.some(value => !value.trim()) || !regime) throw Error("Predict beta, initial mechanical energy and the damping regime before revealing.");
      const numbers = predictions.map(value => { const exact = parseExact(value); if (!realExact(exact)) throw Error("Predictions must be finite real numbers."); return approximateExact(exact).real; });
      if (numbers.some(value => !Number.isFinite(value))) throw Error("Predictions must be finite real numbers.");
      const result = dampingRun(parsed.data), missed = [Math.abs(numbers[0] - result.model.beta) <= 1e-6 ? "" : "beta", Math.abs(numbers[1] - result.model.initialEnergy) <= 1e-6 ? "" : "initial energy", regime === result.model.regime ? "" : "damping regime"].filter(Boolean);
      setRun(result); setProbeIndex(0);
      setMessage(missed.length ? `Revisit ${missed.join(", ")}. beta=zeta*sqrt(k/m), E0=(m*v0²+k*x0²)/2, and the regime follows zeta relative to zero and one. Use the state, event and energy evidence below to revise your predictions.` : "Your predictions agree with the model. Now distinguish true extrema, sampled band behavior and the sufficient future energy bound.");
    } catch (error) { setRun(null); setMessage(error instanceof Error ? error.message : "Check the inputs."); }
  };
  const probe = run?.fine.states[probeIndex];
  return <div className="phs232-investigation"><p><MathText>{activity.prompt}</MathText></p>
    <p className="muted">Simulation: one positive mass, a linear spring and viscous force −bv about a fixed equilibrium; no driving force or changing parameters. The control zeta sets b=2*zeta*sqrt(mk), in kg/s. Initial position and velocity are independent inputs. Controls reset on reload; save reproducible runs and conclusions in lesson notes. No physical experiment or equipment is assigned.</p>
    <div className="phs232-controls">{controls.map(([key, label, min, max, step], i) => <div className="field" key={key}><label htmlFor={`${id}-${key}`}>{label}</label><input id={`${id}-${key}`} type="number" min={min} max={max} step={step} value={values[i]} onChange={e => { setValues(current => current.map((value, j) => j === i ? e.target.value : value)); clear(); }}/><small>Allowed: {min} to {max}.{key === "position" || key === "velocity" ? " Use exactly zero or magnitude at least 0.000001." : ""}</small></div>)}
      <div className="field"><label htmlFor={`${id}-intervals`}>Coarse intervals across the window</label><select id={`${id}-intervals`} value={intervals} onChange={e => { setIntervals(e.target.value); clear(); }}>{[64, 128, 256, 512].map(value => <option key={value} value={value}>{value}</option>)}</select><small>The refined record uses twice as many intervals in the same physical window.</small></div>
    </div>
    <fieldset className="phs232-predictions"><legend>Predict before revealing</legend><p>Calculate beta and E0 in the labeled units. Decimal answers within 0.000001, fractions and supported exact radicals are accepted. Classify the equation even when the initial state is stationary.</p><div className="phs232-controls">{["Predicted beta (1/s)", "Predicted initial mechanical energy (J)"].map((label, i) => <div className="field" key={label}><label htmlFor={`${id}-prediction-${i}`}>{label}</label><input id={`${id}-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={e => { setPredictions(current => current.map((value, j) => i === j ? e.target.value : value)); clear(); }}/></div>)}<div className="field"><label htmlFor={`${id}-regime`}>Predicted damping regime</label><select id={`${id}-regime`} value={regime} onChange={e => { setRegime(e.target.value); clear(); }}><option value="">Choose a prediction</option>{Object.entries(regimeText).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check damping predictions</button><button className="button secondary" onClick={() => { setValues(initial); setIntervals(String(activity.initial.intervals)); setPredictions(["", ""]); setRegime(""); clear(); }}>Reset damping model</button></div>
    <p className="form-status" role="status">{message}</p>
    {run && probe && <div className="notice">
      <p>Equation regime: <strong>{regimeText[run.model.regime]}</strong>. omega0={display(run.model.omega)} rad/s; beta={display(run.model.beta)} 1/s; b={display(run.model.dampingCoefficient)} kg/s; T0={display(run.model.naturalPeriod)} s. Window: {display(run.duration)} s. This window counts natural reference periods, not necessarily cycles of the actual response.</p>
      <p>{run.model.dampedFrequency === null ? run.model.regime === "critical" ? `Repeated characteristic rate: −${display(run.model.beta)} 1/s. The general response includes t times the exponential. No oscillatory phase period is defined.` : `Characteristic rates: ${display(run.model.slowRoot!)} and ${display(run.model.fastRoot!)} 1/s. No oscillatory phase period is defined.` : `Oscillation parameter omega_d=${display(run.model.dampedFrequency)} rad/s; phase period T_d=${display(run.model.dampedPeriod!)} s. With positive damping this is not a period of the complete decaying state.`}</p>
      <p>Initial mechanical energy: {display(run.model.initialEnergy)} J. A*={display(run.model.initialStateScale)} m. The joint band is |x|≤{display(run.positionBand)} m AND |v|≤{display(run.velocityBand)} m/s, including equality. Both bounds scale from the same initial state; changing that state also changes these relative bands.</p>
      {run.model.stationary && <p>Both initial coordinates are zero: the state remains at equilibrium for every time. The displacement is continuously zero; there are no isolated crossings or extrema. The band and energy threshold are zero, and containment is immediate. System parameters still exist; a least positive trajectory period does not.</p>}
      <div className="field"><label htmlFor={`${id}-probe`}>Damping time probe (refined state index): {probeIndex}</label><input id={`${id}-probe`} type="range" min="0" max={run.fine.states.length - 1} step="1" value={probeIndex} aria-valuetext={`State ${probeIndex}; ${display(probe.time)} seconds`} onChange={e => setProbeIndex(Number(e.target.value))}/></div>
      <div className="form-actions"><button className="button secondary" disabled={probeIndex === 0} onClick={() => setProbeIndex(probeIndex - 1)}>Previous damping state</button><button className="button secondary" disabled={probeIndex === run.fine.states.length - 1} onClick={() => setProbeIndex(probeIndex + 1)}>Next damping state</button></div>
      <p>Use the slider&apos;s arrows, Home and End, or the state buttons. The line segments join sampled analytic states; a coarse display can miss a short transient. The event table is computed separately from the analytic roots.</p>
      <p className="phs232-probe" aria-live="polite">Probe at {display(probe.time)} s: x={display(probe.position)} m; v={display(probe.velocity)} m/s; a={display(probe.acceleration)} m/s². K={display(probe.kinetic)} J; U={display(probe.potential)} J; E={display(probe.energy)} J; transfer rate={display(probe.dissipativePower)} W; D={display(probe.dissipated)} J; E+D−E0={display(probe.balanceResidual)} J. Upper envelope: {probe.envelope === null ? "not defined" : `${display(probe.envelope)} m`}. Joint band: {probe.inBand ? "inside" : "outside"}.</p>
      <DampingPlots run={run} probeIndex={probeIndex}/>
      <div className="phs232-table" role="region" aria-label="Damping evidence table; scroll horizontally if needed" tabIndex={0}><table><caption>Two sample resolutions and independent power quadrature</caption><thead><tr><th scope="col">Measure</th><th scope="col">Coarse</th><th scope="col">Refined</th></tr></thead><tbody>
        <tr><th scope="row">Time step (s)</th><td>{display(run.coarse.step)}</td><td>{display(run.fine.step)}</td></tr>
        <tr><th scope="row">First sampled entry into both bands</th><td>{timeText(run.coarse.firstInBand)}</td><td>{timeText(run.fine.firstInBand)}</td></tr>
        <tr><th scope="row">Start of final all-in-band sample sequence</th><td>{timeText(run.coarse.sampledRemainderSince)}</td><td>{timeText(run.fine.sampledRemainderSince)}</td></tr>
        <tr><th scope="row">Transferred energy at window end (J)</th><td>{display(run.coarse.states.at(-1)!.dissipated)}</td><td>{display(run.fine.states.at(-1)!.dissipated)}</td></tr>
        <tr><th scope="row">Maximum |E+D−E0| (J)</th><td>{display(run.coarse.maxBalanceResidual)}</td><td>{display(run.fine.maxBalanceResidual)}</td></tr>
      </tbody></table></div>
      <p>Largest coarse/refined transfer difference at aligned times: {display(run.maxDissipationDifference)} J. These comparisons estimate numerical sensitivity, not guaranteed error bounds. E comes from the analytic state while D integrates the power independently; D is not defined as E0−E.</p>
      {run.model.initialEnergy > 0 && run.fine.maxBalanceResidual / run.model.initialEnergy > .001 && <p>The refined energy residual exceeds 0.1% of E0. Refine the intervals or shorten the window before trusting these transfer digits. This is a proposed numerical diagnostic, not an official tolerance or a physical energy source.</p>}
      <p>Energy sufficient condition: E≤{display(run.energyThreshold)} J implies both bands hold for all later times in this autonomous model, since E is nonincreasing. Estimated first time meeting this condition: <strong>{timeText(run.energySufficientSince)}</strong>. The condition uses min(k*xBand²/2, m*vBand²/2). It may certify later than the true last exit. Neither first sampled entry nor the final passing sample sequence proves permanent continuous-time settling.</p>
      <details><summary>Analytic crossing and extremum evidence</summary><p>Events include both ends of the window when a root occurs there. Extrema satisfy v=0; displacement zeros satisfy x=0. An initial extremum is included, while a stationary trajectory has no isolated events. Event times use analytic equations, independently of the displayed sample spacing.</p>
        {run.events.zeros.kind === "continuous" ? <p>Displacement is zero continuously.</p> : <div className="phs232-table" role="region" aria-label="Damping zero times; scroll horizontally if needed" tabIndex={0}><table><caption>All isolated displacement zeros in the window</caption><thead><tr><th scope="col">Event</th><th scope="col">Time (s)</th></tr></thead><tbody>{run.events.zeros.times.map((time, i) => <tr key={i}><th scope="row">{i + 1}</th><td>{display(time)}</td></tr>)}</tbody></table>{run.events.zeros.times.length === 0 && <p>No isolated displacement zero occurs in this window.</p>}</div>}
        <div className="phs232-table" role="region" aria-label="Damping extrema; scroll horizontally if needed" tabIndex={0}><table><caption>All isolated displacement extrema in the window</caption><thead><tr><th scope="col">Kind</th><th scope="col">Time (s)</th><th scope="col">Position (m)</th></tr></thead><tbody>{run.events.peaks.map((event, i) => <tr key={i}><th scope="row">{event.kind}</th><td>{display(event.time)}</td><td>{display(event.position)}</td></tr>)}</tbody></table>{run.events.peaks.length === 0 && <p>No isolated extremum occurs in this window.</p>}</div>
      </details>
      <DampingStateTable run={run}/>
      <p>All numbers are floating-point calculations rounded for display; 1e-6 means 0.000001 in the labeled unit. A displayed zero at a very late time can reflect numerical rounding or underflow, not arrival at exact equilibrium in finite time. No instrument uncertainty is attached to these simulated states; physical peak fitting needs a separate measurement model.</p>
      <ol><li>Use the initial displaced release. Compare the first two positive maxima, estimate beta from their logarithmic ratio, and compare the true extrema with the envelope values at the same times.</li><li>Keep the initial state, mass, stiffness, window and bands fixed. Compare zeta=0, 0.2, 1 and 2. Distinguish oscillatory phase, a complete-state period, and the sampled and energy-based containment times.</li><li>Set mass=1 kg, stiffness=25 N/m, zeta=1, x0=0.08 m and v0=−0.8 m/s. Predict the single equilibrium crossing from x=(0.08−0.4t) exp(−5t). Confirm that critical damping does not prohibit this crossing.</li><li>Set mass=1 kg, stiffness=25 N/m, zeta=0.05, x0=0.08 m, v0=0, band fraction=0.2 and window=6 T0. Compare first sampled entry, the final passing sample sequence and the energy sufficient time. Refine 64 to 128 to 256 coarse intervals and report what changes.</li><li>Try zeta=0.9999 and 1.0001 with the same initial state, then zero position and velocity. Explain continuity near critical damping and the stationary exception. Changing the initial state also changes relative bands, so it is not a fair fixed-band settling comparison.</li></ol>
      <p>Save at least four contrasting runs, the crossing counterexample and one refinement comparison in lesson notes. Include inputs and units, predictions, actual peak or band evidence, energy residuals and a conclusion restricted to the stated model.</p>
      <details><summary>Damping investigation self-check rubric</summary><p>Use 0 for missing or incorrect evidence, 1 for partial evidence and 2 for each complete criterion below. Revise every criterion below 2. This proposed self-check is not an official grade and does not award objective evidence.</p><ol>
        <li><strong>Reproducible conditions:</strong> record both initial coordinates, mass, stiffness, zeta and b, window, intervals and both dimensional bands; preserve common conditions in a comparison.</li>
        <li><strong>Response and events:</strong> identify all four regimes, recover beta from same-sign peaks and explain the critical crossing counterexample using both initial conditions.</li>
        <li><strong>Energy account:</strong> show E′=−bv², separate energy transfer from power and numerical residual, and compare independently integrated D at two resolutions.</li>
        <li><strong>Settling evidence:</strong> distinguish first entry, a final sampled sequence and a sufficient future bound; do not claim an exact last-exit time or universal fastest response.</li>
        <li><strong>Limits and revision:</strong> explain the stationary and near-critical cases, support or revise a prediction with evidence, and distinguish a simulation from measured behavior.</li>
      </ol></details>
    </div>}
  </div>;
}
