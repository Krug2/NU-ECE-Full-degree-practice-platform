"use client";

import { useId, useState } from "react";
import { standingModeInputSchema, standingModePoint, standingModeRun, type StandingModeInput } from "@/lib/learning/phs-232-standing-modes";
import { ModeNumbers, ModePlot, ModeProbe, ModeTable, modeClose, modeDisplay as display, modeNumbers, modePrediction, modePredictionHelp } from "./phs-232-mode-evidence";
import styles from "./phs-232-mode-evidence.module.css";

const controls = [
  ["tension", "Mode tension (N)", .1, 100, .1], ["density", "Mode density (kg/m)", .001, 2, .001], ["length", "String length L (m)", .25, 10, .25],
  ["amplitude", "Total antinode amplitude B (m)", 0, .1, .001], ["mode", "Positive mode index n", 1, 8, 1],
] as const;
type Run = ReturnType<typeof standingModeRun>;
const headings = ["Row", "x (m)", "t (s)", "y (m)", "y_t (m/s)", "y_x", "y_tt (m/s²)", "K/length (J/m)", "U/length (J/m)", "P toward +x (W)", "Rightward y (m)", "Leftward y (m)"];
const row = (r: ReturnType<typeof standingModePoint>, i: number) => [i, r.position, r.time, r.displacement, r.velocity, r.slope, r.acceleration, r.kinetic, r.potential, r.power, r.rightward, r.leftward];
function StandingResults({ run }: { run: Run }) {
  const id = useId(), [positionIndex, setPositionIndex] = useState(128), [timeIndex, setTimeIndex] = useState(0), [location, setLocation] = useState("grid"), [resolution, setResolution] = useState("fine");
  const p = run.model, time = p.period * timeIndex / 256;
  const position = location.startsWith("node-") ? p.shapeNodes[Number(location.slice(5))] : location.startsWith("antinode-") ? p.shapeAntinodes[Number(location.slice(9))] : p.length * positionIndex / 256;
  const snapshot = Array.from({ length: 257 }, (_, i) => standingModePoint(p, p.length * i / 256, time));
  const history = Array.from({ length: 257 }, (_, i) => standingModePoint(p, position, p.period * i / 256)), probe = history[timeIndex];
  const scale = 1.1 * p.amplitude || .01, velocityScale = 1.1 * p.amplitude * p.omega || .01, energyScale = 1.1 * p.totalEnergy || .001;
  const energyRows = resolution === "fine" ? run.fine : run.coarse, left = standingModePoint(p, 0, time), right = standingModePoint(p, p.length, time);
  return <div className={styles.results}><h4>Finite-string mode evidence</h4>
    <p data-testid="standing-summary">Mode n={p.mode}; right endpoint={p.rightBoundary}; c={display(p.speed)} m/s; frequency={display(p.frequency)} Hz; wavelength={display(p.wavelength)} m; period={display(p.period)} s; maximum slope={display(p.maximumSlope)}. Total antinode amplitude B={display(p.amplitude)} m; each traveling constituent has amplitude B/2.</p>
    <p>{p.atRest ? "B=0 makes every point stationary. The listed nodes and spectrum describe the chosen mathematical mode shape; no nontrivial oscillation is observed." : "The selected nontrivial mode has " + (p.mode - 1) + " internal displacement nodes. A fixed endpoint is a node, while the free endpoint is an antinode."}</p>
    <ModeTable label="Allowed string spectrum" headings={["Mode n", "Harmonic number", "Frequency (Hz)", "Wavelength (m)", "Internal nodes"]} rows={p.spectrum.map(r => [r.mode, r.harmonic, r.frequency, r.wavelength, r.internalNodes])}/>
    <div className="phs232-controls"><div className="field"><label htmlFor={id + "-location"}>Exact mode-shape probe location</label><select id={id + "-location"} value={location} onChange={e => setLocation(e.target.value)}><option value="grid">Position-grid probe</option>{p.shapeNodes.map((x, i) => <option key={"n" + i} value={"node-" + i}>Node {i}: {display(x)} m</option>)}{p.shapeAntinodes.map((x, i) => <option key={"a" + i} value={"antinode-" + i}>Antinode {i + 1}: {display(x)} m</option>)}</select></div>
      <ModeProbe label="Standing position grid index" value={positionIndex} max={256} change={value => { setPositionIndex(value); setLocation("grid"); }}/><ModeProbe label="Standing time index" value={timeIndex} max={256} change={setTimeIndex}/></div>
    <p>The dropdown probes exact mode-shape locations, including nodes between grid samples. Moving the position slider returns to its 257-point grid. Arrow/Home/End keys and step buttons work on both sliders. Time index 64 is one quarter period, when this mode has zero displacement everywhere.</p>
    <p data-testid="standing-probe">At x={display(position)} m, t={display(time)} s: y={display(probe.displacement)} m; y_t={display(probe.velocity)} m/s; slope={display(probe.slope)}; acceleration={display(probe.acceleration)} m/s²; K/length={display(probe.kinetic)} J/m; U/length={display(probe.potential)} J/m; instantaneous P={display(probe.power)} W. Whole-string K={display(run.fine[timeIndex].kinetic)} J and U={display(run.fine[timeIndex].potential)} J.</p>
    <div className={styles.plots}>
      <ModePlot title="Finite-string displacement with local positive and negative mode-shape bounds, permanent shape nodes and the selected probe. Full values are in the spatial table." xLabel="Position x (m)" yLabel="Displacement (m)" domain={[0, p.length]} extent={[-scale, scale]} traces={[
        { points: snapshot.map(r => [r.position, r.displacement]), color: "#176582" }, { points: snapshot.map(r => [r.position, r.envelope]), color: "#8c411e", dash: "4 4" }, { points: snapshot.map(r => [r.position, -r.envelope]), color: "#8c411e", dash: "4 4" },
      ]} verticals={p.shapeNodes} markers={[[position, probe.displacement]]} caption="Solid blue = displacement; dashed brown = local magnitude bounds; vertical dotted lines = mode-shape nodes. At an all-zero frame, the bounds still distinguish permanent nodes from moving points. Vertical scale is exaggerated."/>
      <ModePlot title="Displacement history at the selected exact or grid position over one period." xLabel="Time (s)" yLabel="Local y (m)" domain={[0, p.period]} extent={[-scale, scale]} traces={[{ points: history.map(r => [r.time, r.displacement]), color: "#176582" }]} verticals={[time]} markers={[[time, probe.displacement]]} caption="At a permanent node this curve remains zero throughout the period. At an antinode it crosses zero with maximum speed; one frame cannot establish a node."/>
      <ModePlot title="Transverse velocity history at the same material point. Units differ from the displacement plot and every value is in the time table." xLabel="Time (s)" yLabel="Velocity (m/s)" domain={[0, p.period]} extent={[-velocityScale, velocityScale]} traces={[{ points: history.map(r => [r.time, r.velocity]), color: "#8c411e", dash: "7 4" }]} verticals={[time]} markers={[[time, probe.velocity]]} caption="Velocity is a separate derivative with its own units and scale. Compare it at the quarter-period all-zero displacement frame and at a permanent node."/>
      <ModePlot title="Separately integrated whole-string kinetic and stretch energy and their sum throughout one period. Complete coarse and refined records are available." xLabel="Time (s)" yLabel="Energy (J)" domain={[0, p.period]} extent={[0, energyScale]} traces={[
        { points: run.fine.map(r => [r.time, r.kinetic]), color: "#176582" }, { points: run.fine.map(r => [r.time, r.potential]), color: "#8c411e", dash: "7 4" }, { points: run.fine.map(r => [r.time, r.total]), color: "#23574d", dash: "8 3 2 3" },
      ]} verticals={[time]} caption="Solid blue = integrated kinetic energy; dashed brown = integrated stretch energy; dot-dash green = their sum. Total energy stays constant because endpoint power is zero, even while energy moves between interior regions."/>
    </div>
    <ModeTable label="Mode endpoint evidence" headings={["Endpoint", "x (m)", "y (m)", "y_t (m/s)", "y_x", "F_T*y_x (N)", "P toward +x (W)"]} rows={[["left fixed", 0, left.displacement, left.velocity, left.slope, p.tension * left.slope, left.power], ["right " + p.rightBoundary, p.length, right.displacement, right.velocity, right.slope, p.tension * right.slope, right.power]]}/>
    <p data-testid="standing-energy">Analytic total E={display(p.totalEnergy)} J. Largest coarse energy residual={display(run.coarseResidual)} J; refined residual={display(run.fineResidual)} J; largest K or U refinement difference={display(run.difference)} J. Each traveling constituent has mean-power magnitude {display(p.constituentMeanPower)} W, with opposite signs and zero net mean.</p>
    <p>K and U are separately integrated in space from the local derivatives using 128 and 256 Simpson panels. These resolved sinusoidal modes can integrate to nearly the same value on both grids; tiny differences may be roundoff, not a physical uncertainty estimate. A single traveling wave&apos;s pointwise K=U identity does not apply to this standing field.</p>
    <details><summary>All standing-mode spatial states</summary><ModeTable label="Standing snapshot" headings={headings} rows={snapshot.map(row)}/></details>
    <details><summary>All standing-mode local time states</summary><ModeTable label="Standing time history" headings={headings} rows={history.map(row)}/></details>
    <details><summary>All standing-mode energy records</summary><div className="field"><label htmlFor={id + "-resolution"}>Standing energy spatial resolution</label><select id={id + "-resolution"} value={resolution} onChange={e => setResolution(e.target.value)}><option value="coarse">128 spatial panels</option><option value="fine">256 spatial panels</option></select></div><ModeTable label="Standing energy ledger" headings={["Row", "t (s)", "K (J)", "U (J)", "K+U (J)", "Total minus analytic E (J)"]} rows={energyRows.map(r => [r.index, r.time, r.kinetic, r.potential, r.total, r.residual])}/></details>
    <ol><li>Keep the medium and length fixed while comparing two fixed endpoints with a fixed-free string. Record both fundamental frequencies and distinguish mode index from harmonic number.</li><li>Select an exact internal node and an antinode. Compare their displacement and velocity histories, especially time index 64.</li><li>Check the applicable endpoint condition at several times. A fixed endpoint can exert force while doing no work; a free endpoint can move while its transverse force is zero.</li><li>Compare local K/U with the whole-string account, and record the independent quadrature residuals. Explain why an all-zero displacement frame still has energy.</li></ol>
  </div>;
}

export function Phs232StandingPanel({ initial }: { initial: StandingModeInput }) {
  const id = useId(), [values, setValues] = useState(controls.map(([key]) => String(initial[key]))), [boundary, setBoundary] = useState(initial.rightBoundary);
  const [frequency, setFrequency] = useState(""), [nodes, setNodes] = useState(""), [condition, setCondition] = useState(""), [message, setMessage] = useState(""), [run, setRun] = useState<Run | null>(null), [generation, setGeneration] = useState(0);
  const clear = () => { setRun(null); setMessage(""); setFrequency(""); setNodes(""); setCondition(""); };
  const reveal = () => {
    try {
      const parsed = standingModeInputSchema.safeParse({ ...modeNumbers(controls, values), rightBoundary: boundary });
      if (!parsed.success) throw Error("Use the labeled ranges, an integer mode index from 1 to 8 and maximum slope B*k at most 0.2.");
      if (!condition) throw Error("Predict the right-end condition before revealing.");
      const f = modePrediction(frequency), count = modePrediction(nodes), result = standingModeRun(parsed.data), p = result.model;
      const missed = [modeClose(f, p.frequency) ? "" : "allowed frequency", count === p.mode - 1 ? "" : "internal mode-shape node count", condition === boundary ? "" : "right-end condition"].filter(Boolean);
      setRun(result); setGeneration(generation + 1);
      setMessage(missed.length ? "Revisit " + missed.join(", ") + ". Apply the displacement condition at a fixed end and the slope condition at a free end. Count internal nodes separately from endpoints; mixed-boundary harmonic number is 2*n-1." : "Your predictions agree. Probe exact shape nodes and the all-zero displacement frame, then account for both forms of stored energy.");
    } catch (error) { setRun(null); setMessage(error instanceof Error ? error.message : "Check the inputs."); }
  };
  return <section className={styles.panel}><h3>Select a finite-string mode</h3><p>The left endpoint is fixed. Use y=B sin(k_n*x) cos(omega_n*t); B is the total antinode amplitude. The right endpoint selects the allowed positive spectrum. Free-free rigid translation is discussed in the reading, but is not modeled in this panel.</p>
    <div className="phs232-controls"><div className="field"><label htmlFor={id + "-boundary"}>Right endpoint condition</label><select id={id + "-boundary"} value={boundary} onChange={e => { setBoundary(e.target.value as StandingModeInput["rightBoundary"]); clear(); }}><option value="fixed">Fixed: y(L,t)=0</option><option value="free">Massless free: y_x(L,t)=0</option></select></div><ModeNumbers controls={controls} values={values} change={(i, value) => { setValues(v => v.map((item, j) => i === j ? value : item)); clear(); }}/></div>
    <fieldset className="phs232-predictions"><legend>Predict the allowed mode</legend><div className="phs232-controls"><div className="field"><label htmlFor={id + "-frequency"}>Predicted mode frequency (Hz)</label><input id={id + "-frequency"} value={frequency} onChange={e => setFrequency(e.target.value)}/></div><div className="field"><label htmlFor={id + "-nodes"}>Predicted internal mode-shape node count</label><input id={id + "-nodes"} value={nodes} onChange={e => setNodes(e.target.value)}/></div><div className="field"><label htmlFor={id + "-condition"}>Predicted right-end constraint</label><select id={id + "-condition"} value={condition} onChange={e => setCondition(e.target.value)}><option value="">Choose a prediction</option><option value="fixed">Zero displacement</option><option value="free">Zero transverse slope</option></select></div></div><p>{modePredictionHelp} The node count must be exact and excludes endpoints.</p><button className="button secondary" onClick={reveal}>Check standing-mode predictions</button></fieldset>
    <p role="status" className="form-status">{message}</p>{run && <StandingResults key={generation} run={run}/>}
  </section>;
}
