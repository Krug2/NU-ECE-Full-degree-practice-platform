"use client";

import { useId,useState } from "react";
import { analyzeFactoredPolynomial,factoredFormula,type FactoredPolynomial } from "@/lib/learning/factored-polynomial";
import { sampleRootComparison } from "@/lib/learning/root-exploration";
import { equalRational,formatRational,parseRational } from "@/lib/learning/rational";
import { Equation,MathText } from "./math-text";

const emptyAnswers=()=>({degree:"",count:"",behavior:"",left:"",right:""});
export function RootMultiplicityLab({activity}:{activity:{prompt:string;cases:{title:string;model:FactoredPolynomial}[]}}){
  const id=useId(),[index,setIndex]=useState(0),[model,setModel]=useState(activity.cases[0].model),[selected,setSelected]=useState(0);
  const [view,setView]=useState<"all"|"local">("local"),[answers,setAnswers]=useState(emptyAnswers),[revealed,setRevealed]=useState(false),[message,setMessage]=useState("");
  const original=activity.cases[index].model,result=analyzeFactoredPolynomial(model),root=formatRational(parseRational(model.roots[selected].root)),target=result.roots.find(item=>item.root===root)!;
  const clear=()=>{setAnswers(emptyAnswers());setRevealed(false);setMessage("");};
  const load=(next:number)=>{setIndex(next);setModel(activity.cases[next].model);setSelected(0);setView("local");clear();};
  const changeAnswer=(key:keyof typeof answers,value:string)=>{setAnswers({...answers,[key]:value});setRevealed(false);setMessage("");};
  const changeMultiplicity=(value:string)=>{setModel({...model,roots:model.roots.map((item,i)=>i===selected?{...item,multiplicity:Number(value)}:item)});clear();};
  const check=()=>{
    try{
      if(Object.values(answers).some(value=>!value.trim()))throw new Error("Enter all five predictions before revealing the comparison.");
      const degree=equalRational(parseRational(answers.degree),parseRational(String(result.degree))),count=equalRational(parseRational(answers.count),parseRational(String(result.distinctRoots)));
      setRevealed(true);
      setMessage(!degree?"Add all multiplicities to find the degree of this complete factorization.":!count?"Count distinct root locations once, regardless of repeated factors.":answers.behavior!==target.behavior?"Odd multiplicity crosses; even multiplicity touches and turns.":answers.left!==target.leftSign||answers.right!==target.rightSign?"Include the scale and every factor when finding each nearby sign.":"All predictions are correct. Compare the curves and exact signs, then change one multiplicity.");
    }catch(error){setRevealed(false);setMessage(error instanceof Error?error.message:"Check your predictions.");}
  };
  const plot=revealed?sampleRootComparison(original,model,selected,view):null;
  const X=(x:number)=>100+350*(x-plot!.lower)/(plot!.upper-plot!.lower),Y=(y:number)=>140-100*y/plot!.yExtent;
  const tick=(value:number)=>value===0?"0":Math.abs(value)>=10000||Math.abs(value)<.01?value.toExponential(1).replace("e+","e"):Number(value.toPrecision(3)).toString();
  const scales=[...new Set([original.scale,"-3","-2","-1","1","2","3"])];
  return <div>
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="field"><label htmlFor={id+"-case"}>Factor example</label><select id={id+"-case"} value={index} onChange={event=>load(Number(event.target.value))}>{activity.cases.map((item,i)=><option key={item.title} value={i}>{item.title}</option>)}</select></div>
    <Equation display>{"p(x)="+factoredFormula(model,true)}</Equation>
    <div className="calibration-controls">
      <div className="field"><label htmlFor={id+"-root"}>Zero to investigate</label><select id={id+"-root"} value={selected} onChange={event=>{setSelected(Number(event.target.value));clear();}}>{model.roots.map((item,i)=><option key={item.root} value={i}>x = {item.root}</option>)}</select></div>
      <div className="field"><label htmlFor={id+"-multiplicity"}>Multiplicity at the selected zero</label><select id={id+"-multiplicity"} value={model.roots[selected].multiplicity} onChange={event=>changeMultiplicity(event.target.value)}>{[1,2,3,4,5,6].map(value=><option key={value} value={value} disabled={result.degree-model.roots[selected].multiplicity+value>12}>{value}</option>)}</select></div>
      <div className="field"><label htmlFor={id+"-scale"}>Leading scale a</label><select id={id+"-scale"} value={model.scale} onChange={event=>{setModel({...model,scale:event.target.value});clear();}}>{scales.map(value=><option key={value} value={value}>{value}</option>)}</select></div>
    </div>
    <p>These factors account for the entire polynomial. Changing multiplicity can change degree and interval signs. A nonzero scale can reflect or stretch the graph while keeping every zero.</p>
    <div className="calibration-controls">
      {([["degree","Predicted total degree"],["count","Predicted distinct zero count"]] as const).map(([key,label])=><div className="field" key={key}><label htmlFor={id+"-"+key}>{label}</label><input id={id+"-"+key} value={answers[key]} maxLength={100} onChange={event=>changeAnswer(key,event.target.value)}/></div>)}
      <div className="field"><label htmlFor={id+"-behavior"}>Predicted behavior at x = {root}</label><select id={id+"-behavior"} value={answers.behavior} onChange={event=>changeAnswer("behavior",event.target.value)}><option value="">Choose behavior</option><option value="cross">Crosses the x-axis</option><option value="touch">Touches and turns</option></select></div>
      {(["left","right"] as const).map(side=><div className="field" key={side}><label htmlFor={id+"-"+side}>Predicted sign immediately {side} of {root}</label><select id={id+"-"+side} value={answers[side]} onChange={event=>changeAnswer(side,event.target.value)}><option value="">Choose a sign</option><option value="positive">Positive</option><option value="negative">Negative</option></select></div>)}
    </div>
    <div className="form-actions"><button className="button" onClick={check}>Check root predictions</button><button className="button secondary" onClick={()=>load(0)}>Reset factors</button></div>
    <p className="form-status" role="status">{message}</p>
    {revealed&&plot&&<div className="root-results">
      <div className="notice"><p className="root-conclusions">Degree {result.degree}; {result.distinctRoots} distinct real zeros. At x = {root}, multiplicity {target.multiplicity} gives a {target.behavior==="cross"?"crossing":"touch and turn"}. Nearby signs: left {target.leftSign}, right {target.rightSign}.</p><p>p(0) = {result.yIntercept}. At every listed root, p(x) = 0; zero is neither positive nor negative.</p></div>
      <div className="field section-space"><label htmlFor={id+"-view"}>Root comparison window</label><select id={id+"-view"} value={view} onChange={event=>setView(event.target.value as "all"|"local")}><option value="local">Near the selected zero</option><option value="all">Include every zero</option></select></div>
      <p>Both curves use the same axes. The vertical scale adjusts to their sampled values. The local view excludes neighboring zeros. Exact factorization and the tables establish the signs; the drawing is a finite approximation.</p>
      <figure className="function-figure polynomial-figure"><svg viewBox="0 0 480 300" role="img" aria-labelledby={id+"-title "+id+"-desc"}>
        <title id={id+"-title"}>Compare root behavior on shared axes</title><desc id={id+"-desc"}>Solid curve: the current polynomial. Dashed curve: the original example. Root markers lie on the horizontal axis. The selected zero is {root}. Read the exact root and sign tables below for equivalent information.</desc>
        <rect x="100" y="40" width="350" height="200" fill="white" stroke="#526873"/><line x1="100" x2="450" y1="140" y2="140" stroke="#a3b4ac"/>
        {plot.lower<=0&&plot.upper>=0&&<line x1={X(0)} x2={X(0)} y1="40" y2="240" stroke="#a3b4ac"/>}
        <polyline className="changed-root-curve" points={plot.samples.map(point=>X(point.x)+","+Y(point.changed)).join(" ")} fill="none" stroke="#235c45" strokeWidth="3"/>
        <polyline className="original-root-curve" points={plot.samples.map(point=>X(point.x)+","+Y(point.original)).join(" ")} fill="none" stroke="#963914" strokeWidth="2" strokeDasharray="7 5"/>
        {model.roots.map(item=>{const rational=parseRational(item.root),x=Number(rational.numerator)/Number(rational.denominator);return x>=plot.lower&&x<=plot.upper?<circle key={item.root} cx={X(x)} cy="140" r="4" fill="white" stroke="#203b3e"><title>Zero {item.root}, current multiplicity {item.multiplicity}</title></circle>:null;})}
        {[plot.lower,(plot.lower+plot.upper)/2,plot.upper].map((x,index)=><text key={index} x={X(x)} y="263" textAnchor="middle" fill="#203b3e" fontSize="14">{tick(x)}</text>)}
        {[-plot.yExtent,0,plot.yExtent].map((y,index)=><text key={index} x="90" y={Y(y)+5} textAnchor="end" fill="#203b3e" fontSize="14">{tick(y)}</text>)}
        <text x="275" y="288" textAnchor="middle" fill="#203b3e" fontSize="14">Input x</text><text x="100" y="24" fill="#203b3e" fontSize="14">Output</text>
      </svg><figcaption>Solid: current polynomial. Dashed: original example. Curves overlap when the rules agree; tick labels are rounded.</figcaption></figure>
      <p>Original: <Equation>{"p_0(x)="+factoredFormula(original,true)}</Equation></p>
      <div className="calibration-table-wrap" role="region" tabIndex={0} aria-label="Exact zeros and multiplicities"><table className="coefficient-table"><caption>Exact zeros and local behavior of the current polynomial</caption><thead><tr><th scope="col">Zero</th><th scope="col">Multiplicity</th><th scope="col">Behavior</th><th scope="col">Left sign</th><th scope="col">Right sign</th></tr></thead><tbody>{result.roots.map(item=><tr key={item.root}><th scope="row">{item.root}</th><td>{item.multiplicity}</td><td>{item.behavior==="cross"?"Crosses":"Touches and turns"}</td><td>{item.leftSign}</td><td>{item.rightSign}</td></tr>)}</tbody></table></div>
      <div className="calibration-table-wrap section-space" role="region" tabIndex={0} aria-label="Exact polynomial sign table"><table className="coefficient-table"><caption>Signs on every open interval between roots</caption><thead><tr><th scope="col">Interval</th><th scope="col">Test input</th><th scope="col">Exact p(x)</th><th scope="col">Sign throughout</th></tr></thead><tbody>{result.intervals.map((row,index)=><tr key={index}><th scope="row">({row.lower??"-∞"}, {row.upper??"∞"})</th><td>{row.input}</td><td>{row.output}</td><td>{row.sign}</td></tr>)}</tbody></table></div>
      <p>An even multiplicity keeps the adjacent interval signs the same; an odd multiplicity reverses them. Crossing or touching alone cannot establish an exact exponent for an unknown polynomial.</p>
    </div>}
  </div>;
}
