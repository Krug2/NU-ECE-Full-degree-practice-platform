import { expect, it } from "vitest";
import katex from "katex";
import { phs231MaterialEvidenceQuestion, phs231MaterialEvidenceVariants } from "../lib/learning/families/phs-231-material-evidence";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import { addRational, divideRational, formatRational, multiplyRational, negateRational, parseRational, type Rational } from "../lib/learning/rational";
import { approximateExact, parseRootSet } from "../lib/learning/exact-number";
import type { Response } from "../lib/learning/contracts";

const R=(s:string|number)=>parseRational(String(s)),add=addRational,mul=multiplyRational,div=divideRational,sub=(a:Rational,b:Rational)=>add(a,negateRational(b));
const number=(r:Rational)=>Number(r.numerator)/Number(r.denominator);
const answer=(r:Rational)=>`${r.numerator*2n}/${r.denominator*2n}`;
const near=(a:number,b:number)=>expect(Math.abs(a-b)).toBeLessThanOrEqual(1e-8*Math.max(1,Math.abs(a),Math.abs(b)));
type Vertex={e:Rational;s:Rational};
const line=(a:Vertex,b:Vertex,x:Rational)=>add(a.s,mul(sub(b.s,a.s),div(sub(x,a.e),sub(b.e,a.e))));
const quadrature=(f:(x:Rational)=>Rational,a:Rational,b:Rational)=>mul(div(sub(b,a),R(6)),add(add(f(a),mul(R(4),f(div(add(a,b),R(2))))),f(b)));
const record=(p:Record<string,number>):Vertex[]=>[{e:R(0),s:R(0)},{e:R(`${p.S}/(1000*${p.E})`),s:R(p.S)},{e:R(`${p.hy}*${p.S}/(1000*${p.E})`),s:R(p.u*p.S)},{e:R(`${p.hf}*${p.S}/(1000*${p.E})`),s:R(`${p.t}*${p.S}/2`)}];

it.each(phs231MaterialEvidenceVariants)("checks 50 independent %s records, units, equivalent answers, and interpretations",variant=>{
  const prompts=new Set<string>(),cases=new Set<string>();
  for(let seed=0;seed<50;seed++){
    const q=phs231MaterialEvidenceQuestion("phs231-material-evidence",variant,String(seed),"q"),p=q.parameters;let response:Response;
    expect(q).toEqual(phs231MaterialEvidenceQuestion("phs231-material-evidence",variant,String(seed),"q"));expect(JSON.parse(JSON.stringify(q))).toEqual(q);prompts.add(q.prompt);
    if(variant==="units"){
      const area=R(`${p.A}/1000000`),original=R(`${p.L}/1000`),extension=R(`${p.d}/10000`),epsilon=div(extension,original);
      response={stress:answer(div(div(R(p.F),area),R(1e6))),strain:answer(epsilon),percent:answer(mul(epsilon,R(100))),length:answer(mul(add(original,extension),R(1000))),area:"original"};
      near(number(epsilon),(p.d/10)/p.L);near(number(R(response.length as string))-p.L,p.d/10);
    }else if(variant==="slope"){
      const a={e:R(`${p.S}/(1000*${p.E})`),s:R(p.S)},b={e:R(`${p.hy}*${p.S}/(1000*${p.E})`),s:R(p.u*p.S)};
      const initial=div(a.s,a.e),tangent=div(sub(b.s,a.s),sub(b.e,a.e)),secant=div(b.s,b.e);
      response={initial:answer(div(initial,R(1000))),secant:answer(div(secant,R(1000))),tangent:answer(div(tangent,R(1000))),history:"unloading"};
      near(number(add(a.s,mul(tangent,sub(b.e,a.e)))),number(b.s));expect(number(tangent)).toBeLessThan(number(secant));expect(number(secant)).toBeLessThan(number(initial));
    }else if(variant==="landmarks"){
      const points=record(p),initial=div(div(points[1].s,points[1].e),R(1000)),maximum=Math.max(...points.map(v=>number(v.s)));
      response={modulus:answer(initial),yield:answer(points[1].s),ultimate:String(maximum),last:answer(points[3].s),percent:answer(mul(points[3].e,R(100))),endpoint:p.documented?"fracture":"unknown"};
      cases.add(String(p.documented));expect(maximum).toBeGreaterThanOrEqual(number(points[3].s));
    }else if(variant==="unloading"){
      const E=R(1000*p.E),origin={e:R(0),s:R(0)},a={e:div(R(p.S),E),s:R(p.S)},b={e:div(R(p.hy*p.S),E),s:R(p.u*p.S)};
      const peak=add(a.e,mul(sub(b.e,a.e),R(`${p.r}/6`))),stress=line(a,b,peak),residual=sub(peak,div(stress,E));
      const loading=add(quadrature(x=>line(origin,a,x),R(0),a.e),quadrature(x=>line(a,b,x),a.e,peak));
      const returned=quadrature(x=>mul(E,sub(x,residual)),residual,peak),loss=sub(loading,returned);
      response={stress:answer(stress),residual:answer(residual),extension:answer(mul(residual,R(p.L))),returned:answer(returned),unreturned:answer(loss),energy:"account"};
      near(number(mul(E,sub(peak,residual))),number(stress));expect(number(loss)).toBeGreaterThanOrEqual(0);cases.add(p.r===0?"yield":"plastic");
      const shiftedLine=(e:number)=>p.E*1000*(e-number(residual)),n=100,h=(number(peak)-number(residual))/n;let independentArea=0;
      for(let i=0;i<n;i++)independentArea+=shiftedLine(number(residual)+(i+.5)*h)*h;
      near(number(returned),independentArea);
    }else if(variant==="energy"){
      const pts=record(p),areas=pts.slice(1).map((b,i)=>quadrature(x=>line(pts[i],b,x),pts[i].e,b.e)),total=areas.reduce(add,R(0)),volume=R(`${p.A}*${p.L}/1000`);
      response={first:answer(areas[0]),second:answer(areas[1]),third:answer(areas[2]),total:answer(total),work:answer(mul(total,volume)),meaning:"work"};
      const areaM2=p.A/1e6,lengthM=p.L/1000;let workJ=0;
      for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],x0=number(a.e)*lengthM,x1=number(b.e)*lengthM,h=(x1-x0)/80;
        for(let k=0;k<80;k++){const fraction=(k+.5)/80,F=(number(a.s)+(number(b.s)-number(a.s))*fraction)*1e6*areaM2;workJ+=F*h;}
      }
      near(number(mul(total,volume)),workJ);expect(number(total)).toBeGreaterThan(number(areas[0]));
    }else if(variant==="offset"){
      const E=R(1000*p.E),a={e:div(R(p.S),E),s:R(p.S)},b={e:div(R(p.hy*p.S),E),s:R(p.u*p.S)},H=div(sub(b.s,a.s),sub(b.e,a.e));
      const intercept=sub(a.s,mul(H,a.e)),eps=div(add(intercept,mul(E,R(".002"))),sub(E,H)),stress=mul(E,sub(eps,R(".002")));
      response={strain:answer(eps),stress:answer(stress),offset:"2/1000",definition:"convention"};
      near(number(stress),number(line(a,b,eps)));expect(number(eps)).toBeGreaterThan(number(a.e));expect(number(eps)).toBeLessThanOrEqual(number(b.e)+1e-14);
    }else if(variant==="comparison"){
      const pts=record(p),area=pts.slice(1).map((b,i)=>quadrature(x=>line(pts[i],b,x),pts[i].e,b.e)).reduce(add,R(0));
      const E=R(1000*p.E),end=div(R(2*p.S),E),brittle=quadrature(x=>mul(E,x),R(0),end);
      response={modulus:"2/2",strength:"3/3",first:answer(area),second:answer(brittle),strain:answer(div(pts[3].e,end)),comparison:"area"};
      expect(number(area)).toBeGreaterThan(number(brittle));expect(number(pts[3].e)).toBeGreaterThan(number(end));
    }else if(variant==="true-stress"){
      const original=R(`${p.A}/1000000`),current=mul(original,R(`${p.r}/4`)),F=R(p.F),nominal=div(F,original),actual=div(F,current);
      response={engineering:answer(div(nominal,R(1e6))),current:answer(div(actual,R(1e6))),ratio:answer(div(actual,nominal)),strain:"unknown"};
      near(number(mul(actual,current)),p.F);near(number(mul(nominal,original)),p.F);expect(number(actual)).toBeGreaterThan(number(nominal));
    }else if(variant==="inverse"){
      const pts=record({...p,t:2}),target=add(R(p.S),mul(R((p.u-1)*p.S),R(`${p.r}/4`)));
      const intersections:Rational[]=[];
      for(let i=1;i<pts.length;i++){
        const a=pts[i-1],b=pts[i];
        if(number(target)<Math.min(number(a.s),number(b.s))||number(target)>Math.max(number(a.s),number(b.s)))continue;
        const e=add(a.e,mul(sub(b.e,a.e),div(sub(target,a.s),sub(b.s,a.s))));
        if(!intersections.some(x=>number(sub(x,e))===0))intersections.push(e);
        near(number(line(a,b,e)),number(target));
      }
      response={strains:intersections.map(answer).reverse().join(", "),force:answer(mul(target,R(p.A))),branch:intersections.length===1?"peak":"multiple"};
      expect(parseRootSet(response.strains as string).map(v=>approximateExact(v).real).sort((a,b)=>a-b)).toEqual(intersections.map(number).sort((a,b)=>a-b));cases.add(String(intersections.length));
      const roots=q.fields.find(f=>f.kind==="roots")!;
      expect(gradeField(roots,`${response.strains},0`).correct).toBe(false);
      if(intersections.length===2)expect(gradeField(roots,formatRational(intersections[0])).correct).toBe(false);
    }else if(variant==="measurement"){
      const step=R(`${p.h}/100`),shown=mul(R(p.r),step),error=div(step,R(2));
      const corners=[error,negateRational(error)].flatMap(before=>[error,negateRational(error)].map(after=>add(shown,sub(before,after)))).sort((a,b)=>number(sub(a,b)));
      const lo=corners[0],hi=corners.at(-1)!;
      response={lower:answer(lo),upper:answer(hi),"strain-lower":answer(div(lo,R(p.L))),"strain-upper":answer(div(hi,R(p.L))),resolved:number(lo)>0?"resolved":"unresolved"};
      cases.add(number(lo)<0?"negative-lower":number(lo)===0?"zero-boundary":"positive-lower");
      near(number(sub(hi,lo)),2*p.h/100);
    }else throw Error("Missing independent material fixture");
    const grade=gradeQuestion(q,response);expect(grade.correct,`${variant} seed ${seed}: ${JSON.stringify(grade)}`).toBe(true);
    for(const f of q.fields){
      if(f.kind==="choice"){
        for(const option of f.options.filter(o=>o.id!==response[f.id]))expect(gradeField(f,option.id).correct).toBe(false);
        expect(gradeField(f,"nonexistent").valid).toBe(false);
      }else{
        expect(f.unit).not.toBe("");
        for(const invalid of ["","NaN","Infinity","1/0","2 MPa","sqrt(-1)"])expect(gradeField(f,invalid).correct).toBe(false);
        expect(gradeField(f,f.kind==="roots"?"0":`(${response[f.id]})+1`).correct).toBe(false);
      }
    }
    const visit=(x:unknown):void=>{if(typeof x==="string"){for(const match of x.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();}else if(x&&typeof x==="object")Object.values(x).forEach(visit);};visit(q);
  }
  expect(prompts.size).toBeGreaterThan(5);
  if(["landmarks","unloading","inverse"].includes(variant))expect(cases.size).toBe(2);
  if(variant==="measurement")expect(cases.size).toBe(3);
});

it("finds and checks a proof-line intersection exactly at the supplied segment endpoint",()=>{
  let found=false;
  for(let seed=0;seed<3000;seed++){
    const q=phs231MaterialEvidenceQuestion("phs231-material-evidence","offset",String(seed),"q"),p=q.parameters;
    if(2*p.E!==(p.hy-p.u)*p.S)continue;
    const response={strain:`${p.hy}*${p.S}/(1000*${p.E})`,stress:String(p.u*p.S),offset:"1/500",definition:"convention"};
    expect(gradeQuestion(q,response).correct).toBe(true);found=true;break;
  }
  expect(found).toBe(true);
});

it("requires critical interpretation and rejects unknown family and variant identifiers",()=>{
  for(const variant of ["landmarks","unloading","energy","inverse"])expect(phs231MaterialEvidenceQuestion("phs231-material-evidence",variant,"critical","q").critical).toBe(true);
  expect(()=>phs231MaterialEvidenceQuestion("unknown","units","1","q")).toThrow();expect(()=>phs231MaterialEvidenceQuestion("phs231-material-evidence","unlisted","1","q")).toThrow();
});

