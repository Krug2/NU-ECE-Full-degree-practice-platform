import { expect, it } from "vitest";
import { f06PrecisionQuestion } from "../lib/learning/families/f06-precision";
import { parseRational } from "../lib/learning/rational";
import { gradeQuestion } from "../lib/learning/grading";
import { refresherAnswers } from "./refresher-answers";
const variants={"f06-sig-count":["leading","internal","trailing","scientific","ambiguous","exact","audit"],"f06-measurement-round":["places","figures","tie","carry","negative"],"f06-precision-operation":["addition","subtraction","multiplication","division","exact-factor","mixed","sum-difference","product-quotient"]};
function nearest(n:bigint,d:bigint,place:number){
  if(place<0)n*=10n**BigInt(-place);else d*=10n**BigInt(place);
  const integer=n/d,abs=(v:bigint)=>v<0n?-v:v;
  const candidates=[integer-1n,integer,integer+1n].sort((a,b)=>{
    const da=abs(n-a*d),db=abs(n-b*d);
    return da<db?-1:da>db?1:abs(a)>abs(b)?-1:abs(a)<abs(b)?1:0;
  });
  return parseRational(candidates[0]+"*10^"+place);
}
it.each(Object.entries(variants))("%s validates exact values and separate precision reports",(family,structures)=>{
  for(const variant of structures)for(let seed=0;seed<100;seed++){
    const q=f06PrecisionQuestion(family,variant,String(seed),"q");
    expect(q).toEqual(f06PrecisionQuestion(family,variant,String(seed),"q"));
    expect(q.objectiveId).toBe("m01-l04");expect(q.critical).toBe(true);
    expect(gradeQuestion(q,refresherAnswers(q)).correct).toBe(true);
    for(const f of q.fields)if(f.kind==="choice")expect(new Set(f.options.map(o=>o.label)).size).toBe(f.options.length);
  }
});
it("checks the meaningful digits and explicitly ambiguous or exact cases",()=>{
  for(let seed=0;seed<100;seed++)for(const variant of variants["f06-sig-count"].filter(v=>v!=="audit")){
    const q=f06PrecisionQuestion("f06-sig-count",variant,String(seed),"q"),a=refresherAnswers(q);
    expect(a.count).toBe(variant==="exact"?"exact":variant==="ambiguous"?"ambiguous":variant==="internal"?"4":variant==="trailing"?String(2+q.parameters.zeros):"3");
  }
});
it("selects the nearest exact grid value with a separate tie-break and preserves the requested report",()=>{
  for(let seed=0;seed<100;seed++)for(const variant of variants["f06-measurement-round"]){
    const q=f06PrecisionQuestion("f06-measurement-round",variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q);
    const place=p.figures?Math.floor(Math.log10(Math.abs(p.numerator/p.denominator)))-p.figures+1:p.place;
    expect(parseRational(a.value)).toEqual(nearest(BigInt(p.numerator),BigInt(p.denominator),place));
    const f=q.fields[1];if(f.kind!=="choice")throw Error("Report choice required");
    const display=f.options.find(o=>o.id===a.report)!.label;
    if(p.figures)expect(display.split("×")[0].replace(/[-.\s]/g,"").replace(/^0+/,"").length).toBe(p.figures);
    else expect(display.split(".")[1]?.length??0).toBe(-p.place);
    expect(gradeQuestion(q,{...a,report:"finer"}).correct).toBe(false);
    expect(gradeQuestion(q,{...a,value:"1/0"}).valid).toBe(false);
  }
});
it("independently computes operation results and their final reporting constraint without intermediate rounding",()=>{
  let guardedDifference=false;
  for(let seed=0;seed<100;seed++)for(const variant of variants["f06-precision-operation"]){
    const q=f06PrecisionQuestion("f06-precision-operation",variant,String(seed),"q"),p=q.parameters,a=refresherAnswers(q),op=p.operation;
    const n=BigInt(op===0?p.a+10*p.b:op===1?p.a-10*p.b:op===2?p.a*p.b:op===3?p.a:op===4?p.a:(p.a+10*p.b)*p.c);
    const d=BigInt(op<=1?100:op===2?1000:op===3?10*p.b:op===4?1:10000);
    const digits=op===4?3:op===5?Math.min(String(Math.floor((p.a+10*p.b+5)/10)).length,3):2;
    const place=op<=1?-1:Math.floor(Math.log10(Math.abs(Number(n)/Number(d))))-digits+1;
    const expected=nearest(n,d,place);
    expect(parseRational(a.value)).toEqual(expected);
    expect(a.rule).toBe(op<=1?"place":op===4?"exact":op===5?"guard":"figures");
    if(op===5){
      const prematureNumerator=BigInt(Math.floor((p.a+10*p.b+5)/10)*p.c),premature=nearest(prematureNumerator,1000n,place);
      if(premature.numerator!==expected.numerator||premature.denominator!==expected.denominator)guardedDifference=true;
    }
    expect(gradeQuestion(q,{...a,report:"coarser"}).correct).toBe(false);
  }
  expect(guardedDifference).toBe(true);
});
