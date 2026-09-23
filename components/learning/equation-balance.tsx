"use client";

import { useState } from "react";
import type { Lesson } from "@/lib/learning/contracts";
import { applyBalance, balanceSolved, type BalanceOperation, type BalanceState } from "@/lib/learning/balance";
import { formatRational, parseRational, type Rational } from "@/lib/learning/rational";
import { Equation, MathText } from "./math-text";

const latex=(value:Rational)=>value.denominator===1n?String(value.numerator):`\\frac{${value.numerator}}{${value.denominator}}`;
const equation=(state:BalanceState)=>`${latex(state.leftX)}x+(${latex(state.leftConstant)})=${latex(state.rightX)}x+(${latex(state.rightConstant)})`;
const labels={add:"Add a number",subtract:"Subtract a number",multiply:"Multiply by a number",divide:"Divide by a number","subtract-x":"Subtract a multiple of x"};

export function EquationBalance({activity}:{activity:Extract<Lesson["interaction"],{kind:"equation-balance"}>}) {
  const initial:BalanceState={leftX:parseRational(activity.coefficient),leftConstant:parseRational(activity.constant),rightX:parseRational("0"),rightConstant:parseRational(activity.right)};
  const [history,setHistory]=useState([{state:initial,operation:"Original equation"}]);
  const [operation,setOperation]=useState<BalanceOperation>("subtract");
  const [value,setValue]=useState("6");
  const [side,setSide]=useState<"both"|"left">("both");
  const [message,setMessage]=useState("");
  const [prediction,setPrediction]=useState("");
  const current=history[history.length-1].state;
  const apply=()=>{
    try{
      if(!prediction.trim())throw new Error("Write a short prediction before trying the step.");
      if(history.length>=30)throw new Error("Use Undo or Reset before adding more steps.");
      const next=applyBalance(current,operation,value,side);
      setHistory([...history,{state:next,operation:`${labels[operation]}: ${value}`}]);setPrediction("");
      setMessage(balanceSolved(next)?`The variable is isolated: x = ${formatRational(next.rightConstant)}. Check it in the original equation.`:"This step preserves the solution set. Compare it with your prediction.");
    }catch(error){setMessage(error instanceof Error?error.message:"This step is unavailable.");}
  };
  return <div className="balance-lab"><p><MathText>{activity.prompt}</MathText></p><div className="balance-display" role="group" aria-label="Current equation"><Equation display>{equation(current)}</Equation></div><div className="activity-controls"><div className="field"><label htmlFor="balance-operation">Operation</label><select id="balance-operation" value={operation} onChange={event=>setOperation(event.target.value as BalanceOperation)}>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div><div className="field"><label htmlFor="balance-number">Number</label><input id="balance-number" value={value} onChange={event=>setValue(event.target.value)} maxLength={100}/></div><div className="field"><label htmlFor="balance-side">Apply to</label><select id="balance-side" value={side} onChange={event=>setSide(event.target.value as "both"|"left")}><option value="both">Both sides</option><option value="left">Left side only</option></select></div></div><div className="field"><label htmlFor="balance-prediction">What do you predict will change?</label><input id="balance-prediction" value={prediction} onChange={event=>setPrediction(event.target.value)} maxLength={300} placeholder="For example, the constant on the left becomes zero." /></div><div className="form-actions"><button className="button" onClick={apply}>Apply operation</button><button className="button secondary" disabled={history.length===1} onClick={()=>{setHistory(history.slice(0,-1));setMessage("The last step was undone.");}}>Undo</button><button className="button secondary" onClick={()=>{setHistory([{state:initial,operation:"Original equation"}]);setMessage("The equation was reset.");setPrediction("");}}>Reset investigation</button></div><p className="form-status" role="status">{message}</p><details className="section-space"><summary>Review the operation history ({history.length} states)</summary><ol>{history.map((step,index)=><li key={index}><span>{step.operation}</span><Equation display>{equation(step.state)}</Equation></li>)}</ol></details><p className="muted">This investigation supports practice. Independent evidence comes from the checkpoint.</p></div>;
}
