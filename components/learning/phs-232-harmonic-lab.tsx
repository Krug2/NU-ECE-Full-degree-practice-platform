"use client";

import { useId, useState } from "react";
import { harmonicEvents, harmonicInputSchema, harmonicRun, type HarmonicActivity, type HarmonicInput } from "@/lib/learning/phs-232-harmonic";
import { approximateExact, parseExact, realExact } from "@/lib/learning/exact-number";
import { MathText } from "./math-text";
import "./phs-232.css";

const display = (n: number) => String(Number(n.toPrecision(7)));
const tick = (n: number) => n !== 0 && (Math.abs(n) < .01 || Math.abs(n) >= 10000) ? n.toExponential(1).replace(".0e", "e") : String(Number(n.toPrecision(3)));
const directions = { positive: "moving in +x", negative: "moving in −x", turning: "turning instant: velocity is zero", rest: "stationary equilibrium" };
type Run = ReturnType<typeof harmonicRun>;
type Filter = "either" | "positive" | "negative";
type Result = { input: HarmonicInput; run: Run; events: ReturnType<typeof harmonicEvents>; includeFrom: boolean; includeTo: boolean; filter: Filter };
const controls = [
  ["mass", "Mass (kg)", .05, 10, .05], ["stiffness", "Spring stiffness (N/m)", .05, 200, .05],
  ["position", "Initial position (m)", -.5, .5, .01], ["velocity", "Initial velocity (m/s)", -5, 5, .01],
  ["cycles", "Window length (natural periods)", .25, 6, .25], ["probeCycles", "Prediction time (natural periods from t=0)", 0, 6, .0625],
  ["targetFraction", "Target position as a fraction of amplitude", -1.25, 1.25, .05],
] as const;

function HarmonicPlots({ run }: { run: Run }) {
  const id = useId(), { model, trajectory, duration, probe } = run;
  const xTime = (time: number) => 90 + 285 * time / duration;
  return <div className="phs232-plots">
    {([ ["position", "Position", "m", model.amplitude], ["velocity", "Velocity", "m/s", model.maximumSpeed], ["acceleration", "Acceleration", "m/s²", model.omega ** 2 * model.amplitude] ] as const).map(([key, label, unit, magnitude]) => {
      const extent = magnitude || 1, y = (value: number) => 105 - 65 * value / extent;
      return <figure key={key}><svg viewBox="0 0 400 265" role="img" aria-labelledby={`${id}-${key}`}>
        <title id={`${id}-${key}`}>{`${label} versus time. At ${display(probe.time)} s: ${display(probe[key])} ${unit}. The complete model table provides every plotted state. ${key === "position" ? "Circles mark recorded position samples." : "This is a model derivative, not a recorder measurement."}`}</title>
        <path d="M90 35V180H385 M90 105H385" fill="none" stroke="#a1aba7"/>
        <text x="90" y="25">{label} ({unit})</text><text x="8" y="46">{tick(extent)}</text><text x="8" y="176">{tick(-extent)}</text><text x="8" y="111">0</text>
        <text x="87" y="215">0</text><text x="375" y="215" textAnchor="end">{tick(duration)}</text><text x="232" y="248" textAnchor="middle">Time (s)</text>
        <polyline points={trajectory.map(state => `${xTime(state.time)},${y(state[key])}`).join(" ")} fill="none" stroke="#176582" strokeWidth="2.5"/>
        {key === "position" && run.sampled.map((state, index) => <circle key={index} cx={xTime(state.time)} cy={y(state.position)} r="3" fill="#fff" stroke="#8c411e" strokeWidth="1.6"/>)}
        <line x1={xTime(probe.time)} x2={xTime(probe.time)} y1="35" y2="180" stroke="#293f36" strokeDasharray="4 3"/><circle cx={xTime(probe.time)} cy={y(probe[key])} r="4" fill="#293f36"/>
      </svg><figcaption>{label}: the dashed line locates the time probe. {key === "position" ? "The curve is the ideal model; outlined circles are the recorder's samples." : "The derivative is computed from the continuous model."}</figcaption></figure>;
    })}
    <figure><svg viewBox="0 0 400 265" role="img" aria-labelledby={`${id}-phase`}>
      <title id={`${id}-phase`}>{`Position–velocity phase plane. Probe position ${display(probe.position)} m; velocity ${display(probe.velocity)} m/s. ${model.amplitude ? "The state traverses the ellipse clockwise." : "The equilibrium state stays at the origin."} Model table gives both coordinates.`}</title>
      <path d="M90 105H385 M232.5 35V184" fill="none" stroke="#a1aba7"/>
      <text x="240" y="25">Velocity (m/s)</text><text x="240" y="46">{tick(model.maximumSpeed || 1)}</text><text x="240" y="176">{tick(-(model.maximumSpeed || 1))}</text>
      <text x="90" y="215">{tick(-(model.amplitude || 1))}</text><text x="375" y="215" textAnchor="end">{tick(model.amplitude || 1)}</text><text x="232" y="248" textAnchor="middle">Position (m)</text>
      <polyline points={trajectory.map(state => `${232.5 + 142.5 * state.position / (model.amplitude || 1)},${105 - 65 * state.velocity / (model.maximumSpeed || 1)}`).join(" ")} fill="none" stroke="#176582" strokeWidth="2.5"/>
      <circle cx={232.5 + 142.5 * probe.position / (model.amplitude || 1)} cy={105 - 65 * probe.velocity / (model.maximumSpeed || 1)} r="5" fill="#293f36"/>
    </svg><figcaption>Phase plane: x and v use separate labeled scales. The upper half has positive velocity; the lower half has negative velocity. A repeated position can have a different velocity. At zero amplitude the state is a single stationary point.</figcaption></figure>
  </div>;
}

function StateTable({ run }: { run: Run }) {
  return <div className="phs232-table" role="region" aria-label="Complete model state table; scroll horizontally if needed" tabIndex={0}><table>
    <caption>Every plotted model state; these are calculated values, not measurements</caption><thead><tr><th scope="col">Time (s)</th><th scope="col">x (m)</th><th scope="col">v (m/s)</th><th scope="col">a (m/s²)</th><th scope="col">Direction</th></tr></thead>
    <tbody>{run.trajectory.map((state, index) => <tr key={index}><th scope="row">{display(state.time)}</th><td>{display(state.position)}</td><td>{display(state.velocity)}</td><td>{display(state.acceleration)}</td><td>{directions[state.direction]}</td></tr>)}</tbody>
  </table></div>;
}

export function Phs232HarmonicLab({ activity }: { activity: HarmonicActivity }) {
  const id = useId(), initial = controls.map(([key]) => String(activity.initial[key]));
  const [values, setValues] = useState(initial), [sampleRate, setSampleRate] = useState(String(activity.initial.samplesPerPeriod));
  const [includeFrom, setIncludeFrom] = useState(false), [includeTo, setIncludeTo] = useState(true), [filter, setFilter] = useState<Filter>("either");
  const [predictions, setPredictions] = useState(["", "", ""]), [result, setResult] = useState<Result | null>(null), [message, setMessage] = useState("");
  const clear = () => { setResult(null); setMessage(""); };
  const check = () => {
    try {
      if (values.some(value => !value.trim())) throw Error("Complete each model input; an empty input is not zero.");
      const parsed = harmonicInputSchema.safeParse({ ...Object.fromEntries(controls.map(([key], index) => [key, Number(values[index])])), samplesPerPeriod: Number(sampleRate) });
      if (!parsed.success) throw Error("Use the labeled ranges, with positive mass and stiffness. The prediction time must be inside the chosen window.");
      if (predictions.some(value => !value.trim())) throw Error("Predict position, velocity and the qualifying event count before revealing the model.");
      const numerical = predictions.slice(0, 2).map(value => { const exact = parseExact(value); if (!realExact(exact)) throw Error("Position and velocity predictions must be real numbers."); return approximateExact(exact).real; });
      const all = predictions[2].trim().toLowerCase() === "all";
      let count = 0;
      if (!all) { const exact = parseExact(predictions[2]); count = approximateExact(exact).real; if (!realExact(exact) || !Number.isInteger(count) || count < 0) throw Error("Enter a nonnegative whole event count, or all for a position that holds throughout the interval."); }
      const run = harmonicRun(parsed.data), events = harmonicEvents(run.model, run.target, { from: 0, to: run.duration, includeFrom, includeTo, direction: filter });
      const missed = [Math.abs(numerical[0] - run.probe.position) <= 1e-6 ? "" : "position", Math.abs(numerical[1] - run.probe.velocity) <= 1e-6 ? "" : "velocity", (events.kind === "continuous" ? all : !all && count === events.events.length) ? "" : "event count"].filter(Boolean);
      setResult({ input: parsed.data, run, events, includeFrom, includeTo, filter });
      setMessage(missed.length ? `Revisit ${missed.join(", ")}. Position and velocity use different phase functions; event counts also depend on direction, both endpoints and coincident turning-point roots. Compare your reasoning with the tables.` : "Your state and event predictions agree with the model.");
    } catch (error) { setResult(null); setMessage(error instanceof Error ? error.message : "Check the inputs."); }
  };
  const moveProbe = (cycles: number) => {
    if (!result) return;
    const input = { ...result.input, probeCycles: Math.max(0, Math.min(result.input.cycles, cycles)) };
    setResult({ ...result, input, run: harmonicRun(input) });
    setMessage("Time probe moved. The original predictions apply to the prediction time above; the readout and plots now show the revealed probe time.");
  };
  return <div className="phs232-investigation"><p><MathText>{activity.prompt}</MathText></p>
    <p className="muted">Simulation: one ideal horizontal spring and point mass, displacement from equilibrium, +x to the right, no damping or drive. It models a linear restoring force over the entered range; no physical experiment or equipment is assigned. Changing recorder density leaves the continuous trajectory unchanged. Controls reset on reload; keep comparisons and predictions in the saved lesson notes.</p>
    <div className="phs232-controls">{controls.map(([key, label, min, max, step], index) => <div className="field" key={key}><label htmlFor={`${id}-${key}`}>{label}</label><input id={`${id}-${key}`} type="number" min={min} max={max} step={step} value={values[index]} onChange={event => { setValues(current => current.map((value, j) => j === index ? event.target.value : value)); clear(); }}/><small>Allowed: {min} to {max}{key === "probeCycles" ? "; no later than the window end" : ""}.</small></div>)}
      <div className="field"><label htmlFor={`${id}-samples`}>Recorded samples per natural period</label><select id={`${id}-samples`} value={sampleRate} onChange={event => { setSampleRate(event.target.value); clear(); }}>{[1, 2, 4, 8, 16, 32].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
      <div className="field"><label htmlFor={`${id}-filter`}>Qualifying event direction</label><select id={`${id}-filter`} value={filter} onChange={event => { setFilter(event.target.value as Filter); clear(); }}><option value="either">Either direction, including touches</option><option value="positive">Strictly positive velocity</option><option value="negative">Strictly negative velocity</option></select></div>
    </div>
    <div className="phs232-checks"><label><input type="checkbox" checked={includeFrom} onChange={event => { setIncludeFrom(event.target.checked); clear(); }}/> Include t=0 in the event window</label><label><input type="checkbox" checked={includeTo} onChange={event => { setIncludeTo(event.target.checked); clear(); }}/> Include the final instant in the event window</label></div>
    <fieldset className="phs232-predictions"><legend>Predict before revealing</legend><p>For position and velocity, use fractions, sqrt(...), or decimals within 0.000001 in the labeled unit. Count distinct qualifying event times over the entire chosen window. Enter all if every instant qualifies; zero-velocity touches do not pass a strict direction filter.</p><div className="phs232-controls">{["Predicted position at prediction time (m)", "Predicted velocity at prediction time (m/s)", "Predicted qualifying event count"].map((label, index) => <div className="field" key={label}><label htmlFor={`${id}-prediction-${index}`}>{label}</label><input id={`${id}-prediction-${index}`} maxLength={200} value={predictions[index]} onChange={event => { setPredictions(current => current.map((value, j) => j === index ? event.target.value : value)); clear(); }}/></div>)}</div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check harmonic predictions</button><button className="button secondary" onClick={() => { setValues(initial); setSampleRate(String(activity.initial.samplesPerPeriod)); setIncludeFrom(false); setIncludeTo(true); setFilter("either"); setPredictions(["", "", ""]); clear(); }}>Reset harmonic model</button></div>
    <p role="status" className="form-status">{message}</p>
    {result && <div className="notice">
      <p>Amplitude: <strong>{display(result.run.model.amplitude)} m</strong>; angular frequency: <strong>{display(result.run.model.omega)} rad/s</strong>; natural period: <strong>{display(result.run.model.naturalPeriod)} s</strong>; frequency: <strong>{display(result.run.model.frequency)} Hz</strong>. Principal phase: <strong>{result.run.model.phase === null ? "not identifiable at zero amplitude" : `${display(result.run.model.phase)} rad`}</strong>.</p>
      {result.run.model.amplitude === 0 && <p>The stationary trajectory has no least positive period. Its system still has the natural period above. A target entered as any fraction of zero amplitude is zero meters; use the direction filter to test whether stationary states count. The plots use display bounds of ±1 in each labeled unit to show the zero trajectory.</p>}
      <div className="field"><label htmlFor={`${id}-probe`}>Revealed time probe (natural periods): {display(result.input.probeCycles)}</label><input id={`${id}-probe`} type="range" min="0" max={result.input.cycles} step="any" value={result.input.probeCycles} aria-valuetext={`${display(result.input.probeCycles)} natural periods; ${display(result.run.probe.time)} seconds`} onChange={event => moveProbe(Number(event.target.value))} onKeyDown={event => {
        if (!["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault(); moveProbe(event.key === "Home" ? 0 : event.key === "End" ? result.input.cycles : result.input.probeCycles + (["ArrowLeft", "ArrowDown"].includes(event.key) ? -.0625 : .0625));
      }}/></div>
      <div className="form-actions"><button className="button secondary" onClick={() => moveProbe(result.input.probeCycles - .0625)}>Probe earlier by T/16</button><button className="button secondary" onClick={() => moveProbe(result.input.probeCycles + .0625)}>Probe later by T/16</button></div>
      <p>Use the slider’s arrow keys, Home and End, or the step buttons. Model parameters and event criteria stay fixed while the revealed probe moves.</p>
      <p className="phs232-probe" aria-live="polite">Probe at {display(result.run.probe.time)} s: x={display(result.run.probe.position)} m; v={display(result.run.probe.velocity)} m/s; a={display(result.run.probe.acceleration)} m/s²; {directions[result.run.probe.direction]}.</p>
      <HarmonicPlots run={result.run}/>
      <p>Target: {display(result.run.target)} m. Window: {result.includeFrom ? "[" : "("}0, {display(result.run.duration)}{result.includeTo ? "]" : ")"} s. Direction filter: {result.filter}. {result.events.kind === "continuous" ? "Every instant in this interval qualifies; there is no finite event list." : `Distinct qualifying instants: ${result.events.events.length}.`}</p>
      {result.events.kind === "none" && <p>No event qualifies. Check amplitude bounds, the direction filter and open endpoints before concluding that an event is physically impossible at every time.</p>}
      {result.events.events.length > 0 && <div className="phs232-table" role="region" aria-label="Qualifying event table; scroll horizontally if needed" tabIndex={0}><table><caption>All qualifying events in the requested window</caption><thead><tr><th scope="col">Time (s)</th><th scope="col">Position (m)</th><th scope="col">Velocity (m/s)</th><th scope="col">Motion</th></tr></thead><tbody>{result.events.events.map((event, i) => <tr key={i}><th scope="row">{display(event.time)}</th><td>{display(event.position)}</td><td>{display(event.velocity)}</td><td>{directions[event.direction]}</td></tr>)}</tbody></table></div>}
      <p>The recorder samples at {display(result.run.sampleRate)} Hz, or {result.input.samplesPerPeriod} samples per natural period. {result.input.samplesPerPeriod === 1 ? "Every recorded position repeats the initial position; this does not establish stationary motion." : result.input.samplesPerPeriod === 2 ? "Two samples per natural period can conceal phase and all motion when both samples fall at zero crossings." : "More samples show more of this known trajectory, but the samples alone do not rule out higher-frequency aliases without a bandwidth assumption."} No extra off-grid sample is added at the window end.</p>
      <details><summary>Recorded position table ({result.run.sampled.length} samples)</summary><div className="phs232-table" role="region" aria-label="Recorded position table; scroll horizontally if needed" tabIndex={0}><table><caption>Only positions are recorded; time and position contain no added noise</caption><thead><tr><th scope="col">Sample n</th><th scope="col">Time (s)</th><th scope="col">Recorded x (m)</th></tr></thead><tbody>{result.run.sampled.map((state, n) => <tr key={n}><th scope="row">{n}</th><td>{display(state.time)}</td><td>{display(state.position)}</td></tr>)}</tbody></table></div></details>
      <details><summary>Complete model table ({result.run.trajectory.length} states)</summary><StateTable run={result.run}/></details>
      <p>Displayed numbers are rounded; tiny residual values at exact zeros can come from floating-point arithmetic. The analytic trajectory sets these predictions; the recorder does not independently validate the force law.</p>
      <ol><li>Explain the signs of x, v and a at the initial probe. Move forward by T/4 and check your prediction on the phase plane.</li><li>Compare a return to x(0) with a return to both x(0) and v(0). Include and exclude t=0 and the final instant; explain each change in the event count.</li><li>Use target fractions 1, −1 and 1.1. Distinguish a turning-point touch, a direction-filtered crossing and an unreachable position.</li><li>Set one recorded sample per natural period while keeping the oscillator inputs. Explain why the constant recorded positions coexist with a moving model.</li><li>Set both initial conditions to zero. Explain the unidentifiable phase, the event count all, and the absence of a least positive trajectory period.</li></ol>
      <p>Record two contrasting runs in lesson notes: inputs with units, your prediction, the event criteria, the table evidence, a corrected explanation and one model limitation. A complete explanation distinguishes the ideal trajectory from what its sampled positions alone establish.</p>
      <details><summary>Investigation self-check rubric</summary><p>For each criterion, use 0 for missing or incorrect evidence, 1 for correct but incomplete evidence, and 2 when the complete description below is met. Revise any criterion below 2. This proposed self-check guides your notes; it does not award objective evidence or an official grade.</p><ol>
        <li><strong>Reproducible setup:</strong> both runs record mass, stiffness, initial state, units, time origin, event interval, direction filter and recorder density.</li>
        <li><strong>Prediction and verification:</strong> preserve both predictions, compare them with numerical state and event evidence, and check the force relation or phase-plane identity independently.</li>
        <li><strong>Event reasoning:</strong> explain a crossing versus a touch, each relevant endpoint choice, and why a repeated position may have a different velocity.</li>
        <li><strong>Interpretation and limits:</strong> explain the sparse-record ambiguity, distinguish measured samples from model derivatives, and name an assumption whose failure would require a different model.</li>
      </ol></details>
    </div>}
  </div>;
}
