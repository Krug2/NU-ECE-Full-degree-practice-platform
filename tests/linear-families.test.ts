import { describe, expect, it } from "vitest";
import { linearQuestion } from "../lib/learning/families/mth-linear";
import { generateQuestions } from "../lib/learning/generate";
import { gradeQuestion } from "../lib/learning/grading";

describe("linear problem families", () => {
  it("checks fifty seeds per family against independent algebra and domain rules", () => {
    for(let seed=0;seed<50;seed++) {
      const numeric=linearQuestion("mth-linear-balance","unique",String(seed),"q1");
      const {a,b,c,d}=numeric.parameters;
      const answer=(d-b)/(a-c);
      expect(a*answer+b).toBe(c*answer+d);
      expect(gradeQuestion(numeric,{x:String(answer)}).correct).toBe(true);
      expect(gradeQuestion(numeric,{x:String(answer+1)}).correct).toBe(false);
      const classification=linearQuestion("mth-linear-balance","classify",String(seed),"q2");
      const values=classification.parameters;
      expect(gradeQuestion(classification,{classification:values.b===values.d?"all":"none"}).correct).toBe(true);
      const formula=linearQuestion("mth-linear-formula","isolate",String(seed),"q3");
      expect(gradeQuestion(formula,{formula:"valid",restriction:"nonzero"}).correct).toBe(true);
      expect(gradeQuestion(formula,{formula:"valid",restriction:"none"}).correct).toBe(false);
      const validity=linearQuestion("mth-linear-validity","equivalence",String(seed),"q4");
      expect(gradeQuestion(validity,{reason:"both"}).correct).toBe(true);
    }
  });
  it("reproduces a form from its seed and avoids duplicate prompts", () => {
    const slots=[{familyId:"mth-linear-balance",variant:"unique"},{familyId:"mth-linear-formula",variant:"isolate"},{familyId:"mth-linear-balance",variant:"classify"},{familyId:"mth-linear-validity",variant:"equivalence"}];
    const one=generateQuestions(slots,"example-42");
    expect(generateQuestions(slots,"example-42")).toEqual(one);
    expect(generateQuestions(slots,"example-43")).not.toEqual(one);
    expect(new Set(one.map(question=>question.prompt)).size).toBe(one.length);
  });
  it("fails clearly for a missing family or exhausted finite pool", () => {
    expect(()=>generateQuestions([{familyId:"missing",variant:"x"}],"seed")).toThrow("not available");
    expect(()=>generateQuestions(Array.from({length:5},()=>({familyId:"mth-linear-formula",variant:"isolate"})),"seed")).toThrow("not enough");
  });
});
