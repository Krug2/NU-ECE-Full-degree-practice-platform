import { choice,num,programQuestion,type ProgramCase } from "./programming";
import type { Question } from "../contracts";
export type ProgrammingMode="state"|"loop"|"function"|"debug";
export type TraceStep={statement:string;state:string;reason:string};
export type ProgrammingModel={question:Question;steps:TraceStep[];tests?:{input:string;expected:number;actual:number;passed:boolean}[]};
const make=(mode:ProgrammingMode,intro:string,code:string,fields:ProgramCase["fields"],steps:TraceStep[],explanation:string[]):ProgrammingModel=>({question:{...programQuestion("guided-programming-"+mode,"programming-"+mode,"investigation",{intro,code,fields,checks:{},parameters:{},explanation}),critical:false},steps});
const bounded=(...n:number[])=>{if(!n.every(v=>Number.isSafeInteger(v)&&Math.abs(v)<=20))throw Error("Use small whole-number controls.");};
export function stateTrace(input:number,threshold:number):ProgrammingModel{
 bounded(input,threshold);const y=input+2,high=y>=threshold,result=high?2*y:y-1;
 return make("state","Predict the final values and which branch runs.",`x = ${input}\ny = x + 2\nif y >= ${threshold}:\n    result = y * 2\nelse:\n    result = y - 1`,[num("y","Predicted y",y),num("result","Predicted result",result),choice("branch","Selected branch",high?"if":"else",[["if","if branch","This branch runs when the inclusive comparison is true."],["else","else branch","This branch runs only when the comparison is false."]])],[
 {statement:`x = ${input}`,state:`x = ${input}`,reason:"Bind the initial value."},
 {statement:"y = x + 2",state:`x = ${input}; y = ${y}`,reason:"Evaluate the right side using the current x."},
 {statement:`y >= ${threshold}`,state:high?"True":"False",reason:"Equality is accepted by >=."},
 {statement:high?"result = y * 2":"result = y - 1",state:`y = ${y}; result = ${result}`,reason:"Only the selected branch executes."}
 ],["Assignments change the current state in order; the comparison selects one branch."]);
}
export function loopTrace(items:number[],threshold:number):ProgrammingModel{
 bounded(threshold,...items);if(items.length>8)throw Error("Use at most eight values.");
 let total=0,count=0;const steps:TraceStep[]=[{statement:"total = 0; count = 0",state:"total = 0; count = 0",reason:"Initialize once before traversal."}];
 for(const value of items){const accepted=value>=threshold;if(accepted){total+=value;count++;}steps.push({statement:`value = ${value}; value >= ${threshold} is ${accepted?"True":"False"}`,state:`total = ${total}; count = ${count}`,reason:accepted?"Add this value and increment the count.":"Skip updates for this value."});}
 steps.push({statement:"loop finished",state:`total = ${total}; count = ${count}`,reason:"No items remain; an empty list never enters the body."});
 return make("loop","Predict the filtered sum and count.",`items = [${items.join(", ")}]\ntotal = 0\ncount = 0\nfor value in items:\n    if value >= ${threshold}:\n        total = total + value\n        count = count + 1`,[num("total","Predicted total",total),num("count","Predicted count",count)],steps,["Check the inclusive comparison separately for each item; rejected values leave the accumulator unchanged."]);
}
export function functionTrace(first:number,increment:number,copy:boolean):ProgrammingModel{
 bounded(first,increment);const result=first+increment,caller=copy?first:result;
 return make("function","Predict the return value and caller's first element after the call. The list contains only numbers.",`def change(items):\n    work = items${copy?"[:]":""}\n    work[0] = work[0] + ${increment}\n    return work[0]\noriginal = [${first}, 5]\nresult = change(original)`,[num("returned","Predicted return",result),num("caller","Predicted original[0]",caller)],[
 {statement:"change(original)",state:`caller original = [${first}, 5]; parameter items names that list`,reason:"The argument binds the parameter to the existing list."},
 {statement:copy?"work = items[:]":"work = items",state:copy?"work names a new flat list; items and original still share the old list":"work, items and original name one list",reason:copy?"A shallow copy has separate element positions.":"Assignment does not copy the list."},
 {statement:`work[0] = work[0] + ${increment}`,state:`work = [${result}, 5]; original = [${caller}, 5]`,reason:"Element mutation affects every alias of the mutated object."},
 {statement:"return work[0]",state:`result = ${result}; original[0] = ${caller}`,reason:"The call ends and supplies the return value."}
 ],["Track objects separately from names. A shallow copy isolates replacements in this flat numeric list."]);
}
export type SumBug="offbyone"|"reset"|"early";
export type SumRepair="unchanged"|"visit-all"|"keep-total"|"return-after";
const repairFor:Record<SumBug,SumRepair>={offbyone:"visit-all",reset:"keep-total",early:"return-after"};
export function faultySum(items:number[],bug:SumBug,repair:SumRepair){
 const fixed=repair===repairFor[bug],limit=!fixed&&bug==="offbyone"?Math.max(0,items.length-1):items.length;let total=0;
 for(let i=0;i<limit;i++){if(!fixed&&bug==="reset")total=0;total+=items[i];if(!fixed&&bug==="early")break;}return total;
}
export function debugTrace(bug:SumBug,repair:SumRepair):ProgrammingModel{
 const fixed=repair===repairFor[bug],items=[2,-1,4],actual=faultySum(items,bug,repair),tests=[[],[1],[1,2],[-2,2],items].map(input=>{const expected=input.reduce((s,v)=>s+v,0),actual=faultySum(input,bug,repair);return{input:JSON.stringify(input),expected,actual,passed:expected===actual};});
 const body=fixed?"    total = 0\n    for value in items:\n        total = total + value\n    return total":bug==="offbyone"?"    total = 0\n    for index in range(len(items) - 1):\n        total = total + items[index]\n    return total":bug==="reset"?"    total = 0\n    for value in items:\n        total = 0\n        total = total + value\n    return total":"    total = 0\n    for value in items:\n        total = total + value\n        return total\n    return total";
 const steps:TraceStep[]=[{statement:"total = 0",state:"total = 0",reason:"The required sum starts with the empty-sum identity."}];let total=0;const limit=!fixed&&bug==="offbyone"?2:3;
 for(let i=0;i<limit;i++){if(!fixed&&bug==="reset")total=0;total+=items[i];steps.push({statement:`process item ${i}: ${items[i]}`,state:`total = ${total}`,reason:!fixed&&bug==="reset"?"The reset discarded the prior total.":"Add the current contribution."});if(!fixed&&bug==="early")break;}
 steps.push({statement:"return total",state:`returned ${actual}; specification expects 5`,reason:fixed?"All items were included.":bug==="offbyone"?"The last index was never visited.":bug==="early"?"The first return ended the call before later items.":"Only the final contribution survived."});
 const model=make("debug",`Contract: return every item's integer sum, with zero for an empty list. Selected repair: ${repair}. A repair aimed at a different fault leaves this fault unchanged. Predict the shown program and the test matrix outcome.`,`def total_items(items):\n${body}\nresult = total_items([2, -1, 4])`,[num("actual","Predicted returned sum",actual),choice("suite","Will all five displayed boundary tests pass?",tests.every(t=>t.passed)?"yes":"no",[["yes","Yes","Every listed actual result must equal its expected result."],["no","No","One counterexample is sufficient to reject this implementation."]])],steps,["Specify the expected result, locate the first divergence and target its cause.","Finite passing tests provide evidence and regression protection, not a proof for every possible input."]);
 return {...model,tests};
}
