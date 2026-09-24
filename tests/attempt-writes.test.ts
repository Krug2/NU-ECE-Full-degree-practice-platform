import { expect,it,vi } from "vitest";
import { AttemptWriteQueue } from "../lib/learning/attempt-writes";
import { createAttempt,updateAttempt } from "../lib/learning/attempts";
import { emptyProgress } from "../lib/progress";
import { lessonSchema } from "../lib/learning/contracts";
import lesson from "../content/lessons/mth-215/m01-l01.json";

const fixture=()=>{const data=emptyProgress(),attempt=createAttempt(lessonSchema.parse(lesson),"practice","rapid-answers");data.learning.attempts=[attempt];return {data,attempt};};
it("coalesces pending answer snapshots and retains the complete final answer",async()=>{
  const {data,attempt}=fixture();let current=data,release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const save=vi.fn(async(id,revision,patch)=>{await gate;current={...current,learning:updateAttempt(current.learning,id,revision,value=>({...value,...patch}))};return true;});
  const writer=new AttemptWriteQueue(attempt.id,0,save),question=attempt.questions[0],field=question.fields[0].id;
  const answers=["(","(1","(12","(12/","(12/3","(12/3)"],pending=answers.map(answer=>writer.enqueue({responses:{[question.id]:{[field]:answer}}}));
  expect(writer.pending).toBe(6);expect(writer.revision).toBe(0);expect(current.learning.attempts[0].responses).toEqual({});
  release();expect((await Promise.all(pending)).every(result=>result.saved)).toBe(true);
  expect(writer.pending).toBe(0);expect(writer.revision).toBe(1);
  expect(current.learning.attempts[0].responses[question.id][field]).toBe("(12/3)");
  expect(save).toHaveBeenCalledTimes(1);
});
it("stops queued saves after a persistence failure and resumes only after explicit recovery",async()=>{
  const {data,attempt}=fixture();let current=data;
  const save=vi.fn().mockResolvedValueOnce(false).mockImplementation(async(id,revision,patch)=>{current={...current,learning:updateAttempt(current.learning,id,revision,value=>({...value,...patch}))};return true;});
  const writer=new AttemptWriteQueue(attempt.id,0,save);
  expect((await Promise.all([writer.enqueue({position:1}),writer.enqueue({position:2})])).map(result=>result.saved)).toEqual([false,false]);
  expect(writer.revision).toBe(0);expect(save).toHaveBeenCalledTimes(1);expect(current).toEqual(data);
  writer.reset(0);expect((await writer.enqueue({position:3})).saved).toBe(true);
  expect(current.learning.attempts[0].position).toBe(3);expect(writer.revision).toBe(1);
});
it("refuses stale updates without replacing a newer answer or advancing the writer revision",async()=>{
  const {data,attempt}=fixture();
  let current={...data,learning:updateAttempt(data.learning,attempt.id,0,value=>({...value,position:1}))};
  const saved=current;
  const writer=new AttemptWriteQueue(attempt.id,0,async(id,revision,patch)=>{current={...current,learning:updateAttempt(current.learning,id,revision,value=>({...value,...patch}))};return true;});
  const result=await writer.enqueue({position:2});
  expect(result.saved).toBe(false);expect(result.message).toContain("another tab");
  expect(current).toEqual(saved);expect(writer.revision).toBe(0);
  writer.reset(1);expect((await writer.enqueue({position:2})).saved).toBe(true);
  expect(writer.revision).toBe(2);
});
it("captures queued changes and prevents recovery from racing an unfinished save",async()=>{
  const {data,attempt}=fixture();let current=data,release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const writer=new AttemptWriteQueue(attempt.id,0,async(id,revision,patch)=>{await gate;current={...current,learning:updateAttempt(current.learning,id,revision,value=>({...value,...patch}))};return true;});
  const patch={position:1},pending=writer.enqueue(patch);patch.position=2;
  expect(()=>writer.reset(0)).toThrow("Wait for the current save");
  release();await pending;expect(current.learning.attempts[0].position).toBe(1);
});
it("does not merge answers across an active write, hint, navigation, or submission",async()=>{
  const {data,attempt}=fixture();let current=data,release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;}),seen:unknown[]=[];
  const save=vi.fn(async(id,revision,patch)=>{seen.push(structuredClone(patch));await gate;current={...current,learning:updateAttempt(current.learning,id,revision,value=>({...value,...patch}))};return true;});
  const writer=new AttemptWriteQueue(attempt.id,0,save),question=attempt.questions[0],field=question.fields[0].id;
  const answer=(value:string)=>({responses:{[question.id]:{[field]:value}}});
  const first=writer.enqueue(answer("1"));await vi.waitFor(()=>expect(save).toHaveBeenCalledTimes(1));
  const jobs=[writer.enqueue(answer("12")),writer.enqueue(answer("123")),writer.enqueue({hints:{[question.id]:1}}),writer.enqueue(answer("4")),writer.enqueue({position:1}),writer.enqueue(answer("5")),writer.enqueue({status:"submitted",submittedAt:"2026-09-24T03:00:00.000Z"})];
  let acknowledged=false;void first.then(()=>{acknowledged=true;});expect(acknowledged).toBe(false);
  release();expect((await Promise.all([first,...jobs])).every(result=>result.saved)).toBe(true);
  expect(seen).toEqual([answer("1"),answer("123"),{hints:{[question.id]:1}},answer("4"),{position:1},answer("5"),{status:"submitted",submittedAt:"2026-09-24T03:00:00.000Z"}]);
  expect(writer.revision).toBe(7);expect(writer.pending).toBe(0);
  expect(current.learning.attempts[0]).toMatchObject({status:"submitted",position:1,responses:answer("5").responses,hints:{[question.id]:1}});
});
it("does not acknowledge any coalesced answer when its write fails",async()=>{
  const save=vi.fn(async()=>false),writer=new AttemptWriteQueue(crypto.randomUUID(),0,save);
  const results=await Promise.all([writer.enqueue({responses:{q1:{x:"1"}}}),writer.enqueue({responses:{q1:{x:"12"}}}),writer.enqueue({position:1})]);
  expect(results.every(result=>!result.saved&&result.revision===0)).toBe(true);
  expect(save).toHaveBeenCalledTimes(1);expect(writer.pending).toBe(0);
});
