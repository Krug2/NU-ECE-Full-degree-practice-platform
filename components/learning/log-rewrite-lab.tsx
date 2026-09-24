"use client";

import { useId,useState } from "react";
import { analyzeLogRewrite,inspectLogRewrite,type RewriteValue } from "@/lib/learning/logarithm-rewrites";
import { checkRewriteValue,rewriteConclusions,type LogRewriteLabCase } from "@/lib/learning/log-rewrite-investigation";
import { equalIntervals,formatIntervals,parseIntervals } from "@/lib/learning/intervals";
import { Equation,MathText } from "./math-text";

const blankDomains={left:"",right:"",relationship:""};
const blankValues={left:"",right:""};
type Probe=ReturnType<typeof inspectLogRewrite>;
function ValueCell({value}:{value:RewriteValue}){
  return value.status==="defined"?<><code>{value.exact}</code><p className="muted">Approximate value: {Number(value.approximate.toPrecision(12))}</p></>:<><strong>Undefined</strong><p>{value.reason}</p></>;
}
export function LogRewriteLab({activity}:{activity:{prompt:string;cases:LogRewriteLabCase[]}}){
  const id=useId(),[selected,setSelected]=useState(0),item=activity.cases[selected],analysis=analyzeLogRewrite(item.model);
  const [domains,setDomains]=useState(blankDomains),[domainsChecked,setDomainsChecked]=useState(false),[domainMessage,setDomainMessage]=useState("");
  const [input,setInput]=useState(item.input),[values,setValues]=useState(blankValues),[valueMessage,setValueMessage]=useState(""),[result,setResult]=useState<Probe|null>(null);
  const [conclusion,setConclusion]=useState(""),[commonIdentity,setCommonIdentity]=useState(""),[equivalent,setEquivalent]=useState(""),[explanationMessage,setExplanationMessage]=useState(""),[explained,setExplained]=useState(false);
  const clearExplanation=()=>{setExplanationMessage("");setExplained(false);};
  const clearProbe=()=>{setValueMessage("");setResult(null);setConclusion("");setCommonIdentity("");setEquivalent("");clearExplanation();};
  const selectCase=(index:number)=>{setSelected(index);setDomains(blankDomains);setDomainsChecked(false);setDomainMessage("");setInput(activity.cases[index].input);setValues(blankValues);clearProbe();};
  const changeDomain=(key:keyof typeof blankDomains,value:string)=>{setDomains({...domains,[key]:value});setDomainsChecked(false);setDomainMessage("");clearProbe();};
  const checkDomains=()=>{
    setDomainsChecked(false);clearProbe();const mistakes:string[]=[];
    for(const [key,label,expected] of [["left","Predicted L domain",analysis.leftDomain],["right","Predicted R domain",analysis.rightDomain]] as const){
      try{if(!equalIntervals(parseIntervals(domains[key]),expected))mistakes.push(label);}
      catch(error){setDomainMessage(label+": "+(error instanceof Error?error.message:"Use valid interval notation."));return;}
    }
    if(domains.relationship!==analysis.domainRelation)mistakes.push("Predicted domain relationship");
    if(mistakes.length){setDomainMessage("Review: "+mistakes.join("; ")+". Check every original logarithm argument and denominator before rewriting.");return;}
    setDomainsChecked(true);setDomainMessage("Both original domains and their relationship are correct. Now test a chosen input.");
  };
  const checkValues=()=>{
    clearProbe();
    try{
      const probe=inspectLogRewrite(item.model,input),left=checkRewriteValue(values.left,probe.left),right=checkRewriteValue(values.right,probe.right);
      if(!left.correct||!right.correct){setValueMessage([!left.correct?"Predicted L(x): "+left.message:"",!right.correct?"Predicted R(x): "+right.message:""].filter(Boolean).join(" "));return;}
      setResult(probe);setValueMessage("Both value predictions are correct. Interpret this input separately from a claim about every input.");
    }catch(error){setValueMessage(error instanceof Error?error.message:"Check the exact probe input.");}
  };
  const checkExplanation=()=>{
    if(!result)return;setExplained(false);const mistakes:string[]=[];
    if(conclusion!==result.conclusion)mistakes.push("what the probe establishes");
    if(commonIdentity!==(result.valuesAgreeOnCommonDomain?"yes":"no"))mistakes.push("equality throughout the common domain");
    if(equivalent!==(result.equivalent?"yes":"no"))mistakes.push("whether the complete real functions are equivalent");
    if(mistakes.length){setExplanationMessage("Review "+mistakes.join("; ")+". One matching value cannot establish an identity, and equal values on a common domain do not guarantee equal complete domains.");return;}
    setExplained(true);setExplanationMessage("Your probe conclusion and both whole-domain judgments are correct.");
  };
  return <div className="log-rewrite-lab"><p><MathText>{activity.prompt}</MathText></p><p className="muted">This is supported exploration. Predictions, retries and explanations here do not award objective evidence.</p>
    <div className="field"><label htmlFor={id+"-case"}>Logarithm rewrite</label><select id={id+"-case"} value={selected} onChange={event=>selectCase(Number(event.target.value))}>{activity.cases.map((entry,index)=><option key={index} value={index}>{entry.model.title}</option>)}</select></div>
    <div className="rewrite-formulas"><Equation display>{"L(x)="+analysis.leftFormula}</Equation><Equation display>{"R(x)="+analysis.rightFormula}</Equation></div>
    <h3>1. Predict the original domains</h3><div className="activity-controls">{([["left","Predicted L domain"],["right","Predicted R domain"]] as const).map(([key,label])=><div className="field" key={key}><label htmlFor={id+"-domain-"+key}>{label}</label><input id={id+"-domain-"+key} value={domains[key]} onChange={event=>changeDomain(key,event.target.value)} maxLength={500} autoComplete="off" spellCheck={false} aria-describedby={id+"-domain-help"}/></div>)}</div>
    <p className="muted" id={id+"-domain-help"}>Use interval notation, U for a union, R for all real inputs, or empty. Work with each expression as written, preserving zero arguments and original denominator holes.</p>
    <div className="field"><label htmlFor={id+"-domain-relationship"}>Predicted domain relationship</label><select id={id+"-domain-relationship"} value={domains.relationship} onChange={event=>changeDomain("relationship",event.target.value)}><option value="">Choose a relationship</option><option value="same">The domains are the same</option><option value="left-larger">L accepts every R input and more</option><option value="right-larger">R accepts every L input and more</option><option value="neither">Neither domain contains the other</option></select></div>
    <button type="button" className="button" onClick={checkDomains}>Check rewrite domains</button><p className="form-status rewrite-domain-status" role="status">{domainMessage}</p>
    {domainsChecked&&<><div className="notice rewrite-confirmed-domains"><p>L domain: {formatIntervals(analysis.leftDomain)}</p><p>R domain: {formatIntervals(analysis.rightDomain)}</p></div>
      <h3>2. Predict exact values at an input</h3><div className="field"><label htmlFor={id+"-input"}>Probe input x</label><input id={id+"-input"} value={input} maxLength={200} autoComplete="off" spellCheck={false} aria-describedby={id+"-input-help"} onChange={event=>{setInput(event.target.value);setValues(blankValues);clearProbe();}}/></div>
      <p className="muted" id={id+"-input-help"}>Use an exact number or fraction within +/-1,000,000. This activity limit does not define either mathematical domain. Try a boundary, a canceled hole, or an input where shifted factors are negative.</p>
      <div className="activity-controls">{([["left","Predicted L(x)"],["right","Predicted R(x)"]] as const).map(([key,label])=><div className="field" key={key}><label htmlFor={id+"-value-"+key}>{label}</label><input id={id+"-value-"+key} value={values[key]} maxLength={200} autoComplete="off" spellCheck={false} aria-describedby={id+"-value-help"} onChange={event=>{setValues({...values,[key]:event.target.value});clearProbe();}}/></div>)}</div>
      <p className="muted" id={id+"-value-help"}>Keep values exact using ln(), log() for base 10, log(base, argument), fractions, sqrt() and arithmetic. Enter undefined if the original expression does not exist at this input. Rounded logarithms do not count as exact predictions.</p>
      <button type="button" className="button" onClick={checkValues}>Check value predictions</button><p className="form-status rewrite-value-status" role="status">{valueMessage}</p>
      {result&&<div className="rewrite-result"><div className="calibration-table-wrap" tabIndex={0} role="region" aria-label="Exact values of the two original expressions"><table className="coefficient-table"><caption>Original expressions evaluated at x = {result.input}</caption><thead><tr><th scope="col">Expression</th><th scope="col">Exact value or original-domain failure</th></tr></thead><tbody><tr><th scope="row">L({result.input})</th><td><ValueCell value={result.left}/></td></tr><tr><th scope="row">R({result.input})</th><td><ValueCell value={result.right}/></td></tr></tbody></table></div><p className="muted">The exact expressions determine equality. Rounded displays alone cannot establish an identity or decide whether two exact values are equal.</p>
        <h3>3. Explain the probe and the complete rewrite</h3><fieldset className="answer-choice"><legend>What does this probe establish?</legend>{rewriteConclusions.map(option=><label key={option.id}><input type="radio" name={id+"-conclusion"} value={option.id} checked={conclusion===option.id} onChange={()=>{setConclusion(option.id);clearExplanation();}}/><span>{option.label}</span></label>)}</fieldset>
        <div className="field"><label htmlFor={id+"-common"}>Do values agree at every input where both expressions exist?</label><select id={id+"-common"} value={commonIdentity} onChange={event=>{setCommonIdentity(event.target.value);clearExplanation();}}><option value="">Choose a judgment</option><option value="yes">Yes</option><option value="no">No</option></select></div>
        <div className="field"><label htmlFor={id+"-equivalent"}>Do L and R define the same real function on their complete domains?</label><select id={id+"-equivalent"} value={equivalent} onChange={event=>{setEquivalent(event.target.value);clearExplanation();}}><option value="">Choose a judgment</option><option value="yes">Yes</option><option value="no">No</option></select></div>
        <button type="button" className="button" onClick={checkExplanation}>Check rewrite explanation</button><p className="form-status rewrite-explanation-status" role="status">{explanationMessage}</p>
        {explained&&<div className="notice rewrite-proof"><p>{result.proof}</p><p>{result.repair}</p><p>In your notes, explain which original conditions justified each step. Use another input to challenge your claim, then state the symbolic reason that covers all permitted inputs.</p></div>}
      </div>}
    </>}
    <button type="button" className="button secondary section-space" onClick={()=>selectCase(0)}>Reset rewrite investigation</button>
  </div>;
}
