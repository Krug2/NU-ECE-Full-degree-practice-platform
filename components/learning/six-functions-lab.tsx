"use client";

import { useId, useState } from "react";
import { approximateExact, formatExact, parseExact } from "@/lib/learning/exact-number";
import { gradeField } from "@/lib/learning/grading";
import { analyzeSixCase, sixNames, transformedSix, type SixCase } from "@/lib/learning/six-trig";
import type { TrigName } from "@/lib/learning/refreshers/trig";
import { MathText } from "./math-text";
import "./six-functions.css";

const names: Record<TrigName, string> = { sin: "sine", cos: "cosine", tan: "tangent", sec: "secant", csc: "cosecant", cot: "cotangent" };
const formulas: Record<TrigName, string> = { sin: "y/r", cos: "x/r", tan: "y/x", sec: "r/x", csc: "r/y", cot: "x/y" };
const denominators: Record<TrigName, string> = { sin: "r", cos: "r", tan: "x", sec: "x", csc: "y", cot: "y" };
const math = (value: string | null) => value === null ? <strong>Undefined</strong> : <MathText>{"$" + formatExact(parseExact(value), true) + "$"}</MathText>;
type Transformation = "reflection" | "half-turn" | "full-turn";
const labels: Record<Transformation, string> = { reflection: "Reflection: -theta", "half-turn": "Half-turn: theta + pi", "full-turn": "Full turn: theta + 2pi" };
function PointDiagram({ result }: { result: ReturnType<typeof analyzeSixCase> }) {
  const x = 190 + 120 * approximateExact(parseExact(result.unitX)).real, y = 160 - 120 * approximateExact(parseExact(result.unitY)).real;
  return <svg className="six-diagram" viewBox="0 0 380 320" role="img" aria-label={"Normalized terminal point P: cosine " + result.unitX + ", sine " + result.unitY + ". Exact values and denominators follow in the table."}>
    <circle cx="190" cy="160" r="120" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M35 160H350M190 15V305" fill="none" stroke="currentColor" />
    <path d={"M190 160L" + x + " " + y} stroke="var(--accent, #23574d)" strokeWidth="3" />
    <path d={"M" + x + " 160V" + y + "H190"} fill="none" stroke="currentColor" strokeDasharray="5 4" />
    <circle cx={x} cy={y} r="5" fill="var(--accent, #23574d)" />
    <text x={x + (x > 290 || y < 65 ? -12 : 12)} y={y < 65 ? y + 20 : y - 12} textAnchor={x > 290 || y < 65 ? "end" : "start"}>P</text>
    <text x="343" y="183">x</text><text x="202" y="22">y</text><text x="318" y="181">1</text>
    <text x="48" y="181">−1</text><text x="204" y="48">1</text><text x="204" y="288">−1</text><text x="172" y="181">0</text>
  </svg>;
}
export function SixFunctionsLab({ activity }: { activity: { prompt: string; cases: SixCase[] } }) {
  const id = useId(), [index, setIndex] = useState(0), [item, setItem] = useState(activity.cases[0]);
  const [predictions, setPredictions] = useState<Record<string, string>>({}), [predicted, setPredicted] = useState(false), [predictionStatus, setPredictionStatus] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({}), [solved, setSolved] = useState(false), [solutionStatus, setSolutionStatus] = useState("");
  const [transform, setTransform] = useState<Transformation>("half-turn"), [zeroReason, setZeroReason] = useState(""), [periodReason, setPeriodReason] = useState(""), [explanation, setExplanation] = useState("");
  let result: ReturnType<typeof analyzeSixCase> | undefined, error = "";
  try { result = analyzeSixCase(item); } catch (cause) { error = cause instanceof Error ? cause.message : "Check the point."; }
  const clearExplanation = () => { setZeroReason(""); setPeriodReason(""); setExplanation(""); };
  const clearSolution = () => { setAnswers({}); setSolved(false); setSolutionStatus(""); setTransform("half-turn"); clearExplanation(); };
  const clear = () => { setPredictions({}); setPredicted(false); setPredictionStatus(""); clearSolution(); };
  const load = (next: number) => { setIndex(next); setItem(activity.cases[next]); clear(); };
  const predict = () => {
    if (!result) return;
    const correct = (["tan", "cot", "sec", "csc"] as const).every(name => predictions[name] === (result.values[name] === null ? "undefined" : "defined"));
    setPredicted(correct); clearSolution();
    setPredictionStatus(correct ? "Correct. Now enter all six exact values." : "Inspect denominators: tangent and secant use x; cotangent and cosecant use y. A zero numerator does not make a quotient undefined.");
  };
  const solve = () => {
    if (!result) return;
    clearExplanation();
    const checks = sixNames.map(name => gradeField({ id: name, label: name, kind: "exact-or-undefined", expected: result.values[name], unit: "", help: "Use exact values or undefined." }, answers[name] ?? ""));
    const correct = checks.every(check => check.correct);
    setSolved(correct);
    setSolutionStatus(correct ? "Correct. Compare each exact denominator and the transformed values." : checks.find(check => !check.correct)!.message);
  };
  const transformed = result ? transformedSix(result.values, transform) : null;
  return <div className="six-functions-lab">
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="field"><label htmlFor={id + "-case"}>Six-function case</label><select id={id + "-case"} value={index} onChange={event => load(Number(event.target.value))}>{activity.cases.map((entry, i) => <option key={entry.title} value={i}>{entry.title}</option>)}</select></div>
    <div className="six-controls">{(["x", "y"] as const).map(key => <div className="field" key={key}><label htmlFor={id + "-" + key}>Point {key}</label><input id={id + "-" + key} value={item[key]} maxLength={200} onChange={event => { setItem({ ...item, [key]: event.target.value }); clear(); }} /></div>)}</div>
    <p className="muted">Use exact coordinates from -100 to 100, such as -8, 15 or sqrt(3), in common length units. The origin has no direction. This investigation supports points whose squared radius is rational and whose radicals fit the exact calculator.</p>
    {error && <p className="notice warning" role="alert">{error}</p>}
    <h3>1. Predict the denominator restrictions</h3>
    <p>Use tan = y/x, cot = x/y, sec = r/x and csc = r/y, with r the positive distance from the origin.</p>
    <div className="six-controls">{(["tan", "cot", "sec", "csc"] as const).map(name => <div className="field" key={name}><label htmlFor={id + "-predict-" + name}>Predicted {names[name]} status</label><select id={id + "-predict-" + name} value={predictions[name] ?? ""} onChange={event => { setPredictions({ ...predictions, [name]: event.target.value }); setPredicted(false); setPredictionStatus(""); clearSolution(); }}><option value="">Choose a status</option><option value="defined">Defined</option><option value="undefined">Undefined</option></select></div>)}</div>
    <div className="form-actions"><button className="button" disabled={!result} onClick={predict}>Check function predictions</button><button className="button secondary" onClick={() => load(index)}>Reset this case</button></div>
    <p role="status" className="six-prediction-status">{predictionStatus}</p>
    {predicted && result && <>
      <h3>2. Calculate all six values</h3><p>Compute the positive radius from x² + y². Keep fractions and radicals exact, and type undefined for a zero denominator.</p>
      <div className="six-controls">{sixNames.map(name => <div className="field" key={name}><label htmlFor={id + "-value-" + name}>Exact {names[name]}</label><input id={id + "-value-" + name} maxLength={200} value={answers[name] ?? ""} onChange={event => { setAnswers({ ...answers, [name]: event.target.value }); setSolved(false); setSolutionStatus(""); clearExplanation(); }} /></div>)}</div>
      <button className="button" onClick={solve}>Check six values</button><p role="status" className="six-solution-status">{solutionStatus}</p>
    </>}
    {solved && result && transformed && <div className="six-results">
      <h3>3. Compare definitions and transformations</h3>
      <p>Radius r = {math(result.radius)}. The normalized point is (cosine, sine) = ({math(result.unitX)}, {math(result.unitY)}).</p>
      <PointDiagram result={result} />
      <div className="six-table-wrap" role="region" aria-label="Six exact values and denominators" tabIndex={0}><table className="coefficient-table"><caption>Coordinate definitions at the selected point</caption><thead><tr><th scope="col">Function and ratio</th><th scope="col">Denominator</th><th scope="col">Exact value</th></tr></thead><tbody>{sixNames.map(name => <tr key={name}><th scope="row">{name}<span className="six-table-formula">{formulas[name]}</span></th><td>{denominators[name]} = {math(result.denominators[name])}{result.values[name] === null && <span className="six-zero-label">Zero denominator</span>}</td><td>{math(result.values[name])}</td></tr>)}</tbody></table></div>
      <div className="field"><label htmlFor={id + "-transform"}>Compare a transformation</label><select id={id + "-transform"} value={transform} onChange={event => { setTransform(event.target.value as Transformation); clearExplanation(); }}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      <div className="six-table-wrap" role="region" aria-label="Six-function transformation comparison" tabIndex={0}><table className="coefficient-table"><caption>{labels[transform]}</caption><thead><tr><th scope="col">Function</th><th scope="col">Original</th><th scope="col">Transformed</th></tr></thead><tbody>{sixNames.map(name => <tr key={name}><th scope="row">{name}</th><td>{math(result.values[name])}</td><td>{math(transformed[name])}</td></tr>)}</tbody></table></div>
      <p>{transform === "reflection" ? "Reflection across the horizontal axis preserves x and negates y. Cosine and secant are even; the other four functions are odd on their domains." : transform === "half-turn" ? "A half-turn negates both coordinates. Tangent and cotangent repeat because both signs cancel in the quotient. The other four defined values reverse sign." : "A full turn restores the terminal point. All six functions repeat on their domains, including the same excluded inputs."} Undefined entries remain undefined under these transformations.</p>
      <div className="field"><label htmlFor={id + "-zero"}>What makes a quotient undefined?</label><select id={id + "-zero"} value={zeroReason} onChange={event => { setZeroReason(event.target.value); setExplanation(""); }}><option value="">Choose a reason</option><option value="denominator">The denominator is exactly zero</option><option value="numerator">The numerator is zero</option><option value="negative">A coordinate is negative</option></select></div>
      <div className="field"><label htmlFor={id + "-period"}>Why do tangent and cotangent repeat after a half-turn?</label><select id={id + "-period"} value={periodReason} onChange={event => { setPeriodReason(event.target.value); setExplanation(""); }}><option value="">Choose a reason</option><option value="point">The terminal point is unchanged</option><option value="cancel">Both coordinate signs cancel in the quotient</option><option value="positive">Both outputs must be positive</option></select></div>
      <button className="button" onClick={() => setExplanation(zeroReason === "denominator" && periodReason === "cancel" ? "Correct. The denominator decides whether division is allowed. A half-turn reverses both coordinate signs, preserving their quotient where defined; a full turn restores the point." : "Inspect the denominator, then compare (-y)/(-x) with y/x. A half-turn reaches the opposite point, whose coordinate ratios can still agree.")}>Check function explanation</button>
      <p role="status" className="six-explanation-status">{explanation}</p>
    </div>}
    <p className="muted">This investigation provides assisted practice. Use the independent checkpoint to demonstrate the lesson objective.</p>
  </div>;
}
