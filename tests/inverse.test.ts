import { expect,it } from "vitest";
import katex from "katex";
import { inverseQuestion } from "../lib/learning/families/mth-inverse";
import { gradeQuestion } from "../lib/learning/grading";
import { evaluateMachine,inverseMachine,machineSchema } from "../lib/learning/function-machines";
import { equalExact,parseExact } from "../lib/learning/exact-number";

function question(family:string,variant:string,seed:number){
  const q=inverseQuestion(family,variant,String(seed),"q1");
  const visit=(value:unknown):void=>{
    if(typeof value==="string"){for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();}
    else if(value&&typeof value==="object")Object.values(value).forEach(visit);
  };
  visit(q);expect(q).toEqual(inverseQuestion(family,variant,String(seed),"q1"));return q;
}
const half=(n:number,right:boolean)=>right?"["+n+",inf)":"(-inf,"+n+"]",hole=(n:number)=>"(-inf,"+n+") U ("+n+",inf)";
it("uses repeated outputs to detect inverse uniqueness in tables and finite graphs",()=>{
  const outcomes=new Set<boolean>();
  for(let seed=0;seed<50;seed++)for(const variant of ["table","graph"]){
    const q=question("mth-inverse-classify",variant,seed),p=q.parameters,ys=[0,1,2,3].map(i=>p["y"+i]),unique=new Set(ys).size===4;
    const preimages=[0,1,2,3].filter(i=>ys[i]===p.target).map(i=>p["x"+i]).join(",");
    expect(gradeQuestion(q,{invertible:unique?"yes":"no",preimages}).correct).toBe(true);outcomes.add(unique);
    if(!unique)expect(gradeQuestion(q,{invertible:"no",preimages:String(p.x0)}).correct).toBe(false);
    if(variant==="graph"){
      if(q.figure?.kind!=="coordinates")throw new Error("Expected finite graph");
      expect(q.figure.points.map(point=>[point.xTicks,point.yTicks])).toEqual([0,1,2,3].map(i=>[p["x"+i],p["y"+i]]));
    }
  }
  expect(outcomes.size).toBe(2);
});
it("chooses the increasing square branch by direction and keeps the turning endpoint",()=>{
  const signs=new Set<number>();
  for(let seed=0;seed<50;seed++){
    const q=question("mth-inverse-classify","quadratic",seed),p=q.parameters,right=p.a>0,domain=half(p.h,right);
    expect(gradeQuestion(q,{side:right?"right":"left",domain}).correct).toBe(true);
    expect(gradeQuestion(q,{side:right?"left":"right",domain}).correct).toBe(false);
    expect(gradeQuestion(q,{side:right?"right":"left",domain:"R"}).correct).toBe(false);
    const x1=right?p.h:p.h-1,x2=right?p.h+1:p.h;
    expect(p.a*(x2-p.h)**2+p.k).toBeGreaterThan(p.a*(x1-p.h)**2+p.k);signs.add(p.a);
  }
  expect([...signs].sort()).toEqual([-1,1]);
});
it("requires the inverse formula, domain, range, branch, and evaluated value together",()=>{
  const branches=new Set<string>();
  for(let seed=0;seed<50;seed++)for(const variant of ["linear","reciprocal","quadratic","radical"]){
    const q=question("mth-inverse-rule",variant,seed),p=q.parameters;
    const formula=variant==="linear"?"(x-("+p.k+"))/("+p.a+")+("+p.h+")":variant==="reciprocal"?"("+p.h+"*x+("+(p.a-p.h*p.k)+"))/(x-("+p.k+"))":variant==="radical"?"x^2+("+(-2*p.k)+")*x+("+(p.k*p.k+p.h)+")":"inverse";
    const domain=variant==="linear"?"R":variant==="reciprocal"?hole(p.k):half(p.k,p.a>0);
    const range=variant==="linear"?"R":variant==="reciprocal"?hole(p.h):half(p.h,variant==="radical"||p.side>0);
    const value=variant==="linear"?String(p.h+(p.y-p.k)/p.a):variant==="reciprocal"?p.h+"+("+p.a+")/("+p.y+"-("+p.k+"))":variant==="radical"?String(p.h+((p.y-p.k)/p.a)**2):String(p.h+p.side*Math.sqrt((p.y-p.k)/p.a));
    const answer={formula,domain,range,value,"root-step":p.side>0?"right":"left"};
    expect(gradeQuestion(q,answer).correct,JSON.stringify({variant,p,answer})).toBe(true);
    if(variant!=="linear")expect(gradeQuestion(q,{...answer,domain:"R"}).correct).toBe(false);
    if(variant==="quadratic"){
      expect(gradeQuestion(q,{...answer,formula:"branch"}).correct).toBe(false);
      expect(gradeQuestion(q,{...answer,"root-step":p.side>0?"left":"right"}).correct).toBe(false);
      const field=q.fields[0];if(field.kind!=="choice")throw new Error("Expected inverse choice");
      expect(new Set(field.options.map(option=>option.label)).size).toBe(4);
      branches.add(p.a+":"+p.side);
    }
    const model=machineSchema.parse({kind:variant==="quadratic"?"square":variant==="radical"?"sqrt":variant,a:String(p.a),h:String(p.h),k:String(p.k),branch:variant==="quadratic"?(p.side>0?"right":"left"):"all"});
    const recovered=inverseMachine(model,String(p.y));expect(recovered.status).toBe("defined");
    if(recovered.status==="defined"){
      expect(equalExact(parseExact(recovered.value),parseExact(value))).toBe(true);
      const forward=evaluateMachine(model,recovered.value);expect(forward.status).toBe("defined");
      if(forward.status==="defined")expect(equalExact(parseExact(forward.value),parseExact(String(p.y)))).toBe(true);
    }
  }
  expect(branches.size).toBe(4);
});
it("rejects one-sided proofs and wrong-branch pairs even when algebra looks reversible",()=>{
  const outcomes=new Set<boolean>();
  for(let seed=0;seed<50;seed++)for(const variant of ["restricted","unrestricted"]){
    const q=question("mth-inverse-verify",variant,seed),p=q.parameters,valid=variant==="restricted"&&p.side===p.candidate;
    const fg=variant==="unrestricted"||valid?"identity":"blocked",gf=variant==="unrestricted"?"absolute":valid?"identity":"reflected";
    expect(gradeQuestion(q,{fg,gf,pair:valid?"yes":"no"}).correct).toBe(true);
    if(!valid)expect(gradeQuestion(q,{fg,gf,pair:"yes"}).correct).toBe(false);
    if(variant==="restricted"){
      const input=p.h+p.side*2,recovered=p.h+p.candidate*2;
      expect(input===recovered).toBe(valid);
      const candidateInDomain=p.side>0?recovered>=p.h:recovered<=p.h;expect(candidateInDomain).toBe(valid);outcomes.add(valid);
    }else expect(p.h+Math.abs(-2)).not.toBe(p.h-2);
  }
  expect(outcomes.size).toBe(2);
});
it("retains both rational composition holes and separates inverse notation from a reciprocal",()=>{
  for(let seed=0;seed<50;seed++){
    const q=question("mth-inverse-verify","rational",seed),p=q.parameters;
    expect(gradeQuestion(q,{"fg-domain":hole(p.k),"gf-domain":hole(p.h)}).correct).toBe(true);
    expect(gradeQuestion(q,{"fg-domain":"R","gf-domain":"R"}).correct).toBe(false);
    const n=question("mth-inverse-verify","notation",seed),s=n.parameters;
    const inverse=(s.x-s.offset)/s.scale,reciprocal="1/"+(s.scale*s.x+s.offset);
    expect(gradeQuestion(n,{inverse:String(inverse),reciprocal}).correct).toBe(true);
    expect(gradeQuestion(n,{inverse:reciprocal,reciprocal:String(inverse)}).correct).toBe(false);
  }
});
