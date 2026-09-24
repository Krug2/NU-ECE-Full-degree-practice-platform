import { describe, expect, it } from "vitest";
import { rollingInputSchema, rollingRun, type RollingInput } from "../lib/learning/phs-231-rolling";

const base:RollingInput={mass:2,radius:.5,beta:.5,slope:.75,gravity:10,muStatic:.3,muKinetic:.2,force:0,couple:0,v0:0,omega0:0,duration:2};
const near=(a:number,b:number)=>expect(Math.abs(a-b)).toBeLessThanOrEqual(2e-8*Math.max(1,Math.abs(b)));
const integrate=(f:(t:number)=>number,a:number,b:number,n=100)=>{const h=(b-a)/n;let s=f(a)+f(b);for(let j=1;j<n;j++)s+=(j%2?4:2)*f(a+j*h);return s*h/3;};

describe("rolling demand, actual Coulomb contact, and piecewise transitions",()=>{
  it("matches passive rolling, insufficient traction, and an uphill reversal without changing friction direction",()=>{
    const r=rollingRun(base);
    expect([r.inertia,r.normal,r.requiredFriction,r.staticLimit,r.feasible]).toEqual([.25,16,-4,4.8,true]);
    expect(r.phases).toHaveLength(1);expect(r.events).toHaveLength(0);
    expect(r.final).toMatchObject({kind:"rolling",acceleration:4,alpha:8,x:8,v:8,angle:16,omega:16,translationKinetic:64,rotationKinetic:32,totalKinetic:96,gravityWork:96,heat:0,slip:0});
    const sliding=rollingRun({...base,muStatic:.2,muKinetic:.1});
    expect(sliding.feasible).toBe(false);expect(sliding.initial.kind).toBe("sliding");
    for(const [key,n] of Object.entries({friction:-1.6,acceleration:5.2,alpha:3.2,x:10.4,v:10.4,omega:6.4,angle:6.4,slip:7.2,totalKinetic:113.28,gravityWork:124.8,heat:11.52}))near(sliding.final[key as keyof typeof sliding.final] as number,n);
    const up=rollingRun({...base,v0:-3,omega0:-6});
    const rest=up.samples.find(s=>s.time===.75)!;expect(rest.v).toBe(0);expect(rest.omega).toBe(0);expect(rest.x).toBe(-9/8);expect(up.samples.every(s=>s.friction===-4&&s.kind==="rolling")).toBe(true);
    expect(up.initialKinetic).toBe(27/2);near(-rest.gravityWork,up.initialKinetic);expect(up.final.v).toBeGreaterThan(0);
  });

  it("handles catching rolling from translation or overspin, including a transition exactly at the endpoint",()=>{
    const level={...base,slope:0,v0:3,omega0:0};
    const r=rollingRun(level);expect(r.events).toEqual([{time:.5,kind:"rolling-starts",v:2,omega:4,x:1.25,angle:1}]);
    expect(r.phases.map(s=>[s.kind,s.friction])).toEqual([["sliding",-4],["rolling",0]]);
    expect(r.final).toMatchObject({v:2,omega:4,x:4.25,angle:7,totalKinetic:6,heat:3,slip:0});
    const spinning=rollingRun({...level,v0:0,omega0:12});
    expect(spinning.events).toEqual([{time:1,kind:"rolling-starts",v:2,omega:4,x:1,angle:8}]);
    expect(spinning.final).toMatchObject({v:2,omega:4,x:3,angle:12,totalKinetic:6,heat:12});
    const endpoint=rollingRun({...level,duration:.5});expect(endpoint.phases).toHaveLength(2);expect(endpoint.phases[1].start).toBe(endpoint.phases[1].end);
    expect(endpoint.final.kind).toBe("rolling");expect(endpoint.final.heat).toBe(3);expect(endpoint.samples.filter(s=>s.time===.5)).toHaveLength(1);
    const short=rollingRun({...level,duration:.25});expect(short.events).toHaveLength(0);expect(short.final.kind).toBe("sliding");expect(short.final.slip).toBe(1.5);
    const reversed=rollingRun({...level,v0:-3});expect(reversed.events[0].time).toBe(.5);expect(reversed.final).toMatchObject({v:-2,omega:-4,x:-4.25,angle:-7,heat:3});
  });

  it("reverses relative slip when zero contact speed cannot be sustained by the available static friction",()=>{
    const r=rollingRun({...base,slope:0,muStatic:.1,muKinetic:.05,force:-9,v0:1,omega0:0,duration:1});
    expect(r.requiredFriction).toBe(3);expect(r.staticLimit).toBe(2);expect(r.feasible).toBe(false);
    expect(r.events[0].kind).toBe("slip-reverses");near(r.events[0].time,1/6);
    near(r.events[0].x,7/72);near(r.events[0].angle,1/36);near(r.events[0].v,1/6);near(r.events[0].omega,1/3);
    expect(r.phases.map(s=>[s.kind,s.friction,s.acceleration,s.alpha])).toEqual([["sliding",-1,-5,2],["sliding",1,-4,-2]]);
    for(const [key,n] of Object.entries({x:-83/72,angle:-7/18,v:-19/6,omega:-4/3,slip:-5/2,totalKinetic:41/4,hubWork:83/8,heat:9/8}))near(r.final[key as keyof typeof r.final] as number,n);
    const eventSample=r.samples.find(s=>s.time===r.events[0].time)!;expect(eventSample.slip).toBe(0);expect(eventSample.kind).toBe("sliding");expect(eventSample.friction).toBe(1);
  });

  it("separates drive direction, friction-free compatibility, equality at the static limit, and startup slip",()=>{
    const hub=rollingRun({...base,slope:0,force:6}),motor=rollingRun({...base,slope:0,couple:3});
    expect(hub.initial).toMatchObject({friction:-2,acceleration:2,alpha:4});expect(motor.initial).toMatchObject({friction:4,acceleration:2,alpha:4});
    const offset=rollingRun({...base,slope:0,force:6,couple:1.5,muStatic:0,muKinetic:0});
    expect(offset.initial).toMatchObject({kind:"rolling",friction:0,acceleration:3,alpha:6});
    const incline=rollingRun({...base,muStatic:0,muKinetic:0,duration:1});expect(incline.final).toMatchObject({kind:"sliding",acceleration:6,alpha:0,v:6,omega:0,x:3,totalKinetic:36,heat:0});
    const level=rollingRun({...base,slope:0,muStatic:0,muKinetic:0,v0:2,omega0:4});expect(level.final).toMatchObject({kind:"rolling",friction:0,v:2,omega:4,heat:0});
    const incompatible=rollingRun({...base,slope:0,muStatic:0,muKinetic:0,v0:2,omega0:0});expect(incompatible.final).toMatchObject({kind:"sliding",friction:0,v:2,omega:0,slip:2,heat:0});expect(incompatible.events).toHaveLength(0);
    for(const shift of [-1e-6,0,1e-6]){const r=rollingRun({...base,muStatic:.25+shift,muKinetic:.2});expect(r.feasible).toBe(shift>=0);expect(r.initial.kind).toBe(shift>=0?"rolling":"sliding");}
  });

  it("preserves the actual initial state when a finite slip reversal is extremely close to time zero",()=>{
    const r=rollingRun({...base,mass:.1,radius:.05,beta:.1,slope:0,muStatic:.001,muKinetic:.0005,force:-50,v0:1e-12,omega0:0});
    expect(r.events[0].time).toBeGreaterThan(0);expect(r.events[0].time).toBeLessThan(1e-14);
    expect(r.samples[0].time).toBe(0);expect(r.initial.time).toBe(0);expect(r.initial.v).toBe(1e-12);expect(r.initial.friction).toBeLessThan(0);
    const event=r.samples.find(s=>s.time===r.events[0].time)!;expect(event).toBeDefined();expect(event.friction).toBeGreaterThan(0);expect(r.samples).toHaveLength(82);
  });

  it("checks 200 deterministic trials with independent force/torque solutions, power quadrature, heat integrals, and impulse balances",()=>{
    const branches=new Set<string>();
    for(let seed=0;seed<200;seed++){
      const p:RollingInput={mass:.5+(seed%7)/2,radius:.25+(seed%4)/4,beta:[.4,.5,1][seed%3],slope:seed%5===0?0:((seed*3)%7)/8,gravity:8+(seed%4),
        muStatic:.1+(seed%6)/10,muKinetic:.05+(seed%2)/25,force:(seed%11)-5,couple:((seed*3)%9)-4,v0:seed%4===0?0:(seed%7)-3,omega0:seed%4===0?0:(seed%9)-4,duration:.5+(seed%7)/4};
      const r=rollingRun(p),I=p.beta*p.mass*p.radius*p.radius,N=p.mass*p.gravity/Math.sqrt(1+p.slope*p.slope),G=p.mass*p.gravity*p.slope/Math.sqrt(1+p.slope*p.slope)+p.force;
      const ar=(G*p.radius+p.couple)*p.radius/(I+p.mass*p.radius*p.radius),fr=p.mass*ar-G;
      near(r.requiredFriction,fr);expect(r.feasible).toBe(Math.abs(fr)<=p.muStatic*N+1e-12);
      let workG=0,workF=0,workM=0,frictionWork=0,heat=0,J=0;
      for(const phase of r.phases){
        branches.add(phase.kind);const u0=phase.initial.v-p.radius*phase.initial.omega,dt=phase.end-phase.start;
        near(p.mass*phase.acceleration,G+phase.friction);near(I*phase.alpha,p.couple-phase.friction*p.radius);
        if(phase.kind==="rolling"){near(phase.acceleration,p.radius*phase.alpha);expect(Math.abs(phase.friction)).toBeLessThanOrEqual(p.muStatic*N+1e-10);}
        const v=(t:number)=>phase.initial.v+phase.acceleration*t,w=(t:number)=>phase.initial.omega+phase.alpha*t;
        workG+=integrate(t=>(G-p.force)*v(t),0,dt);workF+=integrate(t=>p.force*v(t),0,dt);workM+=integrate(t=>p.couple*w(t),0,dt);
        frictionWork+=integrate(t=>phase.friction*(v(t)-p.radius*w(t)),0,dt);J+=integrate(()=>phase.friction,0,dt);
        if(phase.kind==="sliding"){
          heat+=integrate(t=>p.muKinetic*N*Math.abs(v(t)-p.radius*w(t)),0,dt);
          for(const f of [.2,.5,.8])expect(phase.friction*(u0+(phase.acceleration-p.radius*phase.alpha)*dt*f)).toBeLessThanOrEqual(1e-10);
        }
      }
      const s=r.final;
      for(const [actual,expected] of [[s.gravityWork,workG],[s.hubWork,workF],[s.coupleWork,workM],[s.frictionWork,frictionWork],[s.heat,heat],[s.frictionImpulse,J]])near(actual,expected);
      near(s.totalKinetic-r.initialKinetic,workG+workF+workM+frictionWork);
      near(p.mass*(s.v-p.v0),G*p.duration+J);near(I*(s.omega-p.omega0),p.couple*p.duration-p.radius*J);
      for(const row of r.samples){
        expect(row.heat).toBeGreaterThanOrEqual(-1e-8);near(row.energyResidual,0);near(row.linearResidual,0);near(row.angularResidual,0);
        expect(row.totalKinetic).toBeGreaterThanOrEqual(0);near(row.totalKinetic,p.mass*row.v*row.v/2+I*row.omega*row.omega/2);
        if(row.kind==="rolling")expect(row.slip).toBe(0);
      }
      for(const event of r.events){
        branches.add(event.kind);expect(r.samples.some(row=>row.time===event.time)).toBe(true);
        const before=r.phases[0],dt=event.time-before.start;near(event.v,before.initial.v+before.acceleration*dt);near(event.omega,before.initial.omega+before.alpha*dt);near(event.v,p.radius*event.omega);
      }
      expect(r.samples[0].time).toBe(0);expect(r.samples.at(-1)!.time).toBe(p.duration);expect(r.samples.length).toBeGreaterThanOrEqual(81);expect(r.samples.length).toBeLessThanOrEqual(82);
    }
    expect(branches).toEqual(new Set(["rolling","sliding","rolling-starts","slip-reverses"]));
  });

  it("differentiates a marked material-point trajectory and keeps instantaneous contact acceleration",()=>{
    for(const p of [base,{...base,slope:0,v0:3,omega0:0}]){
      const r=rollingRun(p);
      for(const row of r.samples.filter((s,i)=>i%10===5)){
        const phase=r.phases.findLast(s=>row.time>=s.start)!,h=.00001;
        if(Math.min(row.time-phase.start,phase.end-row.time)<h*2)continue;
        const position=(t:number)=>{const dt=t-phase.start,x=phase.initial.x+phase.initial.v*dt+phase.acceleration*dt*dt/2,angle=phase.initial.angle+phase.initial.omega*dt+phase.alpha*dt*dt/2;return [x-p.radius*Math.sin(angle),p.radius*(1-Math.cos(angle))];};
        const low=position(row.time-h),now=position(row.time),high=position(row.time+h);
        for(let axis=0;axis<2;axis++){
          near(row.pointPosition[axis],now[axis]);expect(row.pointVelocity[axis]).toBeCloseTo((high[axis]-low[axis])/(2*h),5);
          expect(row.pointAcceleration[axis]).toBeCloseTo((high[axis]-2*now[axis]+low[axis])/(h*h),3);
        }
        if(row.kind==="rolling"){expect(row.slip).toBe(0);near(row.topVelocity,2*row.v);if(row.omega!==0)expect(row.contactNormalAcceleration).toBeGreaterThan(0);}
      }
    }
  });

  it("converges under an independent impulse time step and remains finite at allowed extremes",()=>{
    const p={...base,slope:0,muStatic:.4,muKinetic:.23,v0:3.2,omega0:0,duration:1.73},reference=rollingRun(p),I=p.beta*p.mass*p.radius*p.radius,N=p.mass*p.gravity;
    for(const count of [4000,8000]){
      const h=p.duration/count;let v=p.v0,w=p.omega0;
      for(let i=0;i<count;i++){
        const freeV=v+p.force*h/p.mass,freeW=w+p.couple*h/I,slip=freeV-p.radius*freeW;
        const demand=-slip/(1/p.mass+p.radius*p.radius/I),J=Math.abs(demand)<=p.muStatic*N*h?demand:-Math.sign(slip)*p.muKinetic*N*h;
        v=freeV+J/p.mass;w=freeW-p.radius*J/I;
      }
      expect(Math.abs(v-reference.final.v)).toBeLessThan(10*h);expect(Math.abs(w-reference.final.omega)).toBeLessThan(20*h);
    }
    for(const patch of [{mass:.1,radius:.05,beta:.1,slope:2,force:50,couple:20,omega0:-40,v0:-10,duration:10},{mass:20,radius:2,beta:1,slope:0,force:-50,couple:-20,omega0:40,v0:10,duration:10}]){
      const r=rollingRun({...base,...patch});
      for(const s of r.samples)for(const v of Object.values(s)){if(typeof v==="number")expect(Number.isFinite(v)).toBe(true);else if(Array.isArray(v))expect(v.every(Number.isFinite)).toBe(true);}
      const scale=Math.max(1,r.final.totalKinetic,Math.abs(r.final.coupleWork));expect(Math.abs(r.final.energyResidual)/scale).toBeLessThan(1e-10);
    }
    for(const patch of [{mass:0},{radius:0},{beta:0},{beta:1.1},{slope:-1},{muStatic:.1,muKinetic:.2},{gravity:0},{duration:0},{omega0:Infinity},{force:NaN},{extra:1}])expect(rollingInputSchema.safeParse({...base,...patch}).success).toBe(false);
  });
});
