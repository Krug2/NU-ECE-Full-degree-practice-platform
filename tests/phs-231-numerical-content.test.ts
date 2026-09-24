import { expect,it } from "vitest";
import { lessonSchema } from "../lib/learning/contracts";
import { gradeQuestion } from "../lib/learning/grading";
import data from "../content/lessons/phs-231/m09-l01.json";

it("independently balances the guided first state, power quadrature, and numerical residual",()=>{
  const q=lessonSchema.parse(data).guided.question;
  const mass=.5,stiffness=8,drag=.2,x0=.08,v0=0,dt=.1,oldForce=-stiffness*x0-drag*v0;
  const momentum1=mass*v0+oldForce*dt,v1=momentum1/mass,x1=x0+v0*dt,kinetic=momentum1*momentum1/(2*mass),spring=.5*stiffness*x1*x1;
  const dissipation=(drag*v0*v0+drag*v1*v1)*dt/2,residual=kinetic+spring+dissipation-.5*stiffness*x0*x0;
  expect(kinetic+spring).toBeCloseTo(.029696,14);expect(dissipation).toBeCloseTo(.00016384,14);expect(residual).toBeCloseTo(.00425984,14);
  const response={position:"2/25",velocity:"-16/125",energy:"464/15625",dissipation:"512/3125000",residual:"13312/3125000",claim:"numerical"};
  expect(gradeQuestion(q,response).correct).toBe(true);
  for(const wrong of [{position:".0672"},{velocity:".128"},{energy:".0256"},{dissipation:"0"},{residual:".00393216"},{claim:"source"},{claim:"heat"},{claim:"conserved"}])expect(gradeQuestion(q,{...response,...wrong}).correct).toBe(false);
});
it("checks the worked SI conversion and force-work examples with independent midpoint areas",()=>{
  const integrate=(width:number,a:number,b:number)=>Array.from({length:20},(_,j)=>a+(b-a)*(j+.5)/20).reduce((sum,v)=>sum+v*width/20,0);
  const displacement=integrate(200e-3,100e-2,-50e-2)+integrate(400e-3,-50e-2,50e-2);
  expect(displacement).toBeCloseTo(.05,12);expect(displacement/(600e-3)).toBeCloseTo(1/12,12);
  expect(integrate(2,-2,4)+integrate(1,4,0)).toBeCloseTo(4,12);
  const polynomial=(t:number)=>1+3*t+2*t*t;
  expect(integrate(1,polynomial(0),polynomial(1))+integrate(2,polynomial(1),polynomial(3))).toBeCloseTo(37.5,12);
  const primitive=(t:number)=>t+1.5*t*t+2*t**3/3;
  expect(primitive(3)-primitive(0)).toBe(34.5);
});
it("separates missing observations from an exact zero approximation",()=>{
  const hump=(t:number)=>3*t*(2-t),primitive=(t:number)=>3*t*t-t**3;
  expect(hump(0)).toBe(0);expect(hump(2)).toBe(0);expect(primitive(2)-primitive(0)).toBe(4);
  const q=lessonSchema.parse(data);
  expect(q.prerequisites.some(p=>p.courseId==="f08"&&p.lessonId==="m01-l04")).toBe(true);
  expect(q.prerequisites.some(p=>p.courseId==="csc-208"&&p.note?.includes("under construction"))).toBe(true);
});
