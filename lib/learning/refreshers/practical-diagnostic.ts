import { z } from "zod";
import { responseSchema,type Question,type Response } from "../contracts";
import { gradeQuestion } from "../grading";
const schema=z.object({format:z.literal("practical-diagnostic-v1"),version:z.number().int().positive(),responses:responseSchema,submittedAt:z.iso.datetime().nullable()}).strict();
export type PracticalDiagnosticRecord=z.infer<typeof schema>;
export const diagnosticDraft=(version:number,responses:Response={}):PracticalDiagnosticRecord=>({format:"practical-diagnostic-v1",version,responses,submittedAt:null});
export function readPracticalDiagnostic(raw:string|undefined,question:Question,version:number):PracticalDiagnosticRecord|null{
 if(!raw)return null;try{const record=schema.parse(JSON.parse(raw));if(record.version!==version||Object.entries(record.responses).some(([id,value])=>!question.fields.some(f=>f.id===id&&f.kind==="choice"&&f.options.some(o=>o.id===value))))return null;if(record.submittedAt&&!gradeQuestion(question,record.responses).valid)return null;return record;}catch{return null;}
}
export function practicalReviewTargets(record:PracticalDiagnosticRecord|null,question:Question,targets:Record<string,string>){
 if(!record?.submittedAt)return [];const result=gradeQuestion(question,record.responses);return question.fields.filter(f=>!result.fields[f.id].correct).map(f=>targets[f.id]).filter((id):id is string=>!!id);
}

