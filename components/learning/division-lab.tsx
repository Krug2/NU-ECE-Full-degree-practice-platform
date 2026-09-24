"use client";

import { useId,useState } from "react";
import { addPolynomials,degree,equalPolynomials,formatPolynomial,multiplyPolynomials,parsePolynomial,type Polynomial } from "@/lib/learning/polynomial";
import { auditDivision,dividePolynomials,syntheticDivision,type DivisionCase } from "@/lib/learning/polynomial-division";
import { equalRational,formatRational,negateRational,parseRational } from "@/lib/learning/rational";
import { Equation,MathText } from "./math-text";

const powerLabel=(power:number)=>power===0?"constant":power===1?"x":"x^"+power;
export function DivisionLab({activity}:{activity:{prompt:string;cases:DivisionCase[]}}){
  const id=useId(),[index,setIndex]=useState(0),[method,setMethod]=useState("long"),[coefficients,setCoefficients]=useState<Record<number,string>>({});
  const [ready,setReady]=useState(false),[count,setCount]=useState(0),[first,setFirst]=useState(""),[second,setSecond]=useState(""),[message,setMessage]=useState("");
  const selected=activity.cases[index],p=parsePolynomial(selected.dividend),d=parsePolynomial(selected.divisor),result=dividePolynomials(p,d);
  const supportsSynthetic=degree(d)===1&&equalRational(d[1],parseRational("1")),root=supportsSynthetic?negateRational(d[0]):parseRational("0");
  const synthetic=syntheticDivision(p,root),powers=Array.from({length:p.length},(_,i)=>degree(p)-i);
  const clear=()=>{setCoefficients({});setReady(false);setCount(0);setFirst("");setSecond("");setMessage("");};
  const load=(next:number)=>{setIndex(next);setMethod("long");clear();};
  const total=method==="long"?result.steps.length:synthetic.bottom.length,complete=ready&&count===total;
  let partial:Polynomial=[parseRational("0")];
  if(method==="long"&&count)partial=result.steps[count-1].quotient;
  if(method==="synthetic"&&count){
    const taken=Math.min(count,p.length-1);
    partial=Array.from({length:Math.max(1,p.length-1)},()=>parseRational("0"));
    for(let column=0;column<taken;column++)partial[p.length-2-column]=synthetic.bottom[column];
    partial=parsePolynomial(formatPolynomial(partial));
  }
  const pending=addPolynomials(p,multiplyPolynomials(d,partial).map(negateRational));
  const checkCoefficients=()=>{
    try{
      for(const power of powers){
        if(!coefficients[power]?.trim())throw new Error("Fill every coefficient, including 0 for missing powers.");
        if(!equalRational(parseRational(coefficients[power]),p[power]))throw new Error("Check the coefficient of "+powerLabel(power)+". Keep its sign and reserve a zero for an absent term.");
      }
      setReady(true);setMessage("Coefficient row correct. "+(total===0?"The dividend already has lower degree; division is finished.":"Now complete the division one step at a time."));
    }catch(error){setMessage(error instanceof Error?error.message:"Check the coefficient row.");}
  };
  const checkStep=()=>{
    try{
      if(!first.trim()||!second.trim())throw new Error("Complete both entries before checking this step.");
      if(method==="long"){
        const step=result.steps[count],term=parsePolynomial(first),remaining=parsePolynomial(second);
        if(!equalPolynomials(term,step.term))throw new Error("Divide the current leading term by the divisor's leading term. Enter just the next quotient term so its product cancels the highest remaining power.");
        const audit=auditDivision(p,d,step.quotient,remaining);
        if(!audit.identity)throw new Error("The reconstruction first differs at "+powerLabel(audit.firstMismatchPower!)+". Subtract every term of the product, including negative terms.");
      }else{
        const product=synthetic.products[count]??parseRational("0"),bottom=synthetic.bottom[count];
        if(!equalRational(parseRational(first),product))throw new Error(count===0?"The first column has no incoming product. Enter 0, then bring down its coefficient.":"Multiply the preceding bottom entry by c = "+formatRational(root)+". Keep its sign.");
        if(!equalRational(parseRational(second),bottom))throw new Error("Add this column's dividend coefficient and incoming product. Keep zero coefficients in their original columns.");
      }
      setCount(count+1);setFirst("");setSecond("");setMessage(count+1===total?"Division complete. Inspect the quotient, remainder, and reconstruction.":"Step correct. The updated reconstruction still equals the original dividend.");
    }catch(error){setMessage(error instanceof Error?error.message:"Check this division step.");}
  };
  const reconstructed=addPolynomials(multiplyPolynomials(d,partial),pending);
  return <div>
    <p><MathText>{activity.prompt}</MathText></p>
    <div className="calibration-controls">
      <div className="field"><label htmlFor={id+"-case"}>Division example</label><select id={id+"-case"} value={index} onChange={event=>load(Number(event.target.value))}>{activity.cases.map((item,i)=><option key={item.title} value={i}>{item.title}</option>)}</select></div>
      <div className="field"><label htmlFor={id+"-method"}>Division method</label><select id={id+"-method"} value={method} onChange={event=>{setMethod(event.target.value);clear();}}><option value="long">Polynomial long division</option><option value="synthetic" disabled={!supportsSynthetic}>Standard synthetic division</option></select></div>
    </div>
    <Equation display>{"P(x)="+formatPolynomial(p,true)+",\\qquad D(x)="+formatPolynomial(d,true)}</Equation>
    <p>{supportsSynthetic?"This divisor has the form x-c, with c = "+formatRational(root)+". Try both methods and compare the same quotient and remainder.":"The standard one-input synthetic table cannot use this divisor directly. Long division works with the divisor as written."}</p>
    <div className="calibration-table-wrap" role="region" tabIndex={0} aria-label="Dividend coefficient setup"><table className="coefficient-table division-coefficients"><caption>Set up every dividend coefficient, from highest power to constant</caption><thead><tr>{powers.map(power=><th key={power} scope="col">{powerLabel(power)}</th>)}</tr></thead><tbody><tr>{powers.map(power=><td key={power}><input aria-label={"Dividend coefficient of "+powerLabel(power)} maxLength={100} value={coefficients[power]??""} disabled={ready} onChange={event=>{setCoefficients({...coefficients,[power]:event.target.value});setMessage("");}}/></td>)}</tr></tbody></table></div>
    <div className="form-actions"><button className="button" disabled={ready} onClick={checkCoefficients}>Check coefficient row</button><button className="button secondary" onClick={()=>load(0)}>Reset division</button></div>
    <p className="form-status" role="status">{message}</p>
    {ready&&<div className="division-work">
      {method==="synthetic"&&<div className="calibration-table-wrap" role="region" tabIndex={0} aria-label="Synthetic division table"><table className="coefficient-table"><caption>Synthetic table with c = {formatRational(root)}; the final bottom column is the remainder</caption><thead><tr><th scope="col">Row</th>{powers.map(power=><th key={power} scope="col">{powerLabel(power)}</th>)}</tr></thead><tbody>
        <tr><th scope="row">Dividend</th>{synthetic.coefficients.map((value,i)=><td key={i}>{formatRational(value)}</td>)}</tr>
        <tr><th scope="row">Incoming product</th>{synthetic.products.map((value,i)=><td key={i}>{i>=count?"Pending":value===null?"None":formatRational(value)}</td>)}</tr>
        <tr><th scope="row">Bottom entry</th>{synthetic.bottom.map((value,i)=><td key={i}>{i<count?formatRational(value):"Pending"}</td>)}</tr>
      </tbody></table></div>}
      {method==="long"&&count>0&&<ol aria-label="Accepted long-division steps">{result.steps.slice(0,count).map((step,i)=><li key={i}><p>Add <Equation>{formatPolynomial(step.term,true)}</Equation> to Q, then subtract <Equation>{formatPolynomial(step.product,true)}</Equation>.</p><Equation display>{"P(x)=("+formatPolynomial(d,true)+")("+formatPolynomial(step.quotient,true)+")+("+formatPolynomial(step.remaining,true)+")"}</Equation></li>)}</ol>}
      <div className="notice division-identity"><strong>{complete?"Final reconstruction":"Current reconstruction"}</strong><Equation display>{"P(x)=("+formatPolynomial(d,true)+")("+formatPolynomial(partial,true)+")+("+formatPolynomial(pending,true)+")"}</Equation><p>{complete?"The remainder is zero or has degree below the divisor.":"The unprocessed polynomial is still part of the identity. Continue until it meets the remainder condition."}</p></div>
      {!complete&&<div>
        <h3>{method==="long"?"Division step "+(count+1):"Synthetic column "+(count+1)}</h3>
        {method==="long"?<><p>Current unprocessed polynomial:</p><Equation display>{formatPolynomial(pending,true)}</Equation><p>Divide its leading term by the leading term of D. Subtract the resulting product from the whole unprocessed polynomial.</p></>:<p>{count===0?"There is no incoming product in the first column. Enter 0 for that entry, then bring down the leading coefficient.":"Multiply the preceding bottom entry by c = "+formatRational(root)+", then add the coefficient in this column."}</p>}
        <div className="calibration-controls">
          <div className="field"><label htmlFor={id+"-first"}>{method==="long"?"Next quotient term":"Incoming product"}</label><input id={id+"-first"} value={first} maxLength={200} onChange={event=>{setFirst(event.target.value);setMessage("");}}/></div>
          <div className="field"><label htmlFor={id+"-second"}>{method==="long"?"Polynomial after subtraction":"New bottom entry"}</label><input id={id+"-second"} value={second} maxLength={200} onChange={event=>{setSecond(event.target.value);setMessage("");}}/></div>
        </div><button className="button" onClick={checkStep}>Check division step</button>
      </div>}
      {complete&&<div className="division-result"><h3>Quotient and remainder</h3><Equation display>{"Q(x)="+formatPolynomial(result.quotient,true)+",\\qquad R(x)="+formatPolynomial(result.remainder,true)}</Equation><p>{result.remainder.every(c=>c.numerator===0n)?"The remainder is zero, so D is a factor of P.":"The remainder is nonzero, so D is not a factor of P."} The polynomial identity holds for every x. A quotient expression P/D is defined only where D is nonzero.</p><p>Explain why each step kept P unchanged. Change the example or method to start another investigation. This supported activity does not award checkpoint evidence.</p></div>}
      <div className="calibration-table-wrap section-space" role="region" tabIndex={0} aria-label="Reconstruction coefficient check"><table className="coefficient-table"><caption>Compare each coefficient of P with D times the current quotient plus the unprocessed polynomial</caption><thead><tr><th scope="col">Power</th><th scope="col">Original P</th><th scope="col">Reconstructed P</th></tr></thead><tbody>{powers.map(power=><tr key={power}><th scope="row">{powerLabel(power)}</th><td>{formatRational(p[power])}</td><td>{formatRational(reconstructed[power]??parseRational("0"))}</td></tr>)}</tbody></table></div>
    </div>}
  </div>;
}
