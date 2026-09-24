import { z } from "zod";

const finite=(min:number,max:number)=>z.number().finite().min(min).max(max);
const tolerance=(...values:number[])=>64*Number.EPSILON*Math.max(1,...values.map(Math.abs));
export const staticsInputSchema=z.object({
  length:finite(1,12),supportA:finite(0,12),supportB:finite(0,12),
  beamWeight:finite(.1,200),pointLoad:finite(0,300),pointX:finite(0,12),
  loadLeft:finite(0,100),loadRight:finite(0,100),horizontal:finite(-100,100),
  height:finite(0,4),couple:finite(-300,300),muStatic:finite(0,1.5),
}).strict().refine(p=>p.supportB-p.supportA>=.1-tolerance(p.supportA,p.supportB)&&p.supportB<=p.length&&p.pointX<=p.length,"Keep ordered supports at least 0.1 m apart and the load and supports on the beam.");
export type StaticsInput=z.infer<typeof staticsInputSchema>;
export const phs231StaticsActivitySchema=z.object({kind:z.literal("phs231-statics"),prompt:z.string().min(1).max(6000),initial:staticsInputSchema}).strict();
export type StaticsActivity=z.infer<typeof phs231StaticsActivitySchema>;
export type StaticDecision="admitted"|"friction"|"contact";
type Constraint={id:"normal-a"|"normal-b"|"friction";label:string;constant:number;gradient:number};
const zero=(n:number)=>n||0;

export function staticsRun(input:StaticsInput){
  const p=staticsInputSchema.parse(input),span=p.supportB-p.supportA;
  const distributedLoad=p.length*(p.loadLeft+p.loadRight)/2,distributedMoment=p.length*p.length*(p.loadLeft+2*p.loadRight)/6;
  const totalLoad=p.beamWeight+distributedLoad+p.pointLoad,baseMoment=p.beamWeight*p.length/2+distributedMoment+p.height*p.horizontal-p.couple;
  const normalA0=(p.supportB*totalLoad-baseMoment)/span,normalB0=(baseMoment-p.supportA*totalLoad)/span,gradient=p.pointLoad/span;
  const constraints:Constraint[]=[
    {id:"normal-a",label:"Left normal reaches zero",constant:normalA0,gradient:-gradient},
    {id:"normal-b",label:"Right normal reaches zero",constant:normalB0,gradient},
    {id:"friction",label:"Left friction reaches its bound",constant:p.muStatic*normalA0-Math.abs(p.horizontal),gradient:-p.muStatic*gradient},
  ];
  const at=(position:number)=>{
    if(!Number.isFinite(position)||position<0||position>p.length)throw Error("Load position must be on the finite beam.");
    const rawA=normalA0-gradient*position,rawB=normalB0+gradient*position;
    const eps=tolerance(rawA,rawB,totalLoad,p.horizontal),normalA=Math.abs(rawA)<=eps?0:rawA,normalB=Math.abs(rawB)<=eps?0:rawB;
    const friction=zero(-p.horizontal),rawMargin=p.muStatic*normalA-Math.abs(p.horizontal),frictionMargin=Math.abs(rawMargin)<=tolerance(rawMargin,p.muStatic*normalA,p.horizontal)?0:rawMargin;
    const failed=[...(normalA<0?["normal-a"]:[]),...(normalB<0?["normal-b"]:[]),...(frictionMargin<0?["friction"]:[])];
    const contactAdmitted=normalA>=0&&normalB>=0,decision:StaticDecision=!contactAdmitted?"contact":frictionMargin<0?"friction":"admitted";
    const moment=p.beamWeight*p.length/2+distributedMoment+p.pointLoad*position;
    const residualAt=(origin:number)=>normalA*(p.supportA-origin)+normalB*(p.supportB-origin)-p.beamWeight*(p.length/2-origin)-(distributedMoment-origin*distributedLoad)-p.pointLoad*(position-origin)-p.height*p.horizontal+p.couple;
    return {position,normalA:zero(normalA),normalB:zero(normalB),friction,
      frictionCapacity:normalA<0?null:p.muStatic*normalA,frictionMargin:zero(frictionMargin),
      contactAdmitted,decision,admitted:decision==="admitted",failed,
      limiting:decision==="admitted"&&(normalA===0||normalB===0||frictionMargin===0&&(p.muStatic>0||p.horizontal!==0)),
      loadCentroid:moment/totalLoad,supportLine:(moment+p.height*p.horizontal-p.couple)/totalLoad,
      forceXResidual:zero(friction+p.horizontal),forceYResidual:zero(normalA+normalB-totalLoad),
      momentOriginResidual:zero(residualAt(0)),momentAResidual:zero(residualAt(p.supportA)),momentBResidual:zero(residualAt(p.supportB))};
  };
  let lower=0,upper=p.length,empty=false;
  for(const c of constraints){
    const first=c.constant,last=c.constant+c.gradient*p.length;
    if(first>=0&&last>=0)continue;
    if(first<0&&last<0){empty=true;break;}
    if(c.gradient===0){if(first<0)empty=true;continue;}
    const root=Math.max(0,Math.min(p.length,-c.constant/c.gradient));
    if(c.gradient>0)lower=Math.max(lower,root);else upper=Math.min(upper,root);
  }
  if(lower>upper+tolerance(lower,upper,p.length))empty=true;
  if(!empty&&lower>upper)lower=upper=(lower+upper)/2;
  const feasibleWindow=empty?null:{lower:zero(lower),upper:zero(upper)};
  const boundaries=constraints.flatMap(c=>{
    if(c.gradient===0)return [];
    const position=-c.constant/c.gradient;
    return Number.isFinite(position)&&position>=0&&position<=p.length?[{id:c.id,label:c.label,position:zero(position)}]:[];
  }).sort((a,b)=>a.position-b.position);
  const anchors=[0,p.length,p.pointX,...boundaries.map(b=>b.position)];
  const regular=Array.from({length:81},(_,i)=>p.length*i/80).filter(x=>x===0||x===p.length||!anchors.some(a=>Math.abs(a-x)<=tolerance(a,x,p.length)));
  const positions=[...new Set([...regular,...anchors])].sort((a,b)=>a-b);
  return {span,distributedLoad,distributedMoment,distributedCentroid:distributedLoad===0?null:distributedMoment/distributedLoad,totalLoad,constraints,boundaries,feasibleWindow,current:at(p.pointX),samples:positions.map(at)};
}
