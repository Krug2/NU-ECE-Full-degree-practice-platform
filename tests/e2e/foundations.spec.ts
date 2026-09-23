import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readdir } from "node:fs/promises";

test("optional number refreshers preserve exact work and support keyboard exploration",async({page})=>{
  await page.goto("/courses/mth-215");
  const coreCount=(await readdir(new URL("../../content/lessons/mth-215/",import.meta.url))).filter(name=>/^m\d{2}-l\d{2}\.json$/.test(name)).length;
  await expect(page.getByText(`${coreCount} of 40 planned lessons are available.`,{exact:false})).toBeVisible();
  await page.getByRole("link",{name:"Signed numbers, fractions, and notation",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Signed numbers, fractions, and notation",exact:true})).toBeVisible();
  await page.getByLabel("First numerator over 12",{exact:true}).fill("-8");
  await page.getByLabel("Exact sum",{exact:true}).fill("-1/4");
  await page.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(page.locator("#guided .answer-feedback")).toContainText("Correct. You have checked every part.");
  await page.getByLabel("Predicted exact value",{exact:true}).fill("-1");
  await page.getByLabel("Predicted exact value",{exact:true}).press("Tab");
  await expect(page.getByRole("button",{name:"Check arithmetic prediction",exact:true})).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#investigate [role=status]")).toContainText("is correct");
  await page.getByLabel("Arithmetic expression",{exact:true}).fill("(-3)^2+4*2");
  await page.getByLabel("Predicted exact value",{exact:true}).fill("17");
  await page.getByRole("button",{name:"Check arithmetic prediction",exact:true}).click();
  await expect(page.locator("#investigate [role=status]")).toContainText("is correct");
  await page.getByLabel("Arithmetic expression",{exact:true}).fill("1/0");
  await page.getByRole("button",{name:"Check arithmetic prediction",exact:true}).click();
  await expect(page.locator("#investigate [role=status]")).toContainText("Division by zero");
  await page.getByRole("button",{name:"Reset expression",exact:true}).click();
  await expect(page.getByLabel("Arithmetic expression",{exact:true})).toHaveValue("-3^2+4*2");
  await page.getByRole("button",{name:"Start practice",exact:true}).click();
  await page.locator("#practice").getByLabel("Exact value",{exact:true}).fill("-11/36");
  await page.reload();
  await expect(page.locator("#practice").getByLabel("Exact value",{exact:true})).toHaveValue("-11/36");
  await page.goto("/courses/mth-215");
  await page.getByRole("link",{name:"Resume lesson: Signed numbers, fractions, and notation",exact:true}).click();
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    await page.setViewportSize(viewport);
    const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(result.violations.map(item=>({id:item.id,nodes:item.nodes.map(node=>node.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  const next=page.getByRole("navigation",{name:"Adjacent lessons",exact:true}).getByRole("link",{name:/^Next:/});
  const nextRoute=await next.getAttribute("href");
  await next.click();
  await expect(page).toHaveURL(new RegExp(`${nextRoute}$`));
  await expect(page.getByRole("heading",{level:1})).toBeVisible();
});
