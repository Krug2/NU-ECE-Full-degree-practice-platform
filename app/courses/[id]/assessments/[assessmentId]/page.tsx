import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/ui";
import { AttemptRunner } from "@/components/learning/attempt-runner";
import { phs231Assessment,phs231Assessments } from "@/lib/learning/courses/phs-231-assessments";
import { lessons } from "@/lib/learning/catalog";
import plan from "@/content/course-plans/phs-231/overview.json";
import "@/components/learning/learning.css";

type Params=Promise<{id:string;assessmentId:string}>;
export function generateStaticParams(){return phs231Assessments.map(item=>({id:"phs-231",assessmentId:item.id}));}
export async function generateMetadata({params}:{params:Params}){
  const {id,assessmentId}=await params;
  return {title:id==="phs-231"?phs231Assessment(assessmentId)?.assessment.title??"Assessment not found":"Assessment not found"};
}
export default async function AssessmentPage({params}:{params:Params}){
  const {id,assessmentId}=await params,definition=id==="phs-231"?phs231Assessment(assessmentId):undefined;
  if(!definition)notFound();
  return <><Link className="back-link" href="/courses/phs-231#assessments">Back to PHS 231 assessments</Link>
    <PageHeading eyebrow={"PHS 231 · "+definition.assessment.kind} title={definition.assessment.title}>{definition.description}</PageHeading>
    <p className="notice">{definition.estimatedMinutes} minutes as an unpiloted planning estimate; untimed, with saved breaks. Assessment targets are proposed self-study defaults. They are not an official NU grading policy or a calibrated measure of mastery.</p>
    <section className="panel section-space" aria-labelledby="assessment-conditions"><h2 id="assessment-conditions">Before you begin</h2><ol>{definition.instructions.map(item=><li key={item}><p>{item}</p></li>)}</ol>
      <details><summary>Objectives and targets for this form</summary><ul>{definition.assessment.objectives.map(item=><li key={item.courseId+"/"+item.lessonId}><Link href={`/courses/${item.courseId}/lessons/${item.lessonId}`}>{item.title}</Link>: {item.minimumCorrect} of {item.questionIndices.length} fully correct, including every critical check.</li>)}</ul></details>
    </section>
    {definition.assessment.kind==="readiness"&&<section className="panel section-space"><h2>Academic preparation and available repairs</h2>
      <p>NU publishes this prerequisite wording: “{plan.alignment.publishedPrerequisiteText}.” Its alternatives are unparenthesized; NU determines enrollment eligibility. This screen does not complete or waive any prerequisite.</p>
      <p>Our recommended preparation is introductory physics, algebra, trigonometry, vectors, differentiation and integration. The available refresher lessons are linked in each result. The introductory mechanics samples link to explanations within PHS 231.</p>
      <ul>{[["phs-104","PHS 104"],["csc-208","CSC 208"],["csc-209","CSC 209"]].map(([courseId,label])=><li key={courseId}><Link href={`/courses/${courseId}`}>{label}</Link>: {lessons.some(item=>item.courseId===courseId)?"See its current lesson availability.":"Course preparation is under construction; no authored lessons are available here yet."}</li>)}<li><Link href="/courses/mth-215/lessons/m01-l03">MTH 215: quadratic equations and admissible roots</Link> is available for algebra repair.</li></ul>
      <a className="text-link" href={plan.alignment.source} target="_blank" rel="noreferrer">Official NU program description</a>
    </section>}
    <section className="panel section-space" id="assessment" aria-labelledby="assessment-work"><h2 id="assessment-work">Your saved form</h2><AttemptRunner lesson={definition} showHistory/></section>
    <p className="section-space"><Link className="button secondary" href="/courses/phs-231#assessments">Return to the course and review plan</Link></p>
  </>;
}
