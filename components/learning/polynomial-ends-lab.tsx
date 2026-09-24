"use client";

import { useId,useState } from "react";
import { compareLeadingTerm,polynomialBehavior } from "@/lib/learning/polynomial-behavior";
import { polynomialWindows,samplePolynomialComparison,type PolynomialCase } from "@/lib/learning/polynomial-exploration";
import { equalRational,parseRational } from "@/lib/learning/rational";
import { formatPolynomial,parsePolynomial } from "@/lib/learning/polynomial";
import { Equation,MathText } from "./math-text";

const emptyAnswers=()=>({degree:"",coefficient:"",turns:"",left:"",right:""});
export function PolynomialEndsLab({activity}:{activity:{prompt:string;cases:PolynomialCase[]}}){
  const id=useId(),[index,setIndex]=useState(0),[extent,setExtent]=useState(10);
  const [answers,setAnswers]=useState(emptyAnswers),[revealed,setRevealed]=useState(false),[message,setMessage]=useState("");
  const item=activity.cases[index],result=polynomialBehavior(item.polynomial);
  const clear=()=>{setRevealed(false);setMessage("");};
  const load=(next:number)=>{setIndex(next);setExtent(10);setAnswers(emptyAnswers());clear();};
  const change=(key:keyof typeof answers,value:string)=>{setAnswers({...answers,[key]:value});clear();};
  const check=()=>{
    try{
      if(Object.values(answers).some(value=>!value.trim()))throw new Error("Enter all five predictions before checking the polynomial.");
      const same=(value:string,expected:string|number)=>equalRational(parseRational(value),parseRational(String(expected)));
      if(result.ends.kind!=="unbounded")throw new Error("Choose a nonconstant polynomial for this investigation.");
      const degree=same(answers.degree,result.degree!),coefficient=same(answers.coefficient,result.leadingCoefficient!),turns=same(answers.turns,result.maxTurningPoints);
      const ends=answers.left===result.ends.left&&answers.right===result.ends.right;
      setRevealed(true);setMessage(degree&&coefficient&&turns&&ends?"All predictions are correct. Expand the window and compare the exact values.":!degree?"Collect like terms before finding the greatest surviving exponent.":!coefficient?"Use the coefficient of the actual highest-degree term, including its sign.":!ends?"Use degree parity for matching or opposite ends, and the leading coefficient for the right end.":"The degree-based maximum is n - 1. This is a bound, not an automatic exact count.");
    }catch(error){setRevealed(false);setMessage(error instanceof Error?error.message:"Check the predictions.");}
  };
  const graph=revealed?samplePolynomialComparison(item.polynomial,extent):null;
  const X=(x:number)=>100+350*(x+extent)/(2*extent),Y=(y:number)=>240-200*(y+graph!.yExtent)/(2*graph!.yExtent);
  const tick=(value:number)=>Math.abs(value)>=10_000?value.toExponential(1).replace("e+","e"):Number(value.toPrecision(3)).toString();
  const given=item.polynomial.replaceAll("*","\\cdot ").replace(/\^(\d+)/g,"^{$1}");
  return <div>
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="field"><label htmlFor="polynomial-case">Polynomial example</label><select id="polynomial-case" value={index} onChange={event=>load(Number(event.target.value))}>{activity.cases.map((entry,i)=><option key={entry.title} value={i}>{entry.title}</option>)}</select></div>
    <Equation display>{"p(x)="+given}</Equation>
    <div className="calibration-controls">{([["degree","Predicted degree"],["coefficient","Predicted leading coefficient"],["turns","Predicted maximum turning points"]] as const).map(([key,label])=><div className="field" key={key}><label htmlFor={"polynomial-"+key}>{label}</label><input id={"polynomial-"+key} value={answers[key]} maxLength={100} onChange={event=>change(key,event.target.value)}/></div>)}{(["left","right"] as const).map(side=><div className="field" key={side}><label htmlFor={"polynomial-"+side}>Predicted {side} end</label><select id={"polynomial-"+side} value={answers[side]} onChange={event=>change(side,event.target.value)}><option value="">Choose a direction</option><option value="up">Up without bound</option><option value="down">Down without bound</option></select></div>)}</div>
    <div className="form-actions"><button className="button" onClick={check}>Check polynomial predictions</button><button className="button secondary" onClick={()=>load(0)}>Reset polynomial</button></div>
    <p className="form-status" role="status">{message}</p>
    {revealed&&graph&&result.ends.kind==="unbounded"&&<div className="polynomial-results">
      <div className="notice"><p>Degree: {result.degree}. Leading coefficient: {result.leadingCoefficient}. At most {result.maxTurningPoints} turning points.</p><Equation display>{"L(x)="+formatPolynomial(parsePolynomial(result.leadingTerm!),true)}</Equation><p className="polynomial-directions">Far left: {result.ends.left}. Far right: {result.ends.right}. These conclusions stay the same when the window changes.</p></div>
      <div className="field section-space"><label htmlFor="polynomial-window">Horizontal graph window</label><select id="polynomial-window" value={extent} onChange={event=>setExtent(Number(event.target.value))}>{polynomialWindows.map(value=><option key={value} value={value}>-{value} to {value}</option>)}</select></div>
      <p>The vertical range adjusts to include both sampled curves on the same axes. Use the axis labels and exact table rather than screen steepness. A finite drawing cannot prove the behavior at infinity or reveal every turning point.</p>
      <figure className="function-figure polynomial-figure"><svg viewBox="0 0 480 300" role="img" aria-labelledby={id+"-title "+id+"-description"}>
        <title id={id+"-title"}>Polynomial and leading term on shared axes</title><desc id={id+"-description"}>Solid curve: the polynomial. Dashed curve: its leading term. The horizontal window runs from {-extent} to {extent}. The exact table below gives both values and their ratio at five inputs.</desc>
        <rect x="100" y="40" width="350" height="200" fill="white" stroke="#526873"/>
        <line x1="100" x2="450" y1={Y(0)} y2={Y(0)} stroke="#a3b4ac"/><line x1={X(0)} x2={X(0)} y1="40" y2="240" stroke="#a3b4ac"/>
        <polyline className="polynomial-curve" points={graph.samples.map(point=>`${X(point.x)},${Y(point.polynomial)}`).join(" ")} fill="none" stroke="#235c45" strokeWidth="3"/>
        <polyline className="leading-curve" points={graph.samples.map(point=>`${X(point.x)},${Y(point.leading)}`).join(" ")} fill="none" stroke="#963914" strokeWidth="2" strokeDasharray="7 5"/>
        {[-1,0,1].map(part=><g key={part} fill="#203b3e" fontSize="14"><text x={X(part*extent)} y="263" textAnchor="middle">{part*extent}</text><text x="90" y={Y(part*graph.yExtent)+5} textAnchor="end">{tick(part*graph.yExtent)}</text></g>)}
        <text x="275" y="288" textAnchor="middle" fill="#203b3e" fontSize="14">Input x</text><text x="100" y="24" fill="#203b3e" fontSize="14">Output</text>
      </svg><figcaption>Solid: p(x). Dashed: L(x). Graph coordinates are sampled and tick labels rounded; the table uses exact arithmetic.</figcaption></figure>
      <div className="calibration-table-wrap" tabIndex={0} role="region" aria-label="Exact polynomial comparison"><table className="coefficient-table"><caption>Exact comparison in the current window</caption><thead><tr><th scope="col">Input x</th><th scope="col">Polynomial p(x)</th><th scope="col">Leading term L(x)</th><th scope="col">Ratio p(x)/L(x)</th></tr></thead><tbody>{[-extent,-extent/2,0,extent/2,extent].map(input=>{const row=compareLeadingTerm(item.polynomial,String(input));return <tr key={input}><th scope="row">{row.input}</th><td>{row.polynomial}</td><td>{row.leading}</td><td>{row.ratio??"Undefined: L(x) = 0"}</td></tr>;})}</tbody></table></div>
      <p>Compare the nonzero-input ratios as the window expands. Eventual dominance means the ratio approaches 1; it does not require the absolute difference to approach zero.</p>
    </div>}
  </div>;
}
