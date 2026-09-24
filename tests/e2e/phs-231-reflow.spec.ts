import { expect,test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for(const display of [{name:"200 percent browser zoom equivalent",width:720,height:500,scale:2},{name:"320 pixel reflow",width:320,height:800,scale:1}]){
  test.describe(display.name,()=>{
    test.use({viewport:{width:display.width,height:display.height},deviceScaleFactor:display.scale});
    for(const surface of ["course","assessment","project"] as const)test(surface+" preserves reading and keyboard input with reduced motion",async({page},info)=>{
      const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.emulateMedia({reducedMotion:"reduce"});
      const path=surface==="course"?"":surface==="assessment"?"/assessments/quiz-m01":"/lessons/m09-l02";
      await page.goto("/courses/phs-231"+path);
      expect(await page.evaluate(()=>({reduced:matchMedia("(prefers-reduced-motion: reduce)").matches,width:innerWidth,scale:devicePixelRatio}))).toEqual({reduced:true,width:display.width,scale:display.scale});
      if(surface==="course"){
        const link=page.locator("#assessments").getByRole("link",{name:"Check preparation",exact:true});
        await link.focus();await link.press("Enter");await expect(page).toHaveURL(/assessments\/readiness$/);await page.goBack();await link.focus();
      }else if(surface==="assessment"){
        const start=page.locator("#assessment").getByRole("button",{name:"Start assessment",exact:true});
        await expect(start).toBeEnabled();await start.focus();await start.press("Enter");await expect(page.locator("#assessment .attempt-meta")).toContainText("Question 1 of 8");
        const answer=page.getByLabel("Converted value (m²)",{exact:true});await answer.focus();await answer.pressSequentially("1/1000000");await expect(answer).toHaveValue("1/1000000");
      }else{
        const notebook=page.locator("#project-notebook"),start=notebook.getByRole("button",{name:"Start project notebook",exact:true});
        await expect(start).toBeEnabled();await start.focus();await start.press("Enter");
        const question=notebook.locator("#phs231-project-question");await expect(question).toBeEditable();await question.focus();await question.pressSequentially("State a prediction before using the held-out synthetic states.");
        await expect(question).toHaveValue("State a prediction before using the held-out synthetic states.");
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      const focused=page.locator(":focus");await focused.scrollIntoViewIfNeeded();const box=await focused.boundingBox();expect(box).not.toBeNull();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(display.width+1);expect(box!.y+box!.height).toBeLessThanOrEqual(display.height+1);
      expect(await focused.evaluate(element=>{
        const rect=element.getBoundingClientRect();
        return [.1,.5,.9].every(fraction=>{const hit=document.elementFromPoint(rect.x+fraction*rect.width,rect.y+rect.height/2);return hit===element||!!hit&&element.contains(hit);});
      })).toBe(true);
      if(surface==="project")expect(box!.width).toBeGreaterThanOrEqual(220);
      if(surface!=="assessment"){
        const regions=surface==="course"?page.locator(".two-columns > .stack"):page.locator(".lesson-layout > .lesson-main, .lesson-layout > .lesson-nav");
        const [first,second]=await regions.all(),a=(await first.boundingBox())!,b=(await second.boundingBox())!;
        expect(a.x+a.width<=b.x+1||b.x+b.width<=a.x+1||a.y+a.height<=b.y+1||b.y+b.height<=a.y+1).toBe(true);
      }
      const audit=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21aa"]).analyze();expect(audit.violations.map(item=>({id:item.id,targets:item.nodes.map(node=>node.target)}))).toEqual([]);
      await page.screenshot({path:info.outputPath(surface+"-"+display.width+"-scale-"+display.scale+".png")});expect(errors).toEqual([]);
    });
  });
}
