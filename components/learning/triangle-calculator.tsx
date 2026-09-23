"use client";

import { useState } from "react";
import type { Lesson } from "@/lib/learning/contracts";
import { angleInRadians, formatPiMultiple } from "@/lib/learning/angles";
import { parseRational } from "@/lib/learning/rational";
import { TrianglePlot } from "./question-figure";
import { MathText } from "./math-text";

const decimal = (value: number) => Math.abs(value) < .0000005 ? "0.000000" : value.toFixed(6);
export function TriangleCalculator({ activity }: { activity: Extract<Lesson["interaction"], { kind: "triangle-calculator" }> }) {
  const [degrees, setDegrees] = useState(String(activity.degrees)), [hypotenuse, setHypotenuse] = useState(String(activity.hypotenuse));
  const [mode, setMode] = useState<"degrees" | "radians">("degrees"), [angle, setAngle] = useState(String(activity.degrees)), [prediction, setPrediction] = useState(""), [message, setMessage] = useState("");
  const [result, setResult] = useState<{ interpreted: number; sine: number; target: number; matches: boolean } | null>(null);
  const targetDegrees = Number(degrees), h = Number(hypotenuse), valid = degrees.trim() !== "" && hypotenuse.trim() !== "" && Number.isInteger(targetDegrees) && targetDegrees >= 1 && targetDegrees <= 89 && Number.isInteger(h) && h >= 1 && h <= 20;
  const clear = () => { setResult(null); setMessage(""); };
  const evaluate = () => {
    try {
      if (!valid) throw new Error("Choose a target angle from 1 to 89 degrees and a whole-number hypotenuse from 1 to 20 cm.");
      const radians = angleInRadians(angle, mode), predicted = parseRational(prediction), value = Number(predicted.numerator)/Number(predicted.denominator), sine = Math.sin(radians), interpreted = radians*180/Math.PI;
      const correct = Math.abs(value-sine) <= .0005;
      setResult({ interpreted, sine, target: Math.sin(targetDegrees*Math.PI/180), matches: Math.abs(interpreted-targetDegrees) <= .01 });
      setMessage(correct ? "Your calculator-result prediction is correct. Now compare the interpreted angle with the target." : "Compare your predicted result with the selected mode and the interpreted angle.");
    } catch (error) { setResult(null); setMessage(error instanceof Error ? error.message : "Check the calculator input."); }
  };
  return <div>
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="activity-controls" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}><div className="field"><label htmlFor="triangle-degrees">Target angle (degrees)</label><input id="triangle-degrees" type="number" min={1} max={89} step={1} value={degrees} onChange={event => { setDegrees(event.target.value); clear(); }} /></div><div className="field"><label htmlFor="triangle-hypotenuse">Hypotenuse (cm)</label><input id="triangle-hypotenuse" type="number" min={1} max={20} step={1} value={hypotenuse} onChange={event => { setHypotenuse(event.target.value); clear(); }} /></div></div>
    {valid && <><p>The target angle at B is {targetDegrees} degrees. Side lengths below are approximate.</p><TrianglePlot figure={{ kind: "right-triangle", title: "Target right triangle", angleAt: "B", AB: `${(h*Math.cos(targetDegrees*Math.PI/180)).toFixed(4)} cm`, AC: `${(h*Math.sin(targetDegrees*Math.PI/180)).toFixed(4)} cm`, BC: `${h} cm` }} /></>}
    <div className="field"><label htmlFor="triangle-mode">Calculator angle mode</label><select id="triangle-mode" value={mode} onChange={event => { setMode(event.target.value as "degrees" | "radians"); clear(); }}><option value="degrees">DEG: degree input</option><option value="radians">RAD: radian input</option></select><small>Changing mode keeps your typed input, so you can observe what a mode mismatch does.</small></div>
    <div className="field"><label htmlFor="triangle-entry">Angle entered into sine</label><input id="triangle-entry" value={angle} maxLength={200} onChange={event => { setAngle(event.target.value); clear(); }} /><small>Use numbers or fractions in degree mode. In radian mode, you can also use an exact pi expression such as pi/6.</small></div>
    <button className="button secondary" disabled={!valid} onClick={() => { setAngle(mode === "degrees" ? degrees : formatPiMultiple(parseRational(`${degrees}/180`))); clear(); }}>Use target angle in this mode</button>
    <div className="field section-space"><label htmlFor="triangle-prediction">Predicted sine value</label><input id="triangle-prediction" value={prediction} maxLength={200} onChange={event => { setPrediction(event.target.value); clear(); }} /><small>Use at least three decimal places or an exact fraction. Comparison tolerance: 0.0005.</small></div>
    <div className="form-actions"><button className="button" onClick={evaluate}>Evaluate sine input</button><button className="button secondary" onClick={() => { setDegrees(String(activity.degrees)); setHypotenuse(String(activity.hypotenuse)); setMode("degrees"); setAngle(String(activity.degrees)); setPrediction(""); clear(); }}>Reset triangle calculator</button></div>
    <p className="form-status" role="status">{message}</p>
    {result && <div className="notice"><p>The entered angle represents approximately {decimal(result.interpreted)} degrees. Its sine is approximately {decimal(result.sine)}.</p><p>{result.matches ? "The entered angle matches the target within 0.01 degree." : "The entered angle differs from the target. A matching sine value alone would not prove that two angles are the same."}</p><p>The target triangle has sine approximately {decimal(result.target)}, equal to its opposite leg divided by its hypotenuse. Changing the hypotenuse scales both legs without changing this ratio.</p><p>Compare {targetDegrees} in DEG mode with its exact pi expression in RAD mode. Then intentionally leave the degree number in RAD mode and explain the difference.</p></div>}
  </div>;
}
