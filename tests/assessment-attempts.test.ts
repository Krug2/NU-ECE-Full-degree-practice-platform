import { afterEach,expect,it,vi } from "vitest";
import { IDBFactory,IDBObjectStore } from "fake-indexeddb";
import { assessmentOutcome,attemptResult,attemptSchema,createAttempt,emptyLearning,learningSchema,updateAttempt,type Attempt,type AssessmentSource } from "../lib/learning/attempts";
import { lessonById } from "../lib/learning/catalog";
import { emptyProgress,parseBackup,progressSchema } from "../lib/progress";
import { openProgressRepository,type ProgressRepository } from "../lib/progress-repository";
import { historyBackupBytes,prepareHistory,storedAttemptSchema } from "../lib/progress-records";

const now="2026-09-24T12:00:00.000Z",submittedAt="2026-09-24T14:00:00.000Z";
function fixture():Attempt{
  return attemptSchema.parse({
    id:crypto.randomUUID(),courseId:"phs-231",lessonId:"quiz-fixture",lessonVersion:1,mode:"checkpoint",status:"active",revision:0,seed:"fixture",startedAt:now,submittedAt:null,position:0,hints:{},
    assessment:{format:"course-assessment-v1",kind:"module",title:"Two objectives",blueprintVersion:1,objectives:[0,1].map(group=>({courseId:"phs-231",lessonId:"m01-l0"+(group+1),lessonVersion:1,title:"Objective "+(group+1),questionIndices:[0,1,2,3].map(index=>index+4*group),minimumCorrect:3,reviewAssessmentId:"review-m01-l0"+(group+1)}))},
    questions:Array.from({length:8},(_,index)=>({id:"q-"+(index+1),familyId:"fixture",familyVersion:1,courseId:"phs-231",objectiveId:index<4?"m01-l01":"m01-l02",category:"procedural",critical:index%4===0,prompt:"Double "+(index+1)+".",fields:[{id:"value",kind:"rational",label:"Doubled value",expected:String(2*(index+1))}],hints:["Add the number to itself.","Multiplication by two is doubling.","Keep the integer exact."],explanation:["Adding the integer twice gives twice its value."],answerSummary:String(2*(index+1))})),
    responses:{"q-1":{value:"2"},"q-2":{value:"4"},"q-3":{value:"6"},"q-4":{value:"8"},"q-5":{value:"10"},"q-6":{value:"12"},"q-7":{value:"14"},"q-8":{value:"16"}},
  });
}
const submit=(attempt:Attempt)=>updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,attempt.revision,current=>({...current,status:"submitted",submittedAt}));
const connections:ProgressRepository[]=[];
afterEach(()=>{connections.forEach(item=>item.close());connections.length=0;vi.restoreAllMocks();});

it("preserves old checkpoint shapes and gives multiobjective forms separate evidence",()=>{
  const old=createAttempt(lessonById("mth-215","m01-l01")!,"checkpoint","legacy");
  expect(Object.hasOwn(old,"assessment")).toBe(false);expect(Object.hasOwn(emptyLearning(),"assessmentResults")).toBe(false);
  expect(parseBackup(JSON.stringify({...emptyProgress(),learning:{...emptyLearning(),attempts:[old]}})).learning.attempts[0]).toEqual(old);
  const attempt=fixture();expect(assessmentOutcome(attempt)?.passed).toBe(false);
  const learning=submit(attempt),saved=learning.attempts[0];
  expect(attemptResult(saved).passed).toBe(false);expect(learning.evidence).toEqual([]);
  expect(assessmentOutcome(saved)).toMatchObject({correct:8,total:8,independent:true,passed:true});
  expect(learning.assessmentResults).toHaveLength(1);
});
it("requires every objective target and all its critical checks despite a high aggregate",()=>{
  const weak=fixture();delete weak.responses["q-7"];delete weak.responses["q-8"];
  expect(assessmentOutcome(submit(weak).attempts[0])).toMatchObject({correct:6,total:8,passed:false,objectives:[{correct:4,passed:true},{correct:2,passed:false}]});
  const critical=fixture();critical.responses["q-1"].value="9";
  expect(assessmentOutcome(submit(critical).attempts[0])).toMatchObject({correct:7,passed:false,objectives:[{correct:3,criticalPassed:false,passed:false},{correct:4,passed:true}]});
  const adequate=fixture();adequate.responses["q-2"].value="9";adequate.responses["q-8"].value="9";
  expect(assessmentOutcome(submit(adequate).attempts[0])).toMatchObject({correct:6,passed:true,objectives:[{correct:3,passed:true},{correct:3,passed:true}]});
});
it("rejects missing duplicate wrong out-of-range and changed objective assignments",()=>{
  const attempt=fixture();
  const mutations:((value:Attempt)=>void)[]=[
    value=>{delete value.assessment;},
    value=>{value.assessment!.objectives[0].questionIndices=[0,1,2];},
    value=>{value.assessment!.objectives[0].questionIndices=[0,1,2,4];},
    value=>{value.assessment!.objectives[0].questionIndices=[0,1,2,8];},
    value=>{value.assessment!.objectives[0].lessonId="m09-l02";},
    value=>{value.assessment!.blueprintVersion=2;},
    value=>{value.hints["q-1"]=1;},
  ];
  for(const mutate of mutations){const invalid=structuredClone(attempt);mutate(invalid);expect(attemptSchema.safeParse(invalid).success).toBe(false);}
  for(const mutate of [
    (value:Attempt)=>{value.assessment!.title="Replacement";},
    (value:Attempt)=>{value.assessment!.objectives[0].minimumCorrect=1;},
    (value:Attempt)=>{value.assessment!.objectives[0].lessonVersion=2;},
    (value:Attempt)=>{value.assessment!.kind="readiness";},
  ])expect(()=>updateAttempt({...emptyLearning(),attempts:[attempt]},attempt.id,0,value=>{mutate(value);return value;})).toThrow("cannot change");
});
it("allows explicitly mapped readiness originals without granting prerequisite evidence",()=>{
  const attempt=fixture();attempt.assessment!.kind="readiness";
  attempt.assessment!.objectives[0].courseId="mth-215";
  for(const question of attempt.questions.slice(0,4))question.courseId="mth-215";
  const valid=attemptSchema.parse(attempt),learning=submit(valid);
  expect(assessmentOutcome(learning.attempts[0])).toMatchObject({correct:8,passed:false});
  expect(learning.evidence).toEqual([]);expect(learning.assessmentResults).toBeUndefined();
  expect(parseBackup(JSON.stringify({...emptyProgress(),learning})).learning).toEqual(learning);
  attempt.questions[0].courseId="missing";attempt.assessment!.objectives[0].courseId="missing";
  for(const question of attempt.questions.slice(0,4))question.courseId="missing";
  expect(progressSchema.safeParse({...emptyProgress(),learning:{...emptyLearning(),attempts:[attempt]}}).success).toBe(false);
  expect(storedAttemptSchema.safeParse({revision:1,data:attempt}).success).toBe(false);
});
it("keeps assistance out of independent summaries even if every answer is correct",()=>{
  for(const hints of [{},{"q-1":1}] as Record<string,number>[]){
    const attempt=fixture();attempt.mode="practice";attempt.hints=hints;
    const learning=submit(attempt);expect(assessmentOutcome(learning.attempts[0])).toMatchObject({correct:8,passed:false,independent:false});
    expect(learning.evidence).toEqual([]);expect(learning.assessmentResults).toBeUndefined();
  }
});
it("retains the latest failure after detail deletion and a later repair cannot rewrite it",()=>{
  const first=fixture();let learning=submit(first);expect(learning.assessmentResults![0].passed).toBe(true);
  const second=fixture();second.responses={};learning={...learning,attempts:[...learning.attempts,second]};
  learning=updateAttempt(learning,second.id,0,current=>({...current,status:"submitted",submittedAt:"2026-09-25T12:00:00.000Z"}));
  expect(learning.assessmentResults).toHaveLength(1);expect(learning.assessmentResults![0]).toMatchObject({attemptId:second.id,passed:false});
  const review=fixture();review.lessonId="review-fixture";review.assessment!.kind="review";
  learning={...learning,attempts:[...learning.attempts,review]};
  learning=updateAttempt(learning,review.id,0,current=>({...current,status:"submitted",submittedAt:"2026-09-26T12:00:00.000Z"}));
  learning={...learning,attempts:[]};
  const restored=parseBackup(JSON.stringify({...emptyProgress(),learning})).learning;
  expect(restored.assessmentResults?.map(item=>[item.assessmentId,item.passed])).toEqual([["quiz-fixture",false],["review-fixture",true]]);
  expect(restored.evidence).toEqual([]);
});
it("freezes generated snapshots and retains current versions separately",()=>{
  const lessons=["m01-l01","m01-l02"].map(id=>lessonById("phs-231",id)!);
  const metadata=fixture().assessment!,slots=lessons.flatMap(lesson=>lesson.checkpoint);
  const source:AssessmentSource={id:"quiz-fixture",courseId:"phs-231",version:1,practice:slots,checkpoint:slots,assessment:metadata};
  const created=createAttempt(source,"checkpoint","two-objectives",new Date(now));
  expect(created.questions.map(item=>item.objectiveId)).toEqual(["m01-l01","m01-l01","m01-l01","m01-l01","m01-l02","m01-l02","m01-l02","m01-l02"]);
  metadata.title="Edited later";slots[0]={familyId:"missing",variant:"missing"};
  expect(created.assessment!.title).toBe("Two objectives");expect(JSON.parse(JSON.stringify(created))).toEqual(created);
  let learning=submit(fixture());const next=fixture();next.lessonVersion=2;next.assessment!.blueprintVersion=2;
  learning={...learning,attempts:[...learning.attempts,next]};
  learning=updateAttempt(learning,next.id,0,current=>({...current,status:"submitted",submittedAt}));
  expect(learning.assessmentResults?.map(item=>item.blueprintVersion)).toEqual([1,2]);
  const broken=structuredClone(learning);broken.assessmentResults![0].objectives[0].correct=0;
  expect(learningSchema.safeParse(broken).success).toBe(false);
});
it("stores assessment summaries atomically in the normalized repository and round-trips exact byte counts",async()=>{
  const factory=new IDBFactory(),name=crypto.randomUUID(),repository=await openProgressRepository({factory,name});connections.push(repository);
  const second=await openProgressRepository({factory,name});connections.push(second);
  const attempt=fixture(),other=createAttempt(lessonById("mth-215","b01")!,"practice","unrelated");
  const data={...emptyProgress(),learning:{...emptyLearning(),attempts:[other,attempt]}};
  await repository.initialize(()=>JSON.stringify(data));
  const saved=await repository.saveAttempt(attempt.id,0,{status:"submitted",submittedAt});
  expect(saved.data.learning.assessmentResults?.[0].passed).toBe(true);
  expect(saved.data.learning.attempts[0]).toEqual(other);
  expect((await second.read(true)).data).toEqual(saved.data);
  const prepared=prepareHistory(saved.data,5);
  expect(historyBackupBytes(prepared.index.data,prepared.index.attempts)).toBe(new TextEncoder().encode(JSON.stringify(saved.data,null,2)).length);
  const deleted=await second.update(current=>({...current,learning:{...current.learning,attempts:current.learning.attempts.filter(item=>item.id!==attempt.id)}}));
  expect((await repository.read(true)).data.learning.assessmentResults).toEqual(saved.data.learning.assessmentResults);
  expect(parseBackup(JSON.stringify(deleted.data))).toEqual(deleted.data);
  await expect(second.saveAttempt(attempt.id,1,{position:1})).rejects.toThrow("another tab");
});
it("rolls back both questions and retained results when a submission write fails",async()=>{
  const repository=await openProgressRepository({factory:new IDBFactory(),name:crypto.randomUUID()});connections.push(repository);
  const attempt=fixture(),original=await repository.initialize(()=>JSON.stringify({...emptyProgress(),learning:{...emptyLearning(),attempts:[attempt]}}));
  vi.spyOn(IDBObjectStore.prototype,"put").mockImplementationOnce(()=>{throw new DOMException("Full","QuotaExceededError");});
  await expect(repository.saveAttempt(attempt.id,0,{status:"submitted",submittedAt})).rejects.toMatchObject({code:"commit"});
  expect(await repository.read(true)).toEqual(original);
  expect((await repository.saveAttempt(attempt.id,0,{status:"submitted",submittedAt})).data.learning.assessmentResults![0].passed).toBe(true);
});
