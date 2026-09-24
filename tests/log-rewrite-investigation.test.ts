import { expect,it } from "vitest";
import { checkRewriteValue,logRewriteLabCaseSchema,rewriteConclusions } from "../lib/learning/log-rewrite-investigation";
import { inspectLogRewrite } from "../lib/learning/logarithm-rewrites";

const item=(kind:string,input:string)=>logRewriteLabCaseSchema.parse({model:{title:"Compare the original expressions",kind,h:0,k:3},input});
it("checks equivalent exact logarithms without awarding rounded equality",()=>{
  const selected=item("product-domain","4"),result=inspectLogRewrite(selected.model,selected.input);
  for(const answer of ["ln(4)","2ln(2)","log(e,4)"])expect(checkRewriteValue(answer,result.left)).toMatchObject({correct:true,valid:true});
  for(const answer of [String(Math.log(4)),"ln(4)+1e-20","log(4)","undefined"])expect(checkRewriteValue(answer,result.left)).toMatchObject({correct:false,valid:true});
  const zero=inspectLogRewrite(item("shifted-absolute","-1").model,"-1");expect(checkRewriteValue("0.0",zero.left).correct).toBe(true);
});
it("separates undefined expressions from zero, blank and invalid arithmetic",()=>{
  for(const [kind,probe,side] of [["even-power","-1","right"],["canceled-hole","3","left"],["zero-coefficient","0","left"]] as const){
    const result=inspectLogRewrite(item(kind,probe).model,probe),value=result[side];
    for(const answer of ["undefined"," UNDEFINED ","not defined"])expect(checkRewriteValue(answer,value)).toMatchObject({correct:true,valid:true});
    for(const answer of ["0","1","ln(2)"])expect(checkRewriteValue(answer,value)).toMatchObject({correct:false,valid:true,message:expect.stringContaining("undefined")});
    for(const answer of ["","0*ln(-1)","ln(0)","1/0","Math.log(2)"])expect(checkRewriteValue(answer,value)).toMatchObject({correct:false,valid:false});
  }
});
it("preserves the distinction between accidental agreement and a global identity",()=>{
  const selected=item("false-sum","4/3"),result=inspectLogRewrite(selected.model,selected.input);
  expect(result).toMatchObject({conclusion:"agreement",valuesAgreeOnCommonDomain:false,equivalent:false});
  expect(checkRewriteValue("ln(16/3)",result.left).correct).toBe(true);expect(checkRewriteValue("ln(4)+ln(4/3)",result.right).correct).toBe(true);
  expect(rewriteConclusions.find(option=>option.id==="agreement")?.label).toContain("does not prove an identity");
  expect(inspectLogRewrite(selected.model,"2").conclusion).toBe("value-mismatch");
});
it("permits meaningful forbidden-domain probes while validating syntax and control bounds",()=>{
  for(const [kind,input] of [["even-power","0"],["product-domain","-1"],["quotient-domain","3"],["canceled-hole","3"],["zero-coefficient","-1"],["false-sum","-4"]])expect(()=>item(kind,input)).not.toThrow();
  for(const input of ["","1/0","Math.random()","1000001","-1000001"]){const valid=item("even-power","1");expect(logRewriteLabCaseSchema.safeParse({...valid,input}).success).toBe(false);}
  expect(logRewriteLabCaseSchema.safeParse({model:{title:"Invalid",kind:"mixed-bases",h:0,k:3,base:"2",otherBase:"2"},input:"1"}).success).toBe(false);
});
