import { randomFrom } from "../random";
import { choice,num,programQuestion,type ProgramCase } from "../refreshers/programming";
export const f10FunctionFamilyIds=["f10-function","f10-mutation"];
export function f10FunctionCase(family:string,variant:string,seed:string):ProgramCase{
 const r=randomFrom(seed),a=r.integer(-5,6),k=r.integer(2,5),b=r.integer(1,4),p={a,k,b};
 const make=(intro:string,code:string,fields:ProgramCase["fields"],checks:Record<string,string>,explanation:string[]):ProgramCase=>({intro,code,fields,checks,explanation,parameters:p});
 if(family==="f10-mutation"){
  if(!["alias","copy","rebind","audit"].includes(variant))throw Error("Unknown mutation variant");
  const modes=variant==="audit"?["alias","copy","rebind"]:[variant],fields:ProgramCase["fields"]=[],checks:Record<string,string>={},parts:string[]=[];
  modes.forEach((mode,i)=>{
   const init=mode==="copy"?"work = items[:]":mode==="rebind"?`work = [items[0] + ${b}, items[1]]`:"work = items";
   const update=mode==="rebind"?"":`\n    work[0] = work[0] + ${b}`;
   parts.push(`def change${i}(items):\n    ${init}${update}\n    return work[0]\noriginal${i} = [${a}, ${k}]\nresult${i} = change${i}(original${i})`);
   fields.push(num("result"+i,`Returned result${i}`,a+b),num("caller"+i,`original${i}[0] after the call`,mode==="alias"?a+b:a));checks["result"+i]=`result${i}`;checks["caller"+i]=`original${i}[0]`;
  });
  return make("Track which names share a list. Each original list starts independently. Copies here contain only immutable numbers.",parts.join("\n\n"),fields,checks,["work = items aliases the same list, so element mutation is visible to the caller.","items[:] creates a shallow copy. Rebinding work to a new list also leaves the original list unchanged.","A shallow copy would still share nested mutable objects; these exercises use flat numeric lists."]);
 }
 if(family!=="f10-function"||!["call","local","early","none","contract","audit"].includes(variant))throw Error("Unknown function case");
 if(variant==="none")return make("Distinguish printed output from a returned value.",`def show(value):\n    print(value * ${k})\nresult = show(${a})`,[num("printed","Printed number",a*k),choice("returned","Value of result","none",[["none","None","Reaching the end without return yields None."],["printed","The printed number","Printing writes output; it does not return that number."],["zero","0","Missing return does not imply a numerical zero."]])],{printed:"int(__stdout__.strip())",returned:"'none' if result is None else 'printed'"},[`The printed output is ${a*k}, while result is None.`,"Use return when the caller needs a computed value."]);
 if(variant==="contract"){
  const list=[a,k,b],sum=a+k+b;return make("A mean function requires at least one numeric item. Trace this valid call and assess the empty-input precondition.",`def mean(items):\n    return sum(items) / len(items)\nitems = [${list.join(", ")}]\nresult = mean(items)`,[num("mean","Returned mean",`${sum}/3`),choice("empty","Does mean([]) meet this contract?","no",[["no","No; the denominator would be zero","The nonempty precondition prevents division by zero."],["yes","Yes; its mean is zero","An empty total may be zero, but its count is also zero."],["none","Yes; Python automatically returns None","The division raises an exception before a return value is produced."]])],{mean:"result"},["The mean is the sum divided by the count; this list has three items.","An empty list violates the stated precondition. The caller must validate or handle it explicitly."]);
 }
 if(variant==="call")return make("Trace two calls with distinct arguments.",`def scale(value, factor):\n    return value * factor\nfirst = scale(${a}, ${k})\nsecond = scale(${b}, ${k})`,[num("first","First call result",a*k),num("second","Second call result",b*k)],{first:"first",second:"second"},["Each call binds its own parameter values, then returns the product."]);
 if(variant==="early")return make("A return ends the current function call.",`def classify(value):\n    if value < 0:\n        return -1\n    return value + ${b}\nresult = classify(${a})`,[num("result","Returned result",a<0?-1:a+b)],{result:"result"},["If the condition is true, return -1 exits before the later return can run."]);
 const audit=variant==="audit";return make("A local numeric rebinding does not replace the caller's binding.",`def adjust(x):\n    x = x + ${b}\n    return x * ${k}\nx = ${a}\nresult = adjust(x)`+(audit?`\ndef sign_or_shift(value):\n    if value < 0:\n        return -1\n    return value + ${b}\nearly = sign_or_shift(x)`:""),[num("result","Returned result",(a+b)*k),num("caller","Caller x after the call",a),...(audit?[num("early","Early-return result",a<0?-1:a+b),choice("definition","Does defining a function by itself execute its body?","no",[["no","No; a call executes the body","def creates the function; a later call runs its statements."],["yes","Yes; every definition runs the body immediately","Do not confuse a definition with a function call."]])]:[])],{result:"result",caller:"x",...(audit?{early:"early"}:{})},[`The local x becomes ${a+b}, so the return value is ${(a+b)*k}. The caller's x remains ${a}.`,"Each call has local bindings. Returning passes a value back to the caller; it does not rename the caller's variables."]);
}
export function f10FunctionQuestion(family:string,variant:string,seed:string,id:string){return programQuestion(family,id,"m01-l03",f10FunctionCase(family,variant,seed));}

