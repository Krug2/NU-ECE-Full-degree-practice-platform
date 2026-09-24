import { z } from "zod";

const finite=(min:number,max:number)=>z.number().finite().min(min).max(max);
const material={modulusGPa:finite(.001,300),stressLimitMPa:finite(.01,1000),strainLimit:finite(.00001,.05)};
const face={...material,lengthM:finite(.01,5),areaMm2:finite(.1,1000),loadN:finite(-5000,5000)};
export const elasticInputSchema=z.discriminatedUnion("mode",[
  z.object({mode:z.literal("axial"),...face}).strict(),
  z.object({mode:z.literal("shear"),...face}).strict(),
  z.object({mode:z.literal("bulk"),...material,volumeCm3:finite(.1,5000),pressureMPa:finite(0,1000)}).strict(),
]);
export type ElasticInput=z.infer<typeof elasticInputSchema>;
export const phs231ElasticActivitySchema=z.object({kind:z.literal("phs231-elasticity"),prompt:z.string().min(1).max(6000),initial:elasticInputSchema}).strict();
export type ElasticActivity=z.infer<typeof phs231ElasticActivitySchema>;
export type ElasticStatus="admitted"|"limit"|"outside"|"history";
const tolerance=(...n:number[])=>64*Number.EPSILON*Math.max(1,...n.map(Math.abs));
const zero=(n:number)=>n||0;

export function elasticRun(input:ElasticInput){
  const p=elasticInputSchema.parse(input),bulk=p.mode==="bulk",modulusPa=p.modulusGPa*1e9;
  const volumeM3=p.mode==="bulk"?p.volumeCm3*1e-6:p.areaMm2*1e-6*p.lengthM;
  const stiffness=p.mode==="bulk"?modulusPa/volumeM3:modulusPa*p.areaMm2*1e-6/p.lengthM;
  const peakLoad=zero(p.mode==="bulk"?p.pressureMPa:p.loadN);
  const peakStress=zero(p.mode==="bulk"?p.pressureMPa:p.loadN/p.areaMm2);
  const strainStressLimit=1000*p.modulusGPa*p.strainLimit,stressLimit=Math.min(p.stressLimitMPa,strainStressLimit);
  const stressTolerance=tolerance(peakStress,stressLimit),overloaded=Math.abs(peakStress)>stressLimit+stressTolerance;
  const limitLoad=p.mode==="bulk"?stressLimit:stressLimit*p.areaMm2;
  const limitStage=Math.abs(peakStress)>0&&Math.abs(peakStress)>=stressLimit-stressTolerance?Math.min(1,stressLimit/Math.abs(peakStress)):null;
  const limitBy=Math.abs(p.stressLimitMPa-strainStressLimit)<=tolerance(p.stressLimitMPa,strainStressLimit)?"both":p.stressLimitMPa<strainStressLimit?"stress":"strain";
  const at=(stage:number)=>{
    if(!Number.isFinite(stage)||stage<0||stage>2)throw Error("Loading stage must lie in [0, 2].");
    const fraction=stage<=1?stage:2-stage,load=zero(peakLoad*fraction),stress=zero(peakStress*fraction);
    const withinRange=Math.abs(stress)<=stressLimit+tolerance(stress,stressLimit);
    const historyAdmitted=withinRange&&(!overloaded||limitStage!==null&&stage<=limitStage);
    const limiting=historyAdmitted&&Math.abs(Math.abs(stress)-stressLimit)<=tolerance(stress,stressLimit);
    const status:ElasticStatus=!withinRange?"outside":!historyAdmitted?"history":limiting?"limit":"admitted";
    const strain=historyAdmitted?zero((bulk?-1:1)*stress*1e6/modulusPa):null;
    const deformation=strain===null?null:zero(strain*(p.mode==="bulk"?volumeM3:p.lengthM));
    const energyDensity=strain===null?null:.5*modulusPa*strain*strain;
    const energy=energyDensity===null?null:energyDensity*volumeM3;
    const work=deformation===null?null:zero(.5*(bulk?-load*1e6:load)*deformation);
    return {stage,fraction,phase:stage<=1?"loading" as const:"unloading" as const,load,stress,withinRange,historyAdmitted,limiting,status,strain,deformation,energyDensity,energy,work,energyResidual:energy===null||work===null?null:zero(energy-work)};
  };
  const events=limitStage===null?[]:[
    {stage:limitStage,kind:"loading-limit" as const,label:"Inspect loading limit"},
    ...(limitStage<1?[{stage:2-limitStage,kind:"return-within-range" as const,label:"Inspect return to load range"}]:[]),
  ];
  const anchors=[0,1,2,...events.map(e=>e.stage)];
  const regular=Array.from({length:81},(_,i)=>i/40).filter(t=>t===0||t===1||t===2||!anchors.some(a=>Math.abs(a-t)<=tolerance(a,t)));
  const stages=[...new Set([...regular,...anchors])].sort((a,b)=>a-b);
  return {mode:p.mode,modulusPa,volumeM3,stiffness,compliance:1/stiffness,peakLoad,peakStress,stressLimit,limitLoad,limitBy,limitStage,overloaded,events,peak:at(1),final:at(2),samples:stages.map(at)};
}
