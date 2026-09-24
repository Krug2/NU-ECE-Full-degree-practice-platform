"use client";
import { useId, useMemo, useState } from "react";
import { analyzeRotationInvestigation, type RotationLabCase } from "@/lib/learning/rotation-investigation";
import { equalPiNumbers, formatPiNumber, parsePiNumber } from "@/lib/learning/pi-number";
import { approximatePiNumber } from "@/lib/learning/pi-order";
import { locationLabels } from "@/lib/learning/families/mth-angle-fields";
import { Equation } from "./math-text";
import "./rotation.css";

type Analysis = ReturnType<typeof analyzeRotationInvestigation>;
const blank = { net: "", travel: "", distance: "", scaledDistance: "", scaleSquared: "" };
const solutionLabels = { net: "Signed net rotation (rad)", travel: "Total angular travel (rad)", distance: "Distance at original radius (cm)", scaledDistance: "Distance at scaled radius (cm)", scaleSquared: "Accumulated area scale factor" };
const exact = (source: string) => <Equation>{formatPiNumber(parsePiNumber(source), true)}</Equation>;
function RotationGraph({ result }: { result: Analysis }) {
  const id = useId(), plot = result.plot, radius = 124 * plot.radius / Math.max(plot.radius, plot.scaledRadius), scaled = 124 * plot.scaledRadius / Math.max(plot.radius, plot.scaledRadius);
  const path = (start: number, sweep: number, r: number) => Array.from({ length: 81 }, (_, index) => {
    const angle = start + sweep * index / 80;
    return (index ? "L" : "M") + (210 + r * Math.cos(angle)) + "," + (185 - r * Math.sin(angle));
  }).join(" ");
  const axes: Record<string, [number, number]> = { "positive-x": [1, 0], "positive-y": [0, 1], "negative-x": [-1, 0], "negative-y": [0, -1] };
  const terminal = axes[result.final.location] ?? [Math.cos(plot.terminal), Math.sin(plot.terminal)];
  return <figure className="rotation-figure">
    <svg viewBox="0 0 420 375" role="img" aria-labelledby={id + "-title"} aria-describedby={id + "-description"}>
      <title id={id + "-title"}>Two radii and a directed rotation</title>
      <desc id={id + "-description"}>The terminal ray ends on {locationLabels[result.final.location]}. The solid circle has the original radius and the dashed circle has the scaled radius. Teal arrows show the first rotation; orange dashed arrows show the second. Completed circuits are drawn once per segment. Read the exact values below for all traveled turns and distances.</desc>
      <defs>{["first", "second"].map((key, index) => <marker key={key} id={id + "-" + key} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5Z" fill={index ? "#a14716" : "#176454"}/></marker>)}</defs>
      <path d="M35 185H385M210 30V340" stroke="#72817b" strokeWidth="1"/>
      <text x="382" y="177" fontSize="20">x</text><text x="220" y="35" fontSize="20">y</text>
      <circle cx="210" cy="185" r={radius} fill="none" stroke="#176454" strokeWidth="2"/>
      <circle cx="210" cy="185" r={scaled} fill="none" stroke="#536d86" strokeWidth="2" strokeDasharray="5 6"/>
      {[result.first, result.second].map((segment, index) => {
        const start = index ? plot.secondStart : 0, sign = segment.direction === "clockwise" ? -1 : 1, remainder = approximatePiNumber(parsePiNumber(segment.travelRemainder));
        const color = index ? "#a14716" : "#176454", marker = "url(#" + id + (index ? "-second" : "-first") + ")";
        return <g key={index} fill="none" stroke={color} strokeWidth="4" strokeDasharray={index ? "8 4" : undefined}>
          {segment.fullTraveledTurns > 0 && <path d={path(start, sign * 2 * Math.PI, Math.max(8, radius - 9 - index * 6))} markerEnd={marker}/>}
          {remainder > 0 && <path d={path(start, sign * remainder, radius + index * 6)} markerEnd={marker}/>}
        </g>;
      })}
      <path d={"M210 185L" + (210 + 143 * terminal[0]) + "," + (185 - 143 * terminal[1])} stroke="#263d33" strokeWidth="3"/>
      <circle cx={210 + radius * terminal[0]} cy={185 - radius * terminal[1]} r="5" fill="#176454"/>
      <circle cx={210 + scaled * terminal[0]} cy={185 - scaled * terminal[1]} r="5" fill="#536d86"/>
      <text x="210" y="365" textAnchor="middle" fontSize="19">Same final angle at both radii</text>
    </svg>
    <figcaption>Solid circle: original radius. Dashed circle: scaled radius. Teal: first rotation. Orange dashed: second rotation. Each completed circuit is drawn once; the table retains every turn. Diagram positions are approximate, while classification and grading use exact values.</figcaption>
  </figure>;
}

export function RotationLab({ activity }: { activity: { prompt: string; cases: RotationLabCase[] } }) {
  const id = useId(), [selected, setSelected] = useState(0), [values, setValues] = useState(activity.cases[0]);
  const [location, setLocation] = useState(""), [relation, setRelation] = useState(""), [predicted, setPredicted] = useState(false), [predictionMessage, setPredictionMessage] = useState("");
  const [solutions, setSolutions] = useState(blank), [solutionMessage, setSolutionMessage] = useState(""), [revealed, setRevealed] = useState(false);
  const [reason, setReason] = useState(""), [scaling, setScaling] = useState(""), [explanation, setExplanation] = useState(""), [help, setHelp] = useState(false);
  const analyzed = useMemo(() => {
    try { return { result: analyzeRotationInvestigation(values), error: "" }; }
    catch (error) { return { result: null, error: error instanceof Error ? error.message : "Check the rotation controls." }; }
  }, [values]);
  const result = analyzed.result;
  const clearExplanation = () => { setReason(""); setScaling(""); setExplanation(""); };
  const clearSolutions = () => { setSolutions(blank); setSolutionMessage(""); setRevealed(false); clearExplanation(); };
  const clear = () => { setLocation(""); setRelation(""); setPredicted(false); setPredictionMessage(""); setHelp(false); clearSolutions(); };
  const change = (next: RotationLabCase) => { setValues(next); clear(); };
  const select = (index: number) => { setSelected(index); change(activity.cases[index]); };
  const checkPredictions = () => {
    clearSolutions();
    const correct = !!result && location === result.final.location && relation === result.relation;
    setPredicted(correct); setPredictionMessage(correct ? "Both predictions are correct. Calculate the complete motion next." : "Locate the final ray after both signed rotations. Compare the sum of segment magnitudes with the magnitude of their signed sum.");
  };
  const checkSolutions = () => {
    setRevealed(false); clearExplanation(); if (!result) return;
    const errors: string[] = [];
    for (const key of Object.keys(blank) as (keyof typeof blank)[]) {
      try { if (!equalPiNumbers(parsePiNumber(solutions[key]), parsePiNumber(result[key]))) errors.push(solutionLabels[key] + ": check the complete exact value."); }
      catch (error) { errors.push(solutionLabels[key] + ": " + (error instanceof Error ? error.message : "Use exact arithmetic.")); }
    }
    setSolutionMessage(errors.length ? errors.join(" ") : "All exact quantities are correct. Compare the diagram and values, then explain the relationship.");
    setRevealed(errors.length === 0);
  };
  return <div className="rotation-lab">
    <p>{activity.prompt}</p>
    <div className="field"><label htmlFor={id + "-case"}>Rotation case</label><select id={id + "-case"} value={selected} onChange={event => select(Number(event.target.value))}>{activity.cases.map((item, index) => <option key={item.title} value={index}>{item.title}</option>)}</select></div>
    <div className="rotation-controls">
      {(["first", "second", "radius", "scale"] as const).map(key => <div className="field" key={key}><label htmlFor={id + "-" + key}>{({ first: "First rotation", second: "Second rotation", radius: "Original radius (cm)", scale: "Radius scale factor" })[key]}</label><input id={id + "-" + key} value={values[key]} maxLength={200} onChange={event => change({ ...values, [key]: event.target.value })}/></div>)}
      <div className="field"><label htmlFor={id + "-unit"}>Unit for both rotations</label><select id={id + "-unit"} value={values.unit} onChange={event => change({ ...values, unit: event.target.value as RotationLabCase["unit"] })}><option value="degrees">Degrees</option><option value="radians">Radians</option><option value="turns">Turns</option></select></div>
    </div>
    <p className="muted">Both rotations begin where the previous one ended, starting on the positive x-axis. A zero second rotation adds no movement. Each segment moves without reversing. Radius: 1/10 to 20 cm; scale: 1/4 to 4. These are activity limits.</p>
    <button className="button secondary" onClick={() => select(selected)}>Reset this case</button>
    {analyzed.error && <p className="notice warning" role="alert">{analyzed.error}</p>}
    <h3>1. Predict position and travel</h3>
    <div className="field"><label htmlFor={id + "-location"}>Predicted terminal ray</label><select id={id + "-location"} value={location} onChange={event => { setLocation(event.target.value); setPredicted(false); setPredictionMessage(""); clearSolutions(); }}><option value="">Choose a location</option>{Object.entries(locationLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></div>
    <div className="field"><label htmlFor={id + "-relation"}>Total travel compared with the magnitude of net rotation</label><select id={id + "-relation"} value={relation} onChange={event => { setRelation(event.target.value); setPredicted(false); setPredictionMessage(""); clearSolutions(); }}><option value="">Choose a comparison</option><option value="equal">Equal</option><option value="greater">Greater</option><option value="less">Less</option></select></div>
    <button className="button secondary" disabled={!result} onClick={checkPredictions}>Check rotation predictions</button>
    <p role="status" className="rotation-prediction-status">{predictionMessage}</p>
    <button className="button secondary" aria-expanded={help} onClick={() => setHelp(!help)}>{help ? "Hide calculation help" : "Show calculation help"}</button>
    {help && result && <div className="notice"><p>Add signed radian rotations for the net. Add each segment&apos;s absolute radian measure for travel. Here those totals are {exact(result.net)} and {exact(result.travel)} radians. Multiply travel by each radius for its distance. A radius scale c gives an accumulated area scale of c².</p><p>These are guided calculations. They do not award independent checkpoint evidence.</p></div>}
    {predicted && result && <section><h3>2. Calculate the complete motion</h3><p>Keep pi exact. Use pi or π, fractions and arithmetic. The accumulated area counts any repeated sweep each time it occurs.</p>
      {(Object.keys(blank) as (keyof typeof blank)[]).map(key => <div className="field" key={key}><label htmlFor={id + "-answer-" + key}>{solutionLabels[key]}</label><input id={id + "-answer-" + key} maxLength={200} value={solutions[key]} onChange={event => { setSolutions({ ...solutions, [key]: event.target.value }); setRevealed(false); setSolutionMessage(""); clearExplanation(); }}/></div>)}
      <button className="button secondary" onClick={checkSolutions}>Check circular calculations</button><p role="status" className="rotation-solution-status">{solutionMessage}</p>
    </section>}
    {revealed && result && <section className="rotation-results"><h3>3. Compare and explain</h3><RotationGraph result={result}/>
      <div className="rotation-table-wrap" tabIndex={0} role="region" aria-label="Exact rotation values"><table><caption>Exact quantities for this motion</caption><thead><tr><th scope="col">Quantity</th><th scope="col">Value</th></tr></thead><tbody>
        {[
          ["Signed net rotation (rad)", result.net], ["Total angular travel (rad)", result.travel],
          ["Representative of the final angle in [0, 2pi)", result.final.representative],
          ["Original radius (cm)", values.radius], ["Scaled radius (cm)", result.scaledRadius],
          ["Signed circumferential displacement at original radius (cm)", result.signedArc],
          ["Total distance at original radius (cm)", result.distance], ["Total distance at scaled radius (cm)", result.scaledDistance],
          ["Accumulated swept area at original radius (cm²)", result.accumulatedArea], ["Accumulated swept area at scaled radius (cm²)", result.scaledAccumulatedArea],
        ].map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{exact(value)}</td></tr>)}
        <tr><th scope="row">Complete traveled turns in first segment</th><td>{result.first.fullTraveledTurns}, {result.first.direction}</td></tr>
        <tr><th scope="row">Complete traveled turns in second segment</th><td>{result.second.fullTraveledTurns}, {result.second.direction}</td></tr>
        <tr><th scope="row">Terminal ray</th><td>{locationLabels[result.final.location]}</td></tr>
        <tr><th scope="row">Strictly acute reference angle</th><td>{result.final.referenceAngle === null ? "None: the ray is on an axis" : exact(result.final.referenceAngle)}</td></tr>
      </tbody></table></div>
      <p>Accumulated area counts repeated coverage. It does not measure a union of regions. The final ray records position; it cannot reconstruct this journey&apos;s completed turns.</p>
      <div className="field"><label htmlFor={id + "-reason"}>How should total angular travel be calculated?</label><select id={id + "-reason"} value={reason} onChange={event => { setReason(event.target.value); setExplanation(""); }}><option value="">Choose a reason</option><option value="segments">Add the magnitudes of the individual directed segments</option><option value="net">Always take only the magnitude of the net rotation</option><option value="principal">Use only the final principal angle</option></select></div>
      <div className="field"><label htmlFor={id + "-scaling"}>What changes when radius is multiplied by c?</label><select id={id + "-scaling"} value={scaling} onChange={event => { setScaling(event.target.value); setExplanation(""); }}><option value="">Choose a relationship</option><option value="square">Distances multiply by c, accumulated areas by c², and angles stay the same</option><option value="all">Every quantity multiplies by c</option><option value="none">The radius changes but all distances remain the same</option></select></div>
      <button className="button secondary" onClick={() => setExplanation(reason === "segments" && scaling === "square" ? "Correct. Segment travel preserves reversals, and scaling lengths preserves the angle. This investigation is guided practice; independent evidence comes from the checkpoint." : "Track each segment before adding distances. Arc length contains one factor of radius, while swept area contains two.")}>Check rotation explanation</button>
      <p role="status" className="rotation-explanation-status">{explanation}</p>
    </section>}
  </div>;
}
