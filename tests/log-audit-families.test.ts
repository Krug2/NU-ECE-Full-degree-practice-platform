import { expect,it } from "vitest";
import katex from "katex";
import { logAuditQuestion } from "../lib/learning/families/mth-log-audit";
import { gradeQuestion } from "../lib/learning/grading";
import { parseRational } from "../lib/learning/rational";
import { parseIntervals } from "../lib/learning/intervals";

const variants=["invalid-argument","invalid-base","division-confusion","negative-output","boundary-inclusion","composition-domain","canceled-restriction","rounded-boundary","operating-window","mixed"];
it.each(variants)("independently checks %s reasoning and preserves original restrictions",variant=>{
  const modes=new Set<number>(),flags=new Set<number>(),signs=new Set<number>();
  for(let seed=0;seed<(variant==="mixed"?200:50);seed++){
    const q=logAuditQuestion("mth-log-audit",variant,"log-audit-"+seed,"q-1"),p=q.parameters,{mode,flag,b,h,c,k,u,digits}=p,domain=c>0?"("+h+",inf)":"(-inf,"+h+")",n=BigInt(-p.p),argument=BigInt(p.bd)**n+"/"+BigInt(p.bn)**n;
    let expected:Record<string,string>;
    if(mode===0)expected={argument:flag===0?"0":String(-Math.abs(c)*u),domain,valid:"no",witness:h+"+1/("+c+")","witness-value":"0"};
    else if(mode===1)expected={argument:String(b*b),reason:flag===1?"one":"nonpositive",valid:"no",repaired:"2"};
    else if(mode===2)expected={quotient:"1/"+BigInt(b)**BigInt(1-p.p),logarithm:String(p.p),power:argument,rule:"no"};
    else if(mode===3)expected={argument,value:String(p.p),domain:"(0,inf)",range:"R",valid:"yes"};
    else if(mode===4)expected={domain,range:"R","boundary-argument":"0","anchor-x":h+"+1/("+c+")","anchor-y":String(k),include:"no"};
    else if(mode===5)expected={"first-domain":"R","second-domain":"(0,inf)","first-value":String(p.p),negative:"no",zero:"no"};
    else if(mode===6){const width=b**u,hole=h+width;expected={domain:"("+h+","+hole+") U ("+hole+",inf)","simplified-argument":String(width),"simplified-log":String(u),original:"undefined",restore:"no"};}
    else if(mode===8){
      const numerator=BigInt(k)*BigInt(p.bd)**BigInt(u)+BigInt(p.a)*BigInt(p.bn)**BigInt(u),denominator=BigInt(p.bd)**BigInt(u),first=String(k+p.a),last=numerator+"/"+denominator,increasing=(p.a>0)===(p.bn>p.bd),operating="["+(increasing?first:last)+","+(increasing?last:first)+"]";
      expected={"full-domain":p.a>0?"("+k+",inf)":"(-inf,"+k+")","full-range":"R","operating-domain":operating,"operating-range":"[0,"+u+"]","first-time":"0","last-time":String(u),"probe-time":"-1",allowed:"no"};
      expect(gradeQuestion(q,{...expected,"operating-domain":operating.replace("[","(").replace("]",")")}).correct).toBe(false);
      expect(gradeQuestion(q,{...expected,"operating-range":"(0,"+u+")"}).correct).toBe(false);
    }else{
      const small="1/"+10n**BigInt(digits);expected={"inside-argument":small,"inside-value":String(-digits),inside:"yes","outside-argument":"-"+small,outside:"no",domain,boundary:"no"};
      for(const offset of [-1,1])expect((h+offset*Math.sign(c)/10**digits).toFixed(3)).toBe(h.toFixed(3));
    }
    modes.add(mode);flags.add(flag);signs.add(Math.sign(c));expect(q).toEqual(logAuditQuestion("mth-log-audit",variant,"log-audit-"+seed,"q-1"));expect(q).toMatchObject({objectiveId:"m05-l02",critical:true,familyVersion:1});
    for(const field of q.fields){
      expect(expected[field.id],field.id).toBeDefined();
      if(field.kind==="rational")expect(parseRational(field.expected)).toEqual(parseRational(expected[field.id]));
      else if(field.kind==="intervals")expect(field.expected).toEqual(parseIntervals(expected[field.id]));
      else if(field.kind==="choice")expect(field.correct).toBe(expected[field.id]);else throw new Error("Unexpected logarithm audit field");
    }
    expect(gradeQuestion(q,expected).correct).toBe(true);
    for(const field of q.fields){const wrong=field.kind==="choice"?field.options.find(option=>option.id!==field.correct)!.id:field.kind==="intervals"?"empty":"999999";expect(gradeQuestion(q,{...expected,[field.id]:wrong}).correct).toBe(false);}
    const strings:string[]=[];const collect=(value:unknown):void=>{if(typeof value==="string")strings.push(value);else if(value&&typeof value==="object")Object.values(value).forEach(collect);};collect(q);
    for(const text of strings)for(const match of text.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow();
  }
  expect([...flags].sort()).toEqual([0,1,2]);expect([...signs].sort()).toEqual([-1,1]);if(variant==="mixed")expect([...modes].sort()).toEqual([0,1,2,3,4,5,6,7,8]);
});
it("rejects unknown logarithm reasoning requests",()=>{
  expect(()=>logAuditQuestion("wrong","invalid-argument","seed","q-1")).toThrow("family");expect(()=>logAuditQuestion("mth-log-audit","wrong","seed","q-1")).toThrow("variant");
});
