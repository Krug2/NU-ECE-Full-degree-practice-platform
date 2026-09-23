import { expect,it } from "vitest";
import katex from "katex";
import { graphFeatureQuestion } from "../lib/learning/families/mth-graph-features";
import { gradeQuestion } from "../lib/learning/grading";
import { evaluatePiecewise } from "../lib/learning/piecewise";
import { formatRational } from "../lib/learning/rational";
import { graphNumber,transformedAnchors } from "../lib/learning/transformations";

function question(family:string,variant:string,seed:number){
  const q=graphFeatureQuestion(family,variant,String(seed),"q1");
  const visit=(value:unknown):void=>{
    if(typeof value==="string")for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
    else if(value&&typeof value==="object")Object.values(value).forEach(visit);
  };
  visit(q);expect(q).toEqual(graphFeatureQuestion(family,variant,String(seed),"q1"));return q;
}
it("offers one formula matching all plotted anchors, including reflected root branches",()=>{
  for(let seed=0;seed<50;seed++)for(const variant of ["quadratic","sqrt"]){
    const q=question("mth-transform-match",variant,seed),{a,h,k}=q.parameters;
    if(q.figure?.kind!=="transformed-function"||q.fields[0].kind!=="choice")throw new Error("Expected a plotted choice");
    const anchors=transformedAnchors(q.figure.model),options={matching:[a,h,k],horizontal:[a,-h,k],vertical:[a,h,-k],reflection:[-a,h,k]};
    const matches=Object.entries(options).filter(([,values])=>anchors.every(point=>{
      const input=graphNumber(point.x)-values[1],output=values[0]*(variant==="quadratic"?input**2:Math.sqrt(input))+values[2];
      return Math.abs(output-graphNumber(point.y))<1e-9;
    })).map(([id])=>id);
    expect(matches).toEqual([q.fields[0].correct]);
    expect(new Set(q.fields[0].options.map(option=>option.label)).size).toBe(4);
    for(const option of q.fields[0].options)expect(gradeQuestion(q,{formula:option.id}).correct).toBe(matches.includes(option.id));
  }
});
it("distinguishes interior turning points from endpoint absolute extrema on a closed domain",()=>{
  const directions=new Set<number>();
  for(let seed=0;seed<50;seed++){
    const q=question("mth-graph-extrema","turns",seed),p=q.parameters;
    if(q.figure?.kind!=="piecewise")throw new Error("Expected segment graph");
    const xs=[p.x0,p.x1,p.x2,p.x3],ys=[p.y0,p.y1,p.y2,p.y3],peak=ys[1]>ys[0]&&ys[1]>ys[2]?1:2,trough=peak===1?2:1;
    for(let i=0;i<4;i++)expect(formatRational(evaluatePiecewise(q.figure.model,String(xs[i]))!.output)).toBe(String(ys[i]));
    for(let i=0;i<3;i++)expect(formatRational(evaluatePiecewise(q.figure.model,String((xs[i]+xs[i+1])/2))!.output)).toBe(String((ys[i]+ys[i+1])/2));
    const max=Math.max(...ys),min=Math.min(...ys);
    const answer={"local-max":String(xs[peak]),"local-min":String(xs[trough]),"absolute-max":String(xs[ys.indexOf(max)]),"absolute-min":String(xs[ys.indexOf(min)]),maximum:String(max),minimum:String(min)};
    expect(gradeQuestion(q,answer).correct).toBe(true);
    expect(gradeQuestion(q,{...answer,"absolute-max":answer["local-max"]}).correct).toBe(false);
    expect(evaluatePiecewise(q.figure.model,String(xs[0]-1))).toBeNull();
    expect(evaluatePiecewise(q.figure.model,String(xs[3]+1))).toBeNull();
    directions.add(p.sign);
  }
  expect([...directions].sort()).toEqual([-1,1]);
});
it("requires every plateau input when an extremum is attained on an interval",()=>{
  for(let seed=0;seed<50;seed++){
    const q=question("mth-graph-extrema","plateau",seed),p=q.parameters;
    const plateau="["+p.x1+","+p.x2+"]",endpoint="["+p.x0+","+p.x0+"]",maximum=Math.max(p.y0,p.y1,p.y2,p.y3),minimum=Math.min(p.y0,p.y1,p.y2,p.y3);
    const answer={maximum:String(maximum),minimum:String(minimum),"max-inputs":p.sign>0?plateau:endpoint,"min-inputs":p.sign>0?endpoint:plateau,constant:plateau};
    expect(gradeQuestion(q,answer).correct).toBe(true);
    const isolated="["+p.x1+","+p.x1+"] U ["+p.x2+","+p.x2+"]";
    expect(gradeQuestion(q,{...answer,[p.sign>0?"max-inputs":"min-inputs"]:isolated}).correct).toBe(false);
  }
});
