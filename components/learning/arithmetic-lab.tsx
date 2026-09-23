"use client";

import { useState } from "react";
import type { Lesson } from "@/lib/learning/contracts";
import { equalRational, formatRational, parseRational, type Rational } from "@/lib/learning/rational";
import { Equation, MathText } from "./math-text";

export function ArithmeticLab({activity}:{activity:Extract<Lesson["interaction"],{kind:"arithmetic-lab"}>}) {
  const [index,setIndex]=useState(0),[expression,setExpression]=useState(activity.examples[0].expression);
  const [prediction,setPrediction]=useState(""),[result,setResult]=useState<Rational|null>(null),[message,setMessage]=useState("");
  const reset=()=>{setExpression(activity.examples[index].expression);setPrediction("");setResult(null);setMessage("");};
  const check=()=>{
    try {
      const actual=parseRational(expression),predicted=parseRational(prediction);
      setMessage(equalRational(actual,predicted)?"Your exact prediction is correct.":"Compare your prediction with the exact value. Check the operation order and signs.");
      setResult(actual);
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the expression.");}
  };
  return <div>
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="field"><label htmlFor="arithmetic-example">Starting example</label><select id="arithmetic-example" value={index} onChange={event=>{const next=Number(event.target.value);setIndex(next);setExpression(activity.examples[next].expression);setPrediction("");setResult(null);setMessage("");}}>{activity.examples.map((item,index)=><option key={index} value={index}>{item.label}</option>)}</select></div>
    <div className="field"><label htmlFor="arithmetic-expression">Arithmetic expression</label><input id="arithmetic-expression" value={expression} maxLength={200} onChange={event=>{setExpression(event.target.value);setResult(null);}} aria-describedby="arithmetic-help"/><small id="arithmetic-help">Try changing a sign or adding parentheses. Use numbers, fractions, parentheses, +, -, *, /, and integer powers with ^. Multiplication and division have equal priority and proceed from left to right.</small></div>
    <div className="field"><label htmlFor="arithmetic-prediction">Predicted exact value</label><input id="arithmetic-prediction" value={prediction} maxLength={200} onChange={event=>{setPrediction(event.target.value);setResult(null);}}/></div>
    <div className="form-actions"><button className="button" onClick={check}>Check arithmetic prediction</button><button className="button secondary" onClick={reset}>Reset expression</button></div>
    <p className="form-status" role="status">{message}</p>
    {result&&<div className="notice"><p>Exact value:</p><Equation display>{result.denominator===1n?String(result.numerator):`\\frac{${result.numerator}}{${result.denominator}}`}</Equation><p>Fraction notation: {formatRational(result)}. Decimal display, rounded if necessary: {(Number(result.numerator)/Number(result.denominator)).toPrecision(8)}.</p>{expression===activity.examples[index].expression&&<p><MathText>{activity.examples[index].explanation}</MathText></p>}<p>Change one part of the expression, predict again, and explain why the value stays the same or changes.</p></div>}
  </div>;
}
