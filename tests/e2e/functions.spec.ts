import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";
import { formatIntervals } from "../../lib/learning/intervals";

const route="/courses/mth-215/lessons/m02-l01";
test("function boundaries distinguish an assigned zero from missing output",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/courses/mth-215/lessons/m01-l04");
  await page.getByRole("link",{name:"Next: Function notation, domains, and piecewise rules",exact:true}).click();
  const guided=page.locator("#guided"), activity=page.locator("#investigate");
  await expect(guided.locator(".answer-fields [data-endpoint=left-upper]")).toHaveAttribute("data-included","false");
  await expect(guided.locator(".answer-fields [data-endpoint=right-lower]")).toHaveAttribute("data-included","true");
  await guided.getByRole("group",{name:"Branch at x = 0",exact:true}).getByLabel("Higher-input branch",{exact:true}).check();
  await page.getByLabel("Sensor output f(0) (V)",{exact:true}).fill("1");
  await page.getByLabel("Sensor domain",{exact:true}).fill("[-4,4]");
  await page.getByLabel("Sensor range",{exact:true}).fill("[-2,3]");
  await page.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");

  const input=page.getByLabel("Input x",{exact:true}), prediction=page.getByLabel("Predicted output",{exact:true}), branch=page.getByLabel("Predicted branch",{exact:true}), check=page.getByRole("button",{name:"Trace the input",exact:true});
  await branch.selectOption("left");await prediction.fill("2");await check.click();
  await expect(activity.locator("[role=status]")).toContainText("Check which interval includes");
  await branch.selectOption("right");await prediction.fill("1");await check.focus();await check.press("Enter");
  await expect(activity.locator("[role=status]")).toContainText("Both predictions are correct");
  await expect(activity.locator("[data-selected-point]")).toHaveAttribute("cx","220");
  await expect(activity.locator("[data-selected-point]")).toHaveAttribute("cy","140");
  await page.getByRole("button",{name:"Below the boundary",exact:true}).click();
  await expect(input).toHaveValue("-1/2");await branch.selectOption("left");await prediction.fill("3/2");await check.click();
  await expect(activity.locator("[role=status]")).toContainText("Both predictions are correct");
  await page.getByRole("button",{name:"Above the boundary",exact:true}).click();
  await expect(input).toHaveValue("1/2");await branch.selectOption("right");await prediction.fill("5/4");await check.click();
  await expect(activity.locator("[role=status]")).toContainText("Both predictions are correct");
  await page.getByLabel("Sensor rule",{exact:true}).selectOption("1");
  await page.getByRole("button",{name:"At the boundary",exact:true}).click();
  await branch.selectOption("missing");await prediction.fill("0");await check.click();
  await expect(activity.locator("[role=status]")).toContainText("difference between undefined and zero");
  await prediction.fill("undefined");await check.click();
  await expect(activity.locator("[role=status]")).toContainText("Both predictions are correct");
  await expect(activity.locator("[data-selected-point]")).toHaveCount(0);
  await expect(activity.locator(".notice")).toContainText("No plotted output point exists");
  await input.fill("-2");await branch.selectOption("left");await prediction.fill("0");await check.click();
  await expect(activity.locator("[role=status]")).toContainText("Both predictions are correct");
  await expect(activity.locator("[data-selected-point]")).toHaveAttribute("cy","170");
  await input.fill("6");await branch.selectOption("missing");await prediction.fill("undefined");await check.click();
  await expect(activity.locator("[role=status]")).toContainText("Both predictions are correct");
  await input.fill("1/0");await check.click();
  await expect(activity.locator("[role=status]")).toContainText("Division by zero");
  await page.getByRole("button",{name:"Reset function investigation",exact:true}).click();
  await expect(input).toHaveValue("0");
  await activity.getByText("Read the function graph as text",{exact:true}).click();
  await expect(activity.locator("details")).toContainText("upper endpoint is excluded");
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(result.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await activity.locator(".piecewise-figure").screenshot({path:testInfo.outputPath("function-mobile.png")});
  await page.getByRole("button",{name:"Start practice",exact:true}).click();
  await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 17");
  await page.locator("#practice").getByLabel("Domain",{exact:true}).fill("-2, 0, 3");
  await page.reload();
  await expect(page.locator("#practice").getByLabel("Domain",{exact:true})).toHaveValue("-2, 0, 3");
  expect(errors).toEqual([]);
});

test("function checkpoints preserve sets, branch graphs, and evidence through backup restoration",async({page},testInfo)=>{
  const lesson=lessonSchema.parse(JSON.parse(await readFile(new URL("../../content/lessons/mth-215/m02-l01.json",import.meta.url),"utf8")));
  const attempt=createAttempt(lesson,"checkpoint","function-browser-fixture");
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  await page.goto("/");await page.evaluate(data=>localStorage.setItem("ece-study:progress:v1",JSON.stringify(data)),data);
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  for(let index=0;index<attempt.questions.length;index++){
    for(const field of attempt.questions[index].fields){
      if(field.kind==="choice") await page.locator("#practice").getByRole("group",{name:field.label,exact:true}).locator('input[value="'+field.correct+'"]').check();
      else{
        const answer=field.kind==="intervals"?formatIntervals(field.expected):field.kind==="roots"?field.expected.join(","):String(field.expected);
        await page.locator("#practice").getByLabel(field.label+(field.unit?" ("+field.unit+")":""),{exact:true}).fill(answer);
      }
    }
    await page.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.goto("/settings");
  const download=page.waitForEvent("download");await page.getByRole("button",{name:"Export progress",exact:true}).click();
  const file=testInfo.outputPath("function-progress.json");await(await download).saveAs(file);
  const backup=JSON.parse(await readFile(file,"utf8"));
  expect(backup.learning.attempts[0].questions[3].figure).toEqual(attempt.questions[3].figure);
  await page.getByRole("button",{name:"Reset local progress",exact:true}).click();
  await page.getByRole("button",{name:"Confirm reset",exact:true}).click();
  await page.getByLabel("Import a progress backup",{exact:true}).setInputFiles(file);
  await page.getByRole("button",{name:"Replace with this backup",exact:true}).click();
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.getByText("Question 4: Correct",{exact:true}).click();
  await expect(page.locator("#practice .piecewise-figure")).toContainText("A bounded piecewise function");
  await expect(page.locator("#practice .piecewise-figure [data-endpoint]")).toHaveCount(4);
});
