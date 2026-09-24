import { z } from "zod";

export const projectileInputSchema=z.object({height:z.number().finite().min(0).max(50),vx:z.number().finite().min(-30).max(30),vy:z.number().finite().min(-30).max(30),gravity:z.number().finite().min(1).max(20)}).strict();
export type ProjectileInput=z.infer<typeof projectileInputSchema>;
export const phs231ProjectileActivitySchema=z.object({kind:z.literal("phs231-projectiles"),prompt:z.string().min(1).max(6000),initial:projectileInputSchema}).strict();
export type ProjectileActivity=z.infer<typeof phs231ProjectileActivitySchema>;

export function projectileFlight(input:ProjectileInput) {
  const {height:h,vx,vy,gravity:g}=projectileInputSchema.parse(input);
  const root=Math.sqrt(vy*vy+2*g*h);
  const flightTime=h===0&&vy<=0?0:vy<0?2*h/(root-vy):(vy+root)/g;
  const apexTime=vy>0?vy/g:0,apexHeight=h+(vy>0?vy*vy/(2*g):0);
  const at=(t:number)=>({t,x:vx*t,y:t===flightTime?0:h+vy*t-g*t*t/2,vx,vy:vy-g*t,ax:0,ay:-g});
  const times=flightTime===0?[0]:[...new Set([...Array.from({length:11},(_,i)=>i===10?flightTime:flightTime*i/10),apexTime])].sort((a,b)=>a-b);
  return {flightTime,displacement:vx*flightTime,apexTime,apexHeight,impact:at(flightTime),samples:times.map(at),plot:Array.from({length:flightTime===0?1:81},(_,i)=>at(i===80?flightTime:flightTime*i/80))};
}
