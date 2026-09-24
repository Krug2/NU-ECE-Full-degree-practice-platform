"use client";

import { useSyncExternalStore } from "react";
import type { Progress } from "./progress";
import { downloadProgressText } from "./download-progress";
import { openProgressRepository,type ReplacementCheck } from "./progress-repository";
import { initialStudySnapshot,ProgressStore } from "./progress-store";

const legacyKey="ece-study:progress:v1",signalKey="ece-study:changed";
let channel:BroadcastChannel|null=null,subscribers=0;
const store=new ProgressStore({
  open:()=>openProgressRepository({onVersionChange:()=>store.storageClosed()}),
  legacy:()=>window.localStorage.getItem(legacyKey),
  committed:()=>{
    try{if(channel){channel.postMessage("progress");return;}}catch{}
    try{window.localStorage.setItem(signalKey,crypto.randomUUID());}catch{}
  },
});
const refresh=()=>{void store.refresh();};
const onStorage=(event:StorageEvent)=>{if(event.key===signalKey||event.key===null)refresh();};
const onVisibility=()=>{if(document.visibilityState==="visible")refresh();};
const onBeforeUnload=(event:BeforeUnloadEvent)=>{
  const {saving,dirty}=store.getSnapshot();
  if(saving||dirty){event.preventDefault();event.returnValue="";}
};
function subscribe(listener:()=>void){
  const unsubscribe=store.subscribe(listener);
  if(subscribers++===0){
    try{channel=new BroadcastChannel("ece-study:progress");channel.onmessage=event=>{if(event.data==="progress")refresh();};}catch{}
    window.addEventListener("storage",onStorage);window.addEventListener("focus",refresh);
    window.addEventListener("beforeunload",onBeforeUnload);document.addEventListener("visibilitychange",onVisibility);
  }
  void store.load();
  return ()=>{
    unsubscribe();
    if(--subscribers===0){
      channel?.close();channel=null;
      window.removeEventListener("storage",onStorage);window.removeEventListener("focus",refresh);
      window.removeEventListener("beforeunload",onBeforeUnload);document.removeEventListener("visibilitychange",onVisibility);
    }
  };
}
export function useStudy(){return useSyncExternalStore(subscribe,store.getSnapshot,()=>initialStudySnapshot);}
export const getStudySnapshot=store.getSnapshot;
export const saveProgress=(update:(data:Progress)=>Progress)=>store.save(update);
export const reviewProgressReplacement=()=>store.reviewReplacement();
export const replaceProgress=(data:Progress,expected:ReplacementCheck)=>store.replace(data,expected);
export const retryProgressSave=()=>store.retry();
export const loadSavedProgress=()=>store.loadSaved();
export const toggleCourse=(id:string)=>saveProgress(data=>({...data,plan:data.plan.includes(id)?data.plan.filter(item=>item!==id):[...data.plan,id]}));
export const toggleBookmark=(id:string)=>saveProgress(data=>({...data,bookmarks:data.bookmarks.includes(id)?data.bookmarks.filter(item=>item!==id):[...data.bookmarks,id]}));
export async function downloadBackup(){downloadProgressText(await store.exportText());}
