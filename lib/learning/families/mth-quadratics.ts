import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";

export const quadraticFamilyIds = ["mth-quadratic-roots", "mth-quadratic-discriminant", "mth-quadratic-method", "mth-complex-arithmetic"];
const signed = (n: number) => `${n < 0 ? "-" : "+"}${Math.abs(n)}`;
const polynomial = (a: number, b: number, c: number) => `${a}x^2${signed(b)}x${signed(c)}`;
const rootsField = (expected: string[], numberSystem = "complex") => ({ id: "roots", kind: "roots", label: "Distinct roots", numberSystem, expected, help: "Separate roots with commas. Use sqrt(3), i, and * for multiplication; enter empty if there are no roots in the requested number system. Keep values exact." });

export function quadraticQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  const rng = randomFrom(seed);
  const base = { id, familyId, familyVersion: 1, courseId: "mth-215", objectiveId: "m01-l03" };
  if (familyId === "mth-quadratic-roots") {
    if (variant === "factor") {
      const p = rng.integer(-8,8), q = rng.integer(1,4), s = rng.integer(1,4);
      let r = rng.integer(-8,8);
      if (p*s === r*q) r++;
      const a = q*s, b = -p*s-r*q, c = p*r, expected = [`${p}/${q}`, `${r}/${s}`];
      return questionSchema.parse({ ...base, parameters: { a,b,c,p,q,r,s }, category: "procedural", critical: false,
        prompt: `Solve $${polynomial(a,b,c)}=0$ over the real numbers. List every distinct root.`, fields: [rootsField(expected,"real")],
        hints: ["Look for two linear factors whose product has the displayed coefficients.", `A factorization is $(${q}x${signed(-p)})(${s}x${signed(-r)})=0$.`, "Set each factor equal to zero separately, then solve both linear equations."],
        explanation: [`Expanding $(${q}x${signed(-p)})(${s}x${signed(-r)})$ reproduces all three coefficients.`, `The zero-product property gives $${q}x=${p}$ or $${s}x=${r}$.`, `Thus $x=\\frac{${p}}{${q}}$ or $x=\\frac{${r}}{${s}}$. Substituting either root makes one factor zero.`],
        answerSummary: `$\\left\\{\\frac{${p}}{${q}},\\frac{${r}}{${s}}\\right\\}$` });
    }
    if (!["complete", "complex", "repeated"].includes(variant)) throw new Error("Unknown quadratic root variant");
    const h = rng.integer(-6,6), a = rng.integer(1,4), d = [2,3,5,6,7,8,10][rng.integer(0,6)];
    const k = variant === "repeated" ? 0 : variant === "complex" ? -d : d;
    const b = -2*a*h, c = a*(h*h-k);
    const expected = k === 0 ? [String(h)] : [`${h}+sqrt(${k})`, `${h}-sqrt(${k})`];
    const root = k < 0 ? `i\\sqrt{${-k}}` : `\\sqrt{${k}}`;
    return questionSchema.parse({ ...base, parameters: { a,b,c,h,k }, category: "procedural", critical: false,
      prompt: `Solve $${polynomial(a,b,c)}=0$ over the complex numbers. ${k === 0 ? "List the distinct root and its multiplicity." : "List both roots exactly."}`,
      fields: [...[rootsField(expected)], ...(k === 0 ? [{id:"multiplicity",kind:"rational",label:"Multiplicity of the root",expected:"2"}] : [])],
      hints: [`Divide every term by ${a} before completing the square.`, `Move the constant and add $${h*h}$ to both sides, giving $(x${signed(-h)})^2=${k}$.`, k === 0 ? "The same linear factor appears twice." : k < 0 ? "A negative square requires i. Keep the plus and minus branches." : "Take both square-root branches and then undo the shift."],
      explanation: [`After dividing by $${a}$, the equation is $x^2${signed(-2*h)}x=${k-h*h}$.`, `Add $${h*h}$ to both sides: $(x${signed(-h)})^2=${k}$.`, k === 0 ? `The only distinct root is $${h}$, with multiplicity two.` : `Therefore $x=${h}\\pm ${root}$. Substitution gives $(x${signed(-h)})^2=${k}$ for either branch.`, k < 0 ? "These are conjugate complex roots. Neither is an intercept on a real x-axis." : "These real roots agree with the real graph intercepts; a repeated root is only one distinct intercept."],
      answerSummary: k === 0 ? `$x=${h}$, multiplicity 2.` : `$x=${h}\\pm ${root}$.` });
  }
  if (familyId === "mth-quadratic-discriminant") {
    if (variant !== "classify") throw new Error("Unknown discriminant variant");
    const a = rng.integer(1,5)*(rng.integer(0,1) ? 1 : -1), h = rng.integer(-7,7), k = rng.integer(-5,5);
    const b = -2*a*h, c = a*(h*h-k), discriminant = b*b-4*a*c;
    const correct = discriminant > 0 ? "two" : discriminant === 0 ? "one" : "none";
    return questionSchema.parse({...base,parameters:{a,b,c,discriminant},category:"conceptual",critical:true,
      prompt:`For the real graph $y=${polynomial(a,b,c)}$, compute the discriminant and classify its distinct x-intercepts.`,
      fields:[{id:"discriminant",kind:"rational",label:"Discriminant",expected:String(discriminant)},{id:"intercepts",kind:"choice",label:"Distinct real x-intercepts",correct,options:rng.shuffle([
        {id:"two",label:"Two real x-intercepts",feedback:"Two distinct real intercepts require a positive discriminant."},
        {id:"one",label:"One real x-intercept, from a repeated root",feedback:"Exactly one distinct real intercept occurs when the discriminant is zero."},
        {id:"none",label:"No real x-intercepts; two nonreal conjugate roots",feedback:"A negative discriminant gives nonreal roots, so the real graph never meets the x-axis."},
      ])}],
      hints:["The discriminant is b² - 4ac. Keep the sign of each coefficient.",`Compute $(${b})^2-4(${a})(${c})$.`,"Positive gives two real intercepts, zero gives one, and negative gives none."],
      explanation:[`Here $a=${a}$, $b=${b}$, and $c=${c}$, so $D=${discriminant}$.`,discriminant>0?"The square root of D is positive and real. The plus and minus formula branches differ.":discriminant===0?"The square-root term is zero, so the two formula branches coincide in one repeated root.":"The square-root term is nonreal. Complex roots still exist, but they are not real graph intercepts."],
      answerSummary:`$D=${discriminant}$; ${correct==="two"?"two":correct==="one"?"one":"no"} distinct real x-intercepts.`});
  }
  if (familyId === "mth-quadratic-method") {
    if (variant !== "branch") throw new Error("Unknown quadratic method variant");
    const h = rng.integer(-8,8), n = rng.integer(1,8);
    return questionSchema.parse({...base,parameters:{h,n},category:"conceptual",critical:true,
      prompt:`A learner solves $(x${signed(-h)})^2=${n*n}$ and reports only $x=${h+n}$. Give the missing root and explain the step that was omitted.`,
      fields:[{id:"missing",kind:"rational",label:"Missing root",expected:String(h-n)},{id:"reason",kind:"choice",label:"Why is there another root?",correct:"branch",options:rng.shuffle([
        {id:"branch",label:`Both $${n}$ and $-${n}$ square to $${n*n}$.`,feedback:"The principal square root is positive, but solving u² = n² requires both u = n and u = -n."},
        {id:"negative",label:"Every positive root has its negative as another root.",feedback:"A shifted quadratic need not have roots that are opposites. Apply both signs before undoing the shift."},
        {id:"none",label:"Taking the principal square root already gives every solution.",feedback:"The square-root function returns one principal value. The squared equation can have two solutions."},
      ])}],
      hints:["Set u equal to the whole expression being squared.",`The negative branch is $x${signed(-h)}=-${n}$.`,"Undo the shift on both branches, not just the positive branch."],
      explanation:[`The two equations are $x${signed(-h)}=${n}$ and $x${signed(-h)}=-${n}$.`,`They give $x=${h+n}$ and $x=${h-n}$.`,`For the omitted value, $(${h-n}-${h})^2=(-${n})^2=${n*n}$, which verifies it.`],answerSummary:`Missing root: $${h-n}$. Both square-root branches are required.`});
  }
  if (familyId === "mth-complex-arithmetic") {
    if (!["multiply","divide"].includes(variant)) throw new Error("Unknown complex arithmetic variant");
    const a=rng.integer(-5,5), b=rng.integer(1,5)*(rng.integer(0,1)?1:-1), c=rng.integer(1,5), d=rng.integer(1,5);
    const dividing=variant==="divide", denominator=c*c+d*d;
    const real=dividing?a*c+b*d:a*c-b*d, imaginary=dividing?b*c-a*d:a*d+b*c;
    const expected=`(${real}${signed(imaginary)}i)/${dividing?denominator:1}`;
    const left=`(${a}${signed(b)}i)`, right=`(${c}+${d}i)`;
    return questionSchema.parse({...base,parameters:{a,b,c,d,dividing:dividing?1:0},category:"procedural",critical:false,
      prompt:dividing?`Simplify $\\frac{${left}}{${right}}$ exactly.`:`Simplify $${left}${right}$ exactly.`,
      fields:[{id:"value",kind:"exact",label:"Exact complex value",expected,help:"Use i, fractions, parentheses, and * for multiplication. Equivalent exact forms are accepted."}],
      hints:[dividing?"Multiply numerator and denominator by the denominator's conjugate.":"Distribute all four products before combining terms.",dividing?`Use the conjugate $${c}-${d}i$. The denominator becomes $${c*c}+${d*d}$.`:"Replace each i² with -1.","Combine the real terms and the coefficients of i separately."],
      explanation:[dividing?`The conjugate product in the denominator is $(${c}+${d}i)(${c}-${d}i)=${denominator}$.`:`Distributing gives real part $(${a})(${c})-(${b})(${d})$ and imaginary coefficient $(${a})(${d})+(${b})(${c})$.`,dividing?`The numerator becomes $${real}${signed(imaginary)}i$. Divide both terms by $${denominator}$.`:`Thus the result is $${real}${signed(imaginary)}i$.`],
      answerSummary:dividing?`$\\frac{${real}${signed(imaginary)}i}{${denominator}}$`:`$${real}${signed(imaginary)}i$`});
  }
  throw new Error("This question family is not available.");
}
