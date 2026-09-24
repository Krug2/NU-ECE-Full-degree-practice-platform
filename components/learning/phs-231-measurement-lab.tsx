"use client";

import { useState } from "react";
import { speedBounds, type MeasurementActivity } from "@/lib/learning/phs-231-measurement";
import { parseRational } from "@/lib/learning/rational";
import { MathText } from "./math-text";
import "./phs-231.css";

export function Phs231MeasurementLab({ activity }: { activity: MeasurementActivity }) {
  const initial = [activity.distance, activity.distanceUncertainty, activity.time, activity.timeUncertainty].map(String);
  const [values, setValues] = useState(initial);
  const [predictions, setPredictions] = useState(["", "", ""]);
  const [result, setResult] = useState<ReturnType<typeof speedBounds> | null>(null);
  const [message, setMessage] = useState("");
  const clear = () => { setResult(null); setMessage(""); };
  const check = () => {
    try {
      if (values.some(value => !value.trim())) throw Error("Enter every measurement and uncertainty bound. Zero uncertainty is allowed; an empty input is not zero.");
      const [distance, distanceUncertainty, time, timeUncertainty] = values.map(Number);
      if (![distance, distanceUncertainty, time, timeUncertainty].every(Number.isFinite) || distance < 0 || distanceUncertainty < 0 || time <= 0 || timeUncertainty < 0 || distanceUncertainty > distance || timeUncertainty >= time || Math.max(...values.map(Number)) > 10000) {
        throw Error("Use finite values up to 10000. Distance bounds must stay nonnegative; time bounds must stay strictly positive.");
      }
      if (predictions.some(value => !value.trim())) throw Error("Predict all three speeds before revealing the comparison. Exact fractions or decimal numbers are accepted.");
      const predicted = predictions.map(value => { const r = parseRational(value); return Number(r.numerator)/Number(r.denominator); });
      if (!predicted.every(Number.isFinite)) throw Error("Enter finite speed predictions.");
      const actual = speedBounds({ distance, distanceUncertainty, time, timeUncertainty });
      const labels = ["central speed", "minimum speed", "maximum speed"];
      const missed = [actual.central, actual.lower, actual.upper].flatMap((value, i) => Math.abs(value-predicted[i]) <= .00005 ? [] : [labels[i]]);
      setResult(actual);
      setMessage(missed.length ? `Revisit ${missed.join(", ")}. Minimum speed uses the smallest distance and largest time; maximum speed uses the largest distance and smallest time.` : "All three predictions agree with the stated measurement bounds.");
    } catch (error) { setResult(null); setMessage(error instanceof Error ? error.message : "Check your entries."); }
  };
  return <div className="phs231-investigation">
    <p><MathText>{activity.prompt}</MathText></p>
    <p className="muted">This is a calculation using supplied bounds, not a physical measurement. Every combination of the allowed distance and time is possible. Controls reset on reload; save your findings in the lesson notes.</p>
    <div className="phs231-controls">{["Distance (m)", "Distance uncertainty bound (m)", "Elapsed time (s)", "Time uncertainty bound (s)"].map((label, i) => <div className="field" key={label}>
      <label htmlFor={`phs231-measure-${i}`}>{label}</label><input id={`phs231-measure-${i}`} type="number" min="0" max="10000" step="any" value={values[i]} onChange={event => { setValues(current => current.map((v, j) => j === i ? event.target.value : v)); clear(); }}/>
    </div>)}</div>
    <fieldset className="phs231-predictions"><legend>Predict the speed interval</legend><p>Enter m/s to at least four decimal places, or as exact fractions. Accepted absolute error: 0.00005 m/s.</p><div className="phs231-controls">{["Predicted central speed (m/s)", "Predicted minimum speed (m/s)", "Predicted maximum speed (m/s)"].map((label, i) => <div className="field" key={label}><label htmlFor={`phs231-predict-${i}`}>{label}</label><input id={`phs231-predict-${i}`} value={predictions[i]} maxLength={200} onChange={event => { setPredictions(current => current.map((v, j) => j === i ? event.target.value : v)); clear(); }}/></div>)}</div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check speed predictions</button><button className="button secondary" onClick={() => { setValues(initial); setPredictions(["", "", ""]); clear(); }}>Reset measurement</button></div>
    <p role="status" className="form-status">{message}</p>
    {result && <div className="notice"><div className="phs231-table"><table><caption>Speed from the allowed measurement intervals</caption><thead><tr><th scope="col">Quantity</th><th scope="col">Distance used (m)</th><th scope="col">Time used (s)</th><th scope="col">Speed (m/s)</th></tr></thead><tbody>{[
      ["Central", Number(values[0]), Number(values[2]), result.central],
      ["Minimum", Number(values[0])-Number(values[1]), Number(values[2])+Number(values[3]), result.lower],
      ["Maximum", Number(values[0])+Number(values[1]), Number(values[2])-Number(values[3]), result.upper],
    ].map(([label, distance, time, speed]) => <tr key={label}><th scope="row">{label}</th><td>{Number(distance).toPrecision(7)}</td><td>{Number(time).toPrecision(7)}</td><td>{Number(speed).toFixed(6)}</td></tr>)}</tbody></table></div>
      <p>A larger distance raises the ratio; a larger positive time lowers it. The central quotient need not sit halfway between the bounds. These bounds make no claim about probability.</p>
      <p>Now double only the time uncertainty. Predict which endpoint moves farther from the central speed, check, and explain why. Then set both uncertainties to zero and check the limiting case. If an allowed time reaches zero, this bounded-speed model is unavailable.</p>
    </div>}
  </div>;
}
