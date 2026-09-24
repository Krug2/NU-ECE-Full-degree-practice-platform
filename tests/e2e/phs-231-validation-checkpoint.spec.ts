import { expect,test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { Progress } from "../../lib/progress";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";
const route="/courses/phs-231/lessons/m09-l02";
const emptyProgress=():Progress=>({schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[],evidence:[],notes:{}}});
test("validation independently answered checkpoint resumes and restores real questions and evidence",async({page},info)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m09-l02.json",import.meta.url),"utf8")),attempt=createAttempt(lessonSchema.parse(data),"checkpoint","validation-checkpoint"),progress=emptyProgress();progress.learning.attempts=[attempt];
  await restoreProgress(page,progress);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();const practice=page.locator("#practice");
  for(const [i,q] of attempt.questions.entries()){
    const p=q.parameters;let answers:Record<string,string>;
    if(i===0){
      const left=(p.k*p.X+p.Z)/100,right=(-p.k*p.X+p.Z)/100,k=Math.round((left-right)/(2*p.X/100)),zero=Math.round((left+right)*50);
      answers={zero:`${zero}/100`,stiffness:String(k),force:`${-k*p.W}/100`,reading:`${-k*p.W+zero}/100`,meaning:"cancel"};
    }else if(i===1){
      const observation=(2*p.P+p.sign*p.U*p.factor)/200,predicted=p.P/100,residual=observation-predicted,bound=p.U/100;
      answers={residual:`${Math.round(residual*200)}/200`,magnitude:`${Math.round(Math.abs(residual)*200)}/200`,margin:`${Math.round((bound-Math.abs(residual))*200)}/200`,ratio:`${p.factor}/2`,decision:Math.abs(residual)<=bound+1e-12?"compatible":"outside"};
    }else if(i===2){
      const x=p.X/100,staticForce=-p.k*x;
      answers={stiffness:String(Math.round(-staticForce/x)),free:p.mode===2?"0":"1",claim:["static","coupled","separate"][p.mode]};
      if(p.mode===1){const force=-p.k*x-(p.B/10)*(p.C*x),effective=-force/x;answers.effective=`${Math.round(effective*10)}/10`;answers.stiffness=String(Math.round(effective-(p.B/10)*p.C));}
      if(p.mode===2){const v=p.V/10,force=-(p.B/10)*v;answers.drag=`${Math.round((-force/v)*10)}/10`;}
    }else{
      const inference=p.mode===0?`${Math.round(((p.B*p.V/100)-(-p.B*p.V/100))/(2*p.V/10)*10)}/10`:p.mode===1?String(Math.round((p.C*p.X**3/10000)/(p.X/100)**3)):p.mode===2?`${p.D}/100`:String(Math.round(Math.log2((p.E/1000)/(p.E/2000))));
      answers={inference,next:["drag-test","spring-test","zero-test","step-test"][p.mode],limit:"limited"};
    }
    for(const f of q.fields)if(f.kind==="choice")await practice.getByLabel(f.options.find(o=>o.id===answers[f.id])!.label,{exact:true}).check();else await practice.getByLabel(`${f.label}${f.unit?` (${f.unit})`:""}`,{exact:true}).fill(answers[f.id]);
    if(i===1){
      await expect(practice.getByText("Saved in this browser.",{exact:true})).toBeVisible();await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
      for(const f of q.fields)if(f.kind==="choice")await expect(practice.getByLabel(f.options.find(o=>o.id===answers[f.id])!.label,{exact:true})).toBeChecked();else await expect(practice.getByLabel(`${f.label}${f.unit?` (${f.unit})`:""}`,{exact:true})).toHaveValue(answers[f.id]);
    }
    await practice.getByRole("button",{name:i===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  const note="A fitted sensor zero changes predicted output, not physical acceleration. Static data leave viscous b unidentified. I preserved observed-minus-predicted residuals and compared their magnitudes with closed bounds. The project is synthetic self-assessment; this checkpoint separately checks numerical answers and interpretations.";
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true}).fill(note);await page.getByRole("button",{name:"Save lesson notes",exact:true}).click();await expect(page.getByText("Lesson notes saved.",{exact:true})).toBeVisible();
  await page.goto("/settings");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();const path=info.outputPath("validation-learning.json");await(await download).saveAs(path);const backup=JSON.parse(await readFile(path,"utf8"));
  expect(backup.learning.attempts[0].questions).toEqual(attempt.questions);expect(backup.learning.evidence).toHaveLength(1);expect(backup.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m09-l02",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();await expect(page.getByText("Local progress has been reset.",{exact:true})).toBeVisible();
  await restoreProgress(page,backup);await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true})).toHaveValue(note);
});
