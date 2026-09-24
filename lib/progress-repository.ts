import { z } from "zod";
import { emptyProgress,parseBackup,progressSchema,type Progress } from "./progress";

export const progressDatabaseName="ece-study";
export const progressStoreName="progress";
export const progressRecordKey="current";
const databaseVersion=1;
const recordSchema=z.object({storageVersion:z.literal(1),revision:z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),data:progressSchema}).strict();
export type StoredProgress=z.infer<typeof recordSchema>;
export class ProgressStorageError extends Error{
  constructor(public readonly code:"unavailable"|"blocked"|"version"|"closed"|"corrupt"|"invalid"|"conflict"|"commit",message:string,options?:ErrorOptions){
    super(message,options);this.name="ProgressStorageError";
  }
}
function decodeRecord(raw:unknown):StoredProgress{
  const result=recordSchema.safeParse(raw);
  if(!result.success)throw new ProgressStorageError("corrupt","Saved progress has an unsupported version or invalid data. Export a recovery copy before replacing it.",{cause:result.error});
  return result.data;
}
function nextRevision(raw:unknown){
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
const requestValue=<T>(request:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(new ProgressStorageError("commit","Browser storage could not complete the request. Existing saved progress has not changed.",{cause:request.error}));
});
export type ReplacementCheck={revision:number}|{raw:unknown};
export class ProgressRepository{
  private closed=false;
  constructor(private readonly database:IDBDatabase,onVersionChange?:()=>void){
    database.onversionchange=()=>{this.close();onVersionChange?.();};
    database.onclose=()=>{this.closed=true;onVersionChange?.();};
  }
  close(){this.closed=true;this.database.close();}
  private transaction<T>(mode:IDBTransactionMode,work:(store:IDBObjectStore)=>Promise<T>):Promise<T>{
    return new Promise<T>((resolve,reject)=>{
      if(this.closed){reject(new ProgressStorageError("closed","Progress storage closed. Reload this page before saving more work."));return;}
      let transaction:IDBTransaction;
      try{transaction=this.database.transaction(progressStoreName,mode);}
      catch(error){reject(new ProgressStorageError("unavailable","Browser storage is unavailable. Export your current work before leaving this page.",{cause:error}));return;}
      let output:T,failure:unknown,finished=false;
      transaction.oncomplete=()=>{
        if(finished)resolve(output);
        else reject(new ProgressStorageError("commit","The storage transaction ended before the operation completed."));
      };
      transaction.onabort=()=>reject(failure??new ProgressStorageError("commit","Browser storage did not commit the change. Existing saved progress has not changed.",{cause:transaction.error}));
      work(transaction.objectStore(progressStoreName)).then(value=>{output=value;finished=true;}).catch(error=>{
        failure=error instanceof DOMException?new ProgressStorageError("commit","Browser storage did not commit the change. Existing saved progress has not changed.",{cause:error}):error;
        try{transaction.abort();}catch{reject(failure);}
      });
    });
  }
  readRaw():Promise<unknown>{
    return this.transaction("readonly",store=>requestValue(store.get(progressRecordKey)));
  }
  read():Promise<StoredProgress>{
    return this.transaction("readonly",async store=>decodeRecord(await requestValue(store.get(progressRecordKey))));
  }
  initialize(readLegacy:()=>string|null=()=>null):Promise<StoredProgress>{
    return this.transaction("readwrite",async store=>{
      const raw:unknown=await requestValue(store.get(progressRecordKey));
      if(raw!==undefined)return decodeRecord(raw);
      let data:Progress;
      try{const text=readLegacy();data=text===null?emptyProgress():parseBackup(text);}
      catch(error){throw new ProgressStorageError("corrupt","Existing browser progress could not be migrated. The original data has been preserved; export it before replacing it.",{cause:error});}
      const record:StoredProgress={storageVersion:1,revision:1,data};
      await requestValue(store.put(record,progressRecordKey));
      return record;
    });
  }
  update(change:(current:Progress)=>Progress,expectedRevision?:number):Promise<StoredProgress>{
    return this.transaction("readwrite",async store=>{
      const current=decodeRecord(await requestValue(store.get(progressRecordKey)));
      if(expectedRevision!==undefined&&current.revision!==expectedRevision)throw new ProgressStorageError("conflict","Saved progress changed in another tab. Reload the saved version before applying this change.");
      const data=validateProgress(change(structuredClone(current.data)));
      const record:StoredProgress={storageVersion:1,revision:nextRevision(current),data};
      await requestValue(store.put(record,progressRecordKey));
      return record;
    });
  }
  async replace(data:Progress,expected:ReplacementCheck):Promise<StoredProgress>{
    const replacement=validateProgress(data);
    return this.transaction("readwrite",async store=>{
      const raw:unknown=await requestValue(store.get(progressRecordKey));
      const matches="revision" in expected?decodeRecord(raw).revision===expected.revision:JSON.stringify(raw)===JSON.stringify(expected.raw);
      if(!matches)throw new ProgressStorageError("conflict","Saved progress changed after you reviewed it. Review the latest saved data before replacing it.");
      const record:StoredProgress={storageVersion:1,revision:nextRevision(raw),data:replacement};
      await requestValue(store.put(record,progressRecordKey));
      return record;
    });
  }
}
export function openProgressRepository(options:{factory?:IDBFactory;name?:string;onVersionChange?:()=>void}={}):Promise<ProgressRepository>{
  return new Promise((resolve,reject)=>{
    const factory=options.factory??globalThis.indexedDB;
    if(!factory){reject(new ProgressStorageError("unavailable","This browser does not provide progress storage. Export your current work before leaving."));return;}
    let request:IDBOpenDBRequest,abandoned=false;
    try{request=factory.open(options.name??progressDatabaseName,databaseVersion);}
    catch(error){reject(new ProgressStorageError("unavailable","This browser could not open progress storage.",{cause:error}));return;}
    request.onblocked=()=>{abandoned=true;reject(new ProgressStorageError("blocked","Another tab is blocking the storage upgrade. Close older app tabs, then reload this page. Your saved data has not been replaced."));};
    request.onupgradeneeded=()=>{
      if(abandoned){request.transaction?.abort();return;}
      if(!request.result.objectStoreNames.contains(progressStoreName))request.result.createObjectStore(progressStoreName);
    };
    request.onerror=()=>reject(new ProgressStorageError(request.error?.name==="VersionError"?"version":"unavailable",request.error?.name==="VersionError"?"A newer app version created this progress database. Open a compatible version to use or export it.":"Browser progress storage could not be opened.",{cause:request.error}));
    request.onsuccess=()=>{if(abandoned)request.result.close();else resolve(new ProgressRepository(request.result,options.onVersionChange));};
  });
}
