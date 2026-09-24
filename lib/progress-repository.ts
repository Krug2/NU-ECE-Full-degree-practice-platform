import { z } from "zod";
import { emptyProgress,parseBackup,progressSchema,type Progress } from "./progress";
import { updateAttempt as changeAttempt } from "./learning/attempts";
import type { AttemptPatch } from "./learning/attempt-writes";
import { assembleHistory,attemptStoreName,createHistoryIndex,historyIndexKey,historyIndexSchema,readStoredAttempt,referenceFor,storedRevision,type AttemptReference,type HistoryIndex,type StoredAttempt,type StoredProgress } from "./progress-records";
export type { StoredProgress } from "./progress-records";

export const progressDatabaseName="ece-study";
export const progressStoreName="progress";
export const progressRecordKey="current";
export const progressDatabaseVersion=2;
const markerKey="format";
const legacyRecordSchema=z.object({storageVersion:z.literal(1),revision:storedRevision,data:progressSchema}).strict();
export class ProgressStorageError extends Error{
  constructor(public readonly code:"unavailable"|"blocked"|"version"|"closed"|"corrupt"|"invalid"|"conflict"|"commit",message:string,options?:ErrorOptions){
    super(message,options);this.name="ProgressStorageError";
  }
}
const corrupt=(cause?:unknown)=>new ProgressStorageError("corrupt","Saved progress has an unsupported version or invalid data. Export a recovery copy before replacing it.",{cause});
function nextRevision(raw:unknown):number{
  if(raw&&typeof raw==="object"&&"index" in raw)return nextRevision(raw.index);
  if(raw&&typeof raw==="object"&&"revision" in raw&&Number.isSafeInteger(raw.revision)&&Number(raw.revision)>0){
    if(raw.revision===Number.MAX_SAFE_INTEGER)throw new ProgressStorageError("invalid","The stored revision limit has been reached. Export your progress before resetting the local store.");
    return Number(raw.revision)+1;
  }
  return 1;
}
function validateProgress(data:unknown):Progress{
  const result=progressSchema.safeParse(data);
  if(!result.success)throw new ProgressStorageError("invalid",result.error.issues[0]?.message??"The proposed progress is invalid. Existing saved progress has not changed.",{cause:result.error});
  return result.data;
}
export function stringifyRecovery(raw:unknown):string{
  const legacy=legacyRecordSchema.safeParse(raw);
  return JSON.stringify(legacy.success?legacy.data.data:raw,null,2);
}
const requestValue=<T>(request:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(new ProgressStorageError("commit","Browser storage could not complete the request. Existing saved progress has not changed.",{cause:request.error}));
});
export type ReplacementCheck={revision:number;generation:string}|{raw:unknown};
export type PreparedChange=(data:Progress,revision:number,generation:string)=>void;
type Stores={progress:IDBObjectStore;attempts:IDBObjectStore};
type Cache=Map<string,{reference:AttemptReference;record:StoredAttempt}>;
type Result={index:HistoryIndex;cache:Cache;record:StoredProgress};

export class ProgressRepository{
  private closed=false;
  private cache:Cache=new Map();
  private cacheRevision=0;
  private cacheGeneration="";
  constructor(private readonly database:IDBDatabase,onVersionChange?:()=>void){
    database.onversionchange=()=>{this.close();onVersionChange?.();};
    database.onclose=()=>{this.closed=true;onVersionChange?.();};
  }
  close(){this.closed=true;this.database.close();}
  private transaction<T>(mode:IDBTransactionMode,work:(stores:Stores)=>Promise<T>):Promise<T>{
    return new Promise<T>((resolve,reject)=>{
      if(this.closed){reject(new ProgressStorageError("closed","Progress storage closed. Reload this page before saving more work."));return;}
      let transaction:IDBTransaction;
      try{transaction=this.database.transaction([progressStoreName,attemptStoreName],mode);}
      catch(error){reject(new ProgressStorageError("unavailable","Browser storage is unavailable. Export your current work before leaving this page.",{cause:error}));return;}
      let output:T,failure:unknown,finished=false;
      transaction.oncomplete=()=>{if(finished)resolve(output);else reject(new ProgressStorageError("commit","The storage transaction ended before the operation completed."));};
      transaction.onabort=()=>reject(failure??new ProgressStorageError("commit","Browser storage did not commit the change. Existing saved progress has not changed.",{cause:transaction.error}));
      work({progress:transaction.objectStore(progressStoreName),attempts:transaction.objectStore(attemptStoreName)}).then(value=>{output=value;finished=true;}).catch(error=>{
        failure=error instanceof DOMException?new ProgressStorageError("commit","Browser storage did not commit the change. Existing saved progress has not changed.",{cause:error}):error;
        try{transaction.abort();}catch{reject(failure);}
      });
    });
  }
  private result(index:HistoryIndex,cache:Cache):Result{
    return {index,cache,record:assembleHistory(index,new Map([...cache].map(([id,entry])=>[id,entry.record])))};
  }
  private committed=(result:Result):StoredProgress=>{
    if(result.index.generation!==this.cacheGeneration||result.index.revision>=this.cacheRevision){this.cache=result.cache;this.cacheRevision=result.index.revision;this.cacheGeneration=result.index.generation;}
    return result.record;
  };
  private async index(stores:Stores):Promise<HistoryIndex>{
    const [raw,marker]=await Promise.all([requestValue(stores.progress.get(historyIndexKey)),requestValue(stores.progress.get(markerKey))]);
    const parsed=historyIndexSchema.safeParse(raw);
    if(marker!==2||!parsed.success)throw corrupt(parsed.success?undefined:parsed.error);
    return parsed.data;
  }
  private async records(stores:Stores,index:HistoryIndex,verify=false):Promise<Cache>{
    const cache:Cache=new Map();
    await Promise.all(index.attempts.map(async reference=>{
      const existing=this.cache.get(reference.id);
      if(!verify&&this.cacheGeneration===index.generation&&existing?.reference.revision===reference.revision&&existing.reference.bytes===reference.bytes){cache.set(reference.id,existing);return;}
      const raw:unknown=await requestValue(stores.attempts.get(reference.id));
      try{cache.set(reference.id,{reference,record:readStoredAttempt(raw,reference)});}
      catch(error){throw corrupt(error);}
    }));
    return cache;
  }
  private prepared(data:Progress,revision:number):Result{
    const cache:Cache=new Map();
    const references=data.learning.attempts.map(attempt=>{
      const reference=referenceFor(attempt,revision),record=readStoredAttempt({revision,data:attempt},reference);
      cache.set(attempt.id,{reference,record});return reference;
    });
    return this.result(createHistoryIndex(data,revision,references),cache);
  }
  private async putIndex(stores:Stores,index:HistoryIndex){
    await Promise.all([requestValue(stores.progress.put(index,historyIndexKey)),requestValue(stores.progress.put(2,markerKey))]);
  }
  private async writeReplacement(stores:Stores,result:Result){
    await requestValue(stores.attempts.clear());
    await Promise.all([...result.cache].map(([id,entry])=>requestValue(stores.attempts.put(entry.record,id))));
    await this.putIndex(stores,result.index);return result;
  }
  private async raw(stores:Stores):Promise<unknown>{
    const [index,marker,legacy,keys,values]=await Promise.all([
      requestValue(stores.progress.get(historyIndexKey)),requestValue(stores.progress.get(markerKey)),requestValue(stores.progress.get(progressRecordKey)),
      requestValue(stores.attempts.getAllKeys()),requestValue(stores.attempts.getAll()),
    ]);
    if(index===undefined&&marker===undefined&&keys.length===0)return legacy;
    return {storageVersion:2,index,marker,legacy,attempts:keys.map((key,i)=>({key,value:values[i]}))};
  }
  readRaw():Promise<unknown>{return this.transaction("readonly",stores=>this.raw(stores));}
  read(verify=false):Promise<StoredProgress>{
    return this.transaction("readonly",async stores=>{const index=await this.index(stores);return this.result(index,await this.records(stores,index,verify));}).then(this.committed);
  }
  initialize(readLegacy:()=>string|null=()=>null):Promise<StoredProgress>{
    return this.transaction("readwrite",async stores=>{
      const [existing,marker,count]=await Promise.all([requestValue(stores.progress.get(historyIndexKey)),requestValue(stores.progress.get(markerKey)),requestValue(stores.attempts.count())]);
      if(existing!==undefined){const index=await this.index(stores);return this.result(index,await this.records(stores,index));}
      if(marker!==undefined||count)throw corrupt(new Error("The attempt history index is missing."));
      const old:unknown=await requestValue(stores.progress.get(progressRecordKey));
      let data:Progress,revision=1;
      if(old!==undefined){
        const parsed=legacyRecordSchema.safeParse(old);if(!parsed.success)throw corrupt(parsed.error);
        data=parsed.data.data;revision=parsed.data.revision;
      }else{
        try{const text=readLegacy();data=text===null?emptyProgress():parseBackup(text);}
        catch(error){throw new ProgressStorageError("corrupt","Existing browser progress could not be migrated. The original data has been preserved; export it before replacing it.",{cause:error});}
      }
      return this.writeReplacement(stores,this.prepared(data,revision));
    }).then(this.committed);
  }
  update(change:(current:Progress,revision:number)=>Progress,expectedRevision?:number,onPrepared?:PreparedChange):Promise<StoredProgress>{
    return this.transaction("readwrite",async stores=>{
      const current=await this.index(stores);
      if(expectedRevision!==undefined&&current.revision!==expectedRevision)throw new ProgressStorageError("conflict","Saved progress changed in another tab. Reload the saved version before applying this change.");
      const previous=await this.records(stores,current),data=validateProgress(change(structuredClone(this.result(current,previous).record.data),current.revision)),revision=nextRevision(current);
      const cache:Cache=new Map(),writes:{id:string;record:StoredAttempt}[]=[];
      const references=data.learning.attempts.map(attempt=>{
        const old=previous.get(attempt.id);
        if(old&&JSON.stringify(old.record.data)===JSON.stringify(attempt)){cache.set(attempt.id,old);return old.reference;}
        const reference=referenceFor(attempt,revision),record=readStoredAttempt({revision,data:attempt},reference);
        cache.set(attempt.id,{reference,record});writes.push({id:attempt.id,record});return reference;
      });
      const result=this.result(createHistoryIndex(data,revision,references,current.generation),cache);onPrepared?.(result.record.data,current.revision,current.generation);
      await Promise.all([
        ...writes.map(({id,record})=>requestValue(stores.attempts.put(record,id))),
        ...current.attempts.filter(reference=>!cache.has(reference.id)).map(reference=>requestValue(stores.attempts.delete(reference.id))),
      ]);
      await this.putIndex(stores,result.index);return result;
    }).then(this.committed);
  }
  saveAttempt(id:string,revision:number,patch:AttemptPatch,onPrepared?:PreparedChange):Promise<StoredProgress>{
    return this.transaction("readwrite",async stores=>{
      const current=await this.index(stores),cache=await this.records(stores,current),entry=cache.get(id);
      const learning=changeAttempt({...current.data.learning,attempts:entry?[entry.record.data]:[]},id,revision,attempt=>({...attempt,...patch}));
      const attempt=learning.attempts[0],next=nextRevision(current),reference=referenceFor(attempt,next),record=readStoredAttempt({revision:next,data:attempt},reference);
      cache.set(id,{reference,record});
      const core={...current.data,learning:{...current.data.learning,evidence:learning.evidence}};
      let index:HistoryIndex;
      try{index=createHistoryIndex(core,next,current.attempts.map(item=>item.id===id?reference:item),current.generation);}
      catch(error){throw new ProgressStorageError("invalid",error instanceof z.ZodError?error.issues[0]?.message??"This attempt could not be saved.":"This attempt could not be saved.",{cause:error});}
      const result=this.result(index,cache);onPrepared?.(result.record.data,current.revision,current.generation);
      await requestValue(stores.attempts.put(record,id));await this.putIndex(stores,index);return result;
    }).then(this.committed);
  }
  async replace(data:Progress,expected:ReplacementCheck):Promise<StoredProgress>{
    const replacement=validateProgress(data);
    return this.transaction("readwrite",async stores=>{
      let revision:number;
      if("revision" in expected){
        const current=await this.index(stores);
        if(current.revision!==expected.revision||current.generation!==expected.generation)throw new ProgressStorageError("conflict","Saved progress changed after you reviewed it. Review the latest saved data before replacing it.");
        revision=nextRevision(current);
      }else{
        const raw=await this.raw(stores);
        if(JSON.stringify(raw)!==JSON.stringify(expected.raw))throw new ProgressStorageError("conflict","Saved progress changed after you reviewed it. Review the latest saved data before replacing it.");
        revision=nextRevision(raw);
      }
      return this.writeReplacement(stores,this.prepared(replacement,revision));
    }).then(this.committed);
  }
}
export function openProgressRepository(options:{factory?:IDBFactory;name?:string;onVersionChange?:()=>void}={}):Promise<ProgressRepository>{
  return new Promise((resolve,reject)=>{
    const factory=options.factory??globalThis.indexedDB;
    if(!factory){reject(new ProgressStorageError("unavailable","This browser does not provide progress storage. Export your current work before leaving."));return;}
    let request:IDBOpenDBRequest,abandoned=false;
    try{request=factory.open(options.name??progressDatabaseName,progressDatabaseVersion);}
    catch(error){reject(new ProgressStorageError("unavailable","This browser could not open progress storage.",{cause:error}));return;}
    request.onblocked=()=>{abandoned=true;reject(new ProgressStorageError("blocked","Another tab is blocking the storage upgrade. Close older app tabs, then reload this page. Your saved data has not been replaced."));};
    request.onupgradeneeded=()=>{
      if(abandoned){request.transaction?.abort();return;}
      if(!request.result.objectStoreNames.contains(progressStoreName))request.result.createObjectStore(progressStoreName);
      if(!request.result.objectStoreNames.contains(attemptStoreName))request.result.createObjectStore(attemptStoreName);
    };
    request.onerror=()=>reject(new ProgressStorageError(request.error?.name==="VersionError"?"version":"unavailable",request.error?.name==="VersionError"?"A newer app version created this progress database. Open a compatible version to use or export it.":"Browser progress storage could not be opened.",{cause:request.error}));
    request.onsuccess=()=>{if(abandoned)request.result.close();else resolve(new ProgressRepository(request.result,options.onVersionChange));};
  });
}
