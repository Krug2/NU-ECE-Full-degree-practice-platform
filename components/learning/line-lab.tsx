"use client";

import { useState } from "react";
import type { Lesson } from "@/lib/learning/contracts";
import { equalRational, formatRational, parseRational } from "@/lib/learning/rational";
import { CoordinatePlot } from "./coordinate-plot";
import { Equation, MathText } from "./math-text";

export function LineLab({ activity }: { activity: Extract<Lesson["interaction"], { kind: "line-lab" }> }) {
  const initial = [activity.ax, activity.ay, activity.bx, activity.by].map(String);
  const [coordinates, setCoordinates] = useState(initial), [prediction, setPrediction] = useState(""), [message, setMessage] = useState(""), [result, setResult] = useState<{ rise: number; run: number; slope: string } | null>(null);
  const [ax, ay, bx, by] = coordinates.map(Number);
  const valid = coordinates.every(value => value.trim() !== "" && Number.isInteger(Number(value)) && Math.abs(Number(value)) <= 4) && (ax !== bx || ay !== by);
  const clear = () => { setResult(null); setMessage(""); };
  const check = () => {
    try {
      if (!valid) throw new Error("Choose two distinct points with integer coordinates from -4 to 4.");
      if (!prediction.trim()) throw new Error("Predict the slope first. Use undefined for a vertical line.");
      const rise = by-ay, run = bx-ax, slope = run === 0 ? "undefined" : formatRational(parseRational(`${rise}/${run}`));
      const undefinedInput = prediction.trim().toLowerCase() === "undefined";
      const correct = run === 0 ? undefinedInput : !undefinedInput && equalRational(parseRational(prediction), parseRational(slope));
      setResult({ rise, run, slope });
      setMessage(correct ? "Your slope prediction is correct." : "Compare the signed rise and run, keeping the same point order in both differences.");
    } catch (error) { setResult(null); setMessage(error instanceof Error ? error.message : "Check the prediction."); }
  };
  return <div>
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="activity-controls" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>{["Point A: x", "Point A: y", "Point B: x", "Point B: y"].map((label, index) => <div className="field" key={label}><label htmlFor={`line-coordinate-${index}`}>{label}</label><input id={`line-coordinate-${index}`} type="number" min={-4} max={4} step={1} value={coordinates[index]} onChange={event => { setCoordinates(current => current.map((value, i) => i === index ? event.target.value : value)); clear(); }} /></div>)}</div>
    {valid && <CoordinatePlot figure={{ kind: "coordinates", title: "Line through your points", xLabel: "x", yLabel: "y", xStep: 1, yStep: 1, points: [{ name: "A", xTicks: ax, yTicks: ay }, { name: "B", xTicks: bx, yTicks: by }], line: true }} />}
    <div className="field"><label htmlFor="line-prediction">Predicted slope</label><input id="line-prediction" value={prediction} maxLength={200} onChange={event => { setPrediction(event.target.value); clear(); }} /><small>Use an exact fraction, zero for a horizontal line, or undefined for a vertical line.</small></div>
    <div className="form-actions"><button className="button" onClick={check}>Check slope prediction</button><button className="button secondary" onClick={() => { setCoordinates(initial); setPrediction(""); clear(); }}>Reset points</button></div>
    <p role="status" className="form-status">{message}</p>
    {result && <div className="notice"><Equation display>{`\\Delta y=${by}-(${ay})=${result.rise},\\qquad\\Delta x=${bx}-(${ax})=${result.run}`}</Equation>
      {result.run === 0 ? <p>The run is zero while the rise is nonzero. This vertical line has undefined slope, not zero slope or an infinite numerical slope.</p> : <><Equation display>{`m=\\frac{${result.rise}}{${result.run}}=${result.slope.includes("/") ? `\\frac{${result.slope.split("/")[0]}}{${result.slope.split("/")[1]}}` : result.slope}`}</Equation><p>{result.rise === 0 ? "Zero rise and nonzero run make a horizontal line." : Number(result.rise)/result.run > 0 ? "The positive slope means y increases as x increases." : "The negative slope means y decreases as x increases."} Moving from B back to A reverses both differences, so the slope stays the same.</p></>}
      <p>Make a horizontal line, then a vertical line. Swap the coordinates of A and B and explain what stays unchanged. Two identical points do not determine one unique line.</p>
    </div>}
  </div>;
}
