"use client";

import { useId, useState } from "react";
import { vectorResults, type Vector3, type VectorActivity } from "@/lib/learning/phs-231-vectors";
import { equalRational, parseRational } from "@/lib/learning/rational";
import { MathText } from "./math-text";
import "./phs-231.css";

export function Phs231VectorLab({ activity }: { activity: VectorActivity }) {
  const initial=[...activity.a,...activity.b].map(String);
  const [values,setValues]=useState(initial),[predictions,setPredictions]=useState(["","","",""]);
  const [result,setResult]=useState<ReturnType<typeof vectorResults>|null>(null),[message,setMessage]=useState("");
  const titleId=useId(),markerId=useId();
  const valid=values.every(v=>v.trim()!==""&&Number.isInteger(Number(v))&&Math.abs(Number(v))<=10);
  const a=values.slice(0,3).map(Number) as Vector3,b=values.slice(3).map(Number) as Vector3;
  const clear=()=>{setResult(null);setMessage("");};
  const check=()=>{
    try{
      if(!valid)throw Error("Enter six integer components from -10 to 10. Empty inputs are not zero.");
      if(predictions.some(v=>!v.trim()))throw Error("Predict the dot product and all three cross-product components first.");
      const predicted=predictions.map(parseRational),next=vectorResults(a,b),answers=[next.dot,...next.cross];
      const missed=answers.flatMap((answer,i)=>equalRational(predicted[i],parseRational(String(answer)))?[]:[["dot product","cross x","cross y","cross z"][i]]);
      setResult(next);setMessage(missed.length?`Revisit ${missed.join(", ")}. The dot product adds matching-component products; A cross B uses signed differences in cyclic x, y, z order.`:"Your scalar product and all cross-product components are correct.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the entries.");}
  };
  const extent=Math.max(4,Math.ceil(1.2*Math.max(...a.slice(0,2).map(Math.abs),...b.slice(0,2).map(Math.abs),...a.slice(0,2).map((n,i)=>Math.abs(n+b[i])))));
  const scale=160/extent;
  const point=(v:number[])=>`${200+v[0]*scale},${200-v[1]*scale}`;
  return <div className="phs231-investigation">
    <p><MathText>{activity.prompt}</MathText></p><p className="muted">Here A and B are dimensionless vectors in right-handed orthonormal axes. The plot is their xy projection; all three coordinates are shown in the table. Controls reset on reload. Save your comparison in lesson notes.</p>
    <div className="phs231-controls">{["A x","A y","A z","B x","B y","B z"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-vector-${i}`}>{label}</label><input id={`phs231-vector-${i}`} type="number" min={-10} max={10} step={1} value={values[i]} onChange={event=>{setValues(current=>current.map((v,j)=>j===i?event.target.value:v));clear();}}/></div>)}</div>
    {valid&&<figure><svg viewBox="0 0 400 400" role="img" aria-labelledby={titleId}>
      <title id={titleId}>{`XY projection of A (${a.join(", ")}) and B (${b.join(", ")}). Positive x is right, positive y is up. The z components are omitted from this projection.`}</title>
      <defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L6,3 L0,6" fill="none" stroke="context-stroke"/></marker></defs>
      <line x1="25" x2="375" y1="200" y2="200" stroke="#82928f"/><line x1="200" x2="200" y1="25" y2="375" stroke="#82928f"/>
      {[-extent,-extent/2,0,extent/2,extent].map(n=><g key={n}><text x={200+scale*n} y="218" textAnchor="middle" fontSize="16" fill="#243b38">{n}</text>{n!==0&&<text x="185" y={204-scale*n} textAnchor="end" fontSize="16" fill="#243b38">{n}</text>}</g>)}
      <text x="375" y="190" textAnchor="end" fill="#243b38">+x</text><text x="210" y="28" fill="#243b38">+y</text>
      <polyline points={`200,200 ${point(a)}`} fill="none" stroke="#145f84" strokeWidth="3" markerEnd={`url(#${markerId})`}/>
      <polyline points={`200,200 ${point(b)}`} fill="none" stroke="#933d20" strokeWidth="3" strokeDasharray="6 3" markerEnd={`url(#${markerId})`}/>
      <text x={210+a[0]*scale} y={190-a[1]*scale} fill="#145f84" fontWeight="700">A</text><text x={210+b[0]*scale} y={220-b[1]*scale} fill="#933d20" fontWeight="700">B</text>
      {result&&<polyline points={`200,200 ${point(result.sum)}`} fill="none" stroke="#356b33" strokeWidth="2" strokeDasharray="2 4" markerEnd={`url(#${markerId})`}/>}
    </svg><figcaption>A: solid blue; B: dashed brown; revealed A + B: dotted green. An arrow may project to a point even when its full 3D vector is nonzero.</figcaption></figure>}
    <fieldset className="phs231-predictions"><legend>Predict before calculating</legend><div className="phs231-controls">{["Predicted A dot B","Predicted cross x","Predicted cross y","Predicted cross z"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-vector-prediction-${i}`}>{label}</label><input id={`phs231-vector-prediction-${i}`} maxLength={200} value={predictions[i]} onChange={event=>{setPredictions(current=>current.map((v,j)=>j===i?event.target.value:v));clear();}}/></div>)}</div></fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check vector predictions</button><button className="button secondary" onClick={()=>{setValues([...values.slice(3),...values.slice(0,3)]);clear();}}>Swap A and B</button><button className="button secondary" onClick={()=>{setValues(initial);setPredictions(["","","",""]);clear();}}>Reset vectors</button></div>
    <p role="status" className="form-status">{message}</p>
    {result&&<div className="notice"><div className="phs231-table"><table><caption>Full three-dimensional component results</caption><thead><tr><th scope="col">Vector</th><th scope="col">x</th><th scope="col">y</th><th scope="col">z</th><th scope="col">Magnitude</th></tr></thead><tbody>{[["A",a,result.magnitudeA],["B",b,result.magnitudeB],["A + B",result.sum,result.magnitudeSum],["A cross B",result.cross,Math.hypot(...result.cross)]].map(([label,vector,magnitude])=><tr key={String(label)}><th scope="row">{String(label)}</th>{(vector as number[]).map((n,i)=><td key={i}>{n}</td>)}<td>{Number(magnitude).toFixed(6)}</td></tr>)}</tbody></table></div>
      <p>A dot B = <strong>{result.dot}</strong>. Signed scalar projection of A onto B: <strong>{result.projectionOnB===null?"undefined because B is zero":result.projectionOnB.toFixed(6)}</strong>.</p>
      {result.magnitudeA===0&&<p>A is zero and has no unique direction.</p>}{result.magnitudeB===0&&<p>B is zero and has no unique direction.</p>}{result.magnitudeSum===0&&<p>The resultant is zero. The individual vectors may still be nonzero and opposite.</p>}
      <p>Swap the two vectors. Predict which result stays the same and which changes sign, then check again. Next make the vectors parallel, and finally give one vector only a z component. Explain why the planar picture alone cannot determine the full magnitudes.</p>
    </div>}
  </div>;
}
