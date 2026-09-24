import { expect,test } from "@playwright/test";

for(const example of [
  {name:"course notes",route:"/courses/mth-215",label:"Course notes",save:"Save notes",load:"Load saved notes"},
  {name:"lesson notes",route:"/courses/mth-215/lessons/m01-l01",label:"Reasoning, questions, or a worked solution to revisit",save:"Save lesson notes",load:"Load saved lesson notes"},
]){
  test(example.name+" reflect saved changes without erasing a local draft",async({page,context})=>{
    await page.goto(example.route);const other=await context.newPage();await other.goto(example.route);
    const local=page.getByLabel(example.label,{exact:true}),remote=other.getByLabel(example.label,{exact:true});
    await remote.fill("First saved version");
    await other.getByRole("button",{name:example.save,exact:true}).click();
    await expect(local).toHaveValue("First saved version");
    await local.fill("My unfinished reasoning");
    await remote.fill("Updated in the other tab");
    await other.getByRole("button",{name:example.save,exact:true}).click();
    await expect(page.getByText(/changed while you were editing/)).toBeVisible();
    await expect(local).toHaveValue("My unfinished reasoning");
    await page.getByRole("button",{name:example.load,exact:true}).click();
    await expect(local).toHaveValue("Updated in the other tab");
    await expect(page.getByText(/changed while you were editing/)).toHaveCount(0);
    await local.fill("My chosen replacement");
    await page.getByRole("button",{name:example.save,exact:true}).click();
    await expect(page.locator(".form-status").filter({hasText:/notes saved/i})).toBeVisible();
    await page.reload();await expect(page.getByLabel(example.label,{exact:true})).toHaveValue("My chosen replacement");
    await other.close();
  });
}
