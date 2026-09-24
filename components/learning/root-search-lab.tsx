"use client";

import { useId,useState } from "react";
import { approximateExact,formatExact,parseExact,realExact } from "@/lib/learning/exact-number";
import { degree,evaluatePolynomial,formatPolynomial,parsePolynomial } from "@/lib/learning/polynomial";
import { dividePolynomials } from "@/lib/learning/polynomial-division";
import { combineRoots,evaluatePolynomialExact,exactRootMultiplicity,quadraticRoots,rationalRootCandidates,type RootSearchCase } from "@/lib/learning/polynomial-roots";
import { samplePolynomialComparison } from "@/lib/learning/polynomial-exploration";
import { equalRootLists,parseRootList } from "@/lib/learning/root-list";
import { equalRational,formatRational,negateRational,parseRational } from "@/lib/learning/rational";
import { Equation,MathText } from "./math-text";

type CandidateCheck={polynomial:string;candidate:string;value:string;correct:boolean};
type Removal={before:string;root:string;after:string};
export function RootSearchLab({activity}:{activity:{prompt:string;cases:RootSearchCase[]}}){
  const id=useId(),[index,setIndex]=useState(0),[current,setCurrent]=useState(activity.cases[0].polynomial),[candidate,setCandidate]=useState(""),[prediction,setPrediction]=useState("");
  const [checks,setChecks]=useState<CandidateCheck[]>([]),[checked,setChecked]=useState<CandidateCheck|null>(null),[removals,setRemovals]=useState<Removal[]>([]);
  const [rootAnswer,setRootAnswer]=useState(""),[countAnswer,setCountAnswer]=useState(""),[hint,setHint]=useState(false),[revealed,setRevealed]=useState(false),[message,setMessage]=useState(""),[extent,setExtent]=useState(5);
  const original=parsePolynomial(activity.cases[index].polynomial),remaining=parsePolynomial(current),search=rationalRootCandidates(remaining),canFinish=degree(remaining)<=2;
  const residualRoots=canFinish?quadraticRoots(remaining):[];
  const roots=combineRoots([...removals.map(row=>({root:row.root,multiplicity:1})),...residualRoots]);
  const realRoots=roots.filter(row=>realExact(parseExact(row.root)));
  const clearFinal=()=>{setRootAnswer("");setCountAnswer("");setHint(false);setRevealed(false);};
  const load=(next:number)=>{setIndex(next);setCurrent(activity.cases[next].polynomial);setCandidate("");setPrediction("");setChecks([]);setChecked(null);setRemovals([]);setMessage("");setExtent(5);clearFinal();};
  const changeCandidate=(value:string)=>{setCandidate(value);setPrediction("");setChecked(null);setMessage("");};
  const checkCandidate=()=>{
    try{
      if(!candidate||!prediction.trim())throw new Error("Choose a candidate and predict its exact evaluation before checking.");
      const value=formatRational(evaluatePolynomial(remaining,parseRational(candidate))),correct=equalRational(parseRational(prediction),parseRational(value));
      const result={polynomial:formatPolynomial(remaining),candidate,value,correct};
      setChecked(result);setChecks([...checks,result]);
      setMessage(!correct?"The exact evaluation is "+value+". Check the sign and every coefficient, then correct your prediction.":value==="0"?"Evaluation correct: this candidate is a root of the current polynomial. Remove one factor, then test again if it may repeat.":"Evaluation correct: the nonzero result rejects this candidate for the current polynomial.");
    }catch(error){setMessage(error instanceof Error?error.message:"Check the candidate and its evaluation.");}
  };
  const removeFactor=()=>{
    if(!checked?.correct||checked.value!=="0")return;
    const result=dividePolynomials(remaining,[negateRational(parseRational(checked.candidate)),parseRational("1")]);
    if(result.remainder.some(value=>value.numerator!==0n)){setMessage("The proposed division could not be verified.");return;}
    const after=formatPolynomial(result.quotient);
    setRemovals([...removals,{before:formatPolynomial(remaining),root:checked.candidate,after}]);setCurrent(after);
    setCandidate("");setPrediction("");setChecked(null);clearFinal();
    setMessage("One factor removed with zero remainder. The original scale stays in the quotient. A repeated root must be confirmed again.");
  };
  const checkRoots=()=>{
    try{
      if(!rootAnswer.trim()||!countAnswer.trim())throw new Error("Enter the complete root list and the number of distinct real intercepts.");
      if(roots.reduce((sum,row)=>sum+row.multiplicity,0)!==degree(original)||roots.some(row=>exactRootMultiplicity(original,parseExact(row.root))!==row.multiplicity))throw new Error("The complete root list could not be independently verified.");
      const expected=roots.flatMap(row=>Array.from({length:row.multiplicity},()=>parseExact(row.root)));
      if(!equalRootLists(parseRootList(rootAnswer),expected))throw new Error("Keep every removed root, every repetition, and both quadratic branches. The total number of entries must match the original degree.");
      if(!equalRational(parseRational(countAnswer),parseRational(String(realRoots.length))))throw new Error("Count distinct real root values once. Repetitions share one intercept, and nonreal roots do not appear on the real x-axis.");
      setRevealed(true);setMessage("Complete root list verified. Compare its multiplicities and nonreal roots with the real graph.");
    }catch(error){setRevealed(false);setMessage(error instanceof Error?error.message:"Check the complete root list.");}
  };
  const plot=revealed?samplePolynomialComparison(activity.cases[index].polynomial,extent):null;
  const X=(x:number)=>100+350*(x+extent)/(2*extent),Y=(y:number)=>140-100*y/plot!.yExtent;
  const visibleRoots=realRoots.filter(row=>Math.abs(approximateExact(parseExact(row.root)).real)<=extent);
  const tick=(value:number)=>Math.abs(value)>=10000?value.toExponential(1).replace("e+","e"):String(Number(value.toPrecision(3)));
  return <div>
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="field"><label htmlFor={id+"-case"}>Root search example</label><select id={id+"-case"} value={index} onChange={event=>load(Number(event.target.value))}>{activity.cases.map((item,i)=><option key={item.title} value={i}>{item.title}</option>)}</select></div>
    <p>Original polynomial:</p><Equation display>{"P(x)="+formatPolynomial(original,true)}</Equation>
    <p>Current polynomial after {removals.length} factor removals:</p><Equation display>{"S(x)="+formatPolynomial(remaining,true)}</Equation>
    {removals.length>0&&<ol aria-label="Confirmed factor removals">{removals.map((row,i)=><li key={i}><Equation display>{formatPolynomial(parsePolynomial(row.before),true)+"=(x-("+row.root+"))("+formatPolynomial(parsePolynomial(row.after),true)+")"}</Equation></li>)}</ol>}
    {search.candidates.length>0?<div>
      <p>After clearing coefficient fractions and extracting any zero factors, the rational candidates for the current polynomial are {search.candidates.join(", ")}. They are possibilities to test. A quadratic may have only irrational or nonreal roots.</p>
      <div className="calibration-controls">
        <div className="field"><label htmlFor={id+"-candidate"}>Candidate to test</label><select id={id+"-candidate"} value={candidate} onChange={event=>changeCandidate(event.target.value)}><option value="">Choose a rational candidate</option>{search.candidates.map(value=><option key={value} value={value}>{value}</option>)}</select></div>
        <div className="field"><label htmlFor={id+"-prediction"}>Predicted exact value of S(c)</label><input id={id+"-prediction"} value={prediction} maxLength={100} onChange={event=>{setPrediction(event.target.value);setChecked(null);setMessage("");}}/></div>
      </div>
      <div className="form-actions"><button className="button" onClick={checkCandidate}>Check candidate</button><button className="button secondary" disabled={!checked?.correct||checked.value!=="0"} onClick={removeFactor}>Remove one factor</button></div>
    </div>:<p>The remaining polynomial is a nonzero constant, so no further roots remain.</p>}
    <p className="form-status" role="status">{message}</p>
    {checks.length>0&&<div className="calibration-table-wrap" role="region" tabIndex={0} aria-label="Exact candidate checks"><table className="coefficient-table"><caption>Candidate tests for the polynomial shown in each row</caption><thead><tr><th scope="col">Polynomial tested</th><th scope="col">Candidate</th><th scope="col">Exact value</th><th scope="col">Prediction</th></tr></thead><tbody>{checks.map((row,i)=><tr key={i}><th scope="row">{row.polynomial}</th><td>{row.candidate}</td><td>{row.value}</td><td>{row.correct?"Correct":"Needs correction"}</td></tr>)}</tbody></table></div>}
    {canFinish?<div className="root-search-finish">
      <h3>Finish the root list</h3><p>{degree(remaining)===2?"Solve the remaining quadratic exactly, keeping both branches and any repeated root.":degree(remaining)===1?"Solve the remaining linear equation.":"The remaining nonzero constant contributes no roots."} Combine that result with every factor already removed.</p>
      <button className="button secondary" onClick={()=>setHint(true)}>Show remaining roots</button>
      {hint&&<p className="notice">The remaining polynomial contributes {residualRoots.length?residualRoots.map(row=>row.root+" (multiplicity "+row.multiplicity+")").join("; "):"no roots"}. This is supported exploration, separate from independent checkpoint evidence.</p>}
      <div className="field section-space"><label htmlFor={id+"-roots"}>Complete complex root list with repetitions</label><input id={id+"-roots"} maxLength={500} value={rootAnswer} onChange={event=>{setRootAnswer(event.target.value);setRevealed(false);setMessage("");}} aria-describedby={id+"-roots-help"}/><small id={id+"-roots-help"}>Separate roots with commas and repeat each for its multiplicity. Use exact fractions, sqrt(2), and i. For example: 2, 2, i, -i.</small></div>
      <div className="field"><label htmlFor={id+"-count"}>Predicted distinct real x-intercepts</label><input id={id+"-count"} maxLength={100} value={countAnswer} onChange={event=>{setCountAnswer(event.target.value);setRevealed(false);setMessage("");}}/></div>
      <button className="button" onClick={checkRoots}>Check complete roots</button>
    </div>:<p>Confirm and remove a rational factor to reduce the degree. When the remaining degree is at most two, finish the complete root list.</p>}
    <div className="form-actions section-space"><button className="button secondary" onClick={()=>load(0)}>Reset root search</button></div>
    {revealed&&plot&&<div className="root-search-result">
      <div className="notice"><p>{roots.length} distinct complex roots; {degree(original)} roots with multiplicity; {realRoots.length} distinct real x-intercepts. Every listed root was checked in the original polynomial.</p></div>
      <div className="calibration-table-wrap" role="region" tabIndex={0} aria-label="Complete root verification"><table className="coefficient-table"><caption>Exact roots, multiplicities, and their relationship to the real graph</caption><thead><tr><th scope="col">Root</th><th scope="col">Multiplicity</th><th scope="col">Type</th><th scope="col">Original P at root</th></tr></thead><tbody>{roots.map(row=><tr key={row.root}><th scope="row"><Equation>{formatExact(parseExact(row.root),true)}</Equation></th><td>{row.multiplicity}</td><td>{realExact(parseExact(row.root))?"Real intercept":"Nonreal"}</td><td>{formatExact(evaluatePolynomialExact(original,parseExact(row.root)))}</td></tr>)}</tbody></table></div>
      <div className="field section-space"><label htmlFor={id+"-window"}>Real graph window</label><select id={id+"-window"} value={extent} onChange={event=>setExtent(Number(event.target.value))}>{[2,5,10].map(value=><option key={value} value={value}>-{value} to {value}</option>)}</select></div>
      <p>{visibleRoots.length} of {realRoots.length} real intercepts are inside this window. A repeated real root has one location. Nonreal roots have no real x-axis location. The table establishes the exact roots; the finite graph is an approximation.</p>
      <figure className="function-figure polynomial-figure"><svg viewBox="0 0 480 300" role="img" aria-labelledby={id+"-graph-title "+id+"-graph-desc"}>
        <title id={id+"-graph-title"}>Real graph of the original polynomial</title><desc id={id+"-graph-desc"}>The curve plots real inputs from {-extent} to {extent}. Markers identify the verified real zeros within that window. The exact root table also includes repeated and nonreal roots that this real graph cannot distinguish by counting intercepts.</desc>
        <rect x="100" y="40" width="350" height="200" fill="white" stroke="#526873"/><line x1="100" x2="450" y1="140" y2="140" stroke="#a3b4ac"/><line x1={X(0)} x2={X(0)} y1="40" y2="240" stroke="#a3b4ac"/>
        <polyline className="root-search-curve" points={plot.samples.map(point=>X(point.x)+","+Y(point.polynomial)).join(" ")} fill="none" stroke="#235c45" strokeWidth="3"/>
        {visibleRoots.map(row=><circle key={row.root} cx={X(approximateExact(parseExact(row.root)).real)} cy="140" r="4" fill="white" stroke="#203b3e"><title>Real zero {row.root}; multiplicity {row.multiplicity}</title></circle>)}
        {[-extent,0,extent].map(x=><text key={x} x={X(x)} y="263" textAnchor="middle" fill="#203b3e" fontSize="14">{x}</text>)}
        {[-plot.yExtent,0,plot.yExtent].map((y,i)=><text key={i} x="90" y={Y(y)+5} textAnchor="end" fill="#203b3e" fontSize="14">{tick(y)}</text>)}
        <text x="275" y="288" textAnchor="middle" fill="#203b3e" fontSize="14">Real input x</text><text x="100" y="24" fill="#203b3e" fontSize="14">P(x)</text>
      </svg><figcaption>The original polynomial uses real x and y axes. Changing this window changes the view, not the verified root list.</figcaption></figure>
      <p>Explain why counting intercepts would miss repetitions or nonreal roots in this example. This investigation does not award objective evidence.</p>
    </div>}
  </div>;
}
