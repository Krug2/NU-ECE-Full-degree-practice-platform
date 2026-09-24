import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { restoreProgress } from "./progress";

const route="/courses/phs-231/lessons/m01-l01";

test("measurement reasoning, invalid intervals, and keyboard controls work on wide and narrow screens",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/courses/phs-231");
  await expect(page.getByText(/\d+ of 22 planned lessons are available\./)).toBeVisible();
  await page.getByRole("link",{name:"Open lesson: Units, dimensions, and measurement evidence",exact:true}).click();
  await expect(page.getByRole("link",{name:"Powers, roots, and scientific notation",exact:true})).toHaveAttribute("href","/courses/mth-215/lessons/b02");
  await expect(page.getByRole("link",{name:"Calculus preparation",exact:true})).toHaveAttribute("href","/courses/csc-208");
  await expect(page.locator("#read")).toContainText("This course is under construction");
  const guided=page.locator("#guided");
  await guided.getByLabel("Lower speed bound (m/s)",{exact:true}).fill("31/19");
  await guided.getByLabel("Upper speed bound (m/s)",{exact:true}).fill("29/21");
  await guided.getByLabel("One standard deviation around the mean",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("No probability distribution");
  await guided.getByLabel("Lower speed bound (m/s)",{exact:true}).fill("2.9/2.1");
  await guided.getByLabel("Upper speed bound (m/s)",{exact:true}).fill("3.1/1.9");
  await guided.getByLabel("All possible average speeds under the stated independent bounds",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate");
  await lab.getByLabel("Predicted central speed (m/s)",{exact:true}).fill("2");
  await lab.getByLabel("Predicted minimum speed (m/s)",{exact:true}).fill("66/35");
  await lab.getByLabel("Predicted maximum speed (m/s)",{exact:true}).fill("202/95");
  const check=lab.getByRole("button",{name:"Check speed predictions",exact:true});
  await check.focus();await check.press("Enter");
  await expect(lab.getByRole("status")).toContainText("All three predictions agree");
  await expect(lab.getByRole("row",{name:/Minimum/})).toContainText("1.885714");
  await lab.getByLabel("Time uncertainty bound (s)",{exact:true}).fill("1");
  await check.click();
  await expect(lab.getByRole("status")).toContainText("time bounds must stay strictly positive");
  await expect(lab.getByRole("table")).toHaveCount(0);
  await lab.getByRole("button",{name:"Reset measurement",exact:true}).click();
  await lab.getByLabel("Distance (m)",{exact:true}).fill("");
  await check.click();
  await expect(lab.getByRole("status")).toContainText("empty input is not zero");
  await lab.getByRole("button",{name:"Reset measurement",exact:true}).click();
  await lab.getByLabel("Distance uncertainty bound (m)",{exact:true}).fill("0");
  await lab.getByLabel("Time uncertainty bound (s)",{exact:true}).fill("0");
  for(const name of ["central","minimum","maximum"])await lab.getByLabel(`Predicted ${name} speed (m/s)`,{exact:true}).fill("2");
  await check.click();
  await expect(lab.getByRole("status")).toContainText("All three predictions agree");
  for(const [label,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const){
    await page.setViewportSize(viewport);
    await page.emulateMedia({reducedMotion:"reduce"});
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await lab.screenshot({path:testInfo.outputPath(`measurement-${label}.png`)});
    await check.focus();
    await page.screenshot({path:testInfo.outputPath(`measurement-${label}-viewport.png`)});
  }
  expect(errors).toEqual([]);
});

test("physics checkpoint answers and notes survive real backup export, reset, and import",async({page},testInfo)=>{
  const data=JSON.parse(await readFile(new URL("../../content/lessons/phs-231/m01-l01.json",import.meta.url),"utf8"));
  const lesson=lessonSchema.parse(data),attempt=createAttempt(lesson,"checkpoint","phs231-browser-check");
  const backup={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  await restoreProgress(page,backup);
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  const practice=page.locator("#practice");
  expect(await practice.getByRole("button",{name:/Show a hint/}).count()).toBe(0);
  for(let index=0;index<attempt.questions.length;index++){
    const q=attempt.questions[index],p=q.parameters;
    const answers:Record<string,string>=q.familyId==="phs231-unit-conversion"?{value:`${p.n}/1000000`,reason:"square"}:q.familyId==="phs231-dimensional-audit"?{mass:"0",length:"1",time:String(-p.power)}:q.familyId==="phs231-measurement-bounds"&&"distanceCm" in p?{central:`${p.distanceCm}/${p.timeCs}`,lower:`${p.distanceCm-p.distanceBoundCm}/${p.timeCs+p.timeBoundCs}`,upper:`${p.distanceCm+p.distanceBoundCm}/${p.timeCs-p.timeBoundCs}`}:{correction:String(-p.offsetMm),claim:"bias"};
    for(const field of q.fields){
      if(field.kind==="choice")await practice.locator(`input[value="${answers[field.id]}"]`).check();
      else await practice.getByLabel(`${field.label}${field.unit?` (${field.unit})`:""}`,{exact:true}).fill(answers[field.id]);
    }
    if(index===0){
      const prompt=await practice.locator(".question-prompt").textContent();
      await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
      expect(await practice.locator(".question-prompt").textContent()).toBe(prompt);
      await expect(practice.getByLabel("Converted value (m²)",{exact:true})).toHaveValue(answers.value);
    }
    await practice.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true}).fill("Use smaller distance and larger positive time for the lower bound. These are bounds, not standard deviations.");
  await page.getByRole("button",{name:"Save lesson notes",exact:true}).click();
  await page.goto("/settings");const downloading=page.waitForEvent("download");
  await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const path=testInfo.outputPath("phs231-progress.json");await(await downloading).saveAs(path);
  const exported=JSON.parse(await readFile(path,"utf8"));
  expect(exported.learning.attempts[0].questions).toEqual(attempt.questions);
  expect(exported.learning.evidence[0]).toMatchObject({courseId:"phs-231",lessonId:"m01-l01",correct:4});
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await page.getByLabel("Import a progress backup",{exact:true}).setInputFiles(path);await page.getByRole("button",{name:"Replace with this backup",exact:true}).click();
  await expect(page.getByText(/^Backup restored\./)).toBeVisible();
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await expect(practice.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true})).toHaveValue(exported.learning.notes["phs-231"]["m01-l01"]);
  const response=await page.goto("/courses/phs-231/lessons/m09-l02");expect(response?.status()).toBe(404);
});
