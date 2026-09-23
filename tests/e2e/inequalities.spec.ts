import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const route="/courses/mth-215/lessons/m01-l01";

test("inequality lessons check endpoints and reveal accessible distance models",async({page})=>{
  await page.goto(route);
  await page.getByRole("link",{name:"Next: Inequalities and absolute value",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Inequalities and absolute value",exact:true})).toBeVisible();
  await page.locator("#guided").getByLabel("Solution set",{exact:true}).fill("(-inf, -6) U (2, inf)");
  await page.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(page.locator("#guided .answer-feedback")).toContainText("Correct. You have checked every part.");
  await page.getByLabel("Predict the solution set",{exact:true}).fill("(2, 8)");
  await page.getByRole("button",{name:"Check prediction and reveal graph",exact:true}).click();
  await expect(page.locator("#investigate [role=status]")).toContainText("Compare your prediction");
  await page.getByLabel("Predict the solution set",{exact:true}).fill("[2, 8]");
  await page.getByRole("button",{name:"Check prediction and reveal graph",exact:true}).click();
  await expect(page.locator("#investigate [role=status]")).toContainText("correct");
  await page.getByLabel("Radius or distance threshold",{exact:true}).fill("-1");
  await page.getByLabel("Predict the solution set",{exact:true}).fill("empty");
  await page.getByRole("button",{name:"Check prediction and reveal graph",exact:true}).click();
  await expect(page.locator("figcaption")).toContainText("No real input");
  await page.getByLabel("Comparison",{exact:true}).selectOption("gt");
  await page.getByLabel("Predict the solution set",{exact:true}).fill("R");
  await page.getByRole("button",{name:"Check prediction and reveal graph",exact:true}).click();
  await expect(page.locator("figcaption")).toContainText("(-inf, inf)");
  await page.getByRole("button",{name:"Start practice",exact:true}).click();
  await page.locator("#practice").getByLabel("Solution set",{exact:true}).fill("[0, inf)");
  await page.reload();
  await expect(page.locator("#practice").getByLabel("Solution set",{exact:true})).toHaveValue("[0, inf)");
  await accessible(page);
  await page.setViewportSize({width:390,height:844});await accessible(page);
});

async function accessible(page:Page){
  const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
  expect(result.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
}
