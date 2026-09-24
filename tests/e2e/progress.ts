import { expect,type Page } from "@playwright/test";
import type { Progress } from "../../lib/progress";

export async function restoreProgress(page:Page,data:unknown){
  await page.goto("/settings");
  await page.getByLabel("Import a progress backup",{exact:true}).setInputFiles({name:"fixture.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(data))});
  await expect(page.getByText("Review this backup",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Replace with this backup",exact:true}).click();
  await expect(page.getByText(/^Backup restored\./)).toBeVisible();
}
export async function readStoredProgress(page:Page):Promise<Progress>{
  return page.evaluate(()=>new Promise((resolve,reject)=>{
    const request=indexedDB.open("ece-study");let absent=false;
    request.onupgradeneeded=()=>{absent=true;request.transaction?.abort();};
    request.onerror=()=>{
      if(absent){
        try{resolve(JSON.parse(localStorage.getItem("ece-study:progress:v1")??"null"));}
        catch(error){reject(error);}
      }else reject(request.error);
    };
    request.onsuccess=()=>{
      const database=request.result,normalized=database.objectStoreNames.contains("attempts"),transaction=database.transaction(normalized?["progress","attempts"]:["progress"],"readonly");
      const record=transaction.objectStore("progress").get(normalized?"index":"current");
      const attempts=normalized?transaction.objectStore("attempts").getAll():null;
      transaction.oncomplete=()=>{
        database.close();
        if(!normalized){resolve(record.result?.data);return;}
        const index=record.result;
        if(!index){reject(new Error("The progress index is missing."));return;}
        const byId=new Map((attempts?.result??[]).map(item=>[item.data.id,item.data]));
        resolve({...index.data,learning:{...index.data.learning,attempts:index.attempts.map((item:{id:string})=>byId.get(item.id))}});
      };
      transaction.onabort=()=>{database.close();reject(transaction.error);};
    };
  }));
}
