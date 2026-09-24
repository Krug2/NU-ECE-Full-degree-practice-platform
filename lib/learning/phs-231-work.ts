import { z } from "zod";

export const workInputSchema=z.object({
  mass:z.number().finite().min(.1).max(20),initialSpeed:z.number().finite().min(0).max(20).refine(v=>v===0||v>=.01),
  forceMagnitude:z.number().finite().min(0).max(100),angleDegrees:z.number().finite().min(-180).max(180),
  slope:z.number().finite().min(-50).max(50),distance:z.number().finite().min(.1).max(20),
}).strict();
export type WorkInput=z.infer<typeof workInputSchema>;
export const phs231WorkActivitySchema=z.object({kind:z.literal("phs231-work"),prompt:z.string().min(1).max(6000),initial:workInputSchema}).strict();
export type WorkActivity=z.infer<typeof phs231WorkActivitySchema>;
type Limit={position:number;kind:"turn"|"asymptotic"|"start"};
export type WorkStatus="reachable"|"turn-at-end"|"turns"|"asymptotic"|"no-forward-start";

export function workAlongGuide(input:WorkInput){
  const p=workInputSchema.parse(input),projection=p.forceMagnitude*Math.cos(p.angleDegrees*Math.PI/180);
  const constant=Math.abs(projection)<=8*Number.EPSILON*Math.max(1,p.forceMagnitude)?0:projection;
  const initialKinetic=p.mass*p.initialSpeed*p.initialSpeed/2;
  const force=(x:number)=>constant+p.slope*x,work=(x:number)=>constant*x+p.slope*x*x/2,kinetic=(x:number)=>initialKinetic+work(x);
  let limit:Limit|null=null;
  if(p.initialSpeed===0&&constant<=0)limit={position:0,kind:"start"};
  else if(p.slope===0){
    if(constant<0)limit={position:-initialKinetic/constant,kind:"turn"};
  }else{
    const discriminant=constant*constant-2*p.slope*initialKinetic;
    const tolerance=32*Number.EPSILON*Math.max(Number.MIN_VALUE,constant*constant,Math.abs(2*p.slope*initialKinetic));
    if(discriminant>=-tolerance){
      const repeated=Math.abs(discriminant)<=tolerance,sqrt=Math.sqrt(Math.max(0,discriminant));
      const q=-.5*(constant+(constant>=0?1:-1)*sqrt);
      const roots=repeated?[-constant/p.slope]:[q/(p.slope/2),initialKinetic/q];
      const positive=roots.filter(x=>Number.isFinite(x)&&x>0).sort((a,b)=>a-b);
      if(positive.length)limit={position:positive[0],kind:repeated?"asymptotic":"turn"};
    }
  }
  const positionTolerance=32*Number.EPSILON*Math.max(1,p.distance);
  if(limit&&Math.abs(limit.position-p.distance)<=positionTolerance)limit={...limit,position:p.distance};
  const encountered=limit!==null&&limit.position<=p.distance;
  const status:WorkStatus=!encountered?"reachable":limit!.kind==="start"?"no-forward-start":limit!.kind==="asymptotic"?"asymptotic":limit!.position===p.distance?"turn-at-end":"turns";
  const reached=status==="reachable"||status==="turn-at-end";
  const endpointWork=work(p.distance),candidateKinetic=kinetic(p.distance);
  const finalSpeed=reached?Math.sqrt(2*Math.max(0,candidateKinetic)/p.mass):null;
  const positions=[...Array.from({length:41},(_,i)=>p.distance*i/40),...(encountered?[limit!.position]:[])];
  if(p.slope!==0&&-constant/p.slope>0&&-constant/p.slope<p.distance)positions.push(-constant/p.slope);
  const samples=[...new Set(positions)].sort((a,b)=>a-b).map(position=>{
    const available=!encountered||limit!.kind==="start"?(!encountered||position===0):limit!.kind==="asymptotic"?position<limit!.position:position<=limit!.position;
    const candidate=kinetic(position),speed=available?Math.sqrt(2*Math.max(0,candidate)/p.mass):null;
    return {position,force:force(position),work:work(position),candidateKinetic:candidate,forwardSpeed:speed,power:speed===null?null:force(position)*speed};
  });
  return {constant,initialKinetic,endpointWork,candidateKinetic,finalSpeed,status,limit:encountered?limit:null,samples};
}

