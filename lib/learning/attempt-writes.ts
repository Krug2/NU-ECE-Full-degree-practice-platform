import type { Attempt } from "./attempts";

export type AttemptPatch=Partial<Pick<Attempt,"responses"|"position"|"hints"|"status"|"submittedAt">>;
type Save=(id:string,revision:number,patch:AttemptPatch)=>boolean|Promise<boolean>;
export type AttemptSaveResult={saved:boolean;revision:number;message:string};
type Job={patch:AttemptPatch;started:boolean;resolve:((result:AttemptSaveResult)=>void)[]};
const responseOnly=(patch:AttemptPatch)=>Object.keys(patch).length===1&&patch.responses!==undefined;
export class AttemptWriteQueue{
  private queue:Promise<unknown>=Promise.resolve();
  private tail:Job|null=null;
  private blocked=false;
  pending=0;
  constructor(private readonly id:string,public revision:number,private readonly save:Save){}
  enqueue(patch:AttemptPatch):Promise<AttemptSaveResult>{
    const captured=structuredClone(patch);this.pending++;
    let resolve!:(result:AttemptSaveResult)=>void;
    const completion=new Promise<AttemptSaveResult>(done=>{resolve=done;});
    if(this.tail&&!this.tail.started&&responseOnly(captured)&&responseOnly(this.tail.patch)){
      this.tail.patch=captured;this.tail.resolve.push(resolve);return completion;
    }
    const job:Job={patch:captured,started:false,resolve:[resolve]};this.tail=job;
    const task=this.queue.then(async()=>{
      job.started=true;
      if(this.blocked)return {saved:false,revision:this.revision,message:"Your draft is still visible. Resolve the save problem before continuing."};
      try{
        const saved=await this.save(this.id,this.revision,job.patch);
        if(saved)this.revision++;else this.blocked=true;
        return {saved,revision:this.revision,message:saved?"Saved in this browser.":"Your draft is still visible. Check the storage notice before leaving."};
      }catch(error){
        this.blocked=true;
        return {saved:false,revision:this.revision,message:error instanceof Error?error.message:"The attempt could not be saved."};
      }
    });
    this.queue=task.then(result=>{
      this.pending-=job.resolve.length;
      if(this.tail===job)this.tail=null;
      job.resolve.forEach(done=>done(result));
    });
    return completion;
  }
  reset(revision:number){
    if(this.pending)throw new Error("Wait for the current save before loading another version.");
    this.revision=revision;this.blocked=false;
  }
}
