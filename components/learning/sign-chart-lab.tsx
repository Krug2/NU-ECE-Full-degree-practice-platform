"use client";

import { useId,useMemo,useState } from "react";
import { equalRootSets,formatExact,parseRootSet } from "@/lib/learning/exact-number";
import { compareRealExact,parseRealEndpoint } from "@/lib/learning/exact-order";
import { equalIntervals,formatIntervals,parseIntervals } from "@/lib/learning/intervals";
import { relationLatex,type Relation } from "@/lib/learning/inequalities";
import { formatRationalFunction } from "@/lib/learning/rational-function";
import { analyzeSignChart,signChartValue,type SignChart,type SignChartCase } from "@/lib/learning/sign-chart";
import { Equation,MathText } from "./math-text";

type Trial={input:string;prediction:string;checked:boolean;message:string};
const signName=(sign:number)=>sign>0?"positive":sign<0?"negative":"zero";
const intervalLabel=(lower:string|null,upper:string|null)=>formatIntervals([{lower,upper,lowerClosed:false,upperClosed:false}]);
function SolutionLine({chart,id}:{chart:SignChart;id:string}){
  const position=(index:number)=>25+310*index/(chart.critical.length+1);
  return <figure className="function-figure polynomial-figure sign-chart-figure"><svg viewBox="0 0 360 145" role="img" aria-labelledby={id+"-title "+id+"-description"}>
    <title id={id+"-title"}>Complete inequality solution on an ordered number line</title>
    <desc id={id+"-description"}>{"Solution: "+formatIntervals(chart.solution)+". Green segments are included intervals. Filled circles include boundaries; open circles exclude them. Spacing is schematic, not to scale."}</desc>
    <line x1="25" x2="335" y1="55" y2="55" stroke="#526873" strokeWidth="2"/>
    {chart.intervals.map((row,i)=>row.selected&&<line className="sign-selected-interval" key={i} x1={i?position(i):25} x2={i<chart.critical.length?position(i+1):335} y1="55" y2="55" stroke="#235c45" strokeWidth="6"/>)}
    {chart.intervals[0].selected&&<path d="M 37 45 L 25 55 L 37 65" fill="none" stroke="#235c45" strokeWidth="3"/>}
    {chart.intervals.at(-1)!.selected&&<path d="M 323 45 L 335 55 L 323 65" fill="none" stroke="#235c45" strokeWidth="3"/>}
    {chart.critical.map((point,i)=><g key={point.input}><circle className={point.included?"sign-included":"sign-excluded"} cx={position(i+1)} cy="55" r="6" stroke="#235c45" strokeWidth="3" fill={point.included?"#235c45":"white"}/><text x={position(i+1)} y={i%2?108:86} textAnchor="middle" fontSize="18" fill="#203b3e">{point.input}</text></g>)}
    <text x="25" y="130" fontSize="18" fill="#203b3e">−∞</text><text x="335" y="130" textAnchor="end" fontSize="18" fill="#203b3e">+∞</text>
  </svg><figcaption>Green segments and filled points belong to the solution. Open points are excluded. Boundaries are ordered exactly; spacing is not to scale.</figcaption></figure>;
}

export function SignChartLab({activity}:{activity:{prompt:string;cases:SignChartCase[]}}){
  const id=useId(),[index,setIndex]=useState(0),[relation,setRelation]=useState<Relation>(activity.cases[0].relation);
  const [critical,setCritical]=useState(""),[partitioned,setPartitioned]=useState(false),[trials,setTrials]=useState<Trial[]>([]),[selected,setSelected]=useState<boolean[]>([]),[boundaries,setBoundaries]=useState<string[]>([]),[solution,setSolution]=useState(""),[complete,setComplete]=useState(false),[message,setMessage]=useState("");
  const item=activity.cases[index],chart=useMemo(()=>analyzeSignChart(item.expression,relation,item.right),[item.expression,item.right,relation]);
  const clearWork=()=>{setPartitioned(false);setTrials([]);setSelected([]);setBoundaries([]);setSolution("");setComplete(false);setMessage("");};
  const load=(next:number)=>{setIndex(next);setRelation(activity.cases[next].relation);setCritical("");clearWork();};
  const invalidate=()=>{setComplete(false);setMessage("");};
  const checkPartition=()=>{
    try{
      if(!equalRootSets(parseRootSet(critical),chart.critical.map(point=>parseRealEndpoint(point.input))))throw new Error("Find every comparison-numerator zero and every original denominator zero. Keep canceled exclusions and list each critical input once.");
      setPartitioned(true);setTrials(chart.intervals.map(()=>({input:"",prediction:"",checked:false,message:""})));setSelected(chart.intervals.map(()=>false));setBoundaries(chart.critical.map(()=>""));setSolution("");setComplete(false);setMessage("The partition is complete. Choose an interior test input and predict the sign in every open interval.");
    }catch(error){setPartitioned(false);setComplete(false);setMessage(error instanceof Error?error.message:"Check the critical inputs.");}
  };
  const changeTrial=(i:number,patch:Partial<Trial>)=>{setTrials(current=>current.map((trial,j)=>j===i?{...trial,...patch,checked:false,message:""}:trial));invalidate();};
  const checkTrial=(i:number)=>{
    const trial=trials[i],interval=chart.intervals[i];let checked=false,message="";
    try{
      if(!trial.input.trim()||!trial.prediction)throw new Error("Enter an interior test input and predict its sign before checking.");
      const x=parseRealEndpoint(trial.input);
      if(interval.lower!==null&&compareRealExact(x,parseRealEndpoint(interval.lower))<=0||interval.upper!==null&&compareRealExact(x,parseRealEndpoint(interval.upper))>=0)throw new Error("Choose a test input strictly inside this open interval, not at a boundary or in another interval.");
      const result=signChartValue(chart,trial.input);if(!result.defined)throw new Error("The original denominator excludes this input.");
      checked=trial.prediction===signName(result.sign!);
      message="At x = "+formatExact(x)+", the comparison expression is "+result.output+" ("+signName(result.sign!)+"). "+(checked?"Your sign prediction is correct.":"Revise the sign prediction and check again.");
    }catch(error){message=error instanceof Error?error.message:"Check this interval test.";}
    setTrials(current=>current.map((row,j)=>j===i?{...row,checked,message}:row));invalidate();
  };
  const allChecked=partitioned&&trials.length===chart.intervals.length&&trials.every(row=>row.checked);
  const checkSolution=()=>{
    setComplete(false);
    try{
      if(!allChecked)throw new Error("Verify the test input and sign for every interval first.");
      if(selected.some((value,i)=>value!==chart.intervals[i].selected))throw new Error("Review which interval signs satisfy the selected relation. Include every qualifying interval and no others.");
      if(boundaries.some((value,i)=>value!==(chart.critical[i].included?"include":"exclude")))throw new Error("Decide every endpoint separately: equality admits allowed zeros, but every original denominator zero stays excluded. An isolated allowed zero may be a solution by itself.");
      if(!equalIntervals(parseIntervals(solution),chart.solution))throw new Error("Your interval notation does not yet match the complete solution. Check all boundaries, isolated points, and unions.");
      setComplete(true);setMessage("The complete solution is correct, including every interval and endpoint. Change the relation and explain which decisions change.");
    }catch(error){setMessage(error instanceof Error?error.message:"Check the complete solution.");}
  };
  return <div className="sign-chart-lab">
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="activity-controls"><div className="field"><label htmlFor={id+"-case"}>Sign chart example</label><select id={id+"-case"} value={index} onChange={event=>load(Number(event.target.value))}>{activity.cases.map((example,i)=><option key={example.title} value={i}>{example.title}</option>)}</select></div><div className="field"><label htmlFor={id+"-relation"}>Inequality relation</label><select id={id+"-relation"} value={relation} onChange={event=>{setRelation(event.target.value as Relation);setCritical("");clearWork();}}><option value="lt">Less than</option><option value="le">Less than or equal</option><option value="gt">Greater than</option><option value="ge">Greater than or equal</option></select></div></div>
    <p>Original inequality:</p><Equation display>{formatRationalFunction(chart.original,true)+relationLatex[relation]+chart.right}</Equation>
    <p>Move the right side to the left. Test the sign of this comparison expression, keeping its original denominator exclusions:</p><Equation display>{formatRationalFunction({numerator:chart.numerator,denominator:chart.original.denominator},true)+relationLatex[relation]+"0"}</Equation>
    <h3>1. Partition the real line</h3>
    <div className="field"><label htmlFor={id+"-critical"}>All critical inputs</label><input id={id+"-critical"} value={critical} maxLength={200} onChange={event=>{setCritical(event.target.value);clearWork();}} aria-describedby={id+"-critical-help"}/><small id={id+"-critical-help"}>List distinct numerator zeros and original denominator zeros, separated by commas. Use sqrt(2) for an exact radical, or empty if there are none.</small></div>
    <div className="form-actions"><button className="button" onClick={checkPartition}>Check critical inputs</button><button className="button secondary" onClick={()=>load(0)}>Reset sign chart</button></div>
    {partitioned&&<><h3>2. Test every open interval</h3><p>Choose your own exact test input. Within an interval there is no zero or excluded input where a polynomial or rational expression could cross zero or become undefined, so its sign is constant there.</p>
      {chart.intervals.map((interval,i)=><fieldset className="answer-choice sign-interval-trial" key={i}><legend>{"Interval "+(i+1)+": "+intervalLabel(interval.lower,interval.upper)}</legend><div className="activity-controls"><div className="field"><label htmlFor={id+"-input-"+i}>{"Test input for interval "+(i+1)}</label><input id={id+"-input-"+i} value={trials[i].input} maxLength={100} onChange={event=>changeTrial(i,{input:event.target.value})}/></div><div className="field"><label htmlFor={id+"-sign-"+i}>{"Predicted sign for interval "+(i+1)}</label><select id={id+"-sign-"+i} value={trials[i].prediction} onChange={event=>changeTrial(i,{prediction:event.target.value})}><option value="">Choose a sign</option><option value="negative">Negative</option><option value="zero">Zero throughout</option><option value="positive">Positive</option></select></div></div><button className="button secondary" onClick={()=>checkTrial(i)}>{"Check interval "+(i+1)}</button><p className="form-status" role="status">{trials[i].message}</p></fieldset>)}
      {allChecked&&<><h3>3. Assemble the complete solution</h3><fieldset className="answer-choice"><legend>Include every qualifying open interval</legend>{chart.intervals.map((row,i)=><label key={i}><input type="checkbox" checked={selected[i]} onChange={event=>{setSelected(current=>current.map((value,j)=>j===i?event.target.checked:value));invalidate();}}/>{intervalLabel(row.lower,row.upper)}</label>)}</fieldset>
        <div className="calibration-table-wrap" role="region" tabIndex={0} aria-label="Critical input decisions"><table className="coefficient-table"><caption>Decide boundaries independently of interval signs</caption><thead><tr><th scope="col">Input</th><th scope="col">Numerator order</th><th scope="col">Original denominator order</th><th scope="col">Original status</th><th scope="col">Decision</th></tr></thead><tbody>{chart.critical.map((point,i)=><tr key={point.input}><th scope="row">{point.input}</th><td>{point.numeratorMultiplicity??"identically zero"}</td><td>{point.denominatorMultiplicity}</td><td>{point.kind==="zero"?"Allowed zero":point.numeratorMultiplicity===null||point.numeratorMultiplicity>=point.denominatorMultiplicity?"Excluded hole":"Excluded pole"}</td><td><label htmlFor={id+"-boundary-"+i}>{"At x = "+point.input}</label><select id={id+"-boundary-"+i} value={boundaries[i]} onChange={event=>{setBoundaries(current=>current.map((value,j)=>j===i?event.target.value:value));invalidate();}}><option value="">Choose</option><option value="include">Include</option><option value="exclude">Exclude</option></select></td></tr>)}</tbody></table></div>
        <div className="field"><label htmlFor={id+"-solution"}>Complete solution in interval notation</label><input id={id+"-solution"} value={solution} maxLength={500} onChange={event=>{setSolution(event.target.value);invalidate();}} aria-describedby={id+"-solution-help"}/><small id={id+"-solution-help"}>Use U for union, -inf and inf for unbounded ends, [a,a] for one isolated point, or empty for no solutions. Exact radicals such as sqrt(2) are supported.</small></div><button className="button" onClick={checkSolution}>Check complete solution</button>
      </>}
    </>}
    <p className="form-status sign-chart-status" role="status">{message}</p>
    {complete&&<div className="sign-chart-result"><p className="notice">Complete solution: {formatIntervals(chart.solution)}</p><SolutionLine chart={chart} id={id+"-line"}/><p>Explain why an excluded input never becomes a filled point, and why an even numerator zero can be an isolated solution. This supported investigation does not award objective evidence.</p></div>}
  </div>;
}
