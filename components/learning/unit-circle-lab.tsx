"use client";

import { useId, useState } from "react";
import { approximateExact, equalExact, formatExact, negateExact, parseExact } from "@/lib/learning/exact-number";
import { addPiNumbers, formatPiNumber, negatePiNumber, parsePiNumber } from "@/lib/learning/pi-number";
import { circleLocations, unitCirclePoint, type UnitCircleCase } from "@/lib/learning/unit-circle";
import { MathText } from "./math-text";
import "./unit-circle.css";

const exact = (value: string) => <MathText>{"$" + formatExact(parseExact(value), true) + "$"}</MathText>;
const angle = (value: string) => <MathText>{"$" + formatPiNumber(parsePiNumber(value), true) + "$"}</MathText>;
function CircleDiagram({ point }: { point: ReturnType<typeof unitCirclePoint> }) {
  const x = 190 + 120 * approximateExact(parseExact(point.x)).real, y = 160 - 120 * approximateExact(parseExact(point.y)).real;
  return <svg className="circle-diagram" viewBox="0 0 380 320" role="img" aria-label={"Unit circle: P has horizontal coordinate " + point.x + " and vertical coordinate " + point.y + ". " + circleLocations[point.location] + ". Exact coordinates are also in the table."}>
    <circle cx="190" cy="160" r="120" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M35 160H350M190 15V305" fill="none" stroke="currentColor" />
    <path d={"M190 160L" + x + " " + y} stroke="var(--accent, #23574d)" strokeWidth="3" />
    <path d={"M" + x + " 160V" + y + "H190"} fill="none" stroke="currentColor" strokeDasharray="5 4" />
    <circle cx={x} cy={y} r="5" fill="var(--accent, #23574d)" />
    <text x={x + (x > 290 ? -12 : 12)} y={y - 12} textAnchor={x > 290 ? "end" : "start"}>P</text>
    <text x="343" y="183">x</text><text x="202" y="22">y</text>
    <text x="318" y="181">1</text><text x="48" y="181">−1</text>
    <text x="204" y="48">1</text><text x="204" y="288">−1</text><text x="172" y="181">0</text>
  </svg>;
}
export function UnitCircleLab({ activity }: { activity: { prompt: string; cases: UnitCircleCase[] } }) {
  const id = useId(), [index, setIndex] = useState(0), [item, setItem] = useState(activity.cases[0]);
  const [prediction, setPrediction] = useState<Record<string, string>>({}), [predicted, setPredicted] = useState(false), [predictionStatus, setPredictionStatus] = useState("");
  const [answers, setAnswers] = useState({ x: "", y: "" }), [solved, setSolved] = useState(false), [solutionStatus, setSolutionStatus] = useState("");
  const [reflection, setReflection] = useState(""), [identity, setIdentity] = useState(""), [explanation, setExplanation] = useState("");
  let point: ReturnType<typeof unitCirclePoint> | undefined, error = "";
  try { point = unitCirclePoint(item.angle, item.unit); } catch (cause) { error = cause instanceof Error ? cause.message : "Check the angle."; }
  const clearExplanation = () => { setReflection(""); setIdentity(""); setExplanation(""); };
  const clearSolution = () => { setAnswers({ x: "", y: "" }); setSolved(false); setSolutionStatus(""); clearExplanation(); };
  const clear = () => { setPrediction({}); setPredicted(false); setPredictionStatus(""); clearSolution(); };
  const load = (next: number) => { setIndex(next); setItem(activity.cases[next]); clear(); };
  const predict = () => {
    if (!point) return;
    const correct = prediction.location === point.location && prediction.x === point.xSign && prediction.y === point.ySign;
    setPredicted(correct); clearSolution();
    setPredictionStatus(correct ? "Correct. Now calculate the exact ordered pair." : "Locate the terminal side after removing full turns. Horizontal signs determine x; vertical signs determine y. An axis coordinate can be zero.");
  };
  const solve = () => {
    if (!point) return;
    setSolved(false); clearExplanation();
    try {
      const correct = equalExact(parseExact(answers.x), parseExact(point.x)) && equalExact(parseExact(answers.y), parseExact(point.y));
      setSolved(correct);
      setSolutionStatus(correct ? "Correct. Compare the point, its reflection and a full-turn rotation below." : "Check the coordinate order and signs. Keep radicals exact; a rounded decimal is a different value.");
    } catch (cause) { setSolutionStatus(cause instanceof Error ? cause.message : "Enter both exact coordinates."); }
  };
  const rows = point ? [
    { label: "Selected angle", radians: point.radians, x: point.x, y: point.y },
    { label: "Add one full turn", radians: formatPiNumber(addPiNumbers(parsePiNumber(point.radians), parsePiNumber("2pi"))), x: point.x, y: point.y },
    { label: "Reflect across the x-axis", radians: formatPiNumber(negatePiNumber(parsePiNumber(point.radians))), x: point.x, y: formatExact(negateExact(parseExact(point.y))) },
  ] : [];
  return <div className="unit-circle-lab">
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="field"><label htmlFor={id + "-case"}>Unit-circle case</label><select id={id + "-case"} value={index} onChange={event => load(Number(event.target.value))}>{activity.cases.map((entry, i) => <option value={i} key={entry.title}>{entry.title}</option>)}</select></div>
    <div className="circle-controls">
      <div className="field"><label htmlFor={id + "-angle"}>Directed angle</label><input id={id + "-angle"} value={item.angle} maxLength={200} onChange={event => { setItem({ ...item, angle: event.target.value }); clear(); }} /></div>
      <div className="field"><label htmlFor={id + "-unit"}>Angle unit</label><select id={id + "-unit"} value={item.unit} onChange={event => { setItem({ ...item, unit: event.target.value as UnitCircleCase["unit"] }); clear(); }}><option value="radians">Radians</option><option value="degrees">Degrees</option><option value="turns">Turns</option></select></div>
    </div>
    <p className="muted">Type an exact angle, such as -7*pi/6 radians, 210 degrees or 7/12 turns. This investigation supports terminal angles that are multiples of 30 or 45 degrees, up to 1,000,000 radians in magnitude. Sine and cosine are defined at every real angle; this tool displays a selected set exactly.</p>
    {error && <p className="notice warning" role="alert">{error}</p>}
    <h3>1. Predict the location and signs</h3>
    <div className="circle-controls">
      <div className="field"><label htmlFor={id + "-location"}>Predicted terminal location</label><select id={id + "-location"} value={prediction.location ?? ""} onChange={event => { setPrediction({ ...prediction, location: event.target.value }); setPredicted(false); setPredictionStatus(""); clearSolution(); }}><option value="">Choose a location</option>{Object.entries(circleLocations).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      {(["x", "y"] as const).map(key => <div className="field" key={key}><label htmlFor={id + "-sign-" + key}>Predicted {key} sign</label><select id={id + "-sign-" + key} value={prediction[key] ?? ""} onChange={event => { setPrediction({ ...prediction, [key]: event.target.value }); setPredicted(false); setPredictionStatus(""); clearSolution(); }}><option value="">Choose a sign</option><option value="positive">Positive</option><option value="negative">Negative</option><option value="zero">Zero</option></select></div>)}
    </div>
    <div className="form-actions"><button className="button" disabled={!point} onClick={predict}>Check circle prediction</button><button className="button secondary" onClick={() => load(index)}>Reset this case</button></div>
    <p role="status" className="circle-prediction-status">{predictionStatus}</p>
    {predicted && point && <>
      <h3>2. Calculate the exact pair</h3>
      <p>The ordered pair is (cosine, sine). Enter fractions and sqrt(number), including the predicted signs.</p>
      <div className="circle-controls">{(["x", "y"] as const).map(key => <div className="field" key={key}><label htmlFor={id + "-answer-" + key}>{key === "x" ? "Exact x = cosine" : "Exact y = sine"}</label><input id={id + "-answer-" + key} value={answers[key]} maxLength={200} onChange={event => { setAnswers({ ...answers, [key]: event.target.value }); setSolved(false); setSolutionStatus(""); clearExplanation(); }} /></div>)}</div>
      <button className="button" onClick={solve}>Check circle coordinates</button>
      <p role="status" className="circle-solution-status">{solutionStatus}</p>
    </>}
    {solved && point && <div className="circle-results">
      <h3>3. Compare and explain</h3>
      <CircleDiagram point={point} />
      <p>The terminal point is in {circleLocations[point.location]}. The representative angle in [0, 2π) is {angle(point.representative)} rad. {point.referenceAngle ? <>Its acute reference angle is {angle(point.referenceAngle)} rad.</> : "It is an axis point, so there is no acute reference angle."}</p>
      <p>Horizontal coordinate: {exact(point.x)}. Vertical coordinate: {exact(point.y)}. The identity checks the radius: <MathText>{"$(" + formatExact(parseExact(point.x), true) + ")^2+(" + formatExact(parseExact(point.y), true) + ")^2=1$"}</MathText>.</p>
      <div className="circle-table-wrap" role="region" aria-label="Exact unit-circle comparison" tabIndex={0}>
        <table className="coefficient-table"><caption>Exact coordinates under rotation and reflection</caption><thead><tr><th scope="col">Position</th><th scope="col">Angle (rad)</th><th scope="col">x = cosine</th><th scope="col">y = sine</th></tr></thead><tbody>{rows.map(row => <tr key={row.label}><th scope="row">{row.label}</th><td>{angle(row.radians)}</td><td>{exact(row.x)}</td><td>{exact(row.y)}</td></tr>)}</tbody></table>
      </div>
      <div className="field"><label htmlFor={id + "-reflection"}>Which coordinate is negated by the x-axis reflection rule?</label><select id={id + "-reflection"} value={reflection} onChange={event => { setReflection(event.target.value); setExplanation(""); }}><option value="">Choose a coordinate rule</option><option value="x">x only</option><option value="y">y only</option><option value="both">Both x and y</option></select></div>
      <div className="field"><label htmlFor={id + "-identity"}>Why does x² + y² = 1 fail to choose the signs?</label><select id={id + "-identity"} value={identity} onChange={event => { setIdentity(event.target.value); setExplanation(""); }}><option value="">Choose a reason</option><option value="positive">Both coordinates must be positive</option><option value="squares">Squaring removes each sign</option><option value="order">The identity fixes coordinate order</option></select></div>
      <button className="button" onClick={() => setExplanation(reflection === "y" && identity === "squares" ? "Correct. Reflection negates y and preserves x; when y is zero the reflected point is unchanged. Squared lengths determine the radius, while location determines the signs." : "Use the rule (x, y) → (x, -y), then compare the squares of a number and its negative.")}>Check circle explanation</button>
      <p role="status" className="circle-explanation-status">{explanation}</p>
    </div>}
    <p className="muted">This investigation provides assisted practice. Use the independent checkpoint to demonstrate the lesson objective.</p>
  </div>;
}
