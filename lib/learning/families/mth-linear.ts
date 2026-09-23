import { questionSchema, type Question } from "../contracts";
import { randomFrom } from "../random";

export const linearFamilyIds = ["mth-linear-balance", "mth-linear-formula", "mth-linear-validity"];
const term = (coefficient: number, variable = "x") => coefficient === 0 ? "0" : coefficient === 1 ? variable : coefficient === -1 ? `-${variable}` : `${coefficient}${variable}`;
const signed = (constant: number) => constant < 0 ? `- ${-constant}` : `+ ${constant}`;

export function linearQuestion(familyId: string, variant: string, seed: string, id: string): Question {
  const rng = randomFrom(seed);
  const base = { id, familyId, familyVersion: 1, courseId: "mth-215", objectiveId: "m01-l01" };
  if (familyId === "mth-linear-balance") {
    if (!["unique", "classify"].includes(variant)) throw new Error("Unknown linear variant");
    const a = rng.integer(2,9), b = rng.integer(-9,9), x = rng.integer(-8,8);
    const c = variant === "unique" ? a - rng.integer(1,5) : a;
    const d = variant === "unique" ? (a-c)*x+b : b + (rng.integer(0,1) ? rng.integer(1,6) : 0);
    const prompt = `$${term(a)} ${signed(b)} = ${term(c)} ${signed(d)}$`;
    if (variant === "unique") return questionSchema.parse({ ...base, parameters:{a,b,c,d}, category:"procedural", critical:false,
      prompt:`Solve ${prompt}. Give the exact value of x.`,
      fields:[{id:"x",kind:"rational",label:"x",expected:String(x)}],
      hints:["Collect the x terms on one side and the constants on the other.",`Subtract $${term(c)}$ and then subtract $${b}$ from both sides.`,`You obtain $${term(a-c)} = ${d-b}$. Divide both sides by $${a-c}$.`],
      explanation:[`Subtracting $${term(c)}$ and $${b}$ from both sides gives $${term(a-c)}=${d-b}$.`,`Since $${a-c}\\ne0$, divide to obtain $x=${x}$.`,`Substitution gives $${a*x+b}$ on the left and $${c*x+d}$ on the right.`], answerSummary:`$x=${x}$`,
    });
    const same = b === d;
    return questionSchema.parse({ ...base, parameters:{a,b,c,d}, category:"conceptual",critical:false,
      prompt:`What is the solution set of ${prompt}?`,
      fields:[{id:"classification",kind:"choice",label:"Solution set",correct:same?"all":"none",options:rng.shuffle([
        {id:"all",label:"All real numbers",feedback:same?"Both sides are the same expression, so every real input works.":"The constant terms differ after the equal x terms are removed."},
        {id:"none",label:"No solution",feedback:same?"The reduced statement is true. It does not impose a restriction on x.":"Removing the equal x terms leaves a false statement."},
        {id:"zero",label:"Only x = 0",feedback:"A missing x term after simplification does not imply x equals zero."},
      ])}],
      hints:["Subtract the x terms from both sides.",`The reduced statement is $${b}=${d}$.`,same?"A statement true regardless of x describes all real solutions.":"A false constant statement cannot be repaired by any choice of x."],
      explanation:[`Subtracting $${term(a)}$ from both sides leaves $${b}=${d}$.`,same?"This identity is true for every real x. The solution set is all real numbers.":"This contradiction is false for every real x. The solution set is empty."],answerSummary:same?"All real numbers":"No solution",
    });
  }
  if (familyId === "mth-linear-formula") {
    if (variant !== "isolate") throw new Error("Unknown formula variant");
    const forms = [
      {equation:"V=IR", target:"R", answer:"R=V/I", wrong:"R=I/V", spokenAnswer:"R equals V divided by I", spokenWrong:"R equals I divided by V", divider:"I", meaning:"voltage, current, and resistance", start:"Divide both sides by I", domain:"I is not zero"},
      {equation:"v=u+at", target:"t", answer:"t=(v-u)/a", wrong:"t=(v+u)/a", spokenAnswer:"t equals (v minus u) divided by a", spokenWrong:"t equals (v plus u) divided by a", divider:"a", meaning:"initial velocity, acceleration, and elapsed time", start:"Subtract u from both sides, then divide by a", domain:"a is not zero"},
      {equation:"P=VI", target:"I", answer:"I=P/V", wrong:"I=V/P", spokenAnswer:"I equals P divided by V", spokenWrong:"I equals V divided by P", divider:"V", meaning:"power, voltage, and current", start:"Divide both sides by V", domain:"V is not zero"},
      {equation:"y=mx+b", target:"x", answer:"x=(y-b)/m", wrong:"x=(y+b)/m", spokenAnswer:"x equals (y minus b) divided by m", spokenWrong:"x equals (y plus b) divided by m", divider:"m", meaning:"a linear input-output model", start:"Subtract b from both sides, then divide by m", domain:"m is not zero"},
    ];
    const form = forms[rng.integer(0,forms.length-1)];
    return questionSchema.parse({ ...base,category:"application",critical:true,
      prompt:`The supplied relationship $${form.equation}$ represents ${form.meaning}. Which rearrangement isolates $${form.target}$, and what condition permits this division?`,
      fields:[
        {id:"formula",kind:"choice",label:"Rearranged formula",correct:"valid",options:rng.shuffle([{id:"valid",label:`$${form.answer}$`,accessibleLabel:form.spokenAnswer,feedback:"The target variable is isolated by applying the same operations to both sides."},{id:"wrong",label:`$${form.wrong}$`,accessibleLabel:form.spokenWrong,feedback:"Check the inverse operation and which quantity is divided by which."}])},
        {id:"restriction",kind:"choice",label:"Required condition",correct:"nonzero",options:rng.shuffle([{id:"nonzero",label:form.domain,feedback:"Division by zero cannot preserve a valid formula."},{id:"none",label:"No condition is needed",feedback:`The division is only valid when ${form.divider} is not zero.`},{id:"positive",label:`${form.divider} must be positive`,feedback:"For the algebraic division, a negative nonzero value also works. Positivity would need a separate physical assumption."}])},
      ],
      hints:["Undo the operations on the target variable in reverse order.",`${form.start}.`,`The formula is $${form.answer}$ and requires $${form.divider}\\ne0$.`],
      explanation:[`${form.start} to obtain $${form.answer}$.`,`The formula requires $${form.divider}\\ne0$. If this quantity is zero, return to the original equation and classify it rather than using the divided form.`],answerSummary:`$${form.answer}$, with $${form.divider}\\ne0$`,
    });
  }
  if (familyId === "mth-linear-validity") {
    if (variant !== "equivalence") throw new Error("Unknown validity variant");
    const a=rng.integer(2,8), b=rng.integer(1,9), x=rng.integer(-5,8), right=a*x+b;
    return questionSchema.parse({ ...base,parameters:{a,b,right},category:"conceptual",critical:true,
      prompt:`Start with $${term(a)}+${b}=${right}$. A learner changes it to $${term(a)}=${right}$ by removing ${b} from the left side only. Is that an equivalent equation?`,
      fields:[{id:"reason",kind:"choice",label:"Reasoning",correct:"both",options:rng.shuffle([
        {id:"both",label:`No. Subtract ${b} from both sides to get $${term(a)}=${right-b}$.`,accessibleLabel:"No. Subtract "+b+" from both sides to get "+a+" times x equals "+(right-b),feedback:"Applying the same subtraction to both sides preserves equality."},
        {id:"one",label:"Yes. Constants can be deleted when isolating a variable.",feedback:"Deleting a constant on one side changes which input satisfies the equation."},
        {id:"divide",label:`No. Instead divide only the left side by ${a}.`,feedback:"Dividing only one side also changes the equation. Apply a valid operation to both sides."},
      ])}],
      hints:["An equivalent equation must have the same solution set.",`Test the original solution $x=${x}$ in the proposed new equation.`,`Subtract ${b} from each side, giving $${term(a)}=${right-b}$.`],
      explanation:[`The original equation has $x=${x}$.`,`Subtracting ${b} from both sides gives $${term(a)}=${right-b}$ and keeps that solution. Removing ${b} only from the left creates a different solution.`],answerSummary:`Subtract ${b} from both sides; $x=${x}$.`,
    });
  }
  throw new Error("This question family is not available.");
}
