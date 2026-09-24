import { restoreProgress } from "./progress";
import { expect,test,type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { formatIntervals } from "../../lib/learning/intervals";

const route="/courses/mth-215/lessons/m02-l03";
test("lesson controls wait for scripts before accepting choices",async({page})=>{
  let release!:()=>void;const scriptsReady=new Promise<void>(resolve=>{release=resolve;});
  await page.route(/\/_next\/static\/chunks\/.*\.js(?:\?|$)/,async route=>{await scriptsReady;await route.continue();});
  try{
    await page.goto(route,{waitUntil:"domcontentloaded"});
    const mode=page.locator("#investigate").getByLabel("Machine task",{exact:true});
    await expect(mode).toBeDisabled();
    await expect(page.locator("#guided").getByRole("button",{name:"Check guided work",exact:true})).toBeDisabled();
    release();
    await expect(mode).toBeEnabled();
    await mode.selectOption("inverse");
    await expect(page.locator("#investigate").getByLabel("Predicted inverse value",{exact:true})).toBeVisible();
    await expect(mode).toHaveValue("inverse");
  }finally{release();}
});
async function trace(activity:Locator,first:string,second:string){
  await activity.getByLabel("Predicted first-stage output",{exact:true}).fill(first);
  await activity.getByLabel("Predicted final output",{exact:true}).fill(second);
  await activity.getByRole("button",{name:"Trace function machines",exact:true}).click();
}
async function invert(activity:Locator,inverse:string,reciprocal:string){
  await activity.getByLabel("Predicted inverse value",{exact:true}).fill(inverse);
  await activity.getByLabel("Predicted reciprocal value",{exact:true}).fill(reciprocal);
  await activity.getByRole("button",{name:"Trace function machines",exact:true}).click();
}
test("compositions preserve order, intermediate values, and both domain checks",async({page})=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/courses/mth-215/lessons/m02-l02");
  await page.getByRole("link",{name:"Next: Composition and inverse functions",exact:true}).click();
  const guided=page.locator("#guided"),activity=page.locator("#investigate"),status=activity.locator("[role=status]");
  await guided.getByRole("group",{name:"Inverse rule",exact:true}).getByRole("radio",{name:"One minus the square root of (x minus two)",exact:true}).check();
  await guided.getByLabel("Inverse domain",{exact:true}).fill("[2,inf)");
  await guided.getByLabel("Inverse range",{exact:true}).fill("(-inf,1]");
  await guided.getByLabel("Inverse at 11",{exact:true}).fill("-2");
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await activity.getByRole("button",{name:"Trace function machines",exact:true}).click();
  await expect(status).toContainText("Enter both predictions");
  await trace(activity,"undefined","undefined");await expect(status).toContainText("Review the first function");
  await trace(activity,"4","11");await expect(status).toContainText("Both stage predictions are correct");
  await expect(activity.locator(".machine-trace li").first()).toContainText("First stage: g");
  await expect(activity.locator(".machine-trace li").last()).toContainText("11");
  await activity.getByLabel("Composition order",{exact:true}).selectOption("gf");
  await expect(activity.getByLabel("Machine input x",{exact:true})).toHaveValue("2");
  await trace(activity,"7","49");await expect(status).toContainText("Both stage predictions are correct");
  await activity.getByLabel("Function pair",{exact:true}).selectOption("1");
  await trace(activity,"undefined","undefined");
  await expect(status).toContainText("Both stage predictions are correct");
  await expect(activity.locator(".machine-trace li").first()).toContainText("outside [0, inf)");
  await expect(activity.locator(".machine-trace li").last()).toContainText("Not evaluated");
  await activity.getByLabel("Composition order",{exact:true}).selectOption("gf");
  await trace(activity,"4","2");await expect(status).toContainText("Both stage predictions are correct");
  await activity.getByLabel("Function pair",{exact:true}).selectOption("2");
  await trace(activity,"-1","undefined");await expect(status).toContainText("Both stage predictions are correct");
  await expect(activity.locator(".machine-trace li").last()).toContainText("outside [0, inf)");
  await activity.getByLabel("Composition order",{exact:true}).selectOption("gf");
  await trace(activity,"sqrt(2)","sqrt(2)-3");await expect(status).toContainText("Both stage predictions are correct");
  await activity.getByLabel("Function pair",{exact:true}).selectOption("3");
  await trace(activity,"undefined","undefined");await expect(status).toContainText("Both stage predictions are correct");
  await activity.getByLabel("Machine input x",{exact:true}).fill("0");
  await trace(activity,"-1/2","-2");await expect(status).toContainText("Both stage predictions are correct");
  await activity.getByLabel("Function pair",{exact:true}).selectOption("4");
  await trace(activity,"3","0");await expect(status).toContainText("Both stage predictions are correct");
  await activity.getByLabel("Machine input x",{exact:true}).fill("2");
  await trace(activity,"undefined","undefined");await expect(status).toContainText("Both stage predictions are correct");
  await activity.getByLabel("Original square branch",{exact:true}).selectOption("right");
  await trace(activity,"3","0");await expect(status).toContainText("Both stage predictions are correct");
  await activity.getByLabel("Machine input x",{exact:true}).fill("1/0");
  await trace(activity,"0","0");await expect(status).toContainText("Division by zero");
  await activity.getByRole("button",{name:"Reset machines",exact:true}).click();
  await expect(activity.getByLabel("Function pair",{exact:true})).toHaveValue("0");
  await expect(activity.getByLabel("Machine input x",{exact:true})).toHaveValue("2");
  expect(errors).toEqual([]);
});

test("inverse comparisons respect the original branch and remain usable on mobile",async({page},testInfo)=>{
  await page.goto(route);const activity=page.locator("#investigate"),status=activity.locator("[role=status]");
  await activity.getByLabel("Machine task",{exact:true}).selectOption("inverse");
  await activity.getByLabel("Machine input x",{exact:true}).fill("7");
  await invert(activity,"2","1/17");await expect(status).toContainText("Both inverse and reciprocal predictions are correct");
  await expect(activity.locator(".notice").last()).toContainText("Forward check");
  await expect(activity.locator(".notice").last()).toContainText("Reverse check");
  await activity.getByLabel("Function pair",{exact:true}).selectOption("1");
  await activity.getByLabel("Machine input x",{exact:true}).fill("4");
  await invert(activity,"no inverse","1/16");await expect(status).toContainText("Both inverse and reciprocal predictions are correct");
  await expect(activity.locator(".notice").last()).toContainText("not one-to-one");
  await activity.getByLabel("Original square branch",{exact:true}).selectOption("left");
  await invert(activity,"-2","undefined");await expect(status).toContainText("Both inverse and reciprocal predictions are correct");
  await expect(activity.locator(".notice").last()).toContainText("outside (-inf, 0]");
  await activity.getByLabel("Machine input x",{exact:true}).fill("0");
  await invert(activity,"0","undefined");await expect(status).toContainText("Both inverse and reciprocal predictions are correct");
  await expect(activity.locator(".notice").last()).toContainText("function output is zero");
  await activity.getByLabel("Original square branch",{exact:true}).selectOption("right");
  await activity.getByLabel("Machine input x",{exact:true}).fill("4");
  await invert(activity,"2","1/16");await expect(status).toContainText("Both inverse and reciprocal predictions are correct");
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    const results=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(results.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  const result=activity.locator(".notice").last();
  await result.evaluate(element=>element.scrollIntoView({block:"center"}));
  await result.screenshot({path:testInfo.outputPath("inverse-mobile.png")});
  await activity.getByRole("button",{name:"Reset machines",exact:true}).click();
  await expect(activity.getByLabel("Machine task",{exact:true})).toHaveValue("compose");
  await activity.getByLabel("Predicted first-stage output",{exact:true}).fill("4");
  await activity.getByLabel("Predicted final output",{exact:true}).fill("11");
  const check=activity.getByRole("button",{name:"Trace function machines",exact:true});await check.focus();await check.press("Enter");
  await expect(status).toContainText("Both stage predictions are correct");
  const flow=activity.locator(".notice").last();
  await flow.evaluate(element=>element.scrollIntoView({block:"center"}));
  await flow.screenshot({path:testInfo.outputPath("composition-mobile.png")});
  await page.getByRole("button",{name:"Start practice",exact:true}).click();
  await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 25");
  await page.locator("#practice").getByLabel("f after g",{exact:true}).fill("7/2");
  await page.reload();
  await expect(page.locator("#practice").getByLabel("f after g",{exact:true})).toHaveValue("7/2");
});

test("composition checkpoints restore formulas, inverse domains, and proof choices",async({page},testInfo)=>{
  const lesson=lessonSchema.parse(JSON.parse(await readFile(new URL("../../content/lessons/mth-215/m02-l03.json",import.meta.url),"utf8")));
  const attempt=createAttempt(lesson,"checkpoint","composition-browser-fixture");
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  await restoreProgress(page,data);
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  for(let index=0;index<attempt.questions.length;index++){
    for(const field of attempt.questions[index].fields){
      if(field.kind==="choice")await page.locator("#practice").getByRole("group",{name:field.label,exact:true}).locator('input[value="'+field.correct+'"]').check();
      else{
        const answer=field.kind==="intervals"?formatIntervals(field.expected):field.kind==="roots"?field.expected.join(",")||"empty":String(field.expected);
        await page.locator("#practice").getByLabel(field.label+(field.unit?" ("+field.unit+")":""),{exact:true}).fill(answer);
      }
    }
    await page.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");
  const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const file=testInfo.outputPath("composition-progress.json");await(await download).saveAs(file);
  const backup=JSON.parse(await readFile(file,"utf8"));
  expect(backup.learning.attempts[0].questions[3].fields).toEqual(attempt.questions[3].fields);
  expect(backup.learning.evidence).toHaveLength(1);
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();
  await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await page.getByLabel("Import a progress backup",{exact:true}).setInputFiles(file);
  await page.getByRole("button",{name:"Replace with this backup",exact:true}).click();
  await expect(page.getByText(/^Backup restored\./)).toBeVisible();
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.getByText("Question 4: Correct",{exact:true}).click();
  const restored=page.locator("#practice .result-item").filter({has:page.getByText("Question 4: Correct",{exact:true})});
  await expect(restored).toContainText("Inverse domain");
  await expect(restored).toContainText("Inverse range");
  await expect(restored).toContainText("Root step in the reverse composition");
});
