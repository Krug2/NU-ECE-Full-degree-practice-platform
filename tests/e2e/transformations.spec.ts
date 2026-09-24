import { restoreProgress } from "./progress";
import { expect, test, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { formatIntervals } from "../../lib/learning/intervals";

const route="/courses/mth-215/lessons/m02-l02";
async function predict(activity:Locator,points:string[][]){
  for(let index=0;index<points.length;index++){
    await activity.getByLabel("Anchor "+"ABC"[index]+" new input",{exact:true}).fill(points[index][0]);
    await activity.getByLabel("Anchor "+"ABC"[index]+" new output",{exact:true}).fill(points[index][1]);
  }
}
test("transformations reveal predicted points and preserve sets when the window changes",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/courses/mth-215/lessons/m02-l01");
  await page.getByRole("link",{name:"Next: Transformations and graph features",exact:true}).click();
  const guided=page.locator("#guided"),activity=page.locator("#investigate"),check=activity.getByRole("button",{name:"Check transformed points",exact:true});
  await guided.getByLabel("Mapped input",{exact:true}).fill("-10/2");
  await guided.getByLabel("Mapped output",{exact:true}).fill("3");
  await guided.getByLabel("Complete domain",{exact:true}).fill("(-inf,3]");
  await guided.getByLabel("Complete range",{exact:true}).fill("[-1,inf)");
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await expect(activity.locator(".transformed-figure")).toHaveCount(0);
  await check.click();await expect(activity.locator("[role=status]")).toContainText("both coordinates for all three anchors");
  await predict(activity,[["3","-1"],["5/2","1"],["1","3"]]);await check.click();
  await expect(activity.locator("[role=status]")).toContainText("1 of 3");
  await predict(activity,[["3","-1"],["1","1"],["-5","3"]]);await check.focus();await check.press("Enter");
  await expect(activity.locator("[role=status]")).toContainText("All three anchors are mapped correctly");
  await expect(activity.locator(".notice")).toContainText("Domain of g: (-inf, 3]");
  await expect(activity.locator(".notice")).toContainText("Range of g: [-1, inf)");
  await expect(activity.locator("[data-anchor=A]")).toHaveAttribute("cx","260");
  await expect(activity.locator("[data-anchor=A]")).toHaveAttribute("cy","180");
  await activity.getByLabel("Graph window",{exact:true}).selectOption("6");
  await expect(activity.locator("[data-anchor=A]")).toHaveAttribute("cx","300");
  await expect(activity.locator("[data-anchor=A]")).toHaveAttribute("cy","190");
  await expect(activity.locator(".notice")).toContainText("Domain of g: (-inf, 3]");
  await expect(activity.getByRole("row",{name:"C -5 3",exact:true})).toBeVisible();
  await activity.getByText("Read the transformed graph as text",{exact:true}).click();
  await expect(activity.locator("details")).toContainText("included endpoint is (3, -1)");
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(result.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const fieldSize=await activity.getByLabel("Anchor A new input",{exact:true}).boundingBox();
    expect(fieldSize?.height).toBeGreaterThanOrEqual(40);
  }
  const graph=activity.locator(".transformed-figure > svg");
  const anchor=activity.locator(".anchor-prediction").first();
  await anchor.evaluate(element=>element.scrollIntoView({block:"center"}));
  await anchor.screenshot({path:testInfo.outputPath("transformation-inputs.png")});
  await graph.evaluate(element=>element.scrollIntoView({block:"center"}));
  await graph.screenshot({path:testInfo.outputPath("transformation-mobile.png")});
  const description=activity.locator(".transformed-figure details");
  await description.evaluate(element=>element.scrollIntoView({block:"center"}));
  await description.screenshot({path:testInfo.outputPath("transformation-description.png")});
  await activity.getByLabel("Parent function",{exact:true}).selectOption("reciprocal");
  await expect(activity.locator(".transformed-figure")).toHaveCount(0);
  await predict(activity,[["5","-3"],["1","1"],["-1","0"]]);await check.click();
  await expect(activity.locator("[role=status]")).toContainText("All three anchors");
  await expect(activity.locator("[data-curve=transformed]")).toHaveCount(2);
  await expect(activity.locator("[data-asymptote=vertical]")).toHaveAttribute("x1","300");
  await expect(activity.locator(".notice")).toContainText("(-inf, 3) U (3, inf)");
  await activity.getByLabel("Inside multiplier b",{exact:true}).fill("0");await check.click();
  await expect(activity.locator("[role=status]")).toContainText("nonzero scale");
  await expect(activity.locator(".transformed-figure")).toHaveCount(0);
  await activity.getByRole("button",{name:"Reset transformation",exact:true}).click();
  await expect(activity.getByLabel("Parent function",{exact:true})).toHaveValue("sqrt");
  await expect(activity.getByLabel("Inside multiplier b",{exact:true})).toHaveValue("-1/2");
  await expect(activity.getByLabel("Anchor A new input",{exact:true})).toHaveValue("");
  await page.getByRole("button",{name:"Start practice",exact:true}).click();
  await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 18");
  await page.locator("#practice").getByLabel("Transformed input",{exact:true}).fill("7/2");
  await page.reload();
  await expect(page.locator("#practice").getByLabel("Transformed input",{exact:true})).toHaveValue("7/2");
  expect(errors).toEqual([]);
});

test("transformation checkpoint graphs and exact answer sets survive backup restoration",async({page},testInfo)=>{
  const lesson=lessonSchema.parse(JSON.parse(await readFile(new URL("../../content/lessons/mth-215/m02-l02.json",import.meta.url),"utf8")));
  const attempt=createAttempt(lesson,"checkpoint","transformation-browser-fixture");
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
  const file=testInfo.outputPath("transformation-progress.json");await(await download).saveAs(file);
  const backup=JSON.parse(await readFile(file,"utf8"));
  expect(backup.learning.attempts[0].questions[2].figure).toEqual(attempt.questions[2].figure);
  expect(backup.learning.attempts[0].questions[3].figure).toEqual(attempt.questions[3].figure);
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();
  await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await page.getByLabel("Import a progress backup",{exact:true}).setInputFiles(file);
  await page.getByRole("button",{name:"Replace with this backup",exact:true}).click();
  await expect(page.getByText(/^Backup restored\./)).toBeVisible();
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.getByText("Question 3: Correct",{exact:true}).click();
  await expect(page.locator("#practice .transformed-figure").first()).toContainText("A transformed parent function");
  await expect(page.locator("#practice .result-item").filter({has:page.getByText("Question 3: Correct",{exact:true})}).locator("[data-anchor]")).toHaveCount(3);
  await page.getByText("Question 4: Correct",{exact:true}).click();
  await expect(page.locator("#practice .result-item").filter({has:page.getByText("Question 4: Correct",{exact:true})}).locator("[data-anchor]")).toHaveCount(3);
});
