import { z } from "zod";

const component=z.number().finite().min(-20).max(20);
export const frameVectorSchema=z.tuple([component,component,component]);
export type FrameVector=z.infer<typeof frameVectorSchema>;
export const frameInputSchema=z.object({r0:frameVectorSchema,v0:frameVectorSchema,acceleration:frameVectorSchema,origin:frameVectorSchema,observerVelocity:frameVectorSchema,time:z.number().finite().min(0).max(10)}).strict();
export type FrameInput=z.infer<typeof frameInputSchema>;
export const phs231FrameActivitySchema=z.object({kind:z.literal("phs231-frames"),prompt:z.string().min(1).max(6000),initial:frameInputSchema}).strict();
export type FrameActivity=z.infer<typeof phs231FrameActivitySchema>;

export function frameMotion(input:FrameInput) {
  const p=frameInputSchema.parse(input);
  const at=(t:number)=>{
    const position=p.r0.map((r,i)=>r+p.v0[i]*t+p.acceleration[i]*t*t/2) as FrameVector;
    const velocity=p.v0.map((v,i)=>v+p.acceleration[i]*t) as FrameVector;
    const observerPosition=p.origin.map((r,i)=>r+p.observerVelocity[i]*t) as FrameVector;
    return {t,position,velocity,observerPosition,relativePosition:position.map((r,i)=>r-observerPosition[i]) as FrameVector,relativeVelocity:velocity.map((v,i)=>v-p.observerVelocity[i]) as FrameVector,acceleration:[...p.acceleration] as FrameVector};
  };
  return {current:at(p.time),samples:Array.from({length:p.time===0?1:9},(_,i)=>at(p.time*i/8))};
}
