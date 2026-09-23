import { questionSchema,type Question } from "../contracts";
import { randomFrom } from "../random";
import { formatRational,parseRational } from "../rational";
import { formatPolynomial,parsePolynomial } from "../polynomial";
import { formatIntervals,type Interval } from "../intervals";

export const compositionFamilyIds=["mth-compose-values","mth-compose-formula","mth-compose-domain","mth-compose-structure"];
const numeric=(id:string,label:string,expected:string,unit="")=>({id,kind:"rational",label,expected,unit});
const polynomial=(id:string,label:string,expected:string)=>({id,kind:"polynomial",label,expected,form:"expanded",help:"Use an expanded polynomial in x."});
const interval=(id:string,label:string,expected:Interval[])=>({id,kind:"intervals",label,expected,help:"Use interval notation, with U between separate intervals. R means all real numbers."});
const bounds=(lower:number|null,upper:number|null,lowerClosed=false,upperClosed=false):Interval=>({lower:lower===null?null:String(lower),upper:upper===null?null:String(upper),lowerClosed,upperClosed});
const all=()=>[bounds(null,null)];
const table=(label:string,xs:number[],ys:number[])=>"$\\begin{array}{c|rrrr}x&"+xs.join("&")+"\\\\ "+label+"(x)&"+ys.join("&")+"\\end{array}$";
const poly=(source:string)=>formatPolynomial(parsePolynomial(source));
export function compositionQuestion(familyId:string,variant:string,seed:string,id:string):Question{
  const rng=randomFrom(seed),base={id,familyId,familyVersion:1,courseId:"mth-215",objectiveId:"m02-l03",critical:false};
  const a=rng.integer(1,3)*(rng.integer(0,1)?1:-1),b=rng.integer(1,4)*(rng.integer(0,1)?1:-1),c=rng.integer(-4,4),h=rng.integer(-4,4),k=rng.integer(-3,3),input=rng.integer(-4,4);
  const f=a+"x+("+b+")",g="x^2+("+c+")";
  if(familyId==="mth-compose-values"){
    if(!["affine-square","table","signal"].includes(variant))throw new Error("Unknown composition evaluation");
    if(variant==="signal"){
      const numerator=rng.integer(1,5),temperature=rng.integer(0,30),offset=rng.integer(1,3),gain=rng.integer(20,100),bias=rng.integer(-5,5);
      const voltage=formatRational(parseRational("("+numerator+"*"+temperature+"+10*"+offset+")/10")),count=formatRational(parseRational(gain+"*("+voltage+")+("+bias+")"));
      return questionSchema.parse({...base,category:"application",parameters:{numerator,temperature,offset,gain,bias},
        prompt:"A model sensor maps temperature T in degrees C to voltage V by $V=f(T)=\\frac{"+numerator+"}{10}T+"+offset+"$, for 0 <= T <= 30. A converter maps voltage to an unrounded reading in counts by $g(V)="+gain+"V+("+bias+")$ over this sensor's output range. Find the intermediate voltage and g(f("+temperature+")).",
        fields:[numeric("voltage","Intermediate voltage",voltage,"V"),numeric("count","Converter reading",count,"counts")],
        hints:["The temperature enters f first; its voltage output becomes the input to g.","Substitute T = "+temperature+" into f, preserving the exact fraction.","The intermediate voltage is "+voltage+" V."],
        explanation:["The voltage is "+voltage+" V.","The converter then produces "+count+" counts.","The units determine the order: temperature to voltage to counts. Treating g's count output as a temperature would not match these models."],answerSummary:voltage+" V; "+count+" counts."});
    }
    let fg:number,gf:number,prompt:string,parameters:Record<string,number>;
    if(variant==="table"){
      const xs=rng.shuffle([-4,-3,-2,-1,0,1,2,3,4]).slice(0,4).sort((x,y)=>x-y),fy=rng.shuffle(xs),gy=rng.shuffle(xs),index=rng.integer(0,3),x=xs[index];
      fg=fy[xs.indexOf(gy[index])];gf=gy[xs.indexOf(fy[index])];
      prompt="These tables define the entire finite functions. "+table("f",xs,fy)+" "+table("g",xs,gy)+" Find f(g("+x+")) and g(f("+x+")). Do not interpolate.";
      parameters={input:x,...Object.fromEntries(xs.flatMap((value,i)=>[["x"+i,value],["f"+i,fy[i]],["g"+i,gy[i]]]))};
    }else{
      fg=a*(input*input+c)+b;gf=(a*input+b)**2+c;parameters={a,b,c,input};
      prompt="Let $f(x)="+f+"$ and $g(x)="+g+"$, both on R. Evaluate f(g("+input+")) and g(f("+input+")) exactly.";
    }
    return questionSchema.parse({...base,category:variant==="table"?"conceptual":"procedural",parameters,prompt,
      fields:[numeric("fg","f after g",String(fg)),numeric("gf","g after f",String(gf))],
      hints:["Start at the innermost function.","Feed the first output into the second function, rather than multiplying two outputs.","The two requested outputs are "+fg+" and "+gf+"."],
      explanation:["For f after g, evaluate g at the stated input, then look up or calculate f at that output: "+fg+".","For g after f, reverse those steps: "+gf+".","Agreement at one input would not prove that two compositions agree throughout their domains."],answerSummary:"f after g: "+fg+"; g after f: "+gf+"."});
  }
  if(familyId==="mth-compose-formula"){
    if(!["fg","gf","both"].includes(variant))throw new Error("Unknown composition formula");
    const fg=poly(a+"*x^2+("+(a*c+b)+")"),gf=poly("("+a+"*x+("+b+"))^2+("+c+")");
    const fields=variant==="fg"?[polynomial("fg","f after g",fg)]:variant==="gf"?[polynomial("gf","g after f",gf)]:[polynomial("fg","f after g",fg),polynomial("gf","g after f",gf)];
    return questionSchema.parse({...base,category:"procedural",parameters:{a,b,c},prompt:"Let $f(x)="+f+"$ and $g(x)="+g+"$ on R. Find "+(variant==="both"?"both f(g(x)) and g(f(x))":variant==="fg"?"f(g(x))":"g(f(x))")+" as expanded polynomials. Both compositions have domain R.",
      fields,hints:["Substitute the complete inner rule wherever the outer rule has x.","For f after g, multiply the entire g expression by "+a+" and add "+b+". For g after f, square the entire f expression.","Expand the squared binomial with its middle term."],
      explanation:["$f(g(x))="+formatPolynomial(parsePolynomial(fg),true)+"$.","$g(f(x))="+formatPolynomial(parsePolynomial(gf),true)+"$.","The order changes the symbolic rule. Both are defined at every real input because the original rules are polynomials."],answerSummary:fields.map(field=>field.label+": $"+formatPolynomial(parsePolynomial(field.expected),true)+"$").join("; ")+"."});
  }
  if(familyId==="mth-compose-domain"){
    if(!["root-linear","reciprocal-root","root-reciprocal","root-square","square-root","canceled-reciprocal","restricted-inner"].includes(variant))throw new Error("Unknown composition domain");
    let rules:string,domain:Interval[],reason:string;
    const s=rng.integer(1,4),r=s+rng.integer(1,4);
    if(variant==="root-linear"){
      rules="$f(x)=\\sqrt{x}$ and $g(x)="+a+"(x-("+h+"))$";domain=a>0?[bounds(h,null,true)]:[bounds(null,h,false,true)];
      reason="The inner linear rule allows all real inputs, but its output must be nonnegative. Solve "+a+"(x - ("+h+")) >= 0, reversing direction if the coefficient is negative.";
    }else if(variant==="reciprocal-root"){
      rules="$f(x)=\\frac{1}{x-("+k+")}$ and $g(x)=\\sqrt{x-("+h+")}$";
      domain=k<0?[bounds(h,null,true)]:k===0?[bounds(h,null)]:[bounds(h,h+k*k,true,false),bounds(h+k*k,null)];
      reason="First require x >= "+h+". Next require sqrt(x - ("+h+")) != "+k+". A negative excluded outer input is never produced by the principal square root; a nonnegative one removes x = "+(h+k*k)+".";
    }else if(variant==="root-reciprocal"){
      rules="$f(x)=\\sqrt{x}$ and $g(x)=\\frac{"+a+"}{x-("+h+")}$";
      domain=a>0?[bounds(h,null)]:[bounds(null,h)];
      reason="The inner reciprocal excludes x = "+h+". Its nonzero output must be positive to enter the square root. Compare the signs of numerator and denominator.";
    }else if(variant==="root-square"){
      rules="$f(x)=\\sqrt{x}$ and $g(x)=(x-("+h+"))^2$";domain=all();
      reason="The square is defined and nonnegative for every real input. The output simplifies to |x - ("+h+")|, not x - ("+h+") on all of R.";
    }else if(variant==="square-root"){
      rules="$f(x)=x^2$ and $g(x)=\\sqrt{x-("+h+")}$";domain=[bounds(h,null,true)];
      reason="The inner square root requires x >= "+h+". Squaring its output gives x - ("+h+"), but simplification cannot restore excluded inputs.";
    }else if(variant==="canceled-reciprocal"){
      rules="$f(x)=1/x$ and $g(x)=1/(x-("+h+"))$";domain=[bounds(null,h),bounds(h,null)];
      reason="The inner reciprocal excludes x = "+h+" and never produces zero. The composite simplifies to x - ("+h+"), retaining the original hole.";
    }else{
      rules="$f(x)=\\sqrt{x}$ on [0, inf) and $g(x)=x^2-"+s*s+"$ with stated domain ["+(-r)+", "+r+"]";
      domain=[bounds(-r,-s,true,true),bounds(s,r,true,true)];
      reason="Require both -"+r+" <= x <= "+r+" and x^2 >= "+s*s+". Intersect the original input interval with the two outer-function admissible regions.";
    }
    return questionSchema.parse({...base,critical:true,category:"conceptual",parameters:{a,h,k,s,r},
      prompt:"Use "+rules+". Unless a narrower domain is stated, each function uses its full real domain. Give the complete domain of f(g(x)), preserving restrictions even if a formula simplifies.",
      fields:[interval("domain","Composition domain",domain)],
      hints:["Require x in the inner function's domain first.","Then require the actual inner output to belong to the outer function's domain.","The combined domain is "+formatIntervals(domain)+"."],
      explanation:[reason,"Domain: "+formatIntervals(domain)+".","These conditions apply together. The outside formula cannot repair an input rejected at the first stage."],answerSummary:formatIntervals(domain)+"."});
  }
  if(familyId==="mth-compose-structure"){
    if(!["operations","decompose","unit-order"].includes(variant))throw new Error("Unknown composition structure");
    const options=variant==="operations"?[
      {id:"compose",label:"$"+a+"(x^2+("+c+"))+("+b+")$",feedback:"Composition substitutes the inner output into the outer rule."},
      {id:"product",label:"$("+f+")("+g+")$",feedback:"This multiplies f(x) and g(x); it does not compose the functions."},
      {id:"sum",label:"$("+f+")+("+g+")$",feedback:"This adds outputs evaluated at the same input."},
      {id:"reverse",label:"$("+f+")^2+("+c+")$",feedback:"This is g(f(x)), which reverses the requested order."}
    ]:variant==="decompose"?[
      {id:"compose",label:"$g(x)=x^2+("+b+"),\\quad f(u)=\\sqrt{u}$",feedback:"The inner square-plus-constant is evaluated before the outer square root."},
      {id:"reverse",label:"$g(x)=\\sqrt{x},\\quad f(u)=u^2+("+b+")$",feedback:"This applies the square root first and produces x plus the constant only where the root exists."},
      {id:"product",label:"$g(x)=x^2,\\quad f(u)=\\sqrt{u}+("+b+")$",feedback:"Adding the constant outside the root gives a different rule."}
    ]:[
      {id:"compose",label:"g(f(t)): time to temperature to voltage",feedback:"The first output has the unit required by the second input."},
      {id:"reverse",label:"f(g(t)): time to voltage to temperature",feedback:"The stated g function expects temperature, not time, and f expects time, not voltage."},
      {id:"product",label:"f(t) times g(t)",feedback:"A product does not pass temperature into the voltage model, and g(t) uses the wrong input unit."}
    ];
    const prompt=variant==="operations"?"For $f(x)="+f+"$ and $g(x)="+g+"$, which expression is f(g(x)), rather than a sum or product?":variant==="decompose"?"Choose functions with $f(g(x))=\\sqrt{x^2+("+b+")}$, keeping the square-root restriction on the composite.":"A temperature model f maps time t in seconds to temperature in degrees C. A sensor model g maps temperature to voltage. Which composition gives voltage at time t? The models are compatible on the observed interval from 0 to "+(10+Math.abs(b))+" seconds.";
    return questionSchema.parse({...base,category:variant==="unit-order"?"application":"conceptual",parameters:{a,b,c},prompt,fields:[{id:"structure",kind:"choice",label:"Correct function structure",correct:"compose",options:rng.shuffle(options)}],
      hints:["Read the expression from the innermost operation outward.","The output of the first function must be a valid input to the second.","Choose the option that preserves the stated operation order and input type."],
      explanation:[options[0].feedback,"Composition and multiplication are different operations. A decomposition is valid only at inputs where both stages are defined."],answerSummary:options[0].label});
  }
  throw new Error("Unknown composition family");
}
