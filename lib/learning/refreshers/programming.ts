import { questionSchema,type AnswerField,type Question } from "../contracts";
export type ProgramCase={intro:string;code:string;fields:AnswerField[];checks:Record<string,string>;explanation:string[];parameters:Record<string,number>;error?:string};
export const num=(id:string,label:string,value:number|string):AnswerField=>({id,kind:"rational",label,expected:String(value),unit:"",help:"Enter the requested numerical value. Exact fractions are accepted."});
export const choice=(id:string,label:string,correct:string,options:[string,string,string][]):AnswerField=>({id,kind:"choice",label,correct,help:"Choose from the stated Python behavior.",options:options.map(([id,label,feedback])=>({id,label,feedback}))});
export const truth=(id:string,label:string,value:boolean):AnswerField=>choice(id,label,value?"true":"false",[["true","True","Evaluate the condition with the current values, including equality."],["false","False","Check every comparison and the and/or/not operator."]]);
export const codeBlock=(code:string)=>"```python\n"+code+"\n```";
export function programQuestion(familyId:string,id:string,objectiveId:string,c:ProgramCase):Question{
 return questionSchema.parse({id,familyId,familyVersion:1,courseId:"f10",objectiveId,category:"application",critical:true,prompt:"Use Python 3. "+c.intro+"\n"+codeBlock(c.code),fields:c.fields,parameters:c.parameters,hints:["Write a state table and execute statements in order.","Use the current values, preserve indentation, and check boundaries before applying a rule.",c.explanation[0]],explanation:c.explanation,answerSummary:c.explanation.join(" ")});
}
export function pythonRange(start:number,stop:number,step:number):number[]{
 if(![start,stop,step].every(Number.isSafeInteger)||step===0)throw Error("range needs integer values and a nonzero step");
 const result:number[]=[];for(let v=start;step>0?v<stop:v>stop;v+=step){if(result.length>=100)throw Error("range exceeds the activity limit");result.push(v);}return result;
}

