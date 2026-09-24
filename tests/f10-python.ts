import { expect } from "vitest";
import { execFileSync } from "node:child_process";
import { parseRational } from "../lib/learning/rational";
import type { ProgramCase } from "../lib/learning/refreshers/programming";
export function verifyPython(cases:ProgramCase[]){
 const script="import contextlib,io,json,sys\nout=[]\nfor c in json.load(sys.stdin):\n    state={}\n    try:\n        with contextlib.redirect_stdout(io.StringIO()):\n            exec(c['code'],state)\n        out.append({'values':{k:eval(v,state) for k,v in c['checks'].items()}})\n    except Exception as e:\n        out.append({'error':type(e).__name__})\njson.dump(out,sys.stdout)\n";
 const results=JSON.parse(execFileSync(process.env.F10_PYTHON!,["-c",script],{input:JSON.stringify(cases.map(c=>({code:c.code,checks:c.checks}))),encoding:"utf8",maxBuffer:8e6,timeout:60000}));
 cases.forEach((c,i)=>{const result=results[i];if(c.error){expect(result.error,c.code).toBe(c.error);return;}expect(result.error,c.code).toBeUndefined();for(const f of c.fields){if(!(f.id in c.checks))continue;const value=result.values[f.id];if(f.kind==="choice")expect(value,c.code).toBe(f.correct);else if(f.kind==="rational")expect(value,c.code).toBeCloseTo(Number(parseRational(f.expected).numerator)/Number(parseRational(f.expected).denominator),10);}});
}


