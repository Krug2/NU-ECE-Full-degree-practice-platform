"use client";

import { useId,useMemo,useState } from "react";
import { calculateNaturalExponential,displayExponentialValue,exponentialComparisonSamples,inspectExponentialPattern,matchesExponentialValue,predictExponentialComparison,type ExponentialLabCase } from "@/lib/learning/exponential-investigation";
import { exponentialLatex,type ExponentialValue } from "@/lib/learning/exponential-functions";
import { formatExact,parseExact } from "@/lib/learning/exact-number";
import { formatIntervals } from "@/lib/learning/intervals";
import { rationalLatex } from "@/lib/learning/transformations";
import { Equation,MathText } from "./math-text";

type Comparison=ReturnType<typeof predictExponentialComparison>;
const blankPattern={first:"",second:"",factor:"",kind:""};
const blankPrediction={exponential:"",linear:""};
const rationalOrText=(source:string)=>formatExact(parseExact(source),true);
function ExponentialPlot({item,step,result,id}:{item:ExponentialLabCase;step:string;result:Comparison;id:string}){
  const plot=useMemo(()=>exponentialComparisonSamples(item,step,result.input),[item,step,result.input]);
  const values=[0,plot.baseline,...plot.points.flatMap(point=>[point.exponential,point.linear])],low=Math.min(...values),high=Math.max(...values),padding=Math.max(high-low,1)*.1,min=low-padding,max=high+padding;
  const X=(x:number)=>92+(x-plot.lower)/(plot.upper-plot.lower)*370,Y=(y:number)=>252-(y-min)/(max-min)*195;
  return <figure className="function-figure polynomial-figure exponential-figure"><svg viewBox="0 0 500 330" role="img" aria-labelledby={id+"-plot-title "+id+"-plot-desc"}>
    <title id={id+"-plot-title"}>Exponential response and a line through the first two observations</title><desc id={id+"-plot-desc"}>A solid purple exponential curve and dashed green comparison line use the same axes. The dotted brown horizontal line marks the exponential baseline. A purple circle and green square mark the prediction input. Tables give the observations and prediction values independently of this finite sampled window.</desc>
    <rect x="92" y="57" width="370" height="195" fill="white" stroke="#526873"/>
    <line x1="92" x2="462" y1={Y(0)} y2={Y(0)} stroke="#a3b4ac"/>
    {plot.lower<=0&&plot.upper>=0&&<line x1={X(0)} x2={X(0)} y1="57" y2="252" stroke="#a3b4ac"/>}
    <line className="exponential-baseline" x1="92" x2="462" y1={Y(plot.baseline)} y2={Y(plot.baseline)} stroke="#79592a" strokeDasharray="2 6" strokeWidth="2"/>
    <polyline className="exponential-curve" points={plot.points.map(point=>X(point.x)+","+Y(point.exponential)).join(" ")} fill="none" stroke="#735299" strokeWidth="3"/>
    <polyline className="exponential-linear-curve" points={plot.points.map(point=>X(point.x)+","+Y(point.linear)).join(" ")} fill="none" stroke="#235c45" strokeWidth="3" strokeDasharray="8 5"/>
    <circle className="exponential-selected-point" cx={X(plot.target.x)} cy={Y(plot.target.exponential)} r="6" fill="#735299" stroke="white" strokeWidth="2"/>
    <rect className="exponential-linear-point" x={X(plot.target.x)-5} y={Y(plot.target.linear)-5} width="10" height="10" fill="#235c45" stroke="white" strokeWidth="2"/>
    {[plot.lower,(plot.lower+plot.upper)/2,plot.upper].map(x=><text key={x} x={X(x)} y="280" textAnchor="middle" fill="#203b3e" fontSize="16">{Number(x.toPrecision(3))}</text>)}
    {[min,(min+max)/2,max].map(y=><text key={y} x="82" y={Y(y)+5} textAnchor="end" fill="#203b3e" fontSize="16">{Number(y.toPrecision(3))}</text>)}
    <text x="275" y="312" textAnchor="middle" fill="#203b3e" fontSize="16">input x (s)</text><text x="92" y="32" fill="#203b3e" fontSize="16">response (V)</text>
  </svg><figcaption>Purple solid: exponential model. Green dashed: line through the first two observations. Brown dotted: baseline {item.model.k} V. The markers show your prediction input and can overlap. This window includes all three observations and the prediction input; it does not limit either function&apos;s domain. Sampled curves illustrate the formulas, while the tables preserve exact values where available.</figcaption></figure>;
}
function NaturalCalculator({id}:{id:string}){
  const [inputs,setInputs]=useState({exponent:"",scale:"1",offset:"0"}),[result,setResult]=useState<{value:ExponentialValue;formula:string}|null>(null),[message,setMessage]=useState("");
  const calculate=()=>{
    try{
      const value=calculateNaturalExponential(inputs.exponent,inputs.scale,inputs.offset);
      setResult({value,formula:"\\left("+rationalLatex(inputs.scale)+"\\right)e^{"+rationalLatex(inputs.exponent)+"}+\\left("+rationalLatex(inputs.offset)+"\\right)"});
      setMessage(value.status==="overflow"?"This value exceeds the numerical display range. It is mathematically finite, not undefined.":value.precision==="rounded-to-baseline"?"The exponential term is too small for this display to distinguish the result from the baseline. It has not become exactly zero.":"Calculated. Retain extra digits and round only the requested final answer.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the calculator inputs.");}
  };
  return <section className="natural-calculator"><h3>Natural exponential calculator</h3><p>Calculate <Equation>{"a e^z+k"}</Equation> for the continuous-rate exercises. For a factor, use a = 1 and k = 0. For an effective percentage, use a = 100 and k = -100. For a response, use its coefficient and baseline. Enter the complete exponent, including elapsed time.</p>
    <div className="activity-controls">{([ ["exponent","Calculator exponent z"],["scale","Calculator scale a"],["offset","Calculator baseline k"] ] as const).map(([key,label])=><div className="field" key={key}><label htmlFor={id+"-calculator-"+key}>{label}</label><input id={id+"-calculator-"+key} value={inputs[key]} maxLength={100} aria-describedby={id+"-calculator-help"} onChange={event=>{setInputs({...inputs,[key]:event.target.value});setResult(null);setMessage("");}}/></div>)}</div>
    <p className="muted" id={id+"-calculator-help"}>Use fractions, decimals, or arithmetic such as -1/2 * 6. Calculator inputs are limited to +/-1,000,000; these control limits do not restrict the mathematical exponential function. Approximate results show fourteen significant digits. This calculator does not award objective evidence.</p>
    <button className="button secondary" onClick={calculate}>Calculate natural exponential</button><p className="form-status exponential-calculator-status" role="status">{message}</p>
    {result&&<div className="notice exponential-calculator-result"><Equation display>{result.formula}</Equation><p>{displayExponentialValue(result.value,14)}</p></div>}
  </section>;
}
export function ExponentialLab({activity}:{activity:{prompt:string;cases:ExponentialLabCase[]}}){
  const id=useId(),[index,setIndex]=useState(0),[step,setStep]=useState(activity.cases[0].step),[answers,setAnswers]=useState(blankPattern),[confirmed,setConfirmed]=useState(false),[patternMessage,setPatternMessage]=useState("");
  const [target,setTarget]=useState(activity.cases[0].predictionInput),[predictions,setPredictions]=useState(blankPrediction),[result,setResult]=useState<Comparison|null>(null),[message,setMessage]=useState(""),[calculatorVersion,setCalculatorVersion]=useState(0);
  const item=activity.cases[index],inspection=useMemo(()=>{try{return {pattern:inspectExponentialPattern(item,step),error:""};}catch(error){return {pattern:null,error:error instanceof Error?error.message:"Check the observation step."};}},[item,step]),pattern=inspection.pattern;
  const clearPrediction=()=>{setResult(null);setMessage("");};
  const clearPattern=()=>{setConfirmed(false);setPatternMessage("");clearPrediction();};
  const load=(next:number)=>{const entry=activity.cases[next];setIndex(next);setStep(entry.step);setTarget(entry.predictionInput);setAnswers(blankPattern);setPredictions(blankPrediction);clearPattern();};
  const checkPattern=()=>{
    try{
      if(!pattern)throw new Error(inspection.error);
      if(Object.values(answers).some(answer=>!answer.trim()))throw new Error("Predict both differences, the deviation factor, and the pattern before checking.");
      if(!matchesExponentialValue(answers.first,pattern.differences[0])||!matchesExponentialValue(answers.second,pattern.differences[1]))throw new Error("Review the successive differences. Subtract each response from the next response, keeping the sign and the stated time step.");
      if(!matchesExponentialValue(answers.factor,pattern.factor))throw new Error("Review the factor. Subtract the baseline from each response, then divide consecutive deviations for this same time step.");
      if(answers.kind!=="exponential")throw new Error("The differences change, but the positive baseline-relative factor stays constant. These records fit an exponential model, allowing for displayed rounding.");
      setConfirmed(true);setPatternMessage("All pattern predictions are correct. Now use the two different model rules to predict a new response.");
    }catch(error){setConfirmed(false);clearPrediction();setPatternMessage(error instanceof Error?error.message:"Check the pattern predictions.");}
  };
  const checkPrediction=()=>{
    try{
      if(!predictions.exponential.trim()||!predictions.linear.trim())throw new Error("Predict both responses before checking.");
      const next=predictExponentialComparison(item,step,target),first=matchesExponentialValue(predictions.exponential,next.exponential),second=matchesExponentialValue(predictions.linear,next.linear);
      setResult(next);setMessage(first&&second?"Both predictions are correct. Explain why the line agrees with the first two observations but not the complete exponential model.":"Review "+[!first?"the exponential prediction":"",!second?"the linear prediction":""].filter(Boolean).join(" and ")+". Compare the complete exponent with the line's additive change in the result table.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the input and prediction notation.");}
  };
  return <div className="exponential-lab"><p><MathText>{activity.prompt}</MathText></p><div className="activity-controls"><div className="field"><label htmlFor={id+"-case"}>Exponential example</label><select id={id+"-case"} value={index} onChange={event=>load(Number(event.target.value))}>{activity.cases.map((entry,i)=><option key={entry.title} value={i}>{entry.title}</option>)}</select></div><div className="field"><label htmlFor={id+"-step"}>Observation step (s)</label><input id={id+"-step"} value={step} maxLength={100} aria-describedby={id+"-step-help"} onChange={event=>{setStep(event.target.value);setAnswers(blankPattern);setPredictions(blankPrediction);clearPattern();}}/></div></div>
    <p className="muted" id={id+"-step-help"}>Choose a step from 1/4 to 4 seconds. Changing it supplies three new records and refits the comparison line. These examples use a continuous mathematical model; an observation schedule alone does not restrict its domain.</p><p>Supplied response baseline: {item.model.k} V. Compare deviations from this baseline when testing multiplicative change.</p><p className="form-status" role="status">{inspection.error}</p>
    {pattern&&<><div className="calibration-table-wrap" tabIndex={0} role="region" aria-label="Observed exponential records"><table className="coefficient-table"><caption>Three equally spaced observations</caption><thead><tr><th scope="col">Input x (s)</th><th scope="col">Response f(x) (V)</th>{confirmed&&<th scope="col">Deviation f(x) - k (V)</th>}</tr></thead><tbody>{pattern.rows.map(row=><tr key={row.input}><th scope="row">{row.input}</th><td>{displayExponentialValue(row.output)}</td>{confirmed&&<td>{displayExponentialValue(row.deviation)}</td>}</tr>)}</tbody></table></div>
      <p>Test which pattern is consistent with these records: constant response, constant additive change, or constant positive-factor change relative to the baseline. Three records cannot prove a law for all inputs.</p><div className="activity-controls">{([ ["first","Predicted first difference (V)"],["second","Predicted second difference (V)"],["factor","Predicted deviation factor"] ] as const).map(([key,label])=><div className="field" key={key}><label htmlFor={id+"-"+key}>{label}</label><input id={id+"-"+key} value={answers[key]} maxLength={200} aria-describedby={id+"-answer-help"} onChange={event=>{setAnswers({...answers,[key]:event.target.value});clearPattern();}}/></div>)}</div>
      <div className="field"><label htmlFor={id+"-pattern"}>Predicted pattern</label><select id={id+"-pattern"} value={answers.kind} onChange={event=>{setAnswers({...answers,kind:event.target.value});clearPattern();}}><option value="">Choose a pattern</option><option value="constant">Constant response</option><option value="linear">Linear additive change</option><option value="exponential">Exponential change relative to the baseline</option><option value="neither">None of these models</option></select></div>
      <p className="muted" id={id+"-answer-help"}>Use exact fractions and sqrt() expressions when available. Otherwise enter at least seven significant figures or enough digits for an absolute error below 0.000001 V in response fields. Approximate factors and responses accept the larger of 0.000001 absolute error and one part per million relative error. Keep extra digits during calculations.</p>
      <button className="button" onClick={checkPattern}>Check pattern predictions</button><p className="form-status exponential-pattern-status" role="status">{patternMessage}</p>
      {confirmed&&<><div className="notice"><p>Differences: {displayExponentialValue(pattern.differences[0])} V and {displayExponentialValue(pattern.differences[1])} V. The deviation is multiplied by {displayExponentialValue(pattern.factor)} every {pattern.step} seconds.</p><p>This activity supplies the following exponential model after the pattern check:</p><Equation display>{"f(x)="+exponentialLatex(item.model)}</Equation><p>The comparison line passes through the first two observations and then continues at a constant rate.</p><Equation display>{"L(x)="+(pattern.rows[0].output.exact?rationalOrText(pattern.rows[0].output.exact):"f(x_0)")+"+\\left("+(pattern.slope.exact?rationalOrText(pattern.slope.exact):"m")+"\\right)\\left(x-\\left("+rationalLatex(pattern.rows[0].input)+"\\right)\\right)"}</Equation><p>Line anchor: {displayExponentialValue(pattern.rows[0].output)} V at {pattern.rows[0].input} s. Line rate: {displayExponentialValue(pattern.slope)} V/s. Use the supplied exponential formula for unrounded values in approximate cases.</p></div>
        <p>As x increases, the distance from the baseline {pattern.features.deviation==="growing"?"grows":"shrinks"}, and the signed response {pattern.features.increasing?"increases":"decreases"}. The exponential domain is all real inputs; its range is {formatIntervals(pattern.features.range)} V. Its baseline {item.model.k} V is an open range boundary and is never reached at a finite input.</p>
        <div className="field"><label htmlFor={id+"-target"}>Prediction input x (s)</label><input id={id+"-target"} value={target} maxLength={100} aria-describedby={id+"-target-help"} onChange={event=>{setTarget(event.target.value);clearPrediction();}}/></div><p className="muted" id={id+"-target-help"}>Explore inputs from -12 to 12 seconds, including fractions and times before the first observation. This control limit is separate from the all-real mathematical domain.</p>
        <div className="calibration-controls">{([ ["exponential","Predicted exponential response (V)"],["linear","Predicted linear response (V)"] ] as const).map(([key,label])=><div className="field" key={key}><label htmlFor={id+"-prediction-"+key}>{label}</label><input id={id+"-prediction-"+key} value={predictions[key]} maxLength={200} aria-describedby={id+"-answer-help"} onChange={event=>{setPredictions({...predictions,[key]:event.target.value});clearPrediction();}}/></div>)}</div>
        <button className="button" onClick={checkPrediction}>Check response predictions</button><p className="form-status exponential-response-status" role="status">{message}</p>
        {result&&<div className="exponential-result"><div className="calibration-table-wrap" tabIndex={0} role="region" aria-label="Exponential and linear predictions"><table className="coefficient-table"><caption>Two rules at the same prediction input</caption><thead><tr><th scope="col">Input (s)</th><th scope="col">Exponential (V)</th><th scope="col">Linear (V)</th><th scope="col">Exponential minus linear (V)</th></tr></thead><tbody><tr><th scope="row">{result.input}</th><td>{displayExponentialValue(result.exponential)}</td><td>{displayExponentialValue(result.linear)}</td><td>{displayExponentialValue(result.difference)}</td></tr></tbody></table></div><ExponentialPlot item={item} step={step} result={result} id={id}/><p>Explain in your lesson notes why agreement at two observations does not establish a model. Describe what changes when you change the observation step, and why a nonzero baseline must be removed before comparing ratios. The supplied law determines the curve here; finite data alone cannot establish that law outside the observations.</p></div>}
      </>}
    </>}
    <NaturalCalculator key={calculatorVersion} id={id}/><button className="button secondary section-space" onClick={()=>{load(0);setCalculatorVersion(version=>version+1);}}>Reset exponential investigation</button><p className="muted">This supported investigation does not award objective evidence. Use the independent checkpoint after practicing.</p>
  </div>;
}
