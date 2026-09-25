"use client";

import { useId, useState } from "react";
import { superpositionInputSchema, superpositionMeanPower, superpositionModel, superpositionNodes, superpositionPoint, type SuperpositionInput, type SuperpositionModel } from "@/lib/learning/phs-232-superposition";
import { ModeNumbers, ModePlot, ModeProbe, ModeTable, modeClose, modeDisplay as display, modeNumbers, modePrediction, modePredictionHelp } from "./phs-232-mode-evidence";
import styles from "./phs-232-mode-evidence.module.css";

const controls = [
  ["tension", "Superposition tension (N)", .1, 100, .1], ["density", "Superposition density (kg/m)", .001, 2, .001],
  ["frequency", "Common frequency (Hz)", .1, 20, .1], ["firstAmplitude", "First rightward amplitude A (m)", 0, .1, .001],
  ["secondAmplitude", "Second amplitude B (m)", 0, .1, .001], ["phasePi", "Relative phase delta / pi", -2, 2, .25],
] as const;
const headings = ["Row", "x (m)", "t (s)", "First y (m)", "Second y (m)", "Total y (m)", "y_t (m/s)", "y_x", "y_tt (m/s²)", "y_xx (1/m)", "K/length (J/m)", "U/length (J/m)", "P toward +x (W)", "Local amplitude (m)"];
const row = (r: ReturnType<typeof superpositionPoint>, i: number) => [i, r.position, r.time, r.first.displacement, r.second.displacement, r.displacement, r.velocity, r.slope, r.acceleration, r.curvature, r.kinetic, r.potential, r.power, r.envelope];

function SuperpositionResults({ p }: { p: SuperpositionModel }) {
  const [positionIndex, setPositionIndex] = useState(128), [timeIndex, setTimeIndex] = useState(0);
  const position = p.wavelength * (positionIndex / 64 - 2), time = p.period * timeIndex / 256;
  const snapshot = Array.from({ length: 257 }, (_, i) => superpositionPoint(p, p.wavelength * (i / 64 - 2), time));
  const history = Array.from({ length: 257 }, (_, i) => superpositionPoint(p, position, p.period * i / 256)), probe = history[timeIndex];
  const nodes = superpositionNodes(p), scale = 1.1 * (p.firstAmplitude + p.secondAmplitude) || .01;
  const means = [-.37, 0, .37].map((fraction, i) => { const x = fraction * p.wavelength, coarse = superpositionMeanPower(p, x, 128), fine = superpositionMeanPower(p, x, 256); return [i, x, p.meanPower, coarse, fine, fine - coarse]; });
  return <div className={styles.results}><h4>Superposition evidence</h4>
    <p>c={display(p.speed)} m/s; wavelength={display(p.wavelength)} m; period={display(p.period)} s; maximum combined slope={display(p.maximumSlope)}. The view is part of an unbounded uniform string; its edges are not supports.</p>
    <p data-testid="superposition-summary">Signed mean power={display(p.meanPower)} W; isolated signed-power sum={display(p.isolatedMeanPower)} W. {p.secondDirection === 1 ? "Resultant amplitude=" + display(p.resultantAmplitude!) + " m; " + (p.resultantPhase === null ? "resultant phase is undefined." : "principal resultant phase=" + display(p.resultantPhase) + " rad.") : "Counterwave local amplitude lies between " + display(Math.abs(p.firstAmplitude - p.secondAmplitude)) + " and " + display(p.firstAmplitude + p.secondAmplitude) + " m."}</p>
    <p data-testid="superposition-nodes">{p.atRest ? "The total field is identically at rest. There is no nontrivial observed mode or resultant phase." : p.nontrivialStanding ? "Permanent displacement nodes in this view (m): " + nodes.map(display).join(", ") + ". These come from both time coefficients vanishing, not from this snapshot alone." : "There are no permanent displacement nodes. An isolated zero of the selected snapshot does not establish one."}</p>
    <div className="phs232-controls"><ModeProbe label="Superposition position index" value={positionIndex} max={256} change={setPositionIndex}/><ModeProbe label="Superposition time index" value={timeIndex} max={256} change={setTimeIndex}/></div>
    <p>Use Arrow, Home and End keys or the step buttons. Position stays fixed when time changes; both complete tables remain available.</p>
    <p data-testid="superposition-probe">At x={display(position)} m, t={display(time)} s: total y={display(probe.displacement)} m; y_t={display(probe.velocity)} m/s; slope={display(probe.slope)}; K/length={display(probe.kinetic)} J/m; U/length={display(probe.potential)} J/m; instantaneous signed P={display(probe.power)} W; local time amplitude={display(probe.envelope)} m.</p>
    <div className={styles.plots}>
      <ModePlot title="Constituent and total displacements at the selected time with both local magnitude bounds. Exact states and derivatives are in the snapshot table." xLabel="Position x (m)" yLabel="Displacement (m)" domain={[-2 * p.wavelength, 2 * p.wavelength]} extent={[-scale, scale]} traces={[
        { points: snapshot.map(r => [r.position, r.first.displacement]), color: "#176582" }, { points: snapshot.map(r => [r.position, r.second.displacement]), color: "#8c411e", dash: "7 4" },
        { points: snapshot.map(r => [r.position, r.displacement]), color: "#23574d", dash: "8 3 2 3" }, { points: snapshot.map(r => [r.position, r.envelope]), color: "#5d6562", dash: "2 4" }, { points: snapshot.map(r => [r.position, -r.envelope]), color: "#5d6562", dash: "2 4" },
      ]} verticals={nodes} markers={[[position, probe.displacement]]} caption="Solid blue = first wave; dashed brown = second; dot-dash green = sum. Dotted gray curves are the local time-amplitude bounds. Vertical dotted lines mark permanent nodes when a nontrivial standing field exists. Vertical scale is exaggerated."/>
      <ModePlot title="Displacements at the selected fixed material point over one full period. The time table contains every sample, derivative and power value." xLabel="Time (s)" yLabel="Local y (m)" domain={[0, p.period]} extent={[-scale, scale]} traces={[
        { points: history.map(r => [r.time, r.first.displacement]), color: "#176582" }, { points: history.map(r => [r.time, r.second.displacement]), color: "#8c411e", dash: "7 4" }, { points: history.map(r => [r.time, r.displacement]), color: "#23574d", dash: "8 3 2 3" },
      ]} verticals={[time]} markers={[[time, probe.displacement]]} caption="Follow a material point through a complete cycle. A permanent node has zero total displacement and velocity at every time. A moving point can pass through y=0 without being a node."/>
    </div>
    <ModeTable label="Superposition cycle power" headings={["Row", "x (m)", "Analytic mean (W)", "128-interval mean (W)", "256-interval mean (W)", "Refinement difference (W)"]} rows={means}/>
    <p>Cycle means are integrated from P=−F_T*y_x*y_t at each position with independent Simpson sums. The analytic mean is a separate comparison. Equal counterwaves have zero cycle-mean flux but can exchange energy locally during the cycle. Same-direction coherent power includes cross terms; random-phase averaging would be an additional assumption.</p>
    <details><summary>All superposition spatial states</summary><ModeTable label="Superposition snapshot" headings={headings} rows={snapshot.map(row)}/></details>
    <details><summary>All superposition time states</summary><ModeTable label="Superposition time history" headings={headings} rows={history.map(row)}/></details>
    <ol><li>Start with equal counterwaves and locate a permanent node using the reported positions and time records. Compare it with the all-zero frame at one quarter period when delta=0.</li><li>Make B different from A. Record the nonzero minimum amplitude and signed mean power; a minimum is now a moving point.</li><li>Choose the same direction with equal amplitudes. Compare delta/pi=0 and 1, then an intermediate phase. Explain the power difference from the isolated-power sum.</li></ol>
  </div>;
}

export function Phs232SuperpositionPanel({ initial }: { initial: SuperpositionInput }) {
  const id = useId(), [values, setValues] = useState(controls.map(([key]) => String(initial[key]))), [direction, setDirection] = useState(String(initial.secondDirection));
  const [amplitude, setAmplitude] = useState(""), [power, setPower] = useState(""), [nodes, setNodes] = useState(""), [message, setMessage] = useState(""), [model, setModel] = useState<SuperpositionModel | null>(null), [generation, setGeneration] = useState(0);
  const clear = () => { setModel(null); setMessage(""); setAmplitude(""); setPower(""); setNodes(""); };
  const reveal = () => {
    try {
      const parsed = superpositionInputSchema.safeParse({ ...modeNumbers(controls, values), secondDirection: Number(direction) });
      if (!parsed.success) throw Error("Use the labeled ranges and maximum combined slope at most 0.2. Adjust amplitude, frequency or medium.");
      if (!nodes) throw Error("Predict the all-time node behavior before revealing.");
      const predictedAmplitude = modePrediction(amplitude), predictedPower = modePrediction(power), result = superpositionModel(parsed.data), local = superpositionPoint(result, 0, 0);
      const expectedNodes = result.atRest ? "rest" : result.nontrivialStanding ? "periodic" : "none";
      const missed = [modeClose(predictedAmplitude, local.envelope) ? "" : "local time amplitude", modeClose(predictedPower, result.meanPower) ? "" : "signed mean power", nodes === expectedNodes ? "" : "permanent-node classification"].filter(Boolean);
      setModel(result); setGeneration(generation + 1);
      setMessage(missed.length ? "Revisit " + missed.join(", ") + ". Add the time coefficients before taking amplitude; square the total derivatives for power; test nodes for all time. Use the records below to revise." : "Your predictions agree. Compare the full local history with a single displacement snapshot.");
    } catch (error) { setModel(null); setMessage(error instanceof Error ? error.message : "Check the inputs."); }
  };
  return <section className={styles.panel}><h3>Combine traveling waves</h3><p>Use y=A cos(kx−omega*t)+B cos(kx−sigma*omega*t+delta), where sigma is the second wave&apos;s direction. Positive amplitudes, common frequency and the same ideal medium are specified.</p>
    <div className="phs232-controls"><ModeNumbers controls={controls} values={values} change={(i, value) => { setValues(v => v.map((item, j) => i === j ? value : item)); clear(); }}/><div className="field"><label htmlFor={id + "-direction"}>Second wave direction</label><select id={id + "-direction"} value={direction} onChange={e => { setDirection(e.target.value); clear(); }}><option value="-1">Leftward: counter-propagating</option><option value="1">Rightward: same direction</option></select></div></div>
    <p>The maximum combined-slope guard is 0.2. This bounds one model approximation; it is not a universal physical validity guarantee. Relative phase is entered in multiples of pi.</p>
    <fieldset className="phs232-predictions"><legend>Predict the combined field</legend><div className="phs232-controls"><div className="field"><label htmlFor={id + "-amplitude"}>Predicted local time amplitude at x=0 (m)</label><input id={id + "-amplitude"} value={amplitude} onChange={e => setAmplitude(e.target.value)}/></div><div className="field"><label htmlFor={id + "-power"}>Predicted signed cycle-mean power (W)</label><input id={id + "-power"} value={power} onChange={e => setPower(e.target.value)}/></div><div className="field"><label htmlFor={id + "-nodes"}>Predicted permanent-node behavior</label><select id={id + "-nodes"} value={nodes} onChange={e => setNodes(e.target.value)}><option value="">Choose a prediction</option><option value="periodic">Periodic nodes in a nontrivial standing field</option><option value="none">No permanent displacement nodes</option><option value="rest">The total field is identically at rest</option></select></div></div><p>{modePredictionHelp}</p><button className="button secondary" onClick={reveal}>Check superposition predictions</button></fieldset>
    <p role="status" className="form-status">{message}</p>{model && <SuperpositionResults key={generation} p={model}/>}
  </section>;
}
