import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";

const route="/courses/mth-215/lessons/m01-l01";
const key="ece-study:progress:v1";

test("learn, investigate, resume practice, and restore learning in a backup",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/courses/mth-215");
  await page.getByRole("link",{name:"Open lesson: Linear equations and formula rearrangement",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Linear equations and formula rearrangement",exact:true})).toBeVisible();
  await page.getByLabel("Right side after adding 7",{exact:true}).fill("16");
  await page.getByLabel("Final value of x",{exact:true}).fill("4");
  await page.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(page.locator("#guided .answer-feedback")).toContainText("Correct. You have checked every part.");
  await page.getByLabel("What do you predict will change?",{exact:true}).fill("Subtracting six makes the left constant zero.");
  await page.getByRole("button",{name:"Apply operation",exact:true}).click();
  await page.getByLabel("Operation",{exact:true}).selectOption("divide");
  await page.getByLabel("Number",{exact:true}).fill("3");
  await page.getByLabel("What do you predict will change?",{exact:true}).fill("The variable will have coefficient one.");
  await page.getByRole("button",{name:"Apply operation",exact:true}).click();
  await expect(page.locator("#investigate [role=status]")).toContainText("x = 4");
  await page.getByRole("button",{name:"Start practice",exact:true}).click();
  await page.locator("#practice").getByLabel("x",{exact:true}).fill("1/3");
  await page.getByRole("button",{name:"Show a hint (0/3)",exact:true}).last().click();
  await page.reload();
  await expect(page.locator("#practice").getByLabel("x",{exact:true})).toHaveValue("1/3");
  await expect(page.locator("#practice").getByRole("button",{name:"Show a hint (1/3)",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Next question",exact:true}).click();
  await page.reload();
  await expect(page.locator(".attempt-meta")).toContainText("Question 2 of 6");
  await page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true}).fill("Subtract from both sides before dividing. <script>literal</script>");
  await page.getByRole("button",{name:"Save lesson notes",exact:true}).click();
  await page.goto("/settings");
  const downloadPromise=page.waitForEvent("download");
  await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const file=testInfo.outputPath("learning.json");await(await downloadPromise).saveAs(file);
  const exported=JSON.parse(await readFile(file,"utf8"));
  expect(exported.schemaVersion).toBe(2);expect(exported.learning.attempts[0].position).toBe(1);
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();
  await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await page.getByLabel("Import a progress backup",{exact:true}).setInputFiles(file);
  await page.getByRole("button",{name:"Replace with this backup",exact:true}).click();
  await page.goto(route);
  await expect(page.locator(".attempt-meta")).toContainText("Question 2 of 6");
  await expect(page.getByLabel("Reasoning, questions, or a worked solution to revisit",{exact:true})).toHaveValue("Subtract from both sides before dividing. <script>literal</script>");
  expect(errors).toEqual([]);
});

test("an independent checkpoint records evidence and survives reload",async({page})=>{
  const lesson=lessonSchema.parse(JSON.parse(await readFile(new URL("../../content/lessons/mth-215/m01-l01.json",import.meta.url),"utf8")));
  const attempt=createAttempt(lesson,"checkpoint","browser-fixture");
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  await page.goto("/");await page.evaluate(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key,data});
  await page.goto(route);
  await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  for(let i=0;i<attempt.questions.length;i++){
    const question=attempt.questions[i];
    for(const field of question.fields){
      if(field.kind==="choice")await page.locator("#practice").locator(`input[value="${field.correct}"]`).check();
      else await page.locator("#practice").getByLabel(field.label,{exact:true}).fill(String(field.expected));
    }
    await page.getByRole("button",{name:i<3?"Next question":"Submit checkpoint",exact:true}).click();
  }
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.reload();await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);
  expect(stored.learning.evidence).toHaveLength(1);
  expect(stored.learning.evidence[0].correct).toBe(4);
});

test("concurrent answers keep the other tab's draft until an explicit choice",async({page,context})=>{
  await page.goto(route);await page.getByRole("button",{name:"Start practice",exact:true}).click();
  const other=await context.newPage();await other.goto(route);
  await expect(other.locator("#practice").getByLabel("x",{exact:true})).toHaveValue("");
  await page.locator("#practice").getByLabel("x",{exact:true}).fill("7");
  await expect(other.getByRole("alert").filter({hasText:"changed in another tab"})).toBeVisible();
  await expect(other.locator("#practice").getByLabel("x",{exact:true})).toBeDisabled();
  await other.getByRole("button",{name:"Load saved attempt",exact:true}).click();
  await expect(other.locator("#practice").getByLabel("x",{exact:true})).toHaveValue("7");
  await other.close();
});

test("copying a completed checkpoint's stale draft creates practice without new evidence",async({page,context})=>{
  const lesson=lessonSchema.parse(JSON.parse(await readFile(new URL("../../content/lessons/mth-215/m01-l01.json",import.meta.url),"utf8")));
  const attempt=createAttempt(lesson,"checkpoint","copy-fixture");
  attempt.position=3;
  for(const question of attempt.questions)attempt.responses[question.id]=Object.fromEntries(question.fields.map(field=>[field.id,field.kind==="choice"?field.correct:String(field.expected)]));
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  await page.goto("/");await page.evaluate(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key,data});
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await expect(page.getByRole("button",{name:"Submit checkpoint",exact:true})).toBeVisible();
  const other=await context.newPage();await other.goto(route);
  await other.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await other.getByRole("button",{name:"Submit checkpoint",exact:true}).click();
  await expect(other.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Keep draft as practice",exact:true}).click();
  await expect(page.getByRole("button",{name:"Practice",exact:true})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button",{name:"Submit practice",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Practice completed",exact:true})).toBeVisible();
  const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);
  expect(stored.learning.attempts.at(-1).mode).toBe("practice");
  expect(stored.learning.attempts.at(-1).questions).toEqual(attempt.questions);
  expect(stored.learning.evidence).toHaveLength(1);
  expect(stored.learning.evidence[0].attemptId).toBe(attempt.id);
  await other.close();
});

async function accessible(page:Page){
  const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
  expect(result.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
}
test("lesson and practice are accessible on desktop and mobile and missing lessons return 404",async({page},testInfo)=>{
  await page.goto(route);await accessible(page);
  await page.getByRole("button",{name:"Start practice",exact:true}).click();await accessible(page);
  await page.screenshot({path:testInfo.outputPath("lesson-desktop.png")});
  await page.setViewportSize({width:390,height:844});await accessible(page);
  await page.screenshot({path:testInfo.outputPath("lesson-mobile.png")});
  const response=await page.goto("/courses/mth-215/lessons/not-a-lesson");expect(response?.status()).toBe(404);
});
test("rapid answer entry preserves every character and resumes after the saved message",async({page})=>{
  await page.goto(route);await page.getByRole("button",{name:"Start practice",exact:true}).click();
  const answer=page.locator("#practice").getByLabel("x",{exact:true});
  await answer.pressSequentially("(123456789/3)",{delay:0});
  await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");
  await expect(page.getByText("This attempt changed in another tab.",{exact:true})).toHaveCount(0);
  await page.reload();await expect(page.locator("#practice").getByLabel("x",{exact:true})).toHaveValue("(123456789/3)");
});

test("a conflicting draft exports as practice without changing the saved attempt",async({page,context},testInfo)=>{
  await page.goto(route);await page.getByRole("button",{name:"Start practice",exact:true}).click();
  await page.locator("#practice").getByLabel("x",{exact:true}).fill("7/3");
  await expect(page.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");
  const other=await context.newPage();await other.goto(route);
  await other.locator("#practice").getByLabel("x",{exact:true}).fill("9");
  await expect(page.getByText("This attempt changed in another tab.",{exact:true})).toBeVisible();
  const download=page.waitForEvent("download");
  await page.getByRole("button",{name:"Export draft",exact:true}).click();
  const file=testInfo.outputPath("draft.json");await(await download).saveAs(file);
  const exported=JSON.parse(await readFile(file,"utf8")),original=exported.learning.attempts[0],draft=exported.learning.attempts.at(-1);
  expect(draft.id).not.toBe(original.id);expect(draft.mode).toBe("practice");
  expect(draft.status).toBe("active");expect(draft.revision).toBe(0);expect(draft.questions).toEqual(original.questions);
  const first=draft.questions[0];expect(draft.responses[first.id][first.fields[0].id]).toBe("7/3");
  expect(original.responses[first.id][first.fields[0].id]).toBe("9");expect(exported.learning.evidence).toHaveLength(0);
  await other.reload();await expect(other.locator("#practice").getByLabel("x",{exact:true})).toHaveValue("9");
  await other.close();
});
