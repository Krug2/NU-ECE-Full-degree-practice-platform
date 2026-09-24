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
      const database=request.result,transaction=database.transaction("progress","readonly");
      const record=transaction.objectStore("progress").get("current");
      transaction.oncomplete=()=>{database.close();resolve(record.result?.data);};
      transaction.onabort=()=>{database.close();reject(transaction.error);};
    };
  }));
}
