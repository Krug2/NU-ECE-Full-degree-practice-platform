import numericalData from "../content/lessons/phs-231/m09-l01.json";
import { expect, it } from "vitest";
import katex from "katex";
import { lessonSchema, packSchema } from "../lib/learning/contracts";
import { generateQuestions } from "../lib/learning/generate";
import { gradeQuestion } from "../lib/learning/grading";
import plan from "../content/course-plans/phs-231/modules.json";
import packData from "../content/learning-packs/phs-231.json";
import unitsData from "../content/lessons/phs-231/m01-l01.json";
import vectorData from "../content/lessons/phs-231/m01-l02.json";
import motionData from "../content/lessons/phs-231/m02-l01.json";
import frameData from "../content/lessons/phs-231/m02-l02.json";
import projectileData from "../content/lessons/phs-231/m02-l03.json";
import forceData from "../content/lessons/phs-231/m03-l01.json";
import frictionData from "../content/lessons/phs-231/m03-l02.json";
import dragData from "../content/lessons/phs-231/m03-l03.json";
import circularData from "../content/lessons/phs-231/m04-l01.json";
import gravityData from "../content/lessons/phs-231/m04-l02.json";
import workData from "../content/lessons/phs-231/m05-l01.json";
import energyData from "../content/lessons/phs-231/m05-l02.json";
import impulseData from "../content/lessons/phs-231/m06-l01.json";
import materialsData from "../content/lessons/phs-231/m08-l03.json";
import elasticityData from "../content/lessons/phs-231/m08-l02.json";
import staticsData from "../content/lessons/phs-231/m08-l01.json";
import rollingData from "../content/lessons/phs-231/m07-l03.json";
import angularData from "../content/lessons/phs-231/m07-l02.json";
import rotationData from "../content/lessons/phs-231/m07-l01.json";
import collisionData from "../content/lessons/phs-231/m06-l02.json";

it("keeps the complete mechanics plan distinct from actual lesson availability", () => {
  const pack=packSchema.parse(packData);
  expect(pack.status).toBe("building");
  expect(pack.modules.flatMap(m=>m.lessons)).toHaveLength(22);
  expect(pack.modules.map(m=>m.id)).toEqual(plan.modules.map(m=>m.id));
});

it.each([unitsData, vectorData, motionData, frameData, projectileData, forceData, frictionData, dragData, circularData, gravityData, workData, energyData, impulseData, collisionData, rotationData, angularData, rollingData, staticsData, elasticityData, materialsData, numericalData])("verifies the objective, notation, and deterministic forms for $id",data=>{
    const pack=packSchema.parse(packData);
    const lesson=lessonSchema.parse(data);
    expect(pack.modules.flatMap(m=>m.lessons).find(l=>l.id===lesson.id)?.objective).toBe(lesson.objective);
    const visit=(value:unknown):void=>{
      if(typeof value==="string") { for(const match of value.matchAll(/\$([^$]+)\$/g))expect(()=>katex.renderToString(match[1],{strict:"error",trust:false})).not.toThrow(); }
      else if(value&&typeof value==="object")Object.values(value).forEach(visit);
    };
    visit(lesson);
    for(const example of lesson.examples)for(const step of example.steps)expect(()=>katex.renderToString(step.math,{strict:"error",trust:false})).not.toThrow();
    for(let seed=0;seed<50;seed++)for(const slots of [lesson.practice,lesson.checkpoint]) {
      const qs=generateQuestions(slots,`phs231-content-${seed}`);
      expect(qs).toHaveLength(slots.length);
      expect(new Set(qs.map(q=>q.prompt)).size).toBe(qs.length);
      expect(qs.every(q=>q.courseId===lesson.courseId&&q.objectiveId===lesson.id)).toBe(true);
    }
});

it("separates a documented fracture endpoint from later control and thermal claims",()=>{
  const q=lessonSchema.parse(materialsData).guided.question;
  const strain=[0,.001,.01,.02],stress=[0,100,200,150];
  const density=strain.slice(1).reduce((sum,end,i)=>sum+(end-strain[i])*(stress[i]+stress[i+1])/2,0);
  const force=stress.map(s=>s*10),extension=strain.map(e=>e*.1);
  const work=extension.slice(1).reduce((sum,end,i)=>sum+(end-extension[i])*(force[i]+force[i+1])/2,0);
  expect(density).toBeCloseTo(3.15,12);expect(work).toBeCloseTo(density*1e6*10e-6*.1,12);
  const response={ultimate:String(Math.max(...stress)),last:String(stress.at(-1)),strain:"1/50",work:"63/20",history:"unknown",thermal:"input"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  for(const wrong of [{ultimate:"150"},{last:"200"},{strain:".03"},{strain:"2"},{work:"315"},{history:"zero"},{history:"line"},{history:"last"},{thermal:"heat"},{thermal:"elastic"}])expect(gradeQuestion(q,{...response,...wrong}).correct).toBe(false);
});

it("checks both elastic range bounds before establishing a guided deformation",()=>{
  const q=lessonSchema.parse(elasticityData).guided.question;
  const force=300,area=2e-6,modulus=100e9,gaugeLength=1,stressCap=100e6;
  const demand=force/area,candidateStrain=demand/modulus,lastForce=stressCap*area;
  expect(candidateStrain).toBeLessThan(.002);expect(demand).toBeGreaterThan(stressCap);
  const response={stress:String(demand/1e6),limit:String(stressCap/1e6),force:String(lastForce),extension:String(stressCap/modulus*gaugeLength*1000),model:"unknown"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  for(const wrong of [{stress:"300"},{stress:"0.15"},{limit:"200"},{force:"300"},{extension:"1.5"},{model:"strain"},{model:"double"},{model:"modulus"}])expect(gradeQuestion(q,{...response,...wrong}).correct).toBe(false);
});

it("rejects a balanced statics candidate when the local friction capacity fails",()=>{
  const q=lessonSchema.parse(staticsData).guided.question;
  const a=(60-12)/3,b=120-a,f=-12,capacity=2*a/5;
  expect(a*(1-4)-60*(3-4)-12).toBe(0);
  expect(b*(4-1)-60*(3-1)-60*(4-1)-12).toBe(0);
  expect(a).toBeGreaterThan(0);expect(b).toBeGreaterThan(0);expect(capacity).toBeLessThan(Math.abs(f));
  const response={a:"(60-12)/3",b:"120-(60-12)/3",friction:"-12",capacity:"(2/5)*16",margin:"(2/5)*16-12",model:"friction"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  for(const wrong of [{a:"20"},{capacity:"48"},{margin:"28/5"},{friction:"-32/5"},{model:"total"},{model:"balance"},{model:"clip"}])expect(gradeQuestion(q,{...response,...wrong}).correct).toBe(false);
});

it("checks the rolling contact demand against capacity before solving actual sliding accelerations",()=>{
  const q=lessonSchema.parse(rollingData).guided.question;
  const I=.5*2*.5*.5,G=12,N=16,candidateA=G*.5*.5/(I+2*.5*.5),required=2*candidateA-G,capacity=N/5;
  const actualF=-N/10,a=(G+actualF)/2,alpha=-actualF*.5/I;
  expect(Math.abs(required)).toBeGreaterThan(capacity);
  const response={required:String(required),capacity:String(capacity),acceleration:"(12-16/10)/2",alpha:"(16/10)*(1/2)/(1/4)",regime:"sliding"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  expect(a-.5*alpha).toBeCloseTo(18/5,12);expect(actualF*(a-.5*alpha)).toBeLessThan(0);
  for(const wrong of [{required:"-16/5"},{capacity:"4"},{acceleration:"4"},{alpha:"8"},{regime:"rolling"},{regime:"maximum"},{regime:"rest"}])expect(gradeQuestion(q,{...response,...wrong}).correct).toBe(false);
});

it("checks the guided changing-radius accounts using separate tangential energies and radial work integrals",()=>{
  const q=lessonSchema.parse(angularData).guided.question;
  const I0=1+2*1*1,If=1+2*.5*.5,L=I0*2,free= L/If;
  const response={"free-omega":String(free),"free-work":String(If*free*free/2-I0*4/2),"motor-work":String((If-I0)*4),"radial-work":"-4*(.5^2-1^2)",meaning:"complete"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  const steps=2000,h=(.5-1)/steps;
  let radial=0,freeRadial=0;
  for(let i=0;i<steps;i++){const r=1+(i+.5)*h;radial+=-2*r*4*h;freeRadial+=-2*r*(L/(1+2*r*r))**2*h;}
  expect(radial).toBeCloseTo(3,10);expect(freeRadial).toBeCloseTo(6,6);
  for(const wrong of [{"free-omega":"2"},{"free-work":"0"},{"motor-work":"-3"},{"radial-work":"-3"},{meaning:"kinetic"},{meaning:"motor"},{meaning:"rotation"}])expect(gradeQuestion(q,{...response,...wrong}).correct).toBe(false);
});

it("checks the guided rotor by separate mass and moment inventories and a signed velocity integral",()=>{
  const q=lessonSchema.parse(rotationData).guided.question;
  const inertia=2/2+1+2/4,torque=6/2-1,alpha=torque/inertia,omega=-1+2*alpha;
  const response={inertia:String(inertia),torque:String(torque),alpha:String(alpha),omega:"-1+2*(2/(2/2+1+2/4))",meaning:"reversal"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  expect(1/alpha).toBe(5/4);expect(1/alpha).toBeLessThan(2);expect(omega).toBeCloseTo(3/5,12);
  for(const wrong of [{inertia:"3"},{torque:"4"},{alpha:"-4/5"},{omega:"-3/5"},{meaning:"hold"},{meaning:"slows"},{meaning:"radial"}])expect(gradeQuestion(q,{...response,...wrong}).correct).toBe(false);
});

it("checks the guided oblique collision using momentum and separation equations, then a direct energy sum",()=>{
  const q=lessonSchema.parse(collisionData).guided.question;
  const separation=(4+1)/2,ax=(5-3*separation)/5,bx=ax+separation;
  const loss=20-(ax*ax+1)-3*(bx*bx+1)/2;
  const response={ax:String(ax),ay:"1",bx:String(bx),by:"-1",loss:String(loss),meaning:"normal"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  expect(2*ax+3*bx).toBe(5);expect(2*1+3*(-1)).toBe(-1);
  for(const wrong of [{ay:"-1/2"},{by:"1/2"},{loss:"0"},{meaning:"both"},{meaning:"elastic"},{meaning:"individual"}])expect(gradeQuestion(q,{...response,...wrong}).correct).toBe(false);
});

it("checks guided contact impulse from mean acceleration and distinguishes histories with the same area",()=>{
  const q=lessonSchema.parse(impulseData).guided.question;
  const meanAcceleration=(2+4)/.1,meanFloor=.5*meanAcceleration+.5*10;
  const response={net:"(.5*60)*.1",gravity:"-.5*10*.1",contact:"35*.1",mean:String(meanFloor),peak:"unknown"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  const constantArea=35*.1,triangleArea=.5*70*.1;
  expect(constantArea).toBe(triangleArea);
  for(const wrong of [{contact:"3"},{gravity:".5"},{mean:"30"},{peak:"net"},{peak:"peak"}])expect(gradeQuestion(q,{...response,...wrong}).correct).toBe(false);
});

it("checks the guided energy ledger against separate spring, gravity, and friction work",()=>{
  const q=lessonSchema.parse(energyData).guided.question;
  const springWork=(4+0)/2*.5,gravityWork=-20*.3,frictionWork=-.25*16*.5;
  const K=16+springWork+gravityWork+frictionWork,thermal=-frictionWork;
  const response={thermal:String(thermal),kinetic:String(K),speed:`sqrt(2*${K}/2)`,total:String(K+6+thermal),account:"thermal"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  for(const wrong of [{kinetic:"11"},{thermal:"0"},{total:"15"},{account:"mechanical"},{account:"gravity"}])expect(gradeQuestion(q,{...response,...wrong}).correct).toBe(false);
});

it("checks guided work using a force-equation trajectory and rejects endpoint-only reachability",()=>{
  const q=lessonSchema.parse(workData).guided.question;
  const t=Math.log(5/2),x=2*(Math.exp(t)-1),v=2*Math.exp(t),a=2*Math.exp(t);
  expect(x).toBeCloseTo(3);expect(2*a).toBeCloseTo(4+2*x);
  const kinetic=v*v,work=kinetic-4,power=2*a*v;
  const response={work:String(work),kinetic:String(kinetic),speed:"sqrt(2*25/2)",power:String(power),reach:"whole"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  for(const incorrect of [{work:"30"},{kinetic:"21"},{speed:"-5"},{power:"21"},{reach:"endpoint"},{reach:"direction"}])expect(gradeQuestion(q,{...response,...incorrect}).correct).toBe(false);
});

it("checks the guided orbital radius, period, and weightlessness using independent force balance",()=>{
  const q=lessonSchema.parse(gravityData).guided.question;
  const response={radius:"2+6",field:"72/64",speed:"sqrt(9)",period:"2*pi*8/3",scale:"0",reason:"freefall"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  expect(gradeQuestion(q,{...response,radius:"6"}).correct).toBe(false);
  expect(gradeQuestion(q,{...response,field:"0"}).correct).toBe(false);
  expect(gradeQuestion(q,{...response,reason:"outward"}).correct).toBe(false);
});

it("checks guided contact loss against the actual force inventory",()=>{
  const q=lessonSchema.parse(circularData).guided.question;
  const response={radial:"25/5",required:"2*5-20",actual:"0",acceleration:"20/2",contact:"lost"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  expect(gradeQuestion(q,{...response,actual:"-10"}).correct).toBe(false);
  expect(gradeQuestion(q,{...response,acceleration:"5"}).correct).toBe(false);
  expect(gradeQuestion(q,{...response,contact:"same"}).correct).toBe(false);
});

it("checks the guided drag transient using a convergent exponential series and the original force equation",()=>{
  const q=lessonSchema.parse(dragData).guided.question;
  let term=1,sum=1;for(let n=1;n<=18;n++){term/=-n;sum+=term;}
  const v=20*(1-sum),a=10-.5*v;
  const response={terminal:"10/.5",tau:"1/.5",velocity:v.toFixed(6),acceleration:a.toFixed(6),meaning:"balance"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  expect(gradeQuestion(q,{...response,velocity:"20"}).correct).toBe(false);
  expect(gradeQuestion(q,{...response,meaning:"one-tau"}).correct).toBe(false);
});

it("checks both guided coupled-body equations and rejects the wrong friction regime",()=>{
  const q=lessonSchema.parse(frictionData).guided.question;
  const response={friction:"-1/5*20",acceleration:"(10-4)/3",tension:"10-2",regime:"sliding"};
  expect(8-4).toBe(2*2);expect(10-8).toBe(1*2);
  expect(gradeQuestion(q,response).correct).toBe(true);
  expect(gradeQuestion(q,{...response,friction:"-12"}).correct).toBe(false);
  expect(gradeQuestion(q,{...response,regime:"rest"}).correct).toBe(false);
  expect(gradeQuestion(q,{...response,tension:"10"}).correct).toBe(false);
});

it("checks the guided force inventory, constraint, and third-law recipient independently",()=>{
  const q=lessonSchema.parse(forceData).guided.question;
  const response={normal:"30-6",ax:"12/3",ay:"(24+6-30)/3",partner:"cart-actuator"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  expect(gradeQuestion(q,{...response,normal:"30"}).correct).toBe(false);
  expect(gradeQuestion(q,{...response,partner:"weight"}).correct).toBe(false);
  expect(gradeQuestion(q,{...response,ax:"12"}).correct).toBe(false);
});

it("checks the future projectile event and retains signs in the guided fixture",()=>{
  const q=lessonSchema.parse(projectileData).guided.question;
  const response={time:"3",displacement:"-4*3",vy:"10-10*3",top:"horizontal"};
  expect(15+10*3-5*3*3).toBe(0);
  expect(gradeQuestion(q,response).correct).toBe(true);
  expect(gradeQuestion(q,{...response,time:"-1"}).correct).toBe(false);
  expect(gradeQuestion(q,{...response,vy:"20"}).correct).toBe(false);
  expect(gradeQuestion(q,{...response,top:"rest"}).correct).toBe(false);
});

it("checks the observer chain and exact relative speed in the guided frame fixture",()=>{
  const q=lessonSchema.parse(frameData).guided.question;
  const answer={x:"5-2",y:"-2-1",z:"1-(-1)",speed:"sqrt(9+9+4)",acceleration:"same"};
  expect(gradeQuestion(q,answer).correct).toBe(true);
  expect(gradeQuestion(q,{...answer,y:"-1"}).correct).toBe(false);
  expect(gradeQuestion(q,{...answer,acceleration:"subtract"}).correct).toBe(false);
});

it("checks signed motion areas in the guided fixture and rejects a sign-only speed rule",()=>{
  const q=lessonSchema.parse(motionData).guided.question;
  const positiveArea=4*2/2,negativeArea=-2*1/2;
  const response={displacement:String(positiveArea+negativeArea),distance:String(positiveArea-negativeArea),position:String(-2+positiveArea+negativeArea),speed:"growing"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  expect(gradeQuestion(q,{...response,distance:response.displacement}).correct).toBe(false);
  expect(gradeQuestion(q,{...response,speed:"shrinking"}).correct).toBe(false);
});

it("checks the guided vector products independently and rejects reversed order", () => {
  const q=lessonSchema.parse(vectorData).guided.question;
  const answer={dot:"2*0-3+0*4",x:"-1*4",y:"-2*4",z:"2*3",swap:"cross-sign"};
  expect(gradeQuestion(q,answer).correct).toBe(true);
  expect(gradeQuestion(q,{...answer,x:"4",y:"8",z:"-6"}).correct).toBe(false);
  expect(gradeQuestion(q,{...answer,swap:"both-sign"}).correct).toBe(false);
});

it("checks the guided measurement fixture and rejects reversed or statistical interpretations", () => {
  const q=lessonSchema.parse(unitsData).guided.question;
  const response={lower:"2.9/2.1",upper:"3.1/1.9",meaning:"allowed"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  expect(gradeQuestion(q,{...response,lower:response.upper,upper:response.lower}).correct).toBe(false);
  expect(gradeQuestion(q,{...response,meaning:"standard"}).correct).toBe(false);
  expect(gradeQuestion(q,{...response,meaning:"constant"}).correct).toBe(false);
});
