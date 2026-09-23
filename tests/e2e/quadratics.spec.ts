import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { createAttempt } from "../../lib/learning/attempts";
import { lessonSchema } from "../../lib/learning/contracts";

const route="/courses/mth-215/lessons/m01-l03";
test("quadratics keep both roots and distinguish complex roots from real intercepts",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/courses/mth-215/lessons/m01-l02");
  await page.getByRole("link",{name:"Next: Quadratics and complex roots",exact:true}).click();
  await page.locator("#guided").getByLabel("Distinct roots",{exact:true}).fill("2+sqrt(3)");
  await page.locator("#guided").getByLabel("Discriminant",{exact:true}).fill("12");
  await page.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(page.locator("#guided .answer-feedback")).toContainText("Review this reasoning");
  await page.locator("#guided").getByLabel("Distinct roots",{exact:true}).fill("2-sqrt(3),2+sqrt(12)/2");
  await page.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(page.locator("#guided .answer-feedback")).toContainText("Correct. You have checked every part.");
  const roots=page.getByLabel("Predict all distinct complex roots",{exact:true});
  const count=page.getByLabel("Predict distinct real x-intercepts",{exact:true});
  const reveal=page.getByRole("button",{name:"Check roots and reveal parabola",exact:true});
  await roots.fill("1+sqrt(2),1-sqrt(2)");await count.selectOption("2");await reveal.click();
  await expect(page.locator("#investigate [role=status]")).toContainText("are correct");
  const slider=page.getByRole("slider",{name:/Squared-distance value k/});
  await slider.focus();await slider.press("ArrowLeft");await slider.press("ArrowLeft");
  await roots.fill("1");await count.selectOption("1");await reveal.click();
  await expect(page.locator("figcaption")).toContainText("multiplicity two");
  await slider.focus();await slider.press("ArrowLeft");await slider.press("ArrowLeft");
  await roots.fill("1+i*sqrt(2),1-i*sqrt(2)");await count.selectOption("0");await reveal.click();
  await expect(page.locator("#investigate [role=status]")).toContainText("are correct");
  await expect(page.locator("figcaption")).toContainText("do not appear on a real x-axis");
  await page.getByLabel("Vertical scale a",{exact:true}).selectOption("-1");await reveal.click();
  await expect(page.locator("#investigate [role=status]")).toContainText("are correct");
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(result.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.locator("#investigate").screenshot({path:testInfo.outputPath("parabola-mobile.png")});
  await page.getByRole("button",{name:"Start practice",exact:true}).click();
  await expect(page.locator(".attempt-meta")).toContainText("Question 1 of 8");
  await page.locator("#practice").getByLabel("Distinct roots",{exact:true}).fill("3/2,-2");
  await page.reload();
  await expect(page.locator("#practice").getByLabel("Distinct roots",{exact:true})).toHaveValue("3/2,-2");
  expect(errors).toEqual([]);
});

test("quadratic checkpoints grade complete exact root sets",async({page})=>{
  const lesson=lessonSchema.parse(JSON.parse(await readFile(new URL("../../content/lessons/mth-215/m01-l03.json",import.meta.url),"utf8")));
  const attempt=createAttempt(lesson,"checkpoint","quadratic-browser-fixture");
  const data={schemaVersion:2,profile:{displayName:"",weeklyHours:5},plan:[],bookmarks:[],notes:{},confidence:{},sessions:[],learning:{attempts:[attempt],evidence:[],notes:{}}};
  await page.goto("/");await page.evaluate(data=>localStorage.setItem("ece-study:progress:v1",JSON.stringify(data)),data);
  await page.goto(route);await page.getByRole("button",{name:"Checkpoint",exact:true}).click();
  for(let index=0;index<attempt.questions.length;index++){
    for(const field of attempt.questions[index].fields){
      if(field.kind==="choice")await page.locator("#practice").locator(`input[value="${field.correct}"]`).check();
      else await page.locator("#practice").getByLabel(field.label,{exact:true}).fill(field.kind==="roots"?field.expected.join(","):String(field.expected));
    }
    await page.getByRole("button",{name:index===3?"Submit checkpoint":"Next question",exact:true}).click();
  }
  await expect(page.getByRole("heading",{name:"Objective demonstrated",exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByText("Objective demonstrated",{exact:true})).toBeVisible();
});
