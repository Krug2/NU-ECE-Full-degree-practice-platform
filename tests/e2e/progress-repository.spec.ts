import { expect,test,type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { dirname,resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import type { Progress } from "../../lib/progress";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";

declare global { interface Window { StudyRepository:typeof import("../../lib/progress-repository") } }
let bundle:string;
const emptyProgress=():Progress=>({schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[],evidence:[],notes:{}}});
test.beforeAll(async()=>{
  const require=createRequire(import.meta.url),root=process.cwd();
  const viteUrl=pathToFileURL(require.resolve("vite",{paths:[dirname(require.resolve("vitest/package.json"))]})).href;
  const {build}=await import(viteUrl);
  type BundleOutput={output:{type:string;code?:string}[]};
  const result=await build({
    configFile:false,publicDir:false,logLevel:"silent",resolve:{alias:{"@":root}},
    build:{write:false,minify:false,lib:{entry:resolve(root,"lib/progress-repository.ts"),name:"StudyRepository",formats:["iife"]}},
  }) as BundleOutput|BundleOutput[];
  bundle=(Array.isArray(result)?result:[result]).flatMap(item=>item.output).find(item=>item.type==="chunk")?.code??"";
  expect(bundle).not.toBe("");
});
async function load(page:Page){await page.goto("/");await page.addScriptTag({content:bundle});}

test("migrates complete legacy learning data once and persists it across page reloads",async({page})=>{
  const bridge=JSON.parse(await readFile("content/lessons/mth-215/b01.json","utf8"));
  const data=emptyProgress(),attempt=createAttempt(lessonSchema.parse(bridge),"checkpoint","browser-repository");
  attempt.responses={[attempt.questions[0].id]:{[attempt.questions[0].fields[0].id]:"3/4"}};
  data.learning={attempts:[attempt],evidence:[],notes:{"mth-215":{b01:"Keep my fraction notes."}}};
  data.profile.displayName="Returning learner";
  await load(page);
  const initial=await page.evaluate(async data=>{
    const original=JSON.stringify(data);
    localStorage.setItem("repository-migration",original);
    const repository=await window.StudyRepository.openProgressRepository({name:"migration-test"});
    const record=await repository.initialize(()=>localStorage.getItem("repository-migration"));
    repository.close();
    return {record,legacy:localStorage.getItem("repository-migration")};
  },data);
  expect(initial.record.data).toEqual(data);expect(initial.legacy).toBe(JSON.stringify(data));
  await load(page);
  const reopened=await page.evaluate(async()=>{
    const repository=await window.StudyRepository.openProgressRepository({name:"migration-test"});
    let reads=0;
    const record=await repository.initialize(()=>{reads++;return "{broken";});
    repository.close();return {record,reads};
  });
  expect(reopened.record).toEqual(initial.record);expect(reopened.reads).toBe(0);
});

test("serializes two real browser tabs and rejects a stale replacement",async({page,context})=>{
  await load(page);const second=await context.newPage();await load(second);
  await page.evaluate(async()=>{
    const repository=await window.StudyRepository.openProgressRepository({name:"concurrent-test"});
    await repository.initialize();repository.close();
  });
  const write=async(tab:Page,course:string,note:string)=>tab.evaluate(async({course,note})=>{
    const repository=await window.StudyRepository.openProgressRepository({name:"concurrent-test"});
    try{await repository.update(data=>({...data,notes:{...data.notes,[course]:note}}));}
    finally{repository.close();}
  },{course,note});
  await Promise.all([write(page,"mth-215","first tab"),write(second,"phs-104","second tab")]);
  const result=await page.evaluate(async()=>{
    const repository=await window.StudyRepository.openProgressRepository({name:"concurrent-test"});
    const record=await repository.read();
    let error="";
    try{await repository.replace({...record.data,notes:{}},{revision:1});}
    catch(cause){error=cause instanceof window.StudyRepository.ProgressStorageError?cause.code:"unexpected";}
    const after=await repository.read();repository.close();return {record,after,error};
  });
  expect(result.record).toMatchObject({revision:3,data:{notes:{"mth-215":"first tab","phs-104":"second tab"}}});
  expect(result.after).toEqual(result.record);expect(result.error).toBe("conflict");await second.close();
});

test("does not acknowledge an aborted transaction even after its write request succeeds",async({page})=>{
  await load(page);
  const result=await page.evaluate(async()=>{
    const repository=await window.StudyRepository.openProgressRepository({name:"abort-test"});
    const before=await repository.initialize(),put=IDBObjectStore.prototype.put;
    let requestSucceeded=false,error="";
    IDBObjectStore.prototype.put=function(value,key){
      const request=put.call(this,value,key);
      request.addEventListener("success",()=>{requestSucceeded=true;this.transaction.abort();},{once:true});
      return request;
    };
    try{await repository.update(data=>({...data,notes:{"mth-215":"Uncommitted work"}}));}
    catch(cause){error=cause instanceof window.StudyRepository.ProgressStorageError?cause.code:"unexpected";}
    finally{IDBObjectStore.prototype.put=put;}
    const after=await repository.read();repository.close();return {before,after,requestSucceeded,error};
  });
  expect(result.requestSucceeded).toBe(true);expect(result.error).toBe("commit");expect(result.after).toEqual(result.before);
});

test("preserves unsupported records and requires explicit matching recovery",async({page})=>{
  await load(page);
  const original={storageVersion:99,revision:7,data:{important:"future learning history"}};
  const result=await page.evaluate(async({original,replacement})=>{
    const {openProgressRepository,progressStoreName,progressRecordKey,ProgressStorageError}=window.StudyRepository;
    const repository=await openProgressRepository({name:"recovery-test"});
    await new Promise<void>((resolve,reject)=>{
      const request=indexedDB.open("recovery-test");
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const database=request.result,transaction=database.transaction(progressStoreName,"readwrite");
        transaction.objectStore(progressStoreName).put(original,progressRecordKey);
        transaction.oncomplete=()=>{database.close();resolve();};
        transaction.onabort=()=>{database.close();reject(transaction.error);};
      };
    });
    let error="";
    try{await repository.initialize();}
    catch(cause){error=cause instanceof ProgressStorageError?cause.code:"unexpected";}
    const preserved=await repository.readRaw();
    let conflict="";
    try{await repository.replace(replacement,{raw:{...original,revision:6}});}
    catch(cause){conflict=cause instanceof ProgressStorageError?cause.code:"unexpected";}
    const afterConflict=await repository.readRaw();
    const restored=await repository.replace(replacement,{raw:preserved});
    repository.close();return {error,preserved,conflict,afterConflict,restored};
  },{original,replacement:emptyProgress()});
  expect(result.error).toBe("corrupt");expect(result.preserved).toEqual(original);
  expect(result.conflict).toBe("conflict");expect(result.afterConflict).toEqual(original);
  expect(result.restored).toEqual({storageVersion:1,revision:8,data:emptyProgress()});
});

test("releases an older connection during a database upgrade and preserves the newer database",async({page})=>{
  await load(page);
  const result=await page.evaluate(async()=>{
    const {openProgressRepository,ProgressStorageError}=window.StudyRepository;
    let changes=0;
    const repository=await openProgressRepository({name:"upgrade-test",onVersionChange:()=>{changes++;}});
    await repository.initialize();
    await new Promise<void>((resolve,reject)=>{
      const request=indexedDB.open("upgrade-test",2);
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{request.result.close();resolve();};
    });
    let closed="",version="";
    try{await repository.read();}catch(cause){closed=cause instanceof ProgressStorageError?cause.code:"unexpected";}
    try{await openProgressRepository({name:"upgrade-test"});}catch(cause){version=cause instanceof ProgressStorageError?cause.code:"unexpected";}
    return {changes,closed,version};
  });
  expect(result).toEqual({changes:1,closed:"closed",version:"version"});
});
