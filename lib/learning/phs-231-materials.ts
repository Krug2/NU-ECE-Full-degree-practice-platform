import { z } from "zod";

const finite=(min:number,max:number)=>z.number().finite().min(min).max(max);
const common={modulusGPa:finite(1,300),lengthMm:finite(1,1000),areaMm2:finite(.1,1000),peakStrain:finite(0,.5)};
export const materialInputSchema=z.discriminatedUnion("mode",[
  z.object({mode:z.literal("ductile"),...common,yieldMPa:finite(1,1500),hardeningStrain:finite(.00001,.49),hardeningMPa:finite(1,2000),fractureStrain:finite(.00002,.5),fractureMPa:finite(1,2000)}).strict(),
  z.object({mode:z.literal("brittle"),...common,fractureMPa:finite(1,2000)}).strict(),
]).superRefine((p,ctx)=>{
  const E=1000*p.modulusGPa;
  if(p.mode==="brittle"){
    if(p.fractureMPa/E>.5)ctx.addIssue({code:"custom",message:"The supplied brittle fracture strain must not exceed 0.5."});
  }else{
    if(!(p.yieldMPa/E<p.hardeningStrain&&p.hardeningStrain<p.fractureStrain))ctx.addIssue({code:"custom",message:"Require yield strain < end-of-hardening strain < fracture strain."});
    if(p.hardeningMPa<p.yieldMPa||p.hardeningMPa>E*p.hardeningStrain||p.fractureMPa>p.hardeningMPa)ctx.addIssue({code:"custom",message:"Hardening stress must lie between yield stress and E times its strain; fracture stress cannot exceed it."});
  }
});
export type MaterialInput=z.infer<typeof materialInputSchema>;
export const phs231MaterialActivitySchema=z.object({kind:z.literal("phs231-materials"),prompt:z.string().min(1).max(6000),initial:materialInputSchema}).strict();
export type MaterialActivity=z.infer<typeof phs231MaterialActivitySchema>;
type Point={strain:number;stress:number;kind:"origin"|"yield"|"hardening"|"fracture"};
const zero=(n:number)=>n||0;
const close=(a:number,b:number)=>Math.abs(a-b)<=64*Number.EPSILON*Math.max(1,Math.abs(a),Math.abs(b));

export function materialRun(input:MaterialInput){
  const p=materialInputSchema.parse(input),E=1000*p.modulusGPa,volumeM3=p.areaMm2*p.lengthMm*1e-9;
  const fractureStrain=p.mode==="brittle"?p.fractureMPa/E:p.fractureStrain;
  const curve:Point[]=p.mode==="brittle"?[{strain:0,stress:0,kind:"origin"},{strain:fractureStrain,stress:p.fractureMPa,kind:"fracture"}]:[
    {strain:0,stress:0,kind:"origin"},{strain:p.yieldMPa/E,stress:p.yieldMPa,kind:"yield"},{strain:p.hardeningStrain,stress:p.hardeningMPa,kind:"hardening"},{strain:fractureStrain,stress:p.fractureMPa,kind:"fracture"},
  ];
  const stressAt=(strain:number)=>{
    for(let i=1;i<curve.length;i++)if(strain<=curve[i].strain){
      const a=curve[i-1],b=curve[i];return strain===b.strain?b.stress:zero(a.stress+(b.stress-a.stress)*(strain-a.strain)/(b.strain-a.strain));
    }
    throw Error("The supplied record does not establish postfracture stress.");
  };
  const integral=(strain:number)=>{
    let area=0;
    for(let i=1;i<curve.length;i++){
      const a=curve[i-1],b=curve[i],end=Math.min(strain,b.strain);
      if(end>a.strain)area+=(a.stress+stressAt(end))*(end-a.strain)/2;
      if(strain<=b.strain)break;
    }
    return zero(area*1e6);
  };
  const fractured=p.peakStrain>=fractureStrain,fractureStage=fractured?fractureStrain/p.peakStrain:null;
  const loadingStopStrain=Math.min(p.peakStrain,fractureStrain),loadingStopStress=stressAt(loadingStopStrain),loadingStopDensity=integral(loadingStopStrain);
  const residualStrain=fractured?null:Math.max(0,p.peakStrain-loadingStopStress/E);
  const peakRecoverable=fractured?null:loadingStopStress*loadingStopStress/(2*E)*1e6;
  const events=curve.slice(1).filter(point=>point.strain<=loadingStopStrain).map(point=>({stage:point.strain/p.peakStrain,strain:point.strain,kind:point.kind,label:point.kind==="yield"?"Inspect supplied yield":point.kind==="hardening"?"Inspect end of hardening":"Inspect fracture endpoint"}));
  if(!fractured&&p.peakStrain>0)events.push({stage:2,strain:residualStrain!,kind:"origin",label:"Inspect residual state"});
  const at=(stage:number)=>{
    const commandStrain=zero(stage<=1?p.peakStrain*stage:fractured?p.peakStrain*(2-stage):p.peakStrain-(stage-1)*(p.peakStrain-residualStrain!));
    const afterFracture=fractureStage!==null&&stage>fractureStage,terminal=fractureStage!==null&&stage===fractureStage;
    if(afterFracture)return {stage,commandStrain,phase:"after-fracture" as const,strain:null,stress:null,forceN:null,extensionMm:null,loadingDensity:null,returnedDensity:null,netDensity:null,recoverableDensity:null,unrecoveredDensity:null,loadingWorkJ:null,returnedWorkJ:null,netWorkJ:null,recoverableWorkJ:null,unrecoveredWorkJ:null,workResidual:null};
    const event=events.find(e=>e.stage===stage),strain=terminal?fractureStrain:event?event.strain:stage===2?residualStrain!:commandStrain;
    const unloading=stage>1,stress=zero(unloading?Math.max(0,E*(strain-residualStrain!)):stressAt(strain));
    const loadingDensity=unloading?loadingStopDensity:integral(strain);
    const recoverableDensity=terminal?null:stress*stress/(2*E)*1e6;
    const returnedDensity=unloading?Math.max(0,peakRecoverable!-recoverableDensity!):0;
    const netDensity=zero(loadingDensity-returnedDensity);
    const unrecoveredDensity=terminal?null:Math.max(0,netDensity-recoverableDensity!);
    const loadingWorkJ=zero(loadingDensity*volumeM3),returnedWorkJ=zero(returnedDensity*volumeM3),netWorkJ=zero(netDensity*volumeM3);
    const recoverableWorkJ=recoverableDensity===null?null:zero(recoverableDensity*volumeM3),unrecoveredWorkJ=unrecoveredDensity===null?null:zero(unrecoveredDensity*volumeM3);
    return {stage,commandStrain,phase:terminal?"fracture" as const:unloading?"unloading" as const:"loading" as const,strain:zero(strain),stress,forceN:zero(stress*p.areaMm2),extensionMm:zero(strain*p.lengthMm),loadingDensity,returnedDensity,netDensity,recoverableDensity,unrecoveredDensity,loadingWorkJ,returnedWorkJ,netWorkJ,recoverableWorkJ,unrecoveredWorkJ,workResidual:recoverableWorkJ===null||unrecoveredWorkJ===null?null:zero(netWorkJ-recoverableWorkJ-unrecoveredWorkJ)};
  };
  const anchors=[0,1,2,...events.map(e=>e.stage)],regular=Array.from({length:81},(_,i)=>i/40).filter(t=>t===0||t===1||t===2||!anchors.some(a=>close(a,t)));
  const stages=[...new Set([...regular,...anchors])].sort((a,b)=>a-b),ultimateStress=Math.max(...curve.map(point=>point.stress)),maxPoints=curve.filter(point=>point.stress===ultimateStress);
  return {mode:p.mode,modulusMPa:E,volumeM3,fractureStrain,curve,ultimateStress,ultimateFirstStrain:maxPoints[0].strain,ultimateLastStrain:maxPoints.at(-1)!.strain,fractureStress:p.fractureMPa,workToFractureDensity:integral(fractureStrain),workToFractureJ:integral(fractureStrain)*volumeM3,fractured,fractureStage,loadingStopStrain,loadingStopStress,loadingStopDensity,largestReachedStress:Math.max(loadingStopStress,...curve.filter(point=>point.strain<=loadingStopStrain).map(point=>point.stress)),residualStrain,events,lastDocumented:at(fractureStage??1),peak:at(1),final:at(2),samples:stages.map(at)};
}
