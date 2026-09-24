import { randomFrom } from "../random";
import type { PracticalCase } from "./practical-contracts";
export function engineeringModel(kind:"travel"|"buffer"|"fill",values:Record<string,number>){
 const required=kind==="travel"?["distance","speed"]:kind==="buffer"?["channels","rate","seconds","bytes"]:["initial","target","rate"];
 if(required.some(k=>!Number.isFinite(values[k])||values[k]<0))throw Error("Use finite nonnegative model inputs.");
 if(kind==="travel"){if(!values.speed)throw Error("Speed must be positive.");return values.distance/values.speed*60;}
 if(kind==="buffer")return values.channels*values.rate*values.seconds*values.bytes;
 if(!values.rate||values.target<values.initial)throw Error("Use a positive inflow and a target at or above the initial volume.");
 return (values.target-values.initial)/values.rate;
}
const fmt=(n:number)=>Number(n.toPrecision(5)).toString();
export function f11Case(lessonId:string,seed:string):PracticalCase&{model:NonNullable<PracticalCase["model"]>}{
 if(!["m01-l01","m01-l02","m01-l03","m01-l04"].includes(lessonId))throw Error("Unknown work-habits lesson");
 const r=randomFrom(seed),kind=(["travel","buffer","fill"] as const)[r.integer(0,2)];
 let values:Record<string,number>,scenario:string,relationship:string,unit:string,flaw:string,assumption:string,sensitivity:string,sketch:string;
 if(kind==="travel"){
  values={distance:r.integer(2,12)*5,speed:r.integer(2,6)*5};unit="min";scenario=`A hypothetical cart travels ${values.distance} km at a stated constant ${values.speed} km/h. Find the travel duration in minutes. The model excludes stops and acceleration.`;
  relationship=`t = distance/speed = ${values.distance}/${values.speed} hours; multiply by 60 min/h.`;
  flaw=`An initial report calculates ${fmt(values.distance/values.speed)} from distance/speed and labels it minutes without a conversion.`;
  assumption="The stated speed represents the whole trip; stops or acceleration would require a different model.";
  sensitivity="At the same distance, doubling speed halves the predicted duration. Zero distance gives zero time if speed stays positive.";
  sketch="Start → cart motion along a labeled distance → finish. Mark speed, elapsed time, direction and the trip boundary.";
 }else if(kind==="buffer"){
  values={channels:r.integer(2,4),rate:r.integer(2,8)*100,seconds:r.integer(1,6)*10,bytes:r.integer(1,2)*2};unit="bytes";scenario=`A data logger records ${values.channels} channels, each at ${values.rate} samples/s, for ${values.seconds} s. Each sample uses ${values.bytes} bytes. Estimate raw sample storage, excluding headers and compression. Use 1 kB = 1000 bytes if converting units.`;
  relationship=`storage = channels × samples/(channel·s) × s × bytes/sample = ${values.channels} × ${values.rate} × ${values.seconds} × ${values.bytes} bytes.`;
  flaw=`An initial report gives ${values.rate*values.seconds*values.bytes} bytes; it uses one channel's sample rate and omits the channel count.`;
  assumption="Every channel uses the stated rate and sample width. Headers, timestamps and compression are excluded.";
  sensitivity="Doubling the recording duration or channel count doubles raw storage. Zero duration gives zero raw samples.";
  sketch="Channels → sampler at the per-channel rate → raw sample buffer. Label channel count, duration and bytes per sample; put metadata outside the stated boundary.";
 }else{
  const initial=r.integer(1,5)*10;values={initial,target:initial+r.integer(2,6)*10,rate:r.integer(3,8)};unit="min";scenario=`A hypothetical tank initially contains ${values.initial} L and should reach ${values.target} L. Constant inflow is ${values.rate} L/min, with no outflow. Find the added-volume filling duration in minutes.`;
  relationship=`added volume = ${values.target}-${values.initial} L; t = added volume / (${values.rate} L/min).`;
  flaw=`An initial report divides rate by added volume and labels ${fmt(values.rate/(values.target-values.initial))} as minutes.`;
  assumption="Inflow stays constant, there is no outflow or loss, and the tank can contain the target volume.";
  sensitivity="Doubling inflow halves the duration for the same added volume. If target equals initial volume, no added filling time is needed.";
  sketch="Inflow arrow labeled L/min → tank boundary. Mark initial and target volume, the added volume and elapsed time.";
 }
 const result=engineeringModel(kind,values),focus={
 "m01-l01":"Create a problem frame and a labeled sketch or equivalent text diagram. Separate given information, unknowns and assumptions; name one useful missing-information question.",
 "m01-l02":"Write a rough expectation before calculation. Show the relationship and unit conversion, then explain one changed-input prediction and a limit on precision.",
 "m01-l03":"Audit the initial report. Use independent dimension, sign, scale or limiting-case checks, locate the first error, correct it and state what remains uncertain.",
 "m01-l04":"Preserve the initial claim, write a specific revision and its reason, then produce a reproducible final explanation with independent checks and a next action."
 }[lessonId];
 if(!focus)throw Error("Unknown practical task");
 return{title:kind==="travel"?"A travel-duration work record":kind==="buffer"?"A sample-storage work record":"An added-volume work record",scenario:scenario+(["m01-l03","m01-l04"].includes(lessonId)?" "+flaw:""),task:focus,review:[sketch,relationship,`Under the stated model, the result is approximately ${fmt(result)} ${unit}. ${kind==="buffer"?`That is ${fmt(result/1000)} decimal kB.`:""}`,assumption,sensitivity,flaw+" Preserve that claim when explaining the correction, then record which step changed and why.","A useful next action checks the most consequential assumption with a measurement or a clearer specification. This is one possible review, not an automatic evaluation of your writing."],model:{kind,values,result,unit}};
}
