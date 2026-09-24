import { expect, it } from "vitest";
import { addRational, parseRational } from "../lib/learning/rational";
import { prefixes, convertPrefix, scaleDecimal, decimalNumber, scientificParts, roundAt, roundSignificant, fixedDecimal, significantInfo, dimensions as d, dimensionProduct, dimensionPower, sameDimension, symmetricBounds, combineBounds, percentBound, withinBounds, celsiusKelvin } from "../lib/learning/refreshers/measurement";
it("scales prefixes exactly and reversibly, including signed, zero, case and powered units",()=>{
  for(const a of prefixes)for(const b of prefixes)for(const value of ["-12.5","0","4.7"]){
    const out=convertPrefix(value,a.exponent,b.exponent);
    expect(parseRational(convertPrefix(out,b.exponent,a.exponent))).toEqual(parseRational(value));
    if(value==="0")expect(out).toBe("0");else expect(decimalNumber(out)/(Number(value)*10**(a.exponent-b.exponent))).toBeCloseTo(1,12);
  }
  expect(convertPrefix("1",6,-3)).toBe("1000000000");
  expect(convertPrefix("2.5",-2,0,2)).toBe("1/4000");
  expect(convertPrefix("4",-3,0,3)).toBe("1/250000000");
  expect(convertPrefix("2",-2,0,-1)).toBe("200");
  expect(()=>convertPrefix("1",-12,12,3)).toThrow();
});
it("normalizes scientific and engineering notation independently of decimal point position",()=>{
  for(const value of ["-82000","0.000082","999","1000","0.01","0.0000000000047"]){
    for(const engineering of [false,true]){
      const parts=scientificParts(value,engineering),coefficient=Math.abs(decimalNumber(parts.coefficient));
      expect(coefficient).toBeGreaterThanOrEqual(1);expect(coefficient).toBeLessThan(engineering?1000:10);
      expect(parseRational(scaleDecimal(parts.coefficient,parts.exponent))).toEqual(parseRational(value));
      if(engineering)expect(Math.abs(parts.exponent%3)).toBe(0);
    }
  }
  expect(()=>scientificParts("0")).toThrow();
});
it("rounds exact ties away from zero and preserves precision through carries",()=>{
  for(const [value,place,expected]of [["6.275",-2,"6.28"],["-6.275",-2,"-6.28"],["1.249",-2,"1.25"],["1.245",-2,"1.25"],["0",-2,"0.00"],["1250",2,"1300"]] as const)expect(roundAt(value,place).display).toBe(expected);
  for(let n=-500;n<=500;n++){
    const text=(n/1000).toFixed(3),rounded=roundAt(text,-2),reference=Math.sign(n)*Math.floor((Math.abs(n)+5)/10)/100;
    expect(decimalNumber(rounded.value)).toBe(reference===0?0:reference);
  }
  expect(roundSignificant("9.9995",4).display).toBe("10.00");
  expect(roundSignificant("9.995",3).display).toBe("10.0");
  expect(roundSignificant("9.995",4).display).toBe("9.995");
  expect(roundSignificant("-999.95",4).display).toBe("-1.000 × 10^3");
  expect(roundSignificant("0.00099995",4).display).toBe("0.001000");
  expect(()=>roundSignificant("0",3)).toThrow();expect(()=>roundSignificant("1",0)).toThrow();
  expect(()=>fixedDecimal("1/3",3)).toThrow();
});
it("distinguishes stated digits, ambiguous integers, exact values and the zero reporting place",()=>{
  expect(significantInfo("0.004050")).toMatchObject({count:4,place:-6,reason:"stated"});
  expect(significantInfo("1.200e3")).toMatchObject({count:4,place:0});
  expect(significantInfo("1200")).toMatchObject({count:null,reason:"ambiguous"});
  expect(significantInfo("12.00")).toMatchObject({count:4,place:-2});
  expect(significantInfo("-1.200e3")).toMatchObject({count:4,place:0,value:"-1200"});
  expect(significantInfo("0.00")).toMatchObject({count:null,place:-2,reason:"zero"});
  for(const invalid of ["1/2","NaN","1.2e100","1.2.3"])expect(()=>significantInfo(invalid)).toThrow();
});
it("recovers mechanical and electrical dimensions from defining relationships",()=>{
  expect(dimensionProduct(d.mass,d.acceleration)).toEqual(d.force);
  expect(dimensionProduct(d.force,d.length)).toEqual(d.energy);
  expect(dimensionProduct(d.energy,dimensionPower(d.time,-1))).toEqual(d.power);
  expect(dimensionProduct(d.power,dimensionPower(d.current,-1))).toEqual(d.voltage);
  expect(dimensionProduct(d.voltage,dimensionPower(d.current,-1))).toEqual(d.resistance);
  expect(dimensionProduct(d.resistance,d.capacitance)).toEqual(d.time);
  expect(sameDimension(dimensionProduct(d.velocity,d.time),d.length)).toBe(true);
  expect(sameDimension(dimensionProduct(d.velocity,dimensionPower(d.time,2)),d.length)).toBe(false);
});
it("finds bounds by independent endpoint and interior evaluations, preserving signs and zero exclusions",()=>{
  for(const first of [{lower:"-2",upper:"3"},{lower:"2.9",upper:"3.1"}])for(const second of [{lower:"1.9",upper:"2.1"},{lower:"-4",upper:"-2"}])for(const op of ["sum","difference","product","quotient"] as const){
    const bounds=combineBounds(first,second,op),a=[decimalNumber(first.lower),decimalNumber(first.upper)],b=[decimalNumber(second.lower),decimalNumber(second.upper)];
    const evaluate=(x:number,y:number)=>op==="sum"?x+y:op==="difference"?x-y:op==="product"?x*y:x/y;
    const endpoints=a.flatMap(x=>b.map(y=>evaluate(x,y)));
    expect(decimalNumber(bounds.lower)).toBeCloseTo(Math.min(...endpoints),12);
    expect(decimalNumber(bounds.upper)).toBeCloseTo(Math.max(...endpoints),12);
    for(let i=0;i<=10;i++)for(let j=0;j<=10;j++){
      const v=evaluate(a[0]+(a[1]-a[0])*i/10,b[0]+(b[1]-b[0])*j/10);
      expect(v).toBeGreaterThanOrEqual(decimalNumber(bounds.lower)-1e-12);expect(v).toBeLessThanOrEqual(decimalNumber(bounds.upper)+1e-12);
    }
  }
  expect(combineBounds(symmetricBounds("3",".1"),symmetricBounds("2",".1"),"product")).toEqual({lower:"551/100",upper:"651/100"});
  expect(combineBounds(symmetricBounds("12",".2"),symmetricBounds("5",".1"),"difference")).toEqual({lower:"67/10",upper:"73/10"});
  expect(()=>combineBounds(symmetricBounds("1",".1"),symmetricBounds("0",".1"),"quotient")).toThrow();
  expect(()=>symmetricBounds("1","-.1")).toThrow();
  expect(withinBounds("10.2",{lower:"9.8",upper:"10.2"})).toBe(true);
  expect(percentBound("2.50",".05")).toBe("2");expect(percentBound("-2.50",".05")).toBe("2");expect(percentBound("0",".1")).toBeNull();
});
it("converts temperature values and differences separately, including absolute zero",()=>{
  expect(celsiusKelvin("25")).toBe("5963/20");expect(celsiusKelvin("298.15",false,true)).toBe("25");
  expect(celsiusKelvin("25",true)).toBe("25");expect(celsiusKelvin("-273.15")).toBe("0");
  expect(()=>celsiusKelvin("-274")).toThrow();expect(()=>celsiusKelvin("-1",false,true)).toThrow();
  const t1=parseRational(celsiusKelvin("20")),t2=parseRational(celsiusKelvin("45"));
  expect(addRational(t2,{numerator:-t1.numerator,denominator:t1.denominator})).toEqual(parseRational("25"));
});
