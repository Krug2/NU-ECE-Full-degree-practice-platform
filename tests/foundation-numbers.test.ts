import { expect, it } from "vitest";
import { foundationNumberQuestion } from "../lib/learning/families/mth-foundation-numbers";
import { gradeQuestion } from "../lib/learning/grading";

it("checks fifty forms of signed arithmetic against integer cross-products",()=>{
  for(let seed=0;seed<50;seed++)for(const variant of ["add","subtract","multiply","divide","length"]){
    const question=foundationNumberQuestion("mth-signed-fractions",variant,String(seed),"q1");
    const {a,b,c,d,operation}=question.parameters;
    const numerator=operation===0?a*d+b*c:operation===1?a*d-b*c:operation===2?a*c:a*d;
    const denominator=operation===3?b*c:b*d;
    expect(gradeQuestion(question,{value:`${numerator}/${denominator}`}).correct).toBe(true);
    expect(gradeQuestion(question,{value:`${numerator+1}/${denominator}`}).correct).toBe(false);
  }
});
it("separates signs, exactness, and endpoint notation on fifty seeded forms",()=>{
  for(let seed=0;seed<50;seed++){
    const signs=foundationNumberQuestion("mth-sign-precedence","square",String(seed),"q1");
    const n=signs.parameters.n;
    expect(gradeQuestion(signs,{outside:String(-Math.pow(n,2)),inside:String((-n)*(-n))}).correct).toBe(true);
    expect(gradeQuestion(signs,{outside:String(n*n),inside:String(n*n)}).correct).toBe(false);
    const exact=foundationNumberQuestion("mth-exact-approximate","compare",String(seed),"q2");
    const {numerator,denominator}=exact.parameters;
    expect(gradeQuestion(exact,{classification:"approximate",value:`${numerator}/${denominator}`}).correct).toBe(true);
    expect(gradeQuestion(exact,{classification:"approximate",value:(numerator/denominator).toFixed(3)}).correct).toBe(false);
    const notation=foundationNumberQuestion("mth-interval-notation","endpoints",String(seed),"q3");
    const {lower,upper,lowerClosed,upperClosed}=notation.parameters;
    expect(gradeQuestion(notation,{interval:`${lowerClosed?"[":"("}${lower},${upper}${upperClosed?"]":")"}`}).correct).toBe(true);
    expect(gradeQuestion(notation,{interval:`${lowerClosed?"(":"["}${lower},${upper}${upperClosed?")":"]"}`}).correct).toBe(false);
  }
});
