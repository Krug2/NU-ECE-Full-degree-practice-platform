import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("power refreshers preserve principal signs and exact radicals",async({page})=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/courses/mth-215/lessons/b01");
  await page.getByRole("link",{name:"Next: Powers, roots, and scientific notation",exact:true}).click();
  await page.getByLabel("Value of five to the negative second power",{exact:true}).fill("1/25");
  await page.getByLabel("Principal square root of negative seven squared",{exact:true}).fill("7");
  await page.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(page.locator("#guided .answer-feedback")).toContainText("Correct. You have checked every part.");
  const predict=page.getByLabel("Predicted exact value",{exact:true});
  const check=page.getByRole("button",{name:"Check arithmetic prediction",exact:true});
  await predict.fill("-4");await check.click();
  await expect(page.locator("#investigate [role=status]")).toContainText("Compare your prediction");
  await predict.fill("4");await check.click();
  await expect(page.locator("#investigate [role=status]")).toContainText("is correct");
  await page.getByLabel("Starting example",{exact:true}).selectOption({label:"Extract a perfect-square factor"});
  await predict.fill("8.944272");await check.click();
  await expect(page.locator("#investigate [role=status]")).toContainText("Compare your prediction");
  await predict.fill("4sqrt(5)");await check.click();
  await expect(page.locator("#investigate [role=status]")).toContainText("is correct");
  await expect(page.locator("#investigate .notice")).toContainText("Exact input notation: 4*sqrt(5)");
  await page.getByLabel("Arithmetic expression",{exact:true}).fill("0");await predict.fill("0");await check.click();
  await expect(page.locator("#investigate .notice")).toContainText("Exact input notation: 0");
  await page.getByRole("button",{name:"Start practice",exact:true}).click();
  await page.locator("#practice").getByLabel("Exponent on the single power",{exact:true}).fill("3");
  await page.reload();
  await expect(page.locator("#practice").getByLabel("Exponent on the single power",{exact:true})).toHaveValue("3");
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(result.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});
