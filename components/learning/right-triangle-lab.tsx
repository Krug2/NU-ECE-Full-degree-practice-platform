"use client";

import { useId, useState } from "react";
import { analyzeRightTriangleInvestigation, type RightTriangleCase } from "@/lib/learning/right-triangle-investigation";
import { equalExact, formatExact, parseExact } from "@/lib/learning/exact-number";
import { MathText } from "./math-text";
import { TrianglePlot } from "./question-figure";
import "./right-triangle.css";

const math = (value: string) => <MathText>{"$" + formatExact(parseExact(value), true) + "$"}</MathText>;
export function RightTriangleLab({ activity }: { activity: { prompt: string; cases: RightTriangleCase[] } }) {
  const id = useId(), [index, setIndex] = useState(0), [item, setItem] = useState(activity.cases[0]);
  const [predictions, setPredictions] = useState<Record<string, string>>({}), [predictionStatus, setPredictionStatus] = useState(""), [predicted, setPredicted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({}), [solutionStatus, setSolutionStatus] = useState(""), [solved, setSolved] = useState(false);
  const [reason, setReason] = useState(""), [similarity, setSimilarity] = useState(""), [explanation, setExplanation] = useState("");
  let result: ReturnType<typeof analyzeRightTriangleInvestigation> | undefined, error = "";
  try { result = analyzeRightTriangleInvestigation(item); } catch (cause) { error = cause instanceof Error ? cause.message : "Check the triangle."; }
  const clearExplanation = () => { setReason(""); setSimilarity(""); setExplanation(""); };
  const clearCalculations = () => { setAnswers({}); setSolutionStatus(""); setSolved(false); clearExplanation(); };
  const clear = () => { setPredictions({}); setPredictionStatus(""); setPredicted(false); clearCalculations(); };
  const load = (next: number) => { setIndex(next); setItem(activity.cases[next]); clear(); };
  const edit = (key: keyof RightTriangleCase, value: string) => { setItem({ ...item, [key]: value }); clear(); };
  const predict = () => {
    if (!result) return;
    const correct = predictions.opposite === result.selected.oppositeSide.toLowerCase() && predictions.adjacent === result.selected.adjacentSide.toLowerCase() && predictions.hypotenuse === "bc";
    setPredicted(correct); clearCalculations();
    setPredictionStatus(correct ? "Correct. Calculate the ratios and the scaled side next." : "Find BC across from the right angle at A. Then name the two legs relative to the chosen acute angle.");
  };
  const solve = () => {
    if (!result) return;
    setSolved(false); clearExplanation();
    try {
      const expected = { sin: result.selected.sin, cos: result.selected.cos, tan: result.selected.tan, ab: result.scaled.AB };
      const correct = Object.entries(expected).every(([key, value]) => equalExact(parseExact(answers[key] ?? ""), parseExact(value)));
      setSolved(correct);
      setSolutionStatus(correct ? "Correct. Compare both acute angles and explain what stays the same." : "Check each exact ratio and multiply AB by the scale factor. Keep radicals exact; a rounded decimal is a different value.");
    } catch (cause) { setSolutionStatus(cause instanceof Error ? cause.message : "Enter all four exact answers."); }
  };
  return <div className="right-triangle-lab">
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="field"><label htmlFor={id + "-case"}>Triangle case</label><select id={id + "-case"} value={index} onChange={event => load(Number(event.target.value))}>{activity.cases.map((entry, i) => <option key={entry.title} value={i}>{entry.title}</option>)}</select></div>
    <div className="right-triangle-controls">
      {(["AB", "AC", "BC"] as const).map(side => <div className="field" key={side}><label htmlFor={id + "-" + side}>{side} (cm)</label><input id={id + "-" + side} value={item[side]} maxLength={200} onChange={event => edit(side, event.target.value)} /></div>)}
      <div className="field"><label htmlFor={id + "-angle"}>Reference angle</label><select id={id + "-angle"} value={item.angleAt} onChange={event => edit("angleAt", event.target.value)}><option value="B">Angle at B</option><option value="C">Angle at C</option></select></div>
      <div className="field"><label htmlFor={id + "-scale"}>Length scale factor</label><input id={id + "-scale"} value={item.scale} maxLength={30} onChange={event => edit("scale", event.target.value)} /></div>
    </div>
    <p className="muted">Use exact positive sides from 1/10 to 100 cm, with AB² + AC² = BC². Fractions and square roots such as 6*sqrt(3) are supported. The rational scale factor may range from 1/10 to 10. These are investigation limits.</p>
    {error && <p className="notice warning" role="alert">{error}</p>}
    {result && <TrianglePlot figure={{ kind: "right-triangle", title: "The same triangle, a chosen reference angle", angleAt: item.angleAt, AB: "$" + formatExact(parseExact(item.AB), true) + "$ cm", AC: "$" + formatExact(parseExact(item.AC), true) + "$ cm", BC: "$" + formatExact(parseExact(item.BC), true) + "$ cm" }} />}
    <h3>1. Predict the side roles</h3>
    <div className="right-triangle-controls">{[["opposite", "Predicted opposite side"], ["adjacent", "Predicted adjacent leg"], ["hypotenuse", "Predicted hypotenuse"]].map(([key, label]) => <div className="field" key={key}><label htmlFor={id + "-predict-" + key}>{label}</label><select id={id + "-predict-" + key} value={predictions[key] ?? ""} onChange={event => { setPredictions({ ...predictions, [key]: event.target.value }); setPredictionStatus(""); setPredicted(false); clearCalculations(); }}><option value="">Choose a side</option><option value="ab">AB</option><option value="ac">AC</option><option value="bc">BC</option></select></div>)}</div>
    <div className="form-actions"><button className="button" disabled={!result} onClick={predict}>Check side predictions</button><button className="button secondary" onClick={() => load(index)}>Reset this case</button></div>
    <p role="status" className="right-prediction-status">{predictionStatus}</p>
    {predicted && result && <section>
      <h3>2. Calculate before comparing</h3>
      <p>Enter exact values for the angle at {item.angleAt}. Ratios have no units. Scale AB by {math(item.scale)}.</p>
      <div className="right-triangle-controls">{[["sin", "Exact sine"], ["cos", "Exact cosine"], ["tan", "Exact tangent"], ["ab", "Scaled AB (cm)"]].map(([key, label]) => <div className="field" key={key}><label htmlFor={id + "-answer-" + key}>{label}</label><input id={id + "-answer-" + key} value={answers[key] ?? ""} maxLength={200} onChange={event => { setAnswers({ ...answers, [key]: event.target.value }); setSolutionStatus(""); setSolved(false); clearExplanation(); }} /></div>)}</div>
      <button className="button" onClick={solve}>Check triangle calculations</button>
      <p role="status" className="right-solution-status">{solutionStatus}</p>
    </section>}
    {solved && result && <section className="right-results">
      <h3>3. Compare and explain</h3>
      <div className="right-table-wrap" role="region" aria-label="Exact triangle comparison" tabIndex={0}>
        <table className="coefficient-table"><caption>Two acute angles in the same right triangle</caption><thead><tr><th scope="col">Quantity</th><th scope="col">At B</th><th scope="col">At C</th></tr></thead><tbody>
          <tr><th scope="row">Opposite side</th><td>{result.B.oppositeSide}</td><td>{result.C.oppositeSide}</td></tr>
          <tr><th scope="row">Adjacent leg</th><td>{result.B.adjacentSide}</td><td>{result.C.adjacentSide}</td></tr>
          <tr><th scope="row">Hypotenuse</th><td>BC</td><td>BC</td></tr>
          {(["sin", "cos", "tan"] as const).map(fn => <tr key={fn}><th scope="row">{fn}</th><td>{math(result.B[fn])}</td><td>{math(result.C[fn])}</td></tr>)}
        </tbody></table>
        <table className="coefficient-table"><caption>Scaling every side by {math(item.scale)}</caption><thead><tr><th scope="col">Side</th><th scope="col">Original (cm)</th><th scope="col">Scaled (cm)</th></tr></thead><tbody>{(["AB", "AC", "BC"] as const).map(side => <tr key={side}><th scope="row">{side}</th><td>{math(item[side])}</td><td>{math(result.scaled[side])}</td></tr>)}</tbody></table>
      </div>
      <div className="field"><label htmlFor={id + "-reason"}>What changes when the reference angle switches?</label><select id={id + "-reason"} value={reason} onChange={event => { setReason(event.target.value); setExplanation(""); }}><option value="">Choose a relationship</option><option value="swap">Leg roles swap; BC stays fixed</option><option value="fixed">Leg roles stay fixed</option><option value="hyp">BC becomes a leg</option></select></div>
      <div className="field"><label htmlFor={id + "-similarity"}>Why do the ratios stay the same after scaling?</label><select id={id + "-similarity"} value={similarity} onChange={event => { setSimilarity(event.target.value); setExplanation(""); }}><option value="">Choose a reason</option><option value="cancel">A common scale factor cancels</option><option value="equal">Side lengths stay the same</option><option value="angle">Angles change with scale</option></select></div>
      <button className="button secondary" onClick={() => setExplanation(reason === "swap" && similarity === "cancel" ? "Correct. The reference angle determines the leg roles, and similarity preserves the ratios. This guided investigation does not award independent evidence." : "Compare both columns: the legs exchange roles, BC stays fixed, and a common length factor cancels from each ratio.")}>Check triangle explanation</button>
      <p role="status" className="right-explanation-status">{explanation}</p>
      <p>Try switching the reference angle without changing any lengths. Then choose a different positive scale and explain why the ratios remain unchanged.</p>
    </section>}
  </div>;
}
