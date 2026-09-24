"use client";

import { useId, useState } from "react";
import { materialInputSchema, materialRun, type MaterialActivity, type MaterialInput } from "@/lib/learning/phs-231-materials";
import { approximateExact, parseExact, realExact } from "@/lib/learning/exact-number";
import { MathText } from "./math-text";
import "./phs-231.css";

const display=(n:number)=>n===0?"0":Math.abs(n)>=100000||Math.abs(n)<.00001?n.toExponential(8).replace(/\.?0+e/,"e"):String(Number(n.toPrecision(9)));
const tick=(n:number)=>n!==0&&(Math.abs(n)>=10000||Math.abs(n)<.01)?n.toExponential(1):String(Number(n.toPrecision(3)));
const nullable=(n:number|null,factor=1)=>n===null?"Not established":display(n*factor);
const defaults={
  ductile:{mode:"ductile",modulusGPa:100,lengthMm:100,areaMm2:10,peakStrain:.006,yieldMPa:100,hardeningStrain:.01,hardeningMPa:200,fractureStrain:.02,fractureMPa:150},
  brittle:{mode:"brittle",modulusGPa:100,lengthMm:100,areaMm2:10,peakStrain:.002,fractureMPa:200},
} satisfies Record<MaterialInput["mode"],MaterialInput>;
type Result={input:MaterialInput;state:ReturnType<typeof materialRun>};
type Sample=Result["state"]["peak"];
type Control=[string,string,number,number,number];
const phase=(s:Sample)=>s.phase==="after-fracture"?"After fracture: connected response is not established":s.phase==="fracture"?"Documented prefracture endpoint":s.phase==="unloading"?"Supplied unloading path":"Supplied loading path";
function controlsFor(mode:MaterialInput["mode"]):Control[]{
  const common:Control[]=[["modulusGPa","Initial modulus E (GPa)",1,300,1],["lengthMm","Original gauge length (mm)",1,1000,1],["areaMm2","Original cross-sectional area (mm²)",.1,1000,.1],["peakStrain","Requested peak engineering strain",0,.5,.0001]];
  return mode==="brittle"?[...common,["fractureMPa","Documented fracture stress (MPa)",1,2000,1]]:[...common,["yieldMPa","Supplied yield stress (MPa)",1,1500,1],["hardeningStrain","End-of-hardening strain",.00001,.49,.0001],["hardeningMPa","End-of-hardening stress (MPa)",1,2000,1],["fractureStrain","Documented fracture strain",.00002,.5,.0001],["fractureMPa","Documented fracture stress (MPa)",1,2000,1]];
}
function MaterialShape({result,index}:{result:Result;index:number}){
  const id=useId(),s=result.state.samples[index];
  if(s.strain===null)return <figure><div className="notice"><strong>No connected specimen shape is established.</strong><p>The controller target is known after fracture. Actual specimen strain, force, stored energy, and residual set are not supplied. A zero final target does not restore the broken specimen.</p></div><figcaption>No invented shape or unloading line is drawn for a broken specimen.</figcaption></figure>;
  const mag=s.strain===0?10:Math.min(10,.4/s.strain),width=150*(1+mag*s.strain);
  return <figure><svg viewBox="0 0 360 245" role="img" aria-labelledby={id}><title id={id}>{`Connected specimen at stage ${display(s.stage)}: engineering strain ${display(s.strain)}, extension ${display(s.extensionMm!)} mm. Axial strain is exaggerated ${display(mag)} times. Dashed outline is the original gauge length. Lateral shape and necking are not modeled. Equivalent values are in the selected-state table.`}</title>
    <text x="180" y="24" textAnchor="middle" fontSize="19" fill="#243b38">Connected gauge length</text>
    <rect x="55" y="87" width={width} height="66" fill="#dcece5" stroke="#145f84" strokeWidth="3"/><rect x="55" y="87" width="150" height="66" fill="none" stroke="#933d20" strokeWidth="2" strokeDasharray="6 4"/>
    <text x="180" y="196" textAnchor="middle" fontSize="18" fill="#243b38">{`Extension: ${display(s.extensionMm!)} mm`}</text>
    <text x="180" y="229" textAnchor="middle" fontSize="18" fill="#243b38">{`Strain shown at ${display(mag)}× scale`}</text>
  </svg><figcaption>The filled outline shows axial length only, with adaptive magnification. The original outline is dashed brown. Lateral contraction and local neck geometry are omitted. At the fracture endpoint this is the last connected state immediately before separation.</figcaption></figure>;
}
function MaterialCurve({result,index}:{result:Result;index:number}){
  const id=useId(),r=result.state,s=r.samples[index],xmax=r.fractureStrain,ymax=r.ultimateStress;
  const x=(v:number)=>85+250*v/xmax,y=(v:number)=>210-158*v/ymax;
  const loading=r.samples.filter(v=>v.phase==="loading"||v.phase==="fracture"),unloading=r.fractured?[]:[r.peak,...r.samples.filter(v=>v.phase==="unloading")];
  return <figure><svg viewBox="0 0 360 270" role="img" aria-labelledby={id}><title id={id}>Engineering stress versus engineering strain. Dashed gray is the full supplied reference curve. Solid blue is documented loading in this trial. Dashed brown is the explicitly supplied unfractured unloading, when available. The selected known state is a dot. Unknown postfracture states have no point or return path. The horizontal axis is percent strain; tables use dimensionless strain.</title>
    <text x="180" y="23" textAnchor="middle" fontSize="19" fill="#243b38">Engineering stress (MPa)</text>
    {[0,.5,1].map(f=><g key={f}><line x1="85" x2="335" y1={y(f*ymax)} y2={y(f*ymax)} stroke="#c7d3ce"/><text x="78" y={y(f*ymax)+5} textAnchor="end" fontSize="18" fill="#243b38">{tick(f*ymax)}</text><text x={85+250*f} y="236" textAnchor="middle" fontSize="18" fill="#243b38">{tick(100*f*xmax)}</text></g>)}
    <polyline points={r.curve.map(v=>`${x(v.strain)},${y(v.stress)}`).join(" ")} fill="none" stroke="#526a63" strokeWidth="5" strokeDasharray="3 5"/>
    <polyline points={loading.map(v=>`${x(v.strain!)},${y(v.stress!)}`).join(" ")} fill="none" stroke="#145f84" strokeWidth="3"/>
    {unloading.length>0&&<polyline points={unloading.map(v=>`${x(v.strain!)},${y(v.stress!)}`).join(" ")} fill="none" stroke="#933d20" strokeWidth="3" strokeDasharray="8 4"/>}
    {r.fractured&&<rect x={x(r.fractureStrain)-5} y={y(r.fractureStress)-5} width="10" height="10" fill="#933d20"/>}
    {s.strain!==null&&<circle cx={x(s.strain)} cy={y(s.stress!)} r="5" fill="#243b38"/>}
    <text x="210" y="262" textAnchor="middle" fontSize="18" fill="#243b38">Engineering strain (%)</text>
  </svg><figcaption>Gray dots: full reference record. Blue solid line: loading path for this trial. Brown dashes: supplied unloading if fracture was never reached. Brown square: reached fracture endpoint. Dark dot: selected known state. Initial loading and subyield unloading can overlap. Percent strain = 100 × dimensionless strain. The complete reference and path tables give equivalent values.</figcaption></figure>;
}
function WorkHistory({result,index}:{result:Result;index:number}){
  const id=useId(),r=result.state,s=r.samples[index],known=r.samples.filter(v=>v.loadingWorkJ!==null),max=r.loadingStopDensity*r.volumeM3||1;
  const x=(v:number)=>85+125*v,y=(v:number)=>210-158*v/max;
  return <figure><svg viewBox="0 0 360 270" role="img" aria-labelledby={id}><title id={id}>Cumulative mechanical work in joules versus loading stage. Blue solid is input during loading, brown dashed is returned work. Gray shading after a fracture endpoint marks unestablished work, not zero work. Stage is a sequence parameter, not physical time. Numerical values are in the complete table.</title>
    <text x="180" y="23" textAnchor="middle" fontSize="19" fill="#243b38">Cumulative work (J)</text>
    {r.fractureStage!==null&&<rect x={x(r.fractureStage)} y="45" width={335-x(r.fractureStage)} height="168" fill="#e2e0dc"/>}
    {[0,.5,1].map(f=><g key={f}><line x1="85" x2="335" y1={y(f*max)} y2={y(f*max)} stroke="#c7d3ce"/><text x="78" y={y(f*max)+5} textAnchor="end" fontSize="18" fill="#243b38">{tick(f*max)}</text><text x={x(2*f)} y="236" textAnchor="middle" fontSize="18" fill="#243b38">{2*f}</text></g>)}
    <polyline points={known.map(v=>`${x(v.stage)},${y(v.loadingWorkJ!)}`).join(" ")} fill="none" stroke="#145f84" strokeWidth="3"/>
    <polyline points={known.map(v=>`${x(v.stage)},${y(v.returnedWorkJ!)}`).join(" ")} fill="none" stroke="#933d20" strokeWidth="3" strokeDasharray="8 4"/>
    <line x1={x(s.stage)} x2={x(s.stage)} y1="45" y2="213" stroke="#243b38" strokeDasharray="3 4"/>
    <text x="210" y="262" textAnchor="middle" fontSize="18" fill="#243b38">Loading stage</text>
  </svg><figcaption>Input is accumulated only during documented loading; returned work accumulates along the supplied unload line. Their difference is net work delivered. It is not necessarily heat. Gray is unknown after fracture. The vertical dashed line marks the selected stage. For a zero-load trial both work curves stay at zero; the displayed scale does not establish a material property.</figcaption></figure>;
}
export function Phs231MaterialsLab({activity}:{activity:MaterialActivity}){
  const valuesFor=(p:MaterialInput)=>Object.fromEntries(Object.entries(p).filter(([key])=>key!=="mode").map(([key,value])=>[key,String(value)]));
  const [mode,setMode]=useState(activity.initial.mode),[values,setValues]=useState(valuesFor(activity.initial)),[predictions,setPredictions]=useState(["","","","",""]),[decision,setDecision]=useState<""|"unfractured"|"fractured">(""),[result,setResult]=useState<Result|null>(null),[message,setMessage]=useState(""),[index,setIndex]=useState(0);
  const controls=controlsFor(mode),clear=()=>{setResult(null);setMessage("");};
  const apply=(p:MaterialInput)=>{setMode(p.mode);setValues(valuesFor(p));setPredictions(["","","","",""]);setDecision("");setIndex(0);clear();};
  const check=()=>{
    try{
      if(controls.some(([key])=>!values[key]?.trim()))throw Error("Complete every model input; an empty input is not zero.");
      const parsed=materialInputSchema.safeParse({mode,...Object.fromEntries(controls.map(([key])=>[key,Number(values[key])]))});
      if(!parsed.success)throw Error("Use finite inputs within the printed ranges. Require yield strain < hardening strain < fracture strain; yield stress ≤ hardening stress ≤ E × hardening strain; fracture stress ≤ hardening stress. A brittle fracture strain must not exceed 0.5.");
      if(!decision||predictions.slice(0,3).some(v=>!v.trim())||(decision==="unfractured"&&predictions.slice(3).some(v=>!v.trim())))throw Error("Predict the largest reached stress, last documented force, input work, and fracture decision first. An unfractured prediction also needs residual strain and returned work.");
      const answer=(raw:string)=>{
        const text=raw.trim();
        if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)){const n=Number(text);if(!Number.isFinite(n))throw Error("Predictions must be finite real numbers.");return n;}
        const n=parseExact(text);if(!realExact(n))throw Error("Predictions must be real numbers.");return approximateExact(n).real;
      };
      const state=materialRun(parsed.data),expected=[state.largestReachedStress,state.lastDocumented.forceN,state.lastDocumented.loadingWorkJ,state.residualStrain,state.final.returnedWorkJ],names=["largest reached stress","last documented force","input work","residual strain","returned work"],absolute=[.000001,.000001,.000000001,.0000000001,.000000001],missed:string[]=[];
      predictions.forEach((raw,i)=>{
        if(i<3||decision==="unfractured"){
          const value=answer(raw);
          if(expected[i]===null||Math.abs(value-expected[i]!)>Math.max(absolute[i],Math.abs(expected[i]!)*1e-8))missed.push(names[i]);
        }
      });
      if(decision!==(state.fractured?"fractured":"unfractured"))missed.push("fracture decision");
      setResult({input:parsed.data,state});setIndex(state.samples.findIndex(v=>v.stage===1));
      setMessage(missed.length?`Revisit ${missed.join(", ")}. Integrate the actual loading segments, distinguish maximum stress from endpoint stress, and compare the requested strain with the documented fracture strain before claiming an unloading path.`:state.fractured?"All four predictions agree. The last connected state is the fracture endpoint; a residual strain or returned work after fracture is not established.":"All six predictions agree with the supplied loading and unloading laws. Nonreturned work is an energy account, not a measurement of heat.");
    }catch(error){setResult(null);setMessage(error instanceof Error?error.message:"Check the inputs.");}
  };
  const presets:[string,MaterialInput][]=[
    ["Plastic baseline",defaults.ductile],["Zero loading",{...defaults.ductile,peakStrain:0}],["Subyield loading",{...defaults.ductile,peakStrain:.0005}],["Exact supplied yield",{...defaults.ductile,peakStrain:.001}],["End of hardening",{...defaults.ductile,peakStrain:.01}],["Descending branch",{...defaults.ductile,peakStrain:.015}],["Exact fracture",{...defaults.ductile,peakStrain:.02}],["Beyond fracture",{...defaults.ductile,peakStrain:.03}],["Same modulus brittle fracture",defaults.brittle],["Perfect plastic plateau",{...defaults.ductile,hardeningMPa:100,fractureMPa:100}],["Double original area",{...defaults.ductile,areaMm2:20}],["Double gauge length",{...defaults.ductile,lengthMm:200}],
  ];
  const s=result?.state.samples[index];
  return <div className="phs231-investigation"><p><MathText>{activity.prompt}</MathText></p>
    <p className="muted">This is a simulation of hypothetical engineering records under prescribed extension. It is not a physical tensile, breaking, pressure, overhead-load, or fatigue experiment. Controls reset on reload; save predictions, inputs, calculations, and evidence in lesson notes.</p>
    <div className="field"><label htmlFor="phs231-material-mode">Synthetic material record</label><select id="phs231-material-mode" value={mode} onChange={event=>apply(defaults[event.target.value as MaterialInput["mode"]])}><option value="ductile">Elastic, hardening, and descending record</option><option value="brittle">Linear record ending at brittle fracture</option></select></div>
    <p>Stress uses original area; strain uses original length. Strain inputs are dimensionless: 0.01 means 1%. Temperature and loading rate are held implicit in the supplied record. Before fracture, unloading is explicitly assumed to be a straight engineering line parallel to the initial slope, ending at zero stress. This is a teaching law, not a universal unloading rule after necking.</p>
    <fieldset className="phs231-predictions"><legend>Reference record and requested loading</legend><div className="phs231-controls">{controls.map(([key,label,min,max,step])=><div className="field" key={key}><label htmlFor={`phs231-material-${key}`}>{label}</label><input id={`phs231-material-${key}`} type="number" min={min} max={max} step={step} value={values[key]??""} aria-describedby={`phs231-material-${key}-range`} onChange={event=>{setValues(current=>({...current,[key]:event.target.value}));clear();}}/><small id={`phs231-material-${key}-range`}>Allowed range: {min} to {max}.</small></div>)}</div></fieldset>
    <p>{mode==="ductile"?"The supplied yield strain is yield stress / E. Strain knots must increase; hardening stress must be between yield stress and E times its strain. Fracture stress cannot exceed the maximum. These constraints keep the specified unload line's zero-stress intercept nonnegative.":"The documented fracture strain is fracture stress / E. This record supplies no distinct yield point or postfracture unloading."} Reaching the fracture endpoint terminates the connected specimen, even when it is exactly the requested peak.</p>
    <details><summary>Load prepared material comparisons</summary><div className="form-actions">{presets.map(([label,p])=><button className="button secondary" key={label} onClick={()=>apply(p)}>{label}</button>)}</div></details>
    <fieldset className="phs231-predictions"><legend>Predict what the record establishes</legend>
      <p>Enter fractions, sqrt(...), or finite decimals in the labeled units. Predict the largest stress actually reached and the force at the last connected loading state; they need not occur together. Accepted errors are 0.000001 MPa or N, 0.000000001 J, and 0.0000000001 strain, or one part in 100 million of the expected value, whichever is larger.</p>
      <div className="field"><label htmlFor="phs231-material-decision">Predicted fracture decision</label><select id="phs231-material-decision" value={decision} onChange={event=>{setDecision(event.target.value as typeof decision);clear();}}><option value="">Choose a decision</option><option value="unfractured">Peak stays below fracture; supplied unloading is available</option><option value="fractured">Fracture is reached; connected unloading is not established</option></select></div>
      <div className="phs231-controls">{["Predicted largest reached engineering stress (MPa)","Predicted last documented loading force (N)","Predicted input work through last documented state (J)","Predicted residual engineering strain","Predicted returned work after unloading (J)"].map((label,i)=><div className="field" key={label}><label htmlFor={`phs231-material-prediction-${i}`}>{label}</label><input id={`phs231-material-prediction-${i}`} maxLength={200} disabled={i>2&&decision==="fractured"} value={predictions[i]} onChange={event=>{setPredictions(current=>current.map((v,j)=>i===j?event.target.value:v));clear();}}/>{i>2&&decision==="fractured"&&<small>Not established after the connected record terminates.</small>}</div>)}</div>
    </fieldset>
    <div className="form-actions"><button className="button" onClick={check}>Check material account</button><button className="button secondary" onClick={()=>apply(activity.initial)}>Reset material investigation</button></div><p role="status" className="form-status">{message}</p>
    {result&&s&&<div className="notice">
      <p><strong>Reference maximum engineering stress: {display(result.state.ultimateStress)} MPa.</strong> It occurs {result.state.ultimateFirstStrain===result.state.ultimateLastStrain?`at strain ${display(result.state.ultimateFirstStrain)}`:`through the strain interval [${display(result.state.ultimateFirstStrain)}, ${display(result.state.ultimateLastStrain)}]`}. Documented fracture stress is {display(result.state.fractureStress)} MPa at strain {display(result.state.fractureStrain)}. These descriptors need not coincide.</p>
      <p>Original volume: {display(result.state.volumeM3*1e6)} cm³. Full reference work to fracture: {display(result.state.workToFractureDensity/1e6)} MJ/m³, or {display(result.state.workToFractureJ)} J. A shorter trial does not deliver that entire work.</p>
      <div className="phs231-table" role="region" tabIndex={0} aria-label="Supplied material reference table"><table><caption>Complete piecewise reference; straight segments join these knots</caption><thead><tr><th scope="col">Landmark</th><th scope="col">Strain</th><th scope="col">Stress (MPa)</th></tr></thead><tbody>{result.state.curve.map(v=><tr key={v.kind}><th scope="row">{v.kind==="hardening"?"End of hardening":v.kind==="yield"?"Supplied yield":v.kind==="fracture"?"Documented fracture":"Origin"}</th><td>{display(v.strain)}</td><td>{display(v.stress)}</td></tr>)}</tbody></table></div>
      <div className="field"><label htmlFor="phs231-material-sample">Material-stage sample</label><input id="phs231-material-sample" type="range" min={0} max={result.state.samples.length-1} step={1} value={index} aria-valuetext={`Stage ${display(s.stage)}; ${phase(s)}`} onChange={event=>setIndex(Number(event.target.value))}/><p>Selected stage: <strong>{display(s.stage)}</strong>. Use arrow keys, Home, and End. Stage 0→1 requests increasing extension. An unfractured return stops at zero load and residual extension at stage 2. After fracture, later controller targets are known but the actual connected response is not. Stage is not elapsed time.</p></div>
      <div className="form-actions">{result.state.events.map(event=><button className="button secondary" key={event.label} onClick={()=>setIndex(result.state.samples.findIndex(row=>row.stage===event.stage))}>{event.label}</button>)}</div>
      <p><strong>{phase(s)}.</strong> {s.phase==="after-fracture"?"Controller motion does not provide a constitutive law for the separated pieces. Last documented work remains a historical fact; later cumulative work and recoverable energy are not established.":s.phase==="fracture"?"The prefracture force, strain, and loading work are established. A return path from the fractured state is not supplied.":"The energy account follows the explicitly supplied loading and unloading law. Nonreturned work may include internal material change as well as thermal transfer."}</p>
      <MaterialShape result={result} index={index}/><MaterialCurve result={result} index={index}/><WorkHistory result={result} index={index}/>
      <div className="phs231-table" role="region" tabIndex={0} aria-label="Selected material account"><table><caption>Material account at stage {display(s.stage)}</caption><thead><tr><th scope="col">Quantity</th><th scope="col">Value</th><th scope="col">Unit</th></tr></thead><tbody>
        {([["Controller strain target",s.commandStrain,"1",1],["Connected engineering strain",s.strain,"1",1],["Connected engineering stress",s.stress,"MPa",1],["Connected tensile force",s.forceN,"N",1],["Connected extension",s.extensionMm,"mm",1],["Cumulative loading work density",s.loadingDensity,"MJ/m³",1e-6],["Cumulative loading work",s.loadingWorkJ,"J",1],["Returned work",s.returnedWorkJ,"J",1],["Net work delivered",s.netWorkJ,"J",1],["Work recoverable by the supplied law",s.recoverableWorkJ,"J",1],["Work not returned by the supplied law",s.unrecoveredWorkJ,"J",1],["Work account residual",s.workResidual,"J",1]] as [string,number|null,string,number][]).map(([label,value,unit,factor])=><tr key={label}><th scope="row">{label}</th><td>{nullable(value,factor)}</td><td>{unit}</td></tr>)}
      </tbody></table></div>
      <p><MathText>{"For a known unfractured state, $W_{net}=W_{input}-W_{returned}=U_{recoverable}+W_{not\\ returned}$. On the supplied unloading line, $\\varepsilon_r=\\varepsilon_{peak}-\\sigma_{peak}/E$ and recovered work per original volume is $\\sigma_{peak}^2/(2E)$. Keep stress and E in the same units."}</MathText> Work not returned is not automatically heat. No thermal partition or fatigue life is supplied.</p>
      <details><summary>Complete material path table</summary><div className="phs231-table" role="region" tabIndex={0} aria-label="Complete material path table" style={{maxHeight:"24rem",overflowY:"auto"}}><table style={{minWidth:"60rem"}}><caption>All stage samples and exact events; unknown response remains explicit</caption><thead style={{position:"sticky",top:0,background:"#f6f8f3"}}><tr>{["Stage","Controller strain","Connected strain","Stress (MPa)","Force (N)","Extension (mm)","Input work (J)","Returned work (J)","Net work (J)","Recoverable work (J)","Not returned (J)","State"].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{result.state.samples.map(row=><tr key={row.stage}><th scope="row">{display(row.stage)}</th><td>{display(row.commandStrain)}</td><td>{nullable(row.strain)}</td><td>{nullable(row.stress)}</td><td>{nullable(row.forceN)}</td><td>{nullable(row.extensionMm)}</td><td>{nullable(row.loadingWorkJ)}</td><td>{nullable(row.returnedWorkJ)}</td><td>{nullable(row.netWorkJ)}</td><td>{nullable(row.recoverableWorkJ)}</td><td>{nullable(row.unrecoveredWorkJ)}</td><td>{phase(row)}</td></tr>)}</tbody></table></div></details>
    </div>}
    <h3 className="section-space">Build an evidence record</h3>
    <ol><li>Predict and check the subyield, plastic baseline, and exact-fracture trials. Include at least six states spanning loading, unloading, and the last documented endpoint. Record original dimensions and dimensionless versus percent strain.</li><li>Integrate the baseline loading curve independently, calculate residual strain from the unload line, and compare total work with density × original volume. Double area or length while holding the material record and peak strain fixed; identify what changes.</li><li>Compare the complete ductile and brittle records at equal initial modulus and equal maximum stress. Explain their different fracture strain and work. Find both strains for 175 MPa on the ductile reference; explain why a load alone cannot select the branch.</li><li>Inspect exact and beyond-fracture trials. Separate a historical documented endpoint from a later controller target. Save an input and evidence table, a corrected prediction, and one missing measurement needed for a real material, crack, or fatigue claim in lesson notes.</li></ol>
    <p>Score four criteria from 0 to 2: provenance and units; independent area and residual-strain calculations; controlled comparisons; and limits with a justified revision. Use 0 for missing evidence, 1 for partial evidence or a material error, and 2 for complete justified evidence. The proposed practice target is at least 6 of 8 with no zero. This is not an official laboratory grade or independent material certification.</p>
  </div>;
}

