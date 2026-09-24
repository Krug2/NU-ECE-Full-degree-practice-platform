import { emptyProgress,type Progress } from "./progress";
import { ProgressStorageError,stringifyRecovery,type PreparedChange,type ProgressRepository,type ReplacementCheck,type StoredProgress } from "./progress-repository";
import type { AttemptPatch } from "./learning/attempt-writes";

export type StudySnapshot={data:Progress;ready:boolean;issue:string;locked:boolean;saving:boolean;dirty:boolean;revision:number|null};
export const initialStudySnapshot:StudySnapshot={data:emptyProgress(),ready:false,issue:"",locked:false,saving:false,dirty:false,revision:null};
type Options={open:()=>Promise<ProgressRepository>;legacy:()=>string|null;committed?:()=>void};
const errorMessage=(error:unknown)=>error instanceof Error?error.message:"Progress could not be saved.";
const closedMessage="Progress storage closed or was upgraded in another tab. Export any unsaved work, then reload this page.";
export class ProgressStore{
  private snapshot:StudySnapshot=initialStudySnapshot;
  private repository:ProgressRepository|null=null;
  private loading:Promise<void>|null=null;
  private queue:Promise<unknown>=Promise.resolve();
  private pending=0;
  private closed=false;
  private draft:{data:Progress;revision:number;generation:string}|null=null;
  private recovery:string|null=null;
  private listeners=new Set<()=>void>();
  constructor(private readonly options:Options){}
  getSnapshot=()=>this.snapshot;
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return ()=>{this.listeners.delete(listener);};};
  private publish(change:Partial<StudySnapshot>){
    this.snapshot={...this.snapshot,...change};
    this.listeners.forEach(listener=>listener());
  }
  private accept(record:StoredProgress){
    this.draft=null;this.recovery=null;
    this.publish({data:record.data,revision:record.revision,ready:true,issue:this.closed?closedMessage:"",locked:this.closed,dirty:false});
  }
  load():Promise<void>{
    if(this.loading)return this.loading;
    this.loading=(async()=>{
      try{
        this.repository=await this.options.open();
        this.accept(await this.repository.initialize(()=>{
          const text=this.options.legacy();this.recovery=text;return text;
        }));
      }catch(error){
        if(!this.repository){try{this.recovery=this.options.legacy();}catch{}}
        try{
          const raw=await this.repository?.readRaw();
          if(raw!==undefined)this.recovery=stringifyRecovery(raw);
        }catch{}
        this.publish({ready:true,locked:true,issue:errorMessage(error)});
      }
    })();
    return this.loading;
  }
  private enqueue<T>(work:()=>Promise<T>,saving=false):Promise<T>{
    if(saving){this.pending++;this.publish({saving:true});}
    const task=this.queue.then(async()=>{await this.load();return work();});
    const settled=task.finally(()=>{
      if(saving){this.pending--;this.publish({saving:this.pending>0});}
    });
    this.queue=settled.catch(()=>undefined);
    return settled;
  }
  private storage():ProgressRepository{
    if(!this.repository)throw new ProgressStorageError("unavailable","Browser storage is unavailable. Export any available recovery data before reloading.");
    return this.repository;
  }
  refresh():Promise<void>{
    return this.enqueue(async()=>{
      if(this.snapshot.dirty||this.snapshot.locked)return;
      try{this.accept(await this.storage().read());}
      catch(error){this.publish({locked:true,issue:errorMessage(error)});}
    });
  }
  save(change:(data:Progress)=>Progress):Promise<boolean>{
    return this.saveWith((repository,prepared)=>repository.update(change,undefined,prepared));
  }
  saveAttempt(id:string,revision:number,patch:AttemptPatch):Promise<boolean>{
    const captured=structuredClone(patch);
    return this.saveWith((repository,prepared)=>repository.saveAttempt(id,revision,captured,prepared));
  }
  private saveWith(save:(repository:ProgressRepository,prepared:PreparedChange)=>Promise<StoredProgress>):Promise<boolean>{
    return this.enqueue(async()=>{
      if(this.snapshot.locked)return false;
      let candidate:typeof this.draft=null;
      try{
        const saved=await save(this.storage(),(data,revision,generation)=>{candidate={data,revision,generation};});
        this.accept(saved);this.announce();return true;
      }catch(error){
        if(candidate&&error instanceof ProgressStorageError&&["commit","unavailable","closed"].includes(error.code)){
          this.draft=candidate;
          this.publish({dirty:true,locked:true,issue:"Browser storage could not save your changes. Your unsaved change is available to export in Settings. Retry saving or load the saved version before continuing."});
        }else{
          try{this.accept(await this.storage().read());}catch{}
          const locked=error instanceof ProgressStorageError&&["corrupt","closed","version","unavailable"].includes(error.code);
          this.publish({issue:errorMessage(error),locked});
        }
        return false;
      }
    },true);
  }
  reviewReplacement():Promise<ReplacementCheck>{
    return this.enqueue(async()=>{
      const repository=this.storage();
      try{const record=await repository.read(true);return {revision:record.revision,generation:record.generation};}
      catch(error){
        if(error instanceof ProgressStorageError&&error.code==="corrupt")return {raw:await repository.readRaw()};
        throw error;
      }
    });
  }
  replace(data:Progress,expected:ReplacementCheck):Promise<boolean>{
    return this.enqueue(async()=>{
      try{
        this.accept(await this.storage().replace(data,expected));this.announce();return true;
      }catch(error){this.publish({issue:errorMessage(error)});return false;}
    },true);
  }
  retry():Promise<boolean>{
    return this.enqueue(async()=>{
      if(!this.draft)return false;
      try{
        this.accept(await this.storage().replace(this.draft.data,{revision:this.draft.revision,generation:this.draft.generation}));
        this.announce();return true;
      }catch(error){
        this.publish({issue:errorMessage(error)+" Your unsaved change is still available to export."});return false;
      }
    },true);
  }
  loadSaved():Promise<boolean>{
    return this.enqueue(async()=>{
      try{this.accept(await this.storage().read(true));return true;}
      catch(error){this.publish({issue:errorMessage(error),locked:true});return false;}
    });
  }
  exportText():Promise<string>{
    return this.enqueue(async()=>{
      if(this.draft)return JSON.stringify(this.draft.data,null,2);
      if(this.snapshot.locked){
        try{
          const raw=await this.repository?.readRaw();
          if(raw!==undefined)return stringifyRecovery(raw);
        }catch{}
        if(this.recovery!==null)return this.recovery;
        if(this.snapshot.revision!==null)return JSON.stringify(this.snapshot.data,null,2);
        throw new Error("No readable progress is available to export. Use a compatible app version or restore browser storage access.");
      }
      this.accept(await this.storage().read(true));
      return JSON.stringify(this.snapshot.data,null,2);
    });
  }
  storageClosed(){
    this.closed=true;this.publish({locked:true,issue:closedMessage});
  }
  private announce(){try{this.options.committed?.();}catch{}}
}
