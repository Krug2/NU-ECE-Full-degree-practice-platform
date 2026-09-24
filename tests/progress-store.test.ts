import { afterEach,expect,it,vi } from "vitest";
import { IDBFactory,IDBObjectStore } from "fake-indexeddb";
import { emptyProgress } from "../lib/progress";
import { ProgressStore } from "../lib/progress-store";
import { openProgressRepository,type ProgressRepository } from "../lib/progress-repository";
import { createAttempt,updateAttempt } from "../lib/learning/attempts";
import { lessonSchema } from "../lib/learning/contracts";
import linearLesson from "../content/lessons/mth-215/m01-l01.json";

const connections:ProgressRepository[]=[];
afterEach(()=>{connections.splice(0).forEach(repository=>repository.close());vi.restoreAllMocks();});
async function setup(options:{factory?:IDBFactory;name?:string;legacy?:string|null;committed?:()=>void}={}){
  const factory=options.factory??new IDBFactory(),name=options.name??crypto.randomUUID();
  const repository=await openProgressRepository({factory,name});connections.push(repository);
  const legacy=vi.fn(()=>options.legacy??null),open=vi.fn(async()=>repository),committed=options.committed??vi.fn();
  const store=new ProgressStore({open,legacy,committed});return {store,repository,legacy,open,factory,name,committed};
}
const failNextWrite=()=>vi.spyOn(IDBObjectStore.prototype,"put").mockImplementationOnce(()=>{throw new DOMException("Full","QuotaExceededError");});
it("loads once without starting storage work during snapshot reads",async()=>{
  const data={...emptyProgress(),notes:{"mth-215":"Original note"}},{store,open,legacy}=await setup({legacy:JSON.stringify(data)});
  expect(store.getSnapshot().ready).toBe(false);expect(open).not.toHaveBeenCalled();
  await Promise.all([store.load(),store.load()]);
  expect(open).toHaveBeenCalledTimes(1);expect(legacy).toHaveBeenCalledTimes(1);
  expect(store.getSnapshot()).toMatchObject({data,ready:true,revision:1,dirty:false,locked:false,saving:false});
});
it("reports a pending save without reporting an uncommitted note as saved",async()=>{
  const {store,repository,committed}=await setup();await store.load();
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  const update=repository.update.bind(repository);
  vi.spyOn(repository,"update").mockImplementationOnce(async change=>{await gate;return update(change);});
  const save=store.save(data=>({...data,notes:{"mth-215":"New note"}}));
  expect(store.getSnapshot().saving).toBe(true);expect(store.getSnapshot().data.notes).toEqual({});
  expect(committed).not.toHaveBeenCalled();release();expect(await save).toBe(true);
  expect(store.getSnapshot()).toMatchObject({saving:false,revision:2,data:{notes:{"mth-215":"New note"}}});
  expect(committed).toHaveBeenCalledTimes(1);
});
it("serializes rapid updates and lets exports wait for every queued save",async()=>{
  const {store}=await setup();await store.load();
  const saves=Array.from({length:20},()=>store.save(data=>({...data,profile:{...data.profile,weeklyHours:data.profile.weeklyHours+1}})));
  const backup=store.exportText();
  expect(await Promise.all(saves)).toEqual(Array(20).fill(true));
  expect(JSON.parse(await backup).profile.weeklyHours).toBe(25);
  expect(store.getSnapshot()).toMatchObject({revision:21,saving:false,dirty:false});
});
it("keeps a version-change lock even if an already-running save commits afterward",async()=>{
  const {store,repository}=await setup();await store.load();
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  const update=repository.update.bind(repository);
  const pending=vi.spyOn(repository,"update").mockImplementationOnce(async change=>{await gate;return update(change);});
  const save=store.save(data=>({...data,plan:["mth-215"]}));
  await vi.waitFor(()=>expect(pending).toHaveBeenCalled());store.storageClosed();release();
  expect(await save).toBe(true);
  expect(store.getSnapshot()).toMatchObject({locked:true,saving:false,data:{plan:["mth-215"]}});
  expect(store.getSnapshot().issue).toContain("reload");
});
it("merges unrelated updates from two stores before notifying the other tab",async()=>{
  const first=await setup(),second=await setup({factory:first.factory,name:first.name});
  await Promise.all([first.store.load(),second.store.load()]);
  expect(await Promise.all([
    first.store.save(data=>({...data,notes:{...data.notes,"mth-215":"first"}})),
    second.store.save(data=>({...data,notes:{...data.notes,"phs-104":"second"}})),
  ])).toEqual([true,true]);
  await first.store.refresh();await second.store.refresh();
  expect(first.store.getSnapshot().data.notes).toEqual({"mth-215":"first","phs-104":"second"});
  expect(second.store.getSnapshot().data).toEqual(first.store.getSnapshot().data);
});
it("retains a failed edit for export and retries only against its original saved revision",async()=>{
  const {store,repository}=await setup();await store.load();failNextWrite();
  expect(await store.save(data=>({...data,notes:{"mth-215":"Unsaved draft"}}))).toBe(false);
  expect(store.getSnapshot()).toMatchObject({data:{notes:{}},locked:true,dirty:true,saving:false});
  expect((await repository.read()).data.notes).toEqual({});
  expect(JSON.parse(await store.exportText()).notes).toEqual({"mth-215":"Unsaved draft"});
  expect(await store.retry()).toBe(true);
  expect(store.getSnapshot()).toMatchObject({locked:false,dirty:false,data:{notes:{"mth-215":"Unsaved draft"}}});
  expect((await repository.read()).data).toEqual(store.getSnapshot().data);
});
it("stops queued mutations after a failed save without hiding the recovery state",async()=>{
  const {store}=await setup();await store.load();failNextWrite();
  const skipped=vi.fn(data=>data);
  expect(await Promise.all([store.save(data=>({...data,plan:["mth-215"]})),store.save(skipped)])).toEqual([false,false]);
  expect(skipped).not.toHaveBeenCalled();expect(store.getSnapshot()).toMatchObject({saving:false,dirty:true,locked:true});
});
it("does not erase a failed draft during refresh or overwrite another tab on retry",async()=>{
  const first=await setup(),second=await setup({factory:first.factory,name:first.name});
  await first.store.load();await second.store.load();failNextWrite();
  await first.store.save(data=>({...data,notes:{"mth-215":"Unsaved local work"}}));
  await second.store.save(data=>({...data,notes:{"mth-215":"Newer saved work"}}));
  await first.store.refresh();expect(await first.store.retry()).toBe(false);
  expect(first.store.getSnapshot().dirty).toBe(true);
  expect(first.store.getSnapshot().issue).toContain("changed after you reviewed");
  expect(JSON.parse(await first.store.exportText()).notes["mth-215"]).toBe("Unsaved local work");
  expect((await first.repository.read()).data.notes["mth-215"]).toBe("Newer saved work");
  expect(await first.store.loadSaved()).toBe(true);
  expect(first.store.getSnapshot()).toMatchObject({dirty:false,locked:false,data:{notes:{"mth-215":"Newer saved work"}}});
});
it("checks the revision captured when a replacement was reviewed",async()=>{
  const {store,repository}=await setup();await store.load();const reviewed=await store.reviewReplacement();
  await store.save(data=>({...data,notes:{"mth-215":"Keep this newer work"}}));
  expect(await store.replace(emptyProgress(),reviewed)).toBe(false);
  expect((await repository.read()).data.notes["mth-215"]).toBe("Keep this newer work");
  expect(await store.replace(emptyProgress(),await store.reviewReplacement())).toBe(true);
  expect(store.getSnapshot().data).toEqual(emptyProgress());
});
it("preserves prior valid progress when a replacement fails to commit",async()=>{
  const {store}=await setup();await store.load();await store.save(data=>({...data,plan:["mth-215"]}));
  const reviewed=await store.reviewReplacement();failNextWrite();
  expect(await store.replace(emptyProgress(),reviewed)).toBe(false);
  expect(store.getSnapshot().data.plan).toEqual(["mth-215"]);
  expect(JSON.parse(await store.exportText()).plan).toEqual(["mth-215"]);
});
it("preserves corrupt legacy text for export until an explicit replacement",async()=>{
  const {store,repository}=await setup({legacy:"{broken backup"});await store.load();
  expect(store.getSnapshot()).toMatchObject({ready:true,locked:true,dirty:false});
  expect(await store.exportText()).toBe("{broken backup");
  expect(await repository.readRaw()).toBeUndefined();
  const skipped=vi.fn(data=>data);expect(await store.save(skipped)).toBe(false);expect(skipped).not.toHaveBeenCalled();
  expect(await store.replace(emptyProgress(),await store.reviewReplacement())).toBe(true);
  expect(store.getSnapshot()).toMatchObject({locked:false,revision:1,data:emptyProgress()});
});
it("keeps errors from invalid input and stale attempts from damaging saved data",async()=>{
  const {store}=await setup();await store.load();
  expect(await store.save(data=>({...data,plan:["unknown"]}))).toBe(false);
  expect(store.getSnapshot()).toMatchObject({locked:false,dirty:false,data:{plan:[]}});
  expect(await store.save(()=>{throw new Error("This attempt changed in another tab.");})).toBe(false);
  expect(store.getSnapshot().issue).toContain("another tab");
  expect(await store.save(data=>({...data,plan:["mth-215"]}))).toBe(true);
  expect(store.getSnapshot().issue).toBe("");
});
it("does not show checkpoint evidence before a submission commits",async()=>{
  const attempt=createAttempt(lessonSchema.parse(linearLesson),"checkpoint","uncommitted-evidence"),data=emptyProgress();
  for(const question of attempt.questions)attempt.responses[question.id]=Object.fromEntries(question.fields.map(field=>[field.id,field.kind==="choice"?field.correct:String("expected" in field?field.expected:"")]));
  data.learning.attempts=[attempt];
  const {store,repository}=await setup({legacy:JSON.stringify(data)});await store.load();failNextWrite();
  expect(await store.save(current=>({...current,learning:updateAttempt(current.learning,attempt.id,0,value=>({...value,status:"submitted",submittedAt:new Date().toISOString()}))}))).toBe(false);
  expect(store.getSnapshot().data.learning.evidence).toHaveLength(0);
  expect((await repository.read()).data.learning.attempts[0].status).toBe("active");
  expect(await store.retry()).toBe(true);
  expect(store.getSnapshot().data.learning.evidence).toHaveLength(1);
});
it("never turns a notification failure into a failed committed save",async()=>{
  const {store,repository}=await setup({committed:()=>{throw new Error("No channel");}});await store.load();
  expect(await store.save(data=>({...data,plan:["mth-215"]}))).toBe(true);
  expect((await repository.read()).data.plan).toEqual(["mth-215"]);
});
it("surfaces unavailable storage and refuses to export an empty replacement as recovery",async()=>{
  const store=new ProgressStore({open:async()=>{throw new Error("Storage denied");},legacy:()=>null});
  await store.load();expect(store.getSnapshot()).toMatchObject({ready:true,locked:true,issue:"Storage denied"});
  await expect(store.exportText()).rejects.toThrow("No readable progress");
  await expect(store.reviewReplacement()).rejects.toThrow("unavailable");
});
it("notifies subscribers only while subscribed and locks writes when storage closes",async()=>{
  const {store}=await setup(),listener=vi.fn(),unsubscribe=store.subscribe(listener);
  await store.load();expect(listener).toHaveBeenCalled();
  unsubscribe();listener.mockClear();store.storageClosed();
  expect(store.getSnapshot().locked).toBe(true);expect(listener).not.toHaveBeenCalled();
  expect(await store.save(data=>data)).toBe(false);
});
