import { z } from "zod";

export const motionInputSchema = z.object({
  x0: z.number().finite().min(-100).max(100),
  v0: z.number().finite().min(-30).max(30),
  acceleration: z.number().finite().min(-20).max(20),
  duration: z.number().finite().min(.1).max(20),
}).strict();
export type MotionInput = z.infer<typeof motionInputSchema>;
export const phs231MotionActivitySchema = z.object({ kind: z.literal("phs231-motion"), prompt: z.string().min(1).max(6000), initial: motionInputSchema }).strict();
export type MotionActivity = z.infer<typeof phs231MotionActivitySchema>;

export function constantMotion(input: MotionInput) {
  const { x0, v0, acceleration: a, duration: T } = motionInputSchema.parse(input);
  const position = (t: number) => x0 + v0*t + a*t*t/2;
  const velocity = (t: number) => v0 + a*t;
  const zero = a === 0 ? null : -v0/a;
  const turningTime = zero !== null && zero > 0 && zero < T ? zero : null;
  const distanceAt = (t: number) => turningTime !== null && turningTime < t
    ? Math.abs(position(turningTime)-x0) + Math.abs(position(t)-position(turningTime))
    : Math.abs(position(t)-x0);
  const times = [...new Set([...Array.from({length:11},(_,i)=>T*i/10), ...(turningTime===null?[]:[turningTime])])].sort((a,b)=>a-b);
  const samples = times.map(t=>({t,x:position(t),v:velocity(t),a,speed:Math.abs(velocity(t)),displacement:position(t)-x0,distance:distanceAt(t)}));
  const plot = Array.from({length:81},(_,i)=>{const t=T*i/80;return {t,x:position(t),v:velocity(t),a};});
  return { turningTime, displacement: position(T)-x0, distance: distanceAt(T), finalVelocity: velocity(T), samples, plot };
}
