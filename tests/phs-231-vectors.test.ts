import { expect, it } from "vitest";
import katex from "katex";
import { phs231VectorQuestion, phs231VectorVariants } from "../lib/learning/families/phs-231-vectors";
import { vectorResults, type Vector3 } from "../lib/learning/phs-231-vectors";
import { gradeField, gradeQuestion } from "../lib/learning/grading";
import type { Response } from "../lib/learning/contracts";

const squared=(a:number[])=>a.reduce((sum,value)=>sum+value*value,0);
function determinantCross(a:number[],b:number[]) {
  const output=[0,0,0];
  for(const [i,j,k,sign] of [[0,1,2,1],[1,2,0,1],[2,0,1,1],[0,2,1,-1],[2,1,0,-1],[1,0,2,-1]])output[i]+=sign*a[j]*b[k];
  return output;
}

it("checks all vector families over 50 seeds using component reconstruction and independent products",()=>{
  const signs=new Set<number>();
  for(const [family,variants] of Object.entries(phs231VectorVariants))for(const variant of variants)for(let seed=0;seed<50;seed++){
    const q=phs231VectorQuestion(family,variant,String(seed),"q");
    expect(q).toEqual(phs231VectorQuestion(family,variant,String(seed),"q"));
    const p=q.parameters,a=[p.ax,p.ay,p.az],b=[p.bx,p.by,p.bz];
    const dot=(squared(a.map((n,i)=>n+b[i]))-squared(a)-squared(b))/2;
    let answer:Response;
    if(family==="phs231-vector-components"){
      if(variant==="unit")answer={magnitude:`sqrt(${squared(a)})`,x:`${a[0]}/sqrt(${squared(a)})`,y:`${a[1]}/sqrt(${squared(a)})`,z:`${a[2]}/sqrt(${squared(a)})`};
      else if(variant==="planar"){
        const magnitude=Math.sqrt(squared(a));
        let angle=Math.acos(a[0]/magnitude)*180/Math.PI;
        if(a[1]<0)angle=360-angle;
        answer={magnitude:`sqrt(${squared(a)})`,angle:angle.toFixed(4)};
        expect(magnitude*Math.cos(angle*Math.PI/180)).toBeCloseTo(a[0],12);
        expect(magnitude*Math.sin(angle*Math.PI/180)).toBeCloseTo(a[1],12);
      }else{
        const target=a.map((n,i)=>variant==="displacement"?b[i]-n:n+b[i]);
        answer={x:String(target[0]),y:String(target[1]),z:String(target[2]),magnitude:`sqrt(${squared(target)})`};
        if(variant==="zero")answer.direction="undefined";
        if(variant==="displacement")expect(a.map((n,i)=>n+target[i])).toEqual(b);
      }
    }else if(variant==="dot")answer={work:String(dot),type:"scalar"};
    else if(variant==="projection")answer={projection:`${dot}/sqrt(${squared(b)})`};
    else{
      const result=variant==="order"?determinantCross(b,a):determinantCross(a,b);
      answer={x:String(result[0]),y:String(result[1]),z:String(result[2])};
      if(variant==="order")answer.order="negative";
      expect(result.reduce((sum,n,i)=>sum+n*a[i],0)).toBe(0);
      expect(result.reduce((sum,n,i)=>sum+n*b[i],0)).toBe(0);
      expect(squared(result)+dot*dot).toBe(squared(a)*squared(b));
    }
    expect(gradeQuestion(q,answer).correct,q.prompt).toBe(true);
    const strings:string[]=[];
    const visit=(v:unknown):void=>{if(typeof v==="string")strings.push(v);else if(v&&typeof v==="object")Object.values(v).forEach(visit);};visit(q);
    for(const s of strings)for(const match of s.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
    for(const field of q.fields){
      for(const invalid of ["","NaN","1/0","2 m","sqrt(-4) + unknown"])expect(gradeField(field,invalid).correct).toBe(false);
      if(field.kind==="choice")for(const option of field.options)if(option.id!==answer[field.id])expect(gradeField(field,option.id).correct).toBe(false);
    }
    signs.add(Math.sign(dot));
  }
  expect([...signs].sort()).toEqual([-1,0,1]);
});

it("handles orthogonal, parallel, opposite, and zero vectors with independent exact anchors",()=>{
  const x:Vector3=[1,0,0],y:Vector3=[0,1,0],zero:Vector3=[0,0,0];
  expect(vectorResults(x,y).cross).toEqual([0,0,1]);
  expect(vectorResults(y,x).cross).toEqual([0,0,-1]);
  expect(vectorResults([3,4,0],[-2,1,2])).toMatchObject({sum:[1,5,2],dot:-2,cross:[8,-6,11],magnitudeA:5,magnitudeB:3,projectionOnB:-2/3});
  expect(vectorResults(x,[-1,0,0])).toMatchObject({sum:zero,cross:zero,dot:-1,magnitudeSum:0,projectionOnB:-1});
  expect(vectorResults(x,zero).projectionOnB).toBeNull();
  expect(vectorResults(zero,x).projectionOnB).toBe(0);
  expect(vectorResults([2,4,6],[1,2,3]).cross).toEqual(zero);
  expect(()=>vectorResults([11,0,0],x)).toThrow();
  expect(()=>vectorResults([NaN,0,0],x)).toThrow();
  expect(()=>vectorResults([.5,0,0],x)).toThrow();
});

it("accepts equivalent exact vector components and rejects sign and missing-direction errors",()=>{
  const q=phs231VectorQuestion("phs231-vector-components","unit","0","q");
  const p=q.parameters,S=p.ax*p.ax+p.ay*p.ay+p.az*p.az;
  const answer={magnitude:`sqrt(${S})`,x:`${p.ax}*sqrt(${S})/${S}`,y:`${p.ay}*sqrt(${S})/${S}`,z:`${p.az}*sqrt(${S})/${S}`};
  expect(gradeQuestion(q,answer).correct).toBe(true);
  const bad=Object.entries({x:p.ax,y:p.ay,z:p.az}).find(([,n])=>n!==0)!;
  expect(gradeQuestion(q,{...answer,[bad[0]]:`${-bad[1]}/sqrt(${S})`}).correct).toBe(false);
  const z=phs231VectorQuestion("phs231-vector-components","zero","0","q");
  expect(gradeQuestion(z,{x:"0",y:"0",z:"0",magnitude:"0",direction:"positive-x"}).correct).toBe(false);
  for(const family of Object.keys(phs231VectorVariants))expect(()=>phs231VectorQuestion(family,"unknown","0","q")).toThrow();
});
