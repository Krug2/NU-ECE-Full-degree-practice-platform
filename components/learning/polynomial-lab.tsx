"use client";

import { useState } from "react";
import type { Lesson } from "@/lib/learning/contracts";
import { equalPolynomials, evaluatePolynomial, formatPolynomial, parsePolynomial, type Polynomial } from "@/lib/learning/polynomial";
import { formatRational, parseRational } from "@/lib/learning/rational";
import { Equation, MathText } from "./math-text";

type Comparison = { left: Polynomial; right: Polynomial; same: boolean; sample: string; values: string[] };
export function PolynomialLab({ activity }: { activity: Extract<Lesson["interaction"], { kind: "polynomial-lab" }> }) {
  const [index, setIndex] = useState(0), [left, setLeft] = useState(activity.examples[0].left), [right, setRight] = useState(activity.examples[0].right);
  const [prediction, setPrediction] = useState(""), [sample, setSample] = useState("0"), [message, setMessage] = useState(""), [result, setResult] = useState<Comparison | null>(null);
  const clear = () => { setResult(null); setMessage(""); };
  const select = (next: number) => { setIndex(next); setLeft(activity.examples[next].left); setRight(activity.examples[next].right); setPrediction(""); setSample("0"); clear(); };
  const compare = () => {
    try {
      if (!prediction) throw new Error("Predict whether the expressions agree for every real x.");
      const a = parsePolynomial(left), b = parsePolynomial(right), x = parseRational(sample), same = equalPolynomials(a, b);
      setResult({ left: a, right: b, same, sample: formatRational(x), values: [a, b].map(value => formatRational(evaluatePolynomial(value, x))) });
      setMessage((prediction === "yes") === same ? "Your prediction is correct. Compare the coefficients to explain why." : "Revisit your prediction using the expanded coefficients below.");
    } catch (error) { setResult(null); setMessage(error instanceof Error ? error.message : "Check the expressions."); }
  };
  return <div>
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="field"><label htmlFor="polynomial-example">Starting comparison</label><select id="polynomial-example" value={index} onChange={event => select(Number(event.target.value))}>{activity.examples.map((example, i) => <option key={i} value={i}>{example.label}</option>)}</select></div>
    <p id="polynomial-help">Use x, numbers, fractions, parentheses, +, -, *, /, and whole-number powers with ^. Divide only by nonzero constants in this investigation.</p>
    <div className="field"><label htmlFor="polynomial-left">First expression</label><input id="polynomial-left" value={left} maxLength={200} aria-describedby="polynomial-help" onChange={event => { setLeft(event.target.value); clear(); }} /></div>
    <div className="field"><label htmlFor="polynomial-right">Second expression</label><input id="polynomial-right" value={right} maxLength={200} aria-describedby="polynomial-help" onChange={event => { setRight(event.target.value); clear(); }} /></div>
    <div className="field"><label htmlFor="polynomial-prediction">Equal for every real x?</label><select id="polynomial-prediction" value={prediction} onChange={event => { setPrediction(event.target.value); clear(); }}><option value="">Choose a prediction</option><option value="yes">Yes, they are the same polynomial</option><option value="no">No, at least one coefficient differs</option></select></div>
    <div className="field"><label htmlFor="polynomial-sample">Test input x</label><input id="polynomial-sample" value={sample} maxLength={200} onChange={event => { setSample(event.target.value); clear(); }} /><small>A sample can disprove equality, but one matching value cannot prove an identity.</small></div>
    <div className="form-actions"><button className="button" onClick={compare}>Compare polynomials</button><button className="button secondary" onClick={() => select(index)}>Reset comparison</button></div>
    <p role="status" className="form-status">{message}</p>
    {result && <div className="notice">
      <p><strong>{result.same ? "Every coefficient agrees." : "These are different polynomials."}</strong></p>
      <p>First expression, expanded:</p><Equation display>{formatPolynomial(result.left, true)}</Equation>
      <p>Second expression, expanded:</p><Equation display>{formatPolynomial(result.right, true)}</Equation>
      <table className="coefficient-table"><caption>Exact coefficients after collecting like terms</caption><thead><tr><th scope="col">Power of x</th><th scope="col">First</th><th scope="col">Second</th></tr></thead><tbody>{Array.from({ length: Math.max(result.left.length, result.right.length) }, (_, i) => Math.max(result.left.length, result.right.length)-1-i).map(power => <tr key={power}><th scope="row">{power}</th><td>{result.left[power] ? formatRational(result.left[power]) : "0"}</td><td>{result.right[power] ? formatRational(result.right[power]) : "0"}</td></tr>)}</tbody></table>
      <p>At x = {result.sample}, the first value is {result.values[0]} and the second is {result.values[1]}. {result.values[0] !== result.values[1] ? "This input is a counterexample to the proposed identity." : result.same ? "The matching coefficients establish the identity; the sample illustrates it." : "The sample agrees even though the polynomials differ. Try another input."}</p>
      {left === activity.examples[index].left && right === activity.examples[index].right && <p><MathText>{activity.examples[index].explanation}</MathText></p>}
      <p>Change a sign or factor, predict again, and explain which coefficients should change.</p>
    </div>}
  </div>;
}
