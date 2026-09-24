import { expect,test,type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

const route="/courses/phs-231/lessons/m09-l02";
const predict=async(lab:Locator,values:string[],decision="outside")=>{
  for(const [i,value]of values.entries())await lab.locator(`#phs231-validation-prediction-${i}`).fill(value);
  await lab.getByLabel("Predicted closed-bound decision",{exact:true}).selectOption(decision);
  const button=lab.getByRole("button",{name:"Check and reveal comparison",exact:true});await button.focus();await button.press("Enter");
};
const initial=["-.16","-.12","-.02"];
const status=(lab:Locator)=>lab.getByRole("status",{name:"Validation comparison status",exact:true});
const selected=(lab:Locator)=>lab.getByRole("region",{name:"Selected force comparison",exact:true});
const value=(region:Locator,name:string)=>region.getByRole("row").filter({has:region.page().getByRole("rowheader",{name,exact:true})}).getByRole("cell").first();
const preset=async(lab:Locator,name:string)=>{
  const details=lab.locator("details").filter({has:lab.page().getByText("Load controlled comparison cases",{exact:true})});
  if(!await details.evaluate(el=>(el as HTMLDetailsElement).open))await details.locator("summary").click();
  await lab.getByRole("button",{name,exact:true}).click();
};
for(const [name,viewport]of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const)test(`validation ${name} complete lesson and notebook pass accessibility`,async({page})=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));await page.setViewportSize(viewport);await page.goto(route);
  const lab=page.locator("#investigate");await predict(lab,initial);await expect(status(lab)).toContainText("All four predictions agree");
  await lab.getByText("Complete force comparison table",{exact:true}).click();await lab.getByRole("button",{name:"Start project notebook",exact:true}).click();
  await expect(page.locator("#project-notebook").getByRole("status")).toContainText("A fresh notebook is saved");
  const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
for(const [name,viewport]of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]] as const)test(`validation ${name} plots keyboard tables and reload remain meaningful`,async({page},info)=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));await page.setViewportSize(viewport);await page.goto(route);const lab=page.locator("#investigate");await predict(lab,initial);
  for(const [i,kind]of ["outputs","residuals"].entries()){await lab.getByRole("img").nth(i).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`validation-${name}-${kind}.png`)});}
  const slider=lab.getByLabel("Imposed force state",{exact:true});await slider.focus();await slider.press("Home");await expect(value(selected(lab),"Observed sensor output")).toHaveText("0.04");
  await slider.press("ArrowRight");await expect(value(selected(lab),"Position")).toHaveText("-0.04");await expect(value(selected(lab),"Candidate physical force")).toHaveText("0.32");
  await slider.press("End");await expect(value(selected(lab),"Position")).toHaveText("0.01");await expect(selected(lab).getByRole("caption")).toContainText("State 14");
  await lab.getByText("Complete force comparison table",{exact:true}).click();const table=lab.getByRole("region",{name:"Complete force comparison table",exact:true});await expect(table.getByRole("row")).toHaveCount(15);
  await table.focus();await table.press("ArrowRight");await expect.poll(()=>table.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
  await table.press("ArrowDown");await expect.poll(()=>table.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);await page.screenshot({path:info.outputPath(`validation-${name}-table.png`)});
  await page.reload();await expect(lab.getByRole("region",{name:"Selected force comparison",exact:true})).toHaveCount(0);await expect(lab.locator("#phs231-validation-prediction-0")).toHaveValue("");
  expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test("validation candidates separate static calibration omitted drag and nonlinear held-out failure",async({page},info)=>{
  await page.goto(route);const lab=page.locator("#investigate");await predict(lab,initial);
  await expect(value(selected(lab),"Observed minus predicted residual")).toHaveText("-0.02");await expect(value(selected(lab),"Closed-bound decision")).toHaveText("Outside the bound");
  await preset(lab,"Calibrated linear candidate");await predict(lab,["-.18","-.14","0"],"compatible");await expect(status(lab)).toContainText("All four predictions agree");await expect(lab.getByTestId("validation-summary")).toContainText("Compatible held-out rows: 9 / 9");
  await preset(lab,"No-drag record");await predict(lab,["-.16","-.12","0"],"compatible");await expect(status(lab)).toContainText("All four predictions agree");
  await preset(lab,"Static fit to nonlinear record");await predict(lab,["-.195","-.155",".015"]);await expect(status(lab)).toContainText("All four predictions agree");await expect(lab.getByTestId("validation-summary")).toContainText("Compatible calibration rows: 5 / 5");
  await lab.getByLabel("Imposed force state",{exact:true}).fill("9");await expect(value(selected(lab),"Observed minus predicted residual")).toHaveText("-0.2");
  const download=page.waitForEvent("download");await lab.getByRole("button",{name:"Download force comparison CSV",exact:true}).click();const path=info.outputPath("nonlinear.csv");await(await download).saveAs(path);const csv=await readFile(path,"utf8");
  expect(csv).toContain("not physical observations or a time trajectory");expect(csv).toContain('"generating_cubic_N_per_m3",500');expect(csv).toContain('"candidate_spring_N_per_m",8.75');
  const lines=csv.trim().split(/\r?\n/),header=lines.findIndex(line=>line.startsWith("state,role,")),rows=lines.slice(header+1).map(line=>line.split(","));expect(rows).toHaveLength(14);
  for(const row of rows){
    const x=Number(row[2]),v=Number(row[3]),truth=-8*x-.2*v-500*x**3+.04,observed=Math.round(truth*100)/100,predicted=-8.75*x-.2*v+.04;
    expect(Number(row[4])).toBeCloseTo(observed,12);expect(Number(row[6])).toBeCloseTo(predicted,12);expect(Number(row[8])).toBeCloseTo(observed-predicted,12);
    expect(row[1]).toBe(rows.indexOf(row)<5?'"calibration"':'"validation"');expect(row[14]).toBe(String(Math.abs(observed-predicted)<=.005+1e-12));
  }
});
test("validation drift and closed-bound endpoints retain the meaning of corrections and allowances",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate");await preset(lab,"Keep old zero after drift");await predict(lab,["-.18","-.14",".03"]);
  await expect(status(lab)).toContainText("All four predictions agree");await expect(lab.getByTestId("validation-summary")).toContainText("Compatible calibration rows: 5 / 5");await expect(lab.getByTestId("validation-summary")).toContainText("Compatible held-out rows: 0 / 9");
  await lab.getByLabel("Candidate sensor zero (N)",{exact:true}).fill(".07");await predict(lab,["-.18","-.11","0"],"compatible");await expect(lab.getByTestId("validation-summary")).toContainText("Compatible calibration rows: 0 / 5");await expect(lab.getByTestId("validation-summary")).toContainText("Compatible held-out rows: 9 / 9");
  await preset(lab,"Calibrated linear candidate");await lab.getByLabel("Candidate sensor zero (N)",{exact:true}).fill(".045");await predict(lab,["-.18","-.135","-.005"],"compatible");await expect(value(selected(lab),"Closed-bound decision")).toHaveText("Compatible at the bound endpoint");
  await lab.getByLabel("Candidate sensor zero (N)",{exact:true}).fill(".046");await predict(lab,["-.18","-.134","-.006"]);await expect(value(selected(lab),"Closed-bound decision")).toHaveText("Outside the bound");
  await lab.getByLabel("Declared additional comparison bound (N)",{exact:true}).fill(".001");await predict(lab,["-.18","-.134","-.006"],"compatible");await expect(value(selected(lab),"Closed-bound decision")).toHaveText("Compatible at the bound endpoint");await expect(lab.getByText(/The extra 0.001 N is your declared allowance/)).toBeVisible();
});
test("validation rejects invalid inputs and provides actionable feedback without stale results",async({page})=>{
  await page.goto(route);const lab=page.locator("#investigate");await predict(lab,["0","0","0"],"compatible");await expect(status(lab)).toContainText("First compute -k*x-b*v");await expect(selected(lab)).toBeVisible();
  await lab.getByLabel("Candidate stiffness (N/m)",{exact:true}).fill("");await lab.getByRole("button",{name:"Check and reveal comparison",exact:true}).click();await expect(status(lab)).toContainText("An empty value is not zero");await expect(selected(lab)).toHaveCount(0);
  await lab.getByLabel("Candidate stiffness (N/m)",{exact:true}).fill("31");await lab.getByRole("button",{name:"Check and reveal comparison",exact:true}).click();await expect(status(lab)).toContainText("within the printed ranges");
  await lab.getByRole("button",{name:"Reset validation investigation",exact:true}).click();
  for(const invalid of ["sqrt(-1)","Infinity","1/0"]){await predict(lab,[invalid,"-.12","-.02"]);await expect(selected(lab)).toHaveCount(0);await expect(status(lab)).not.toContainText("All four");}
  await predict(lab,["-16e-2","-3/25","-1/50"]);await expect(status(lab)).toContainText("All four predictions agree");
  await lab.getByLabel("Declared additional comparison bound (N)",{exact:true}).fill("-.001");await lab.getByRole("button",{name:"Check and reveal comparison",exact:true}).click();await expect(selected(lab)).toHaveCount(0);await expect(status(lab)).toContainText("cannot be negative");
});
test("validation guided work distinguishes inferred damping from the deliberately incomplete candidate",async({page})=>{
  await page.goto(route);const guided=page.locator("#guided");
  const answers=[["Calibrated sensor zero (N)","1/25"],["Calibrated stiffness (N/m)","8"],["Coefficient supported by the moving calibration pair (kg/s)","1/5"],["Sensor prediction from the candidate with b=0 (N)","-3/25"],["Observed minus incomplete-candidate prediction (N)","-1/50"],["Absolute residual divided by its bound (1)","4"]];
  for(const [label,value]of answers)await guided.getByLabel(label,{exact:true}).fill(value);
  await guided.getByRole("group",{name:"Does the incomplete candidate meet this bound?",exact:true}).locator('input[value="negative"]').check();
  await guided.getByRole("group",{name:"What next step does this evidence support?",exact:true}).locator('input[value="targeted"]').check();
  await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Compatibility compares absolute residual");
  await guided.getByRole("group",{name:"Does the incomplete candidate meet this bound?",exact:true}).locator('input[value="outside"]').check();await guided.getByRole("button",{name:"Check guided work",exact:true}).click();await expect(guided.locator(".answer-feedback")).toContainText("Correct. You have checked every part.");
  await expect(page.getByRole("link",{name:"Algebra preparation: rates and linear calibration",exact:true})).toHaveAttribute("href","/courses/mth-215/lessons/m02-l04");
});
