"use client";

import { useState } from "react";
import type { Lesson } from "@/lib/learning/contracts";
import { evaluatePolynomial } from "@/lib/learning/polynomial";
import { parseRationalExpression, type RationalExpression } from "@/lib/learning/rational-expression";
import { divideRational, formatRational, parseRational, type Rational } from "@/lib/learning/rational";
import { Equation, MathText } from "./math-text";

const factor = (n: number) => n === 0 ? "x" : `x${n < 0 ? "+" : "-"}${Math.abs(n)}`;
function valueAt(expression: RationalExpression, x: Rational) {
  const denominator = evaluatePolynomial(expression.denominator, x);
  return denominator.numerator === 0n ? null : formatRational(divideRational(evaluatePolynomial(expression.numerator, x), denominator));
}
type Investigation = { a: number; c: number; sample: string; original: string | null; reduced: string | null; rows: { x: string; original: string | null; reduced: string | null }[] };
export function SimplificationLab({ activity }: { activity: Extract<Lesson["interaction"], { kind: "simplification-lab" }> }) {
  const [a, setA] = useState(String(activity.a)), [b, setB] = useState(String(activity.b)), [c, setC] = useState(String(activity.c));
  const [sample, setSample] = useState(String(activity.a)), [prediction, setPrediction] = useState(""), [message, setMessage] = useState(""), [result, setResult] = useState<Investigation | null>(null);
  const clear = () => { setResult(null); setMessage(""); };
  const values = [a, b, c].map(Number), valid = [a, b, c].every(text => text.trim() !== "") && values.every(value => Number.isInteger(value) && Math.abs(value) <= 8) && new Set(values).size === 3;
  const original = valid ? `((${factor(values[0])})(${factor(values[1])}))/((${factor(values[0])})(${factor(values[2])}))` : "";
  const reduced = valid ? `(${factor(values[1])})/(${factor(values[2])})` : "";
  const check = () => {
    try {
      if (!valid) throw new Error("Choose three distinct integers from -8 to 8 for a, b, and c.");
      if (!prediction) throw new Error("Predict whether the original fraction is defined at your test input.");
      const first = parseRationalExpression(original), second = parseRationalExpression(reduced), x = parseRational(sample), originalValue = valueAt(first, x), reducedValue = valueAt(second, x);
      const inputs = [...new Set([formatRational(x), a, b, c])];
      setResult({ a: values[0], c: values[2], sample: formatRational(x), original: originalValue, reduced: reducedValue, rows: inputs.map(input => ({ x: input, original: valueAt(first, parseRational(input)), reduced: valueAt(second, parseRational(input)) })) });
      setMessage((prediction === "defined") === (originalValue !== null) ? "Your prediction is correct. Check both original denominator factors." : "Revisit the original denominator before canceling a factor.");
    } catch (error) { setResult(null); setMessage(error instanceof Error ? error.message : "Check the inputs."); }
  };
  const reset = () => { setA(String(activity.a)); setB(String(activity.b)); setC(String(activity.c)); setSample(String(activity.a)); setPrediction(""); clear(); };
  return <div>
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="activity-controls">{[["a", "Canceled factor: x minus a", a, setA], ["b", "Numerator factor: x minus b", b, setB], ["c", "Remaining denominator: x minus c", c, setC]].map(([key, label, value, set]) => <div className="field" key={String(key)}><label htmlFor={`fraction-${key}`}>{String(label)}</label><input id={`fraction-${key}`} type="number" min={-8} max={8} step={1} value={String(value)} onChange={event => { (set as (value: string) => void)(event.target.value); clear(); }} /></div>)}</div>
    {valid && <><p>Original fraction:</p><Equation display>{`\\frac{(${factor(values[0])})(${factor(values[1])})}{(${factor(values[0])})(${factor(values[2])})}`}</Equation><p>Formula after canceling the shared factor:</p><Equation display>{`\\frac{${factor(values[1])}}{${factor(values[2])}}`}</Equation></>}
    <div className="field"><label htmlFor="fraction-sample">Test input x</label><input id="fraction-sample" value={sample} maxLength={200} onChange={event => { setSample(event.target.value); clear(); }} /></div>
    <div className="field"><label htmlFor="fraction-prediction">Is the original fraction defined here?</label><select id="fraction-prediction" value={prediction} onChange={event => { setPrediction(event.target.value); clear(); }}><option value="">Choose a prediction</option><option value="defined">Defined</option><option value="undefined">Undefined</option></select></div>
    <div className="form-actions"><button className="button" onClick={check}>Check original domain</button><button className="button secondary" onClick={reset}>Reset factors</button></div>
    <p className="form-status" role="status">{message}</p>
    {result && <div className="notice"><p>At x = {result.sample}, the original fraction is {result.original ?? "undefined"}. The reduced formula is {result.reduced ?? "undefined"}.</p>
      <p>{result.original === null && result.reduced !== null ? "The canceled factor hides a missing input. The reduced formula has a value here, but it cannot supply a value for the original fraction." : result.original === null ? "The remaining denominator is zero here. Both expressions are undefined." : "This input is allowed, so canceling the nonzero common factor preserves the value."}</p>
      <table className="coefficient-table"><caption>Values at the test input and factor zeros</caption><thead><tr><th scope="col">x</th><th scope="col">Original</th><th scope="col">Reduced</th></tr></thead><tbody>{result.rows.map(row => <tr key={row.x}><th scope="row">{row.x}</th><td>{row.original ?? "undefined"}</td><td>{row.reduced ?? "undefined"}</td></tr>)}</tbody></table>
      <p>The original exclusions remain {result.a} and {result.c}. Try an allowed input, then each excluded input. Change the canceled factor and explain which missing input moves.</p>
    </div>}
  </div>;
}
