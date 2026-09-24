import { afterEach,expect,it,vi } from "vitest";
import { IDBFactory,IDBObjectStore } from "fake-indexeddb";
import { emptyProgress,type Progress } from "../lib/progress";
import { openProgressRepository,progressRecordKey,progressStoreName,ProgressStorageError,type ProgressRepository } from "../lib/progress-repository";
import bridge from "../content/lessons/mth-215/b01.json";
import { lessonSchema } from "../lib/learning/contracts";
import { createAttempt,updateAttempt } from "../lib/learning/attempts";

const connections:ProgressRepository[]=[];
afterEach(()=>{connections.splice(0).forEach(repository=>repository.close());vi.restoreAllMocks();});
async function open(factory=new IDBFactory(),name=crypto.randomUUID(),onVersionChange?:()=>void){
  const repository=await openProgressRepository({factory,name,onVersionChange});connections.push(repository);return {repository,factory,name};
}
async function rawWrite(factory:IDBFactory,name:string,value:unknown){
  await new Promise<void>((resolve,reject)=>{
    const request=factory.open(name,1);request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const database=request.result,transaction=database.transaction(progressStoreName,"readwrite");
      transaction.objectStore(progressStoreName).put(value,progressRecordKey);
      transaction.oncomplete=()=>{database.close();resolve();};transaction.onabort=()=>{database.close();reject(transaction.error);};
    };
  });
}
it("migrates valid v1 browser data once and leaves its original text untouched",async()=>{
  const {repository,factory,name}=await open();
  const legacy={schemaVersion:1,profile:{displayName:"Learner",weeklyHours:7},plan:["mth-215"],bookmarks:["R01"],notes:{"mth-215":"Keep my note"},confidence:{"mth-215":"refresh"},sessions:[]};
  const text=JSON.stringify(legacy),readLegacy=vi.fn(()=>text),saved=await repository.initialize(readLegacy);
  expect(saved).toEqual({storageVersion:1,revision:1,data:{...legacy,schemaVersion:2,learning:{attempts:[],evidence:[],notes:{}}}});
  expect(text).toBe(JSON.stringify(legacy));expect(readLegacy).toHaveBeenCalledTimes(1);
  const second=(await open(factory,name)).repository,unused=vi.fn(()=>"{broken");
  expect(await second.initialize(unused)).toEqual(saved);expect(unused).not.toHaveBeenCalled();
});
it("preserves concrete question snapshots, versions, answers, and lesson notes from v2",async()=>{
  const {repository}=await open(),data=emptyProgress(),attempt=createAttempt(lessonSchema.parse(bridge),"checkpoint","repository-fixture");
  attempt.responses={[attempt.questions[0].id]:{[attempt.questions[0].fields[0].id]:"3/4"}};
  data.learning={attempts:[attempt],evidence:[],notes:{"mth-215":{b01:"Keep exact fractions."}}};
  const saved=await repository.initialize(()=>JSON.stringify(data));
  expect(saved.data).toEqual(data);
  expect((await repository.read()).data.learning.attempts[0].questions).toEqual(attempt.questions);
  const changed=await repository.update(current=>({...current,notes:{"mth-215":"Another note"}}));
  expect(changed.revision).toBe(2);expect(changed.data.learning).toEqual(data.learning);
});
it("serializes two connections without losing unrelated updates",async()=>{
  const {repository:first,factory,name}=await open(),second=(await open(factory,name)).repository;
  await first.initialize();
  await Promise.all([
    first.update(current=>({...current,notes:{...current.notes,"mth-215":"first tab"}})),
    second.update(current=>({...current,notes:{...current.notes,"phs-104":"second tab"}})),
  ]);
  expect(await first.read()).toMatchObject({revision:3,data:{notes:{"mth-215":"first tab","phs-104":"second tab"}}});
  expect(await second.read()).toEqual(await first.read());
});
it("serializes rapid functional updates on one connection",async()=>{
  const {repository}=await open();await repository.initialize();
  await Promise.all(Array.from({length:20},()=>repository.update(current=>({...current,profile:{...current.profile,weeklyHours:current.profile.weeklyHours+1}}))));
  expect(await repository.read()).toMatchObject({revision:21,data:{profile:{weeklyHours:25}}});
});
it("rejects a stale revision before invoking its update callback",async()=>{
  const {repository}=await open();const original=await repository.initialize();
  const newer=await repository.update(current=>({...current,profile:{...current.profile,displayName:"Newer"}}));
  const change=vi.fn((current:Progress)=>({...current,notes:{"mth-215":"stale"}}));
  await expect(repository.update(change,original.revision)).rejects.toMatchObject({code:"conflict"});
  expect(change).not.toHaveBeenCalled();expect(await repository.read()).toEqual(newer);
});
it("retains attempt-level conflict checks even without a global expected revision",async()=>{
  const {repository}=await open(),data=emptyProgress(),attempt=createAttempt(lessonSchema.parse(bridge),"practice","attempt-conflict");
  data.learning.attempts.push(attempt);await repository.initialize(()=>JSON.stringify(data));
  const changed=await repository.update(current=>({...current,learning:updateAttempt(current.learning,attempt.id,0,value=>({...value,position:1}))}));
  await expect(repository.update(current=>({...current,learning:updateAttempt(current.learning,attempt.id,0,value=>({...value,position:2}))}))).rejects.toThrow("another tab");
  expect(await repository.read()).toEqual(changed);
});
it("does not commit invalid updates or mutations made by a failing callback",async()=>{
  const {repository}=await open(),original=await repository.initialize();
  await expect(repository.update(current=>({...current,plan:["missing-course"]}))).rejects.toMatchObject({code:"invalid"});
  await expect(repository.update(current=>{current.notes["mth-215"]="unsaved";throw new Error("stop");})).rejects.toThrow("stop");
  expect(await repository.read()).toEqual(original);
});
it("waits for the transaction commit, including an abort after the write request succeeded",async()=>{
  const {repository}=await open(),original=await repository.initialize(),put=IDBObjectStore.prototype.put;
  vi.spyOn(IDBObjectStore.prototype,"put").mockImplementationOnce(function(this:IDBObjectStore,value,key){
    const request=put.call(this,value,key);request.addEventListener("success",()=>this.transaction.abort());return request;
  });
  await expect(repository.update(current=>({...current,notes:{"mth-215":"must not persist"}}))).rejects.toMatchObject({code:"commit"});
  expect(await repository.read()).toEqual(original);
});
it("preserves the prior record on a quota failure",async()=>{
  const {repository}=await open(),original=await repository.initialize();
  vi.spyOn(IDBObjectStore.prototype,"put").mockImplementationOnce(()=>{throw new DOMException("Full","QuotaExceededError");});
  await expect(repository.update(current=>({...current,notes:{"mth-215":"unsaved draft"}}))).rejects.toMatchObject({code:"commit"});
  expect(await repository.read()).toEqual(original);
});
it("preserves corrupt legacy text and newer stored records for recovery",async()=>{
  const {repository,factory,name}=await open();
  await expect(repository.initialize(()=>"{broken")).rejects.toMatchObject({code:"corrupt"});
  expect(await repository.readRaw()).toBeUndefined();
  const future={storageVersion:99,revision:4,data:{important:"future data"}};
  await rawWrite(factory,name,future);
  await expect(repository.read()).rejects.toMatchObject({code:"corrupt"});
  await expect(repository.initialize(()=>JSON.stringify(emptyProgress()))).rejects.toMatchObject({code:"corrupt"});
  expect(await repository.readRaw()).toEqual(future);
});
it("checks the reviewed revision before replacing valid progress",async()=>{
  const {repository}=await open(),original=await repository.initialize();
  const current=await repository.update(data=>({...data,notes:{"mth-215":"newer note"}}));
  await expect(repository.replace(emptyProgress(),{revision:original.revision})).rejects.toMatchObject({code:"conflict"});
  expect(await repository.read()).toEqual(current);
  const replaced=await repository.replace({...emptyProgress(),plan:["phs-104"]},{revision:current.revision});
  expect(replaced).toMatchObject({revision:3,data:{plan:["phs-104"],notes:{}}});
});
it("requires an exact recovery-record match before replacing corrupt data",async()=>{
  const {repository,factory,name}=await open(),old={storageVersion:99,revision:7,data:"keep me"},newer={...old,data:"newer value"};
  await rawWrite(factory,name,old);const reviewed=await repository.readRaw();
  await rawWrite(factory,name,newer);
  await expect(repository.replace(emptyProgress(),{raw:reviewed})).rejects.toMatchObject({code:"conflict"});
  expect(await repository.readRaw()).toEqual(newer);
  expect(await repository.replace(emptyProgress(),{raw:newer})).toMatchObject({revision:8,data:emptyProgress()});
});
it("closes on a database upgrade and rejects use from an older app version",async()=>{
  const changed=vi.fn(),{repository,factory,name}=await open(new IDBFactory(),crypto.randomUUID(),changed);
  await repository.initialize();
  await new Promise<void>((resolve,reject)=>{const request=factory.open(name,2);request.onsuccess=()=>{request.result.close();resolve();};request.onerror=()=>reject(request.error);});
  expect(changed).toHaveBeenCalledTimes(1);
  await expect(repository.read()).rejects.toMatchObject({code:"closed"});
  await expect(openProgressRepository({factory,name})).rejects.toMatchObject({code:"version"});
});
it("reports denied storage and a closed connection without dropping the stored record",async()=>{
  const factory=new IDBFactory();vi.spyOn(factory,"open").mockImplementationOnce(()=>{throw new DOMException("Denied","SecurityError");});
  await expect(openProgressRepository({factory,name:"denied"})).rejects.toBeInstanceOf(ProgressStorageError);
  const {repository}=await open(factory);await repository.initialize();repository.close();
  await expect(repository.update(current=>current)).rejects.toMatchObject({code:"closed"});
});
