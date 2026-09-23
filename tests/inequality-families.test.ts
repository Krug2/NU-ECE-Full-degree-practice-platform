import { describe, expect, it } from "vitest";
import { inequalityQuestion } from "../lib/learning/families/mth-inequalities";
import { absoluteIntervals } from "../lib/learning/inequalities";
import { formatIntervals, type Interval } from "../lib/learning/intervals";
import { gradeQuestion } from "../lib/learning/grading";

const contains=(set:Interval[],x:number)=>set.some(item=>(item.lower===null||x>Number(item.lower)||(item.lowerClosed&&x===Number(item.lower)))&&(item.upper===null||x<Number(item.upper)||(item.upperClosed&&x===Number(item.upper))));
describe("inequality question generation",()=>{
  it("matches absolute-value truth across negative, zero, and positive radii",()=>{
    for(const relation of ["lt","le","gt","ge"] as const)for(let radius=-2;radius<=5;radius++)for(let center=-3;center<=3;center++){
      const set=absoluteIntervals(center,radius,relation);
      for(let x=-12;x<=12;x+=.5){const distance=Math.abs(x-center);const truth=relation==="lt"?distance<radius:relation==="le"?distance<=radius:relation==="gt"?distance>radius:distance>=radius;expect(contains(set,x)).toBe(truth);}
    }
  });
  it("verifies fifty seeds and the original inequality rather than repeating the answer formula",()=>{
    for(let seed=0;seed<50;seed++)for(const [family,variant] of [["mth-inequality-linear","negative"],["mth-inequality-compound","intersection"],["mth-inequality-compound","union"],["mth-inequality-distance","absolute"],["mth-inequality-distance","tolerance"]]){
      const question=inequalityQuestion(family,variant,String(seed),"q1"),field=question.fields[0];
      if(field.kind!=="intervals")throw new Error("Expected interval answer");
      expect(gradeQuestion(question,{set:formatIntervals(field.expected)}).correct).toBe(true);
      if(family==="mth-inequality-linear"){
        const {a,b,right}=question.parameters,match=question.prompt.match(/\\le|\\ge|<|>/)![0];
        for(let x=-10;x<=10;x+=.5){const left=a*x+b;const truth=match==="<"?left<right:match===">"?left>right:match==="\\le"?left<=right:left>=right;expect(contains(field.expected,x)).toBe(truth);}
      }
      if(family==="mth-inequality-compound"){
        const {lower,upper,and}=question.parameters;
        for(let x=-12;x<=12;x+=.5)expect(contains(field.expected,x)).toBe(and?x>lower&&x<=upper:x<lower||x>=upper);
      }
    }
  });
});
