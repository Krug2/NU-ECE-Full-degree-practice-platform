import { expect,it } from "vitest";
import { composeMachines,containsExact,evaluateMachine,inverseMachine,machineDomain,machineRange,machineSchema,realSign,reciprocalMachine,type FunctionMachine } from "../lib/learning/function-machines";
import { equalExact,parseExact } from "../lib/learning/exact-number";
import { formatIntervals } from "../lib/learning/intervals";

const machine=(kind:FunctionMachine["kind"],a="1",h="0",k="0",branch:FunctionMachine["branch"]="all")=>machineSchema.parse({kind,a,h,k,branch});
it("compares rational and radical domain boundaries without floating-point rounding",()=>{
  for(const [input,expected] of [["0",0],["-3",-1],["sqrt(2)-1",1],["1-sqrt(2)",-1],["sqrt(9)-3",0],["1/1000000000000+sqrt(2)-sqrt(2)",1]] as const)expect(realSign(parseExact(input))).toBe(expected);
  expect(containsExact([{lower:"0",upper:"2",lowerClosed:false,upperClosed:true}],parseExact("sqrt(2)"))).toBe(true);
  expect(containsExact([{lower:"0",upper:"2",lowerClosed:false,upperClosed:true}],parseExact("0"))).toBe(false);
  expect(()=>realSign(parseExact("i"))).toThrow("real inputs");
  expect(()=>realSign(parseExact("sqrt(2)+sqrt(3)"))).toThrow("one square-root");
  expect(machineSchema.safeParse({kind:"sqrt",a:"1",h:"0",k:"0",branch:"left"}).success).toBe(false);
  expect(machineSchema.safeParse({kind:"linear",a:"0",h:"0",k:"0"}).success).toBe(false);
  expect(machineSchema.safeParse({kind:"linear",a:"1/0",h:"0",k:"0"}).success).toBe(false);
});
it("stops at the actual failing stage and never repairs a hole by simplifying",()=>{
  const root=machine("sqrt"),square=machine("square"),reciprocal=machine("reciprocal");
  expect(composeMachines(root,square,"-2")).toMatchObject({first:{status:"undefined"},second:null});
  expect(composeMachines(square,root,"-2")).toMatchObject({first:{status:"defined",value:"4"},second:{status:"defined",value:"2"}});
  expect(composeMachines(machine("linear","1","0","-3"),root,"2")).toMatchObject({first:{status:"defined",value:"-1"},second:{status:"undefined"}});
  expect(composeMachines(reciprocal,reciprocal,"0")).toMatchObject({first:{status:"undefined"},second:null});
  expect(composeMachines(reciprocal,reciprocal,"-3")).toMatchObject({first:{value:"-1/3"},second:{value:"-3"}});
  expect(evaluateMachine(machine("square","1","2","3","left"),"3").status).toBe("undefined");
});
it("round-trips linear, restricted-square, radical, and reciprocal inverses on their own domains",()=>{
  for(const kind of ["linear","square","sqrt","reciprocal"] as const)for(const a of ["-3","-1/2","1/2","2"])for(const branch of kind==="square"?["left","right"] as const:["all"] as const){
    const model=machine(kind,a,"2","-3",branch);
    for(let x=-3;x<=7;x++){
      const value=evaluateMachine(model,String(x));
      if(value.status!=="defined")continue;
      const inverse=inverseMachine(model,value.value);
      expect(inverse.status).toBe("defined");
      if(inverse.status==="defined")expect(equalExact(parseExact(inverse.value),parseExact(String(x)))).toBe(true);
    }
    for(let y=-6;y<=6;y++){
      const inverse=inverseMachine(model,String(y));
      if(inverse.status!=="defined")continue;
      const value=evaluateMachine(model,inverse.value);
      expect(value.status).toBe("defined");
      if(value.status==="defined")expect(equalExact(parseExact(value.value),parseExact(String(y)))).toBe(true);
    }
  }
});
it("distinguishes an inverse, a reciprocal, and a non-invertible function",()=>{
  const linear=machine("linear","2","0","3");
  expect(inverseMachine(linear,"7")).toEqual({status:"defined",value:"2"});
  expect(reciprocalMachine(linear,"7")).toEqual({status:"defined",value:"1/17"});
  expect(reciprocalMachine(linear,"-3/2").status).toBe("undefined");
  expect(inverseMachine(machine("square"),"4").status).toBe("no-inverse");
  expect(inverseMachine(machine("square","1","0","0","left"),"4")).toEqual({status:"defined",value:"-2"});
  expect(inverseMachine(machine("square","1","0","0","right"),"-1").status).toBe("undefined");
  expect(formatIntervals(machineDomain(machine("reciprocal","2","3","-1")))).toBe("(-inf, 3) U (3, inf)");
  expect(formatIntervals(machineRange(machine("sqrt","-2","3","-1")))).toBe("(-inf, -1]");
});
