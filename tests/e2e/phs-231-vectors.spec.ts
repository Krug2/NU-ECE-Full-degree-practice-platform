import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const route="/courses/phs-231/lessons/m01-l02";

test("vector products retain their order, units, and full 3D meaning with keyboard controls",async({page},testInfo)=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/courses/phs-231/lessons/m01-l01");
  await page.getByRole("link",{name:"Next: Vectors in a right-handed coordinate system",exact:true}).click();
  const guided=page.locator("#guided");
  for(const [label,value] of [["A dot B","-3"],["Cross product x component","4"],["Cross product y component","8"],["Cross product z component","-6"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByLabel("Both products reverse sign",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("The dot product is commutative");
  for(const [label,value] of [["Cross product x component","-4"],["Cross product y component","-8"],["Cross product z component","6"]])await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByLabel("The dot product stays the same; the cross product reverses sign",{exact:true}).check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();
  await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  const lab=page.locator("#investigate"),check=lab.getByRole("button",{name:"Check vector predictions",exact:true});
  const predict=async(values:string[])=>{for(const [i,label] of ["Predicted A dot B","Predicted cross x","Predicted cross y","Predicted cross z"].entries())await lab.getByLabel(label,{exact:true}).fill(values[i]);await check.focus();await check.press("Enter");};
  await predict(["-2","8","-6","11"]);
  await expect(lab.getByRole("status")).toContainText("all cross-product components are correct");
  await expect(lab.getByRole("row",{name:/A cross B/})).toContainText("14.866069");
  await lab.getByRole("button",{name:"Swap A and B",exact:true}).click();
  await check.click();
  await expect(lab.getByRole("status")).toContainText("Revisit cross x, cross y, cross z");
  await predict(["-2","-8","6","-11"]);
  await expect(lab.getByRole("status")).toContainText("all cross-product components are correct");
  for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const){
    await page.setViewportSize(viewport);await page.emulateMedia({reducedMotion:"reduce"});
    const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();
    expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await lab.screenshot({path:testInfo.outputPath(`vectors-${name}.png`)});
    await check.focus();await page.screenshot({path:testInfo.outputPath(`vectors-${name}-viewport.png`)});
  }
  for(const [label,value] of [["A x","0"],["A y","0"],["A z","5"],["B x","0"],["B y","0"],["B z","0"]])await lab.getByLabel(label,{exact:true}).fill(value);
  await predict(["0","0","0","0"]);
  await expect(lab.getByRole("row",{name:/^A 0 0 5/})).toContainText("5.000000");
  await expect(lab).toContainText("undefined because B is zero");
  await expect(lab.getByRole("img")).toHaveAccessibleName(/A \(0, 0, 5\)/);
  await lab.getByLabel("A z",{exact:true}).focus();await lab.getByLabel("A z",{exact:true}).press("ArrowUp");
  await expect(lab.getByLabel("A z",{exact:true})).toHaveValue("6");
  await expect(lab.getByRole("table")).toHaveCount(0);
  await lab.getByLabel("A x",{exact:true}).fill("");await check.click();
  await expect(lab.getByRole("status")).toContainText("Empty inputs are not zero");
  expect(errors).toEqual([]);
});

test("vector practice preserves exact radical drafts, position, and question snapshots on reload",async({page})=>{
  await page.goto(route);await page.getByRole("button",{name:"Start practice",exact:true}).click();
  const practice=page.locator("#practice");
  await practice.getByLabel("x component (m)",{exact:true}).fill("-sqrt(2)/2");
  await practice.getByRole("button",{name:"Show a hint (0/3)",exact:true}).click();
  const prompt=await practice.locator(".question-prompt").textContent();
  await page.reload();
  await expect(practice.getByLabel("x component (m)",{exact:true})).toHaveValue("-sqrt(2)/2");
  expect(await practice.locator(".question-prompt").textContent()).toBe(prompt);
  await expect(practice.getByRole("button",{name:"Show a hint (1/3)",exact:true})).toBeVisible();
  await practice.getByRole("button",{name:"Next question",exact:true}).click();await page.reload();
  await expect(practice.locator(".attempt-meta")).toContainText("Question 2 of 9");
});
