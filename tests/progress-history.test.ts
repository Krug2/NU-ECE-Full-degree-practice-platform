import { afterEach,expect,it,vi } from "vitest";
import { IDBFactory,IDBObjectStore } from "fake-indexeddb";
import { emptyProgress,parseBackup } from "../lib/progress";
import { openProgressRepository,progressRecordKey,progressStoreName,stringifyRecovery,type ProgressRepository } from "../lib/progress-repository";
import { attemptStoreName,historyIndexKey } from "../lib/progress-records";
import { createAttempt,updateAttempt } from "../lib/learning/attempts";
import { lessonSchema } from "../lib/learning/contracts";
import lessonData from "../content/lessons/mth-215/m01-l01.json";

const connections:ProgressRepository[]=[];
afterEach(()=>{connections.splice(0).forEach(repository=>repository.close());vi.restoreAllMocks();});
const fixture=()=>{
  const data=emptyProgress(),lesson=lessonSchema.parse(lessonData);
  data.learning.attempts=[createAttempt(lesson,"practice","history-first"),createAttempt(lesson,"checkpoint","history-second")];
  data.learning.notes={"mth-215":{"m01-l01":"Keep this note."}};return data;
};
async function open(factory=new IDBFactory(),name=crypto.randomUUID()){
  const repository=await openProgressRepository({factory,name});connections.push(repository);return {repository,factory,name};
}
async function native(factory:IDBFactory,name:string,work:(transaction:IDBTransaction)=>void,legacy=false){
  await new Promise<void>((resolve,reject)=>{
    const request=legacy?factory.open(name,1):factory.open(name);
    request.onupgradeneeded=()=>request.result.createObjectStore(progressStoreName);
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const database=request.result,transaction=database.transaction(Array.from(database.objectStoreNames),"readwrite");
      transaction.oncomplete=()=>{database.close();resolve();};
      transaction.onabort=()=>{database.close();reject(transaction.error);};work(transaction);
    };
  });
}
it("migrates the original database atomically while preserving its untouched recovery record",async()=>{
  const factory=new IDBFactory(),name=crypto.randomUUID(),data=fixture(),legacy={storageVersion:1,revision:9,data};
  await native(factory,name,tx=>tx.objectStore(progressStoreName).put(legacy,progressRecordKey),true);
  const {repository}=await open(factory,name),unused=vi.fn(()=>"{broken"),saved=await repository.initialize(unused);
  expect(saved).toMatchObject({storageVersion:2,revision:9,data});expect(unused).not.toHaveBeenCalled();
  const raw=await repository.readRaw();
  expect(raw).toMatchObject({legacy,marker:2,attempts:expect.arrayContaining(data.learning.attempts.map(attempt=>({key:attempt.id,value:{revision:9,data:attempt}})))});
  await repository.saveAttempt(data.learning.attempts[0].id,0,{position:1});
  expect(await repository.readRaw()).toMatchObject({legacy});
  expect(parseBackup(stringifyRecovery(legacy))).toEqual(data);
  await expect(new Promise((resolve,reject)=>{
    const request=factory.open(name,1);request.onsuccess=()=>{request.result.close();resolve(null);};request.onerror=()=>reject(request.error);
  })).rejects.toMatchObject({name:"VersionError"});
});
it("rolls back every migration write when the history index cannot be committed",async()=>{
  const factory=new IDBFactory(),name=crypto.randomUUID(),legacy={storageVersion:1,revision:4,data:fixture()};
  await native(factory,name,tx=>tx.objectStore(progressStoreName).put(legacy,progressRecordKey),true);
  const {repository}=await open(factory,name),put=IDBObjectStore.prototype.put;
  const failure=vi.spyOn(IDBObjectStore.prototype,"put").mockImplementation(function(this:IDBObjectStore,value,key){
    if(this.name===progressStoreName&&key===historyIndexKey)throw new DOMException("Full","QuotaExceededError");
    return put.call(this,value,key);
  });
  await expect(repository.initialize()).rejects.toMatchObject({code:"commit"});
  expect(await repository.readRaw()).toEqual(legacy);failure.mockRestore();
  expect((await repository.initialize()).data).toEqual(legacy.data);
});
it("saves one answer without rereading or rewriting unrelated question histories",async()=>{
  const {repository}=await open(),data=fixture(),before=await repository.initialize(()=>JSON.stringify(data));
  const put=IDBObjectStore.prototype.put,get=IDBObjectStore.prototype.get,writes:{store:string;key:IDBValidKey|undefined}[]=[],reads:string[]=[];
  vi.spyOn(IDBObjectStore.prototype,"put").mockImplementation(function(this:IDBObjectStore,value,key){writes.push({store:this.name,key});return put.call(this,value,key);});
  vi.spyOn(IDBObjectStore.prototype,"get").mockImplementation(function(this:IDBObjectStore,key){reads.push(this.name);return get.call(this,key);});
  const attempt=data.learning.attempts[0],question=attempt.questions[0],patch={responses:{[question.id]:{[question.fields[0].id]:"7"}}};
  const after=await repository.saveAttempt(attempt.id,0,patch);
  expect(after.data.learning.attempts[0].responses).toEqual(patch.responses);
  expect(after.data.learning.attempts[1]).toBe(before.data.learning.attempts[1]);
  expect(reads).not.toContain(attemptStoreName);
  expect(writes.filter(write=>write.store===attemptStoreName)).toEqual([{store:attemptStoreName,key:attempt.id}]);
  expect(after.generation).toBe(before.generation);expect(after.revision).toBe(2);
  expect(await repository.read(true)).toEqual(after);
});
it("merges saves to different attempts but rejects a stale edit to the same attempt",async()=>{
  const {repository:first,factory,name}=await open(),second=(await open(factory,name)).repository,data=fixture();
  await first.initialize(()=>JSON.stringify(data));await second.read();
  await Promise.all([first.saveAttempt(data.learning.attempts[0].id,0,{position:1}),second.saveAttempt(data.learning.attempts[1].id,0,{position:2})]);
  const saved=await first.read();expect(saved.data.learning.attempts.map(attempt=>attempt.position)).toEqual([1,2]);
  const prepared=vi.fn();
  await expect(second.saveAttempt(data.learning.attempts[0].id,0,{position:0},prepared)).rejects.toThrow("another tab");
  expect(prepared).not.toHaveBeenCalled();expect(await second.read()).toEqual(saved);
});
it("keeps the cache and disk unchanged after an attempt write succeeds but its transaction aborts",async()=>{
  const {repository}=await open(),data=fixture(),before=await repository.initialize(()=>JSON.stringify(data)),put=IDBObjectStore.prototype.put;
  const prepared=vi.fn();let succeeded=false;
  vi.spyOn(IDBObjectStore.prototype,"put").mockImplementationOnce(function(this:IDBObjectStore,value,key){
    const request=put.call(this,value,key);request.addEventListener("success",()=>{succeeded=true;this.transaction.abort();});return request;
  });
  await expect(repository.saveAttempt(data.learning.attempts[0].id,0,{position:1},prepared)).rejects.toMatchObject({code:"commit"});
  expect(succeeded).toBe(true);expect(prepared).toHaveBeenCalledTimes(1);
  expect(await repository.read()).toEqual(before);expect(await repository.read(true)).toEqual(before);
  expect((await repository.saveAttempt(data.learning.attempts[0].id,0,{position:1})).data.learning.attempts[0].revision).toBe(1);
});
it("preserves independent checkpoint evidence and rejects malformed answer patches",async()=>{
  const {repository}=await open(),data=fixture(),attempt=data.learning.attempts[1];
  const responses=Object.fromEntries(attempt.questions.map(question=>[question.id,Object.fromEntries(question.fields.map(field=>[field.id,field.kind==="choice"?field.correct:String("expected" in field?field.expected:"")]))]));
  await repository.initialize(()=>JSON.stringify(data));
  await expect(repository.saveAttempt(attempt.id,0,{responses:{missing:{x:"3"}}})).rejects.toThrow("unknown question");
  const patch={responses,status:"submitted" as const,submittedAt:"2026-09-24T02:00:00.000Z"};
  const saved=await repository.saveAttempt(attempt.id,0,patch),expected=updateAttempt(data.learning,attempt.id,0,value=>({...value,...patch}));
  expect(saved.data.learning).toEqual(expected);expect(saved.data.learning.evidence).toHaveLength(1);
  await expect(repository.saveAttempt(attempt.id,1,{position:1})).rejects.toThrow("already ended");
});
it("audits missing records and never silently restores older data after index loss",async()=>{
  const {repository,factory,name}=await open(),data=fixture();await repository.initialize(()=>JSON.stringify(data));
  await native(factory,name,tx=>tx.objectStore(attemptStoreName).delete(data.learning.attempts[0].id));
  await expect(repository.read(true)).rejects.toMatchObject({code:"corrupt"});
  expect(await repository.readRaw()).toMatchObject({attempts:[{key:data.learning.attempts[1].id}]});
  await native(factory,name,tx=>tx.objectStore(progressStoreName).delete(historyIndexKey));
  const unused=vi.fn(()=>JSON.stringify(data));
  await expect(repository.initialize(unused)).rejects.toMatchObject({code:"corrupt"});expect(unused).not.toHaveBeenCalled();
  expect(await repository.readRaw()).toMatchObject({marker:2});
});
it("invalidates old confirmations and cached attempts when recovery reuses a revision",async()=>{
  const {repository:first,factory,name}=await open(),second=(await open(factory,name)).repository,data=fixture(),attempt=data.learning.attempts[0];
  const question=attempt.questions[0],field=question.fields[0].id;attempt.responses={[question.id]:{[field]:"1"}};
  const original=await first.initialize(()=>JSON.stringify(data));await second.read();
  await native(factory,name,tx=>tx.objectStore(progressStoreName).clear());
  const changed=structuredClone(data);changed.learning.attempts[0].responses[question.id][field]="2";
  const replaced=await first.replace(changed,{raw:await first.readRaw()});
  expect(replaced.revision).toBe(original.revision);expect(replaced.generation).not.toBe(original.generation);
  expect((await second.read()).data).toEqual(changed);
  await expect(second.replace(data,{revision:original.revision,generation:original.generation})).rejects.toMatchObject({code:"conflict"});
});
