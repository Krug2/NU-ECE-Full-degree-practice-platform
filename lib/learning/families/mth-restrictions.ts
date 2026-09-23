import { questionSchema, type Question } from "../contracts";
import type { Interval } from "../intervals";
import { formatIntervals } from "../intervals";
import { randomFrom } from "../random";

export const restrictionFamilyIds = ["mth-rational-equation", "mth-radical-equation", "mth-original-domain", "mth-squaring-validity"];
const signed = (n:number) => `${n<0?"-":"+"}${Math.abs(n)}`;
const factor = (root:number) => `(x${signed(-root)})`;
const polynomial = (p:number,q:number) => `x^2${signed(-p-q)}x${signed(p*q)}`;
const rootField = (id:string,label:string,expected:number[]) => ({id,kind:"roots",label,numberSystem:"real",expected:expected.map(String),help:"Enter every value separated by commas, or empty if there are none. Order does not matter."});

export function restrictionQuestion(familyId:string,variant:string,seed:string,id:string):Question {
  const rng=randomFrom(seed),base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m01-l04"};
  if(familyId==="mth-rational-equation") {
    if(variant==="identity") {
      const p=rng.integer(1,9)*(rng.integer(0,1)?1:-1);
      const expected:Interval[]=[{lower:null,upper:String(p),lowerClosed:false,upperClosed:false},{lower:String(p),upper:null,lowerClosed:false,upperClosed:false}];
      return questionSchema.parse({...base,parameters:{p},category:"conceptual",critical:true,
        prompt:`Solve $\\frac{x^2-${p*p}}{x${signed(-p)}}=x${signed(p)}$ over the real numbers. Give the entire solution set.`,
        fields:[{id:"domain",kind:"intervals",label:"Solution set",expected,help:"Use interval notation with a union. Keep any original excluded input missing from the set."}],
        hints:[`The denominator excludes $x=${p}$.`,`Factor the numerator as $(x${signed(-p)})(x${signed(p)})$.`,"After cancellation, the equation is an identity on its original domain."],
        explanation:[`For $x\\ne${p}$, cancellation gives $x${signed(p)}=x${signed(p)}$.`,`Every allowed real input therefore solves the equation, but $x=${p}$ remains excluded because the original fraction is undefined there.`],answerSummary:formatIntervals(expected)});
    }
    if(!["one","none","two"].includes(variant))throw new Error("Unknown rational equation variant");
    const p=rng.integer(-6,6),t=rng.integer(1,6),r=variant==="none"?p:p+rng.integer(1,5),s=r+rng.integer(1,5),q=r-t;
    const two=variant==="two", expected=two?[r,s]:variant==="none"?[]:[r];
    const first=two?r:p,second=two?s:q;
    return questionSchema.parse({...base,parameters:{p,q,r,s,t,kind:two?2:variant==="none"?0:1},category:"procedural",critical:true,
      prompt:`Solve $\\frac{${polynomial(first,second)}}{x${signed(-p)}}=${two?0:t}$ over the real numbers. Give the original denominator exclusion as well as the final solution set.`,
      fields:[rootField("roots","Valid solutions",expected),rootField("excluded","Original excluded values",[p])],
      hints:[`The original denominator is zero at $x=${p}$. Record that exclusion before multiplying.`,two?`The numerator factors as $${factor(r)}${factor(s)}$.`:`The numerator factors as $${factor(p)}${factor(q)}$. For $x\\ne${p}$, cancellation leaves $x${signed(-q)}=${t}$.`,two?"Set each numerator factor equal to zero and check the exclusion.":`The transformed equation proposes $x=${r}$. Compare that value with the original exclusion.`],
      explanation:[`The original expression requires $x\\ne${p}$; simplification cannot restore that input.`,two?`For allowed inputs, the fraction is zero precisely when $${factor(r)}${factor(s)}=0$.`:`For allowed inputs, canceling the common factor gives $x${signed(-q)}=${t}$, hence $x=${r}$.`,expected.length?`The candidate${expected.length>1?"s":""} ${expected.join(" and ")} ${expected.length>1?"are":"is"} allowed and ${expected.length>1?"make":"makes"} the original fraction equal to ${two?0:t}.`:`The only candidate $${p}$ makes the original denominator zero, so the solution set is empty.`],
      answerSummary:`Valid solutions: ${expected.length?expected.join(", "):"empty"}. Original excluded value: ${p}.`});
  }
  if(familyId==="mth-radical-equation") {
    if(variant==="double") {
      const n=rng.integer(1,8),m=2*n+1;
      return questionSchema.parse({...base,parameters:{n,m},category:"procedural",critical:true,
        prompt:`Solve $\\sqrt{x+${m}}-\\sqrt{x}=1$ over the real numbers. Check the original equation after both squaring steps.`,
        fields:[rootField("roots","Valid solutions",[n*n])],
        hints:["The real domain is x at least zero. Isolate the first square root before squaring.",`The first squaring gives $x+${m}=1+2\\sqrt{x}+x$.`,`Isolating the remaining radical gives $\\sqrt{x}=${n}$. Square again, then check.`],
        explanation:[`The original domain is $x\\ge0$. Isolating gives $\\sqrt{x+${m}}=1+\\sqrt{x}$.`,`Squaring and canceling x gives $${m-1}=2\\sqrt{x}$, so $x=${n*n}$.`,`The original check is $\\sqrt{${n*n+m}}-\\sqrt{${n*n}}=${n+1}-${n}=1$. This candidate is valid.`],answerSummary:`$x=${n*n}$`});
    }
    if(!["one","two","none"].includes(variant))throw new Error("Unknown radical equation variant");
    const c=rng.integer(-4,4),u=variant==="none"?-rng.integer(1,5):rng.integer(0,5);
    const v=variant==="two"?u+rng.integer(1,4):variant==="none"?u-rng.integer(1,4):-rng.integer(1,5);
    const a=u+v,b=-u*v-a*c,candidates=[c+u,c+v],expected=candidates.filter(x=>x-c>=0),rejected=candidates.filter(x=>x-c<0);
    return questionSchema.parse({...base,parameters:{a,b,c,u,v},category:"procedural",critical:true,
      prompt:`Solve $\\sqrt{${a}x${signed(b)}}=x${signed(-c)}$ over the real numbers. Separate the valid solutions from the extraneous candidates produced by squaring.`,
      fields:[rootField("roots","Valid solutions",expected),rootField("rejected","Extraneous candidates",rejected)],
      hints:[`A principal square root is nonnegative, so a solution needs $x\\ge${c}$ as well as a nonnegative radicand.`,`Set $t=x${signed(-c)}$. Squaring gives $t^2${signed(-a)}t${signed(u*v)}=0$.`,`The squared equation has candidates $x=${candidates[0]}$ and $x=${candidates[1]}$. Test both in the original equation.`],
      explanation:[`Let $t=x${signed(-c)}$. The equation becomes $\\sqrt{${a}t${signed(-u*v)}}=t$, which requires $t\\ge0$.`,`Squaring and factoring gives $(t${signed(-u)})(t${signed(-v)})=0$. Thus $t=${u}$ or $t=${v}$.`,...candidates.map(x=>`At $x=${x}$, the original left side is $\\sqrt{${a*x+b}}=${Math.abs(x-c)}$, while the right side is $${x-c}$. ${x-c>=0?"They agree, so this is a valid solution.":"They differ, so this candidate is extraneous."}`)],
      answerSummary:`Valid solutions: ${expected.length?expected.join(", "):"empty"}. Extraneous candidates: ${rejected.length?rejected.join(", "):"empty"}.`});
  }
  if(familyId==="mth-original-domain") {
    if(!["combined","root-denominator"].includes(variant))throw new Error("Unknown domain variant");
    const h=rng.integer(-6,5),p=h+rng.integer(-2,3),q=p+rng.integer(1,4),denominator=variant==="root-denominator";
    const expected:Interval[]=[];
    let lower=h,closed=!denominator;
    if(!denominator) for(const exclusion of [p,q].filter(value=>value>=h)) {
      if(exclusion>lower)expected.push({lower:String(lower),upper:String(exclusion),lowerClosed:closed,upperClosed:false});
      lower=exclusion;closed=false;
    }
    expected.push({lower:String(lower),upper:null,lowerClosed:closed,upperClosed:false});
    return questionSchema.parse({...base,parameters:{h,p,q,denominator:denominator?1:0},category:"conceptual",critical:true,
      prompt:denominator?`Give the complete real domain of $\\frac1{\\sqrt{x${signed(-h)}}}$.`:`Give the complete real domain of $\\frac{\\sqrt{x${signed(-h)}}}{${factor(p)}${factor(q)}}$.`,
      fields:[{id:"domain",kind:"intervals",label:"Allowed real inputs",expected,help:"Use interval notation, including unions. Parentheses exclude boundaries; brackets include them."}],
      hints:["An even root requires a nonnegative radicand.",denominator?"The root is also a denominator, so it cannot equal zero.":"Every original denominator factor must be nonzero.",denominator?`Together these conditions require $x>${h}$.`:`Start with $x\\ge${h}$ and remove $${p}$ and $${q}$ wherever they belong to that range.`],
      explanation:[denominator?`The radicand must satisfy $x${signed(-h)}>0$, because equality would make the denominator zero.`:`The square root requires $x\\ge${h}$. The denominator excludes $x=${p}$ and $x=${q}$.`,denominator?"The boundary is open even though a square root alone would allow equality.":"Intersect the conditions. Exclusions below the lower boundary do not create additional gaps inside the allowed set.",`The complete domain is ${formatIntervals(expected)}.`],answerSummary:formatIntervals(expected)});
  }
  if(familyId==="mth-squaring-validity") {
    if(variant!=="counterexample")throw new Error("Unknown squaring variant");
    const n=rng.integer(1,12);
    return questionSchema.parse({...base,parameters:{n},category:"conceptual",critical:true,
      prompt:`A learner replaces $x=${n}$ with $x^2=${n*n}$ and claims the solution sets are equal. Give a counterexample that satisfies the squared equation but not the original, and identify the logical error.`,
      fields:[{id:"counterexample",kind:"rational",label:"Counterexample x",expected:String(-n)},{id:"reason",kind:"choice",label:"Why does the reasoning fail?",correct:"sign",options:rng.shuffle([
        {id:"sign",label:"Squaring can erase a sign difference, so the reverse implication needs a check.",feedback:"Equal values have equal squares, but opposite values can also have equal squares."},
        {id:"always",label:"Applying the same operation to both sides always preserves the full solution set.",feedback:"Only a reversible operation on the stated domain guarantees equivalence."},
        {id:"never",label:"Squaring both sides is never a valid step.",feedback:"Squaring can find candidates. The mistake is accepting the reverse implication without checking the original equation."},
      ])}],hints:["Both n and -n square to n².",`Try the value $x=-${n}$.`,"The transformation preserves every original solution but can add new ones."],
      explanation:[`The value $x=-${n}$ satisfies $x^2=${n*n}$ but fails $x=${n}$.`,"Squaring is therefore a one-way implication unless extra sign restrictions make it reversible. Check every resulting candidate against the original equation."],answerSummary:`Counterexample: $x=-${n}$. Squaring can erase a sign difference.`});
  }
  throw new Error("This question family is not available.");
}
