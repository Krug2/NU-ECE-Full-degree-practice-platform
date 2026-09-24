import type { Progress } from "../progress";
import { updateAttempt,type Attempt } from "./attempts";

export type AttemptPatch=Partial<Pick<Attempt,"responses"|"position"|"hints"|"status"|"submittedAt">>;
type Save=(change:(data:Progress)=>Progress)=>boolean|Promise<boolean>;
export type AttemptSaveResult={saved:boolean;revision:number;message:string};
export class AttemptWriteQueue{
  private queue:Promise<unknown>=Promise.resolve();
  private blocked=false;
  pending=0;
  constructor(private readonly id:string,public revision:number,private readonly save:Save){}
  enqueue(patch:AttemptPatch):Promise<AttemptSaveResult>{
    const captured=structuredClone(patch);this.pending++;
    const task=this.queue.then(async()=>{
      if(this.blocked)return {saved:false,revision:this.revision,message:"Your draft is still visible. Resolve the save problem before continuing."};
      try{
        const saved=await this.save(data=>({...data,learning:updateAttempt(data.learning,this.id,this.revision,current=>({...current,...captured}))}));
        if(saved)this.revision++;else this.blocked=true;
        return {saved,revision:this.revision,message:saved?"Saved in this browser.":"Your draft is still visible. Check the storage notice before leaving."};
      }catch(error){
        this.blocked=true;
        return {saved:false,revision:this.revision,message:error instanceof Error?error.message:"The attempt could not be saved."};
      }
    }).finally(()=>{this.pending--;});
    this.queue=task;return task;
  }
  reset(revision:number){
    if(this.pending)throw new Error("Wait for the current save before loading another version.");
    this.revision=revision;this.blocked=false;
  }
}
