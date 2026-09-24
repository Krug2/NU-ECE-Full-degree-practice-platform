import { expect, it } from "vitest";
import { approximateExact, parseExact } from "../lib/learning/exact-number";
import { parseRational } from "../lib/learning/rational";
import { coterminalDegrees, principalInverseDegrees, standardDegrees, trigSolutions, trigValue, waveAnchors, type BasicTrigName, type TrigName } from "../lib/learning/refreshers/trig";

const number = (text: string) => { const value=parseRational(text); return Number(value.numerator)/Number(value.denominator); };
it("checks every exact circle coordinate and reciprocal against independent trigonometry and the unit radius", () => {
  for (const degrees of standardDegrees) for (const turns of [-2,-1,0,1,2]) {
    const theta = (degrees+360*turns)*Math.PI/180, sine = Math.sin(theta), cosine = Math.cos(theta);
    expect(coterminalDegrees(degrees+360*turns)).toBe(degrees);
    const x = approximateExact(parseExact(trigValue("cos", degrees)!)).real, y = approximateExact(parseExact(trigValue("sin",degrees)!)).real;
    expect(x*x+y*y).toBeCloseTo(1, 13);
    const expected: Record<TrigName,number|null> = { sin:sine, cos:cosine, tan:Math.abs(cosine)<1e-12?null:sine/cosine, sec:Math.abs(cosine)<1e-12?null:1/cosine, csc:Math.abs(sine)<1e-12?null:1/sine, cot:Math.abs(sine)<1e-12?null:cosine/sine };
    for (const name of Object.keys(expected) as TrigName[]) {
      const value = trigValue(name,degrees+360*turns);
      if (expected[name]===null) expect(value).toBeNull();
      else expect(approximateExact(parseExact(value!)).real).toBeCloseTo(expected[name]!,11);
    }
  }
  expect(()=>trigValue("sin",22)).toThrow("supported standard angle");
});
it("matches all principal inverse branches including endpoints and negative angles", () => {
  for (const degrees of standardDegrees) for (const name of ["sin","cos","tan"] as const) {
    const value=trigValue(name,degrees);
    if(value===null){expect(()=>principalInverseDegrees(name,degrees)).toThrow();continue;}
    const output=approximateExact(parseExact(value)).real;
    const radians=name==="sin"?Math.asin(output):name==="cos"?Math.acos(output):Math.atan(output);
    expect(principalInverseDegrees(name,degrees-720)).toBeCloseTo(radians*180/Math.PI,10);
  }
});
it("enumerates complete scaled solution sets using an independent inverse-and-period oracle", () => {
  for (const name of ["sin","cos","tan"] as BasicTrigName[]) for (const degrees of standardDegrees) {
    const target = trigValue(name,degrees); if(target===null)continue;
    const value=approximateExact(parseExact(target)).real;
    const principal=(name==="sin"?Math.asin(value):name==="cos"?Math.acos(value):Math.atan(value))*180/Math.PI;
    const bases=name==="sin"?[principal,180-principal]:name==="cos"?[principal,-principal]:[principal];
    const period=name==="tan"?180:360;
    for(const frequency of [1,2,3]) for(const shift of [-90,0,60]) for(const closed of [false,true]) {
      const expected=new Set<number>();
      for(const base of bases)for(let k=-12;k<=12;k++){
        const root=(base+period*k)/frequency+shift;
        if(root>=-1e-9&&(closed?root<=360+1e-9:root<360-1e-9))expected.add(Math.round(root*1e8)/1e8);
      }
      const actual=trigSolutions(name,target,frequency,shift,closed).map(number);
      const wanted=[...expected].sort((a,b)=>a-b);
      expect(actual).toHaveLength(wanted.length);
      actual.forEach((root,index)=>expect(root).toBeCloseTo(wanted[index],7));
    }
  }
  expect(trigSolutions("sin","2")).toEqual([]);
  expect(trigSolutions("cos","-2")).toEqual([]);
  expect(()=>trigSolutions("sin","3/10")).toThrow("standard-angle target");
  expect(()=>trigSolutions("sin","i")).toThrow("real target");
  expect(()=>trigSolutions("cos","1/2",0)).toThrow();
});
it("checks signed wave quarter-cycle points, phase, and period independently", () => {
  for(const name of ["sin","cos"] as const)for(const a of [-3,2])for(const b of [-4,-1,1,3])for(const h of ["-3/4","0","1/2"]) {
    const anchors=waveAnchors(a,b,h,1,name), fn=name==="sin"?Math.sin:Math.cos;
    expect(number(anchors[4].inputPi)-number(anchors[0].inputPi)).toBeCloseTo(2/Math.abs(b),12);
    for(const point of anchors)expect(point.output).toBeCloseTo(1+a*fn(b*(number(point.inputPi)-number(h))*Math.PI),11);
    expect(Math.max(...anchors.map(p=>p.output))).toBe(1+Math.abs(a));
    expect(Math.min(...anchors.map(p=>p.output))).toBe(1-Math.abs(a));
  }
  expect(()=>waveAnchors(2,0,"0",1,"sin")).toThrow();
});
