import { expect,test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { readStoredProgress,restoreProgress } from "./progress";
import { fill,solve } from "./phs-231-assessment-helpers";

const route="/courses/phs-231/assessments/quiz-m01";
test("a restored metadata change preserves the original draft and its practice copy cannot award assessment evidence",async({page,context},info)=>{
  await page.goto(route);const scope=page.locator("#assessment");await scope.getByRole("button",{name:"Start assessment",exact:true}).click();
  await scope.getByLabel("Converted value (m²)",{exact:true}).fill("1/2");await expect(scope.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");
  const original=await readStoredProgress(page),replacement=structuredClone(original);replacement.learning.attempts[0].assessment!.title="Restored form with a different title";
  const other=await context.newPage();await restoreProgress(other,replacement);
  await expect(scope.getByText("This attempt's saved questions changed.",{exact:true})).toBeVisible();
  await expect(scope.getByLabel("Converted value (m²)",{exact:true})).toHaveValue("1/2");
  await expect(scope.getByRole("button",{name:"Practice",exact:true})).toBeDisabled();
  const downloading=page.waitForEvent("download");await scope.getByRole("button",{name:"Export draft",exact:true}).click();
  const path=info.outputPath("assessment-conflict.json");await(await downloading).saveAs(path);const exported=JSON.parse(await readFile(path,"utf8"));
  expect(exported.learning.attempts.at(-1)).toMatchObject({mode:"practice",assessment:original.learning.attempts[0].assessment,questions:original.learning.attempts[0].questions,responses:original.learning.attempts[0].responses});
  await scope.getByRole("button",{name:"Keep draft as practice",exact:true}).click();
  await expect(scope.getByText("Draft kept as practice. Start a new assessment for independent evidence.",{exact:true})).toBeVisible();
  const copy=(await readStoredProgress(page)).learning.attempts.at(-1)!;
  await scope.getByRole("button",{name:"Show a hint (0/3)",exact:true}).click();await expect(scope.getByRole("button",{name:"Show a hint (1/3)",exact:true})).toBeVisible();
  for(const [index,question] of copy.questions.entries()){await fill(scope,question,solve(question));await scope.getByRole("button",{name:index===7?"Submit practice":"Next question",exact:true}).click();}
  await expect(scope.getByRole("heading",{name:"Assessment practice completed",exact:true})).toBeVisible();await expect(scope.getByRole("status").first()).toContainText("8 of 8");
  const learning=(await readStoredProgress(page)).learning;expect(learning.assessmentResults).toBeUndefined();expect(learning.evidence).toEqual([]);
  expect(learning.attempts[0].assessment!.title).toBe("Restored form with a different title");expect(learning.attempts.at(-1)!.mode).toBe("practice");await other.close();
});
test("a failed assessment save keeps answers exportable and blocks changing modes until recovery",async({page},info)=>{
  await page.goto(route);const scope=page.locator("#assessment");await scope.getByRole("button",{name:"Start assessment",exact:true}).click();
  const before=await readStoredProgress(page);
  await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){IDBObjectStore.prototype.put=put;throw new DOMException("Simulated full storage","QuotaExceededError");};});
  await scope.getByLabel("Converted value (m²)",{exact:true}).fill("1/2");
  await expect(scope.getByText("Your latest draft has not been saved.",{exact:true})).toBeVisible();
  await expect(scope.getByRole("button",{name:"Practice",exact:true})).toBeDisabled();await expect(scope.getByLabel("Converted value (m²)",{exact:true})).toHaveValue("1/2");
  expect((await readStoredProgress(page)).learning).toEqual(before.learning);
  const downloading=page.waitForEvent("download");await scope.getByRole("button",{name:"Export draft",exact:true}).click();const path=info.outputPath("assessment-unsaved.json");await(await downloading).saveAs(path);
  const exported=JSON.parse(await readFile(path,"utf8"));expect(exported.learning.attempts.at(-1)).toMatchObject({mode:"practice",assessment:before.learning.attempts[0].assessment,responses:{"q-1":{value:"1/2"}}});
  await expect(scope.getByRole("button",{name:"Load saved attempt",exact:true})).toBeDisabled();
  await page.getByRole("link",{name:"Open backup and recovery settings",exact:true}).click();
  await page.getByRole("button",{name:"Load saved progress",exact:true}).click();await page.getByRole("button",{name:"Discard unsaved change",exact:true}).click();
  await expect(page.getByText("An unsaved change needs recovery.",{exact:true})).toHaveCount(0);
  await page.goto(route);await expect(scope.getByLabel("Converted value (m²)",{exact:true})).toHaveValue("");
  await expect(scope.getByRole("button",{name:"Practice",exact:true})).toBeEnabled();
});
test("ending an old form preserves its work and allows a fresh current form without completion evidence",async({page})=>{
  await page.goto(route);const scope=page.locator("#assessment");await scope.getByRole("button",{name:"Start assessment",exact:true}).click();
  await scope.getByLabel("Converted value (m²)",{exact:true}).fill("2/7");await expect(scope.locator(".attempt-session .form-status")).toHaveText("Saved in this browser.");
  const original=(await readStoredProgress(page)).learning.attempts[0];
  await scope.getByText("End this attempt without submitting",{exact:true}).click();await scope.getByRole("button",{name:"End attempt",exact:true}).click();
  await expect(scope.getByRole("heading",{name:"Attempt ended without submission",exact:true})).toBeVisible();
  await scope.getByRole("button",{name:"Start another assessment",exact:true}).click();const learning=(await readStoredProgress(page)).learning;
  expect(learning.attempts).toHaveLength(2);expect(learning.attempts[0]).toMatchObject({id:original.id,status:"abandoned",responses:{"q-1":{value:"2/7"}}});
  expect(learning.attempts[1].questions).not.toEqual(original.questions);expect(learning.assessmentResults).toBeUndefined();
});
