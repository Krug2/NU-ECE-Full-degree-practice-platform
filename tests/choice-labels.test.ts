import { expect,it } from "vitest";
import { generateQuestions } from "../lib/learning/generate";
import { lessons } from "../lib/learning/catalog";
import type { Question } from "../lib/learning/contracts";

function check(question:Question){
  for(const field of question.fields)if(field.kind==="choice"){
    for(const option of field.options)if(option.label.includes("$")){
      expect(option.accessibleLabel,question.familyId+": "+option.id).toBeTruthy();
      expect(option.accessibleLabel).not.toMatch(/[$\\]/);
    }
    expect(new Set(field.options.map(option=>option.accessibleLabel??option.label)).size).toBe(field.options.length);
  }
}
it("gives mathematical choices distinct readable labels while preserving the displayed formulas",()=>{
  const slots=[
    {familyId:"mth-linear-formula",variant:"isolate"},{familyId:"mth-linear-validity",variant:"equivalence"},
    {familyId:"mth-root-meaning",variant:"absolute"},{familyId:"mth-quadratic-method",variant:"branch"},
    {familyId:"mth-transform-match",variant:"quadratic"},{familyId:"mth-transform-match",variant:"sqrt"},
    {familyId:"mth-compose-structure",variant:"operations"},{familyId:"mth-compose-structure",variant:"decompose"},
    {familyId:"mth-inverse-rule",variant:"quadratic"},
  ];
  for(let seed=0;seed<50;seed++)generateQuestions(slots,String(seed)).forEach(check);
  lessons.forEach(lesson=>check(lesson.guided.question));
});
