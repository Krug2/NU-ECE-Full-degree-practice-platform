import { questionSchema } from "../contracts";
import { randomFrom } from "../random";

export const phs231VectorVariants = {
  "phs231-vector-components": ["sum", "displacement", "unit", "planar", "zero"],
  "phs231-vector-products": ["dot", "cross", "projection", "order"],
} as const;
export const phs231VectorFamilyIds = Object.keys(phs231VectorVariants);
const display = (v: number[]) => `(${v.join(", ")})`;
const exact = (id: string, label: string, expected: string, unit = "") => ({ id, label, kind: "exact", expected, unit, help: "Enter an exact value. Fractions and sqrt(...) are accepted; omit the labeled unit." });

export function phs231VectorQuestion(familyId: string, variant: string, seed: string, id: string) {
  const variants=phs231VectorVariants[familyId as keyof typeof phs231VectorVariants];
  if(!variants || !(variants as readonly string[]).includes(variant))throw Error("Unknown PHS 231 vector family or variant.");
  const rng=randomFrom(`${familyId}:${variant}:${seed}`);
  const a=[rng.integer(-5,5),rng.integer(-5,5),rng.integer(-5,5)];
  const b=[rng.integer(-5,5),rng.integer(-5,5),rng.integer(-5,5)];
  if(variant==="unit"&&a.reduce((s,n)=>s+n*n,0)===0)a[0]=1;
  if(variant==="projection"&&b.reduce((s,n)=>s+n*n,0)===0)b[1]=1;
  if(variant==="planar"){a[2]=0;if(a[0]===0&&a[1]===0)a[1]=1;}
  if(variant==="zero")for(let i=0;i<3;i++)b[i]=-a[i];
  const parameters={ax:a[0],ay:a[1],az:a[2],bx:b[0],by:b[1],bz:b[2]};
  const base={id,familyId,familyVersion:1,courseId:"phs-231",objectiveId:"m01-l02",category:"procedural",critical:true,parameters};
  const magnitudeSquared=a.reduce((n,v)=>n+v*v,0),bSquared=b.reduce((n,v)=>n+v*v,0);
  const components=(v:number[],unit:string)=>v.map((n,i)=>exact(["x","y","z"][i],`${["x","y","z"][i]} component`,String(n),unit));
  const choice=(id:string,label:string,correct:string,options:{id:string;label:string;feedback:string}[])=>({id,label,kind:"choice",correct,options:rng.shuffle(options)});
  if(familyId==="phs231-vector-components"){
    if(variant==="unit")return questionSchema.parse({...base,
      prompt:`A displacement vector has Cartesian components ${display(a)} m. Find its magnitude and the three components of a unit vector in the same direction, in a right-handed orthonormal coordinate system.`,
      fields:[exact("magnitude","Displacement magnitude",`sqrt(${magnitudeSquared})`,"m"),...a.map((n,i)=>exact(["x","y","z"][i],`Unit direction ${["x","y","z"][i]} component`,`${n}/sqrt(${magnitudeSquared})`))],
      hints:["Square each Cartesian component, add, and take the nonnegative square root.","Divide every original component by that same nonzero magnitude; retain each component's sign.",`The magnitude is sqrt(${magnitudeSquared}) m. Divide ${display(a)} by sqrt(${magnitudeSquared}).`],
      explanation:[`The squared length is ${a.map(n=>`(${n})²`).join(" + ")} = ${magnitudeSquared} m².`,`The magnitude is sqrt(${magnitudeSquared}) m and the unit direction is ${display(a)}/sqrt(${magnitudeSquared}).`,"The unit vector has dimensionless components; its squared components sum to 1. A zero vector would have no unique unit direction."],
      answerSummary:`Magnitude sqrt(${magnitudeSquared}) m; unit vector ${display(a)}/sqrt(${magnitudeSquared}).`});
    if(variant==="planar"){
      const angle=(Math.atan2(a[1],a[0])*180/Math.PI+360)%360;
      return questionSchema.parse({...base,category:"application",
        prompt:`A displacement in the xy plane is ${display(a)} m. Give its magnitude exactly and its direction counterclockwise from +x in degrees in the interval [0, 360). Give the angle to the nearest 0.01 degree.`,
        fields:[exact("magnitude","Displacement magnitude",`sqrt(${magnitudeSquared})`,"m"),{id:"angle",kind:"numeric",label:"Direction from +x",unit:"degrees",expected:angle,absoluteTolerance:.005,relativeTolerance:0,help:"Use [0, 360) degrees; accepted absolute error is 0.005 degree."}],
        hints:["Magnitude uses the sum of squared x and y components.","Identify the quadrant from the component signs. A one-argument arctangent alone can lose the quadrant.",`The quadrant-aware direction is approximately ${angle.toFixed(4)} degrees.`],
        explanation:[`Magnitude = sqrt(${magnitudeSquared}) m.`,`Using the signs of both components gives a direction of ${angle.toFixed(6)} degrees counterclockwise from +x.`,"Check that magnitude times cosine and sine of this direction reproduce the signed components. This angle convention uses the xy plane; a 3D vector needs more than one planar angle."],answerSummary:`Magnitude sqrt(${magnitudeSquared}) m; direction ${angle.toFixed(6)} degrees.`});
    }
    const displacement=variant==="displacement",sum=a.map((n,i)=>displacement?b[i]-n:n+b[i]),square=sum.reduce((n,v)=>n+v*v,0);
    return questionSchema.parse({...base,category:variant==="zero"?"conceptual":"application",
      prompt:displacement?`A sensor starts at position A=${display(a)} m and ends at B=${display(b)} m. Find the displacement from A to B and its magnitude. Axes are fixed and orthonormal.`:`Two successive displacement vectors are A=${display(a)} m and B=${display(b)} m. Find their vector sum and its magnitude.${variant==="zero"?" Does this resultant have a unique direction?":""}`,
      fields:[...components(sum,"m"),exact("magnitude","Resultant magnitude",`sqrt(${square})`,"m"),...(variant==="zero"?[choice("direction","Direction of the zero resultant","undefined",[
        {id:"undefined",label:"No unique direction",feedback:"The zero vector has zero length and cannot be normalized by division by its magnitude."},
        {id:"positive-x",label:"Along +x",feedback:"Zero x, y, and z components do not select the positive x axis."},
        {id:"negative-x",label:"Along -x",feedback:"A zero vector is neither a positive nor a negative displacement along an axis."},
      ])]:[])],
      hints:[displacement?"Displacement is final position minus initial position, component by component.":"Add corresponding components; do not add vector magnitudes.",`The resultant components are ${display(sum)} m.`,`Square and add the resultant components: the magnitude is sqrt(${square}) m.`],
      explanation:[displacement?`Subtracting A from B gives ${display(sum)} m. Adding this displacement to A recovers B.`:`Adding corresponding components gives ${display(sum)} m. Opposite components can cancel.`,`The squared magnitude is ${square} m², so the length is sqrt(${square}) m.`,variant==="zero"?"The resultant has no unique direction. The traveled path can still have positive length: opposite displacements cancel, not the path lengths.":"The length of the resultant is at most the sum of the separate lengths. A position depends on origin, while displacement between two fixed events does not change under a common origin shift."],
      answerSummary:`Components ${display(sum)} m; magnitude sqrt(${square}) m.${variant==="zero"?" Direction undefined.":""}`});
  }
  const dot=a.reduce((s,n,i)=>s+n*b[i],0);
  const cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  if(variant==="dot")return questionSchema.parse({...base,category:"application",
    prompt:`A constant force F=${display(b)} N acts during displacement Δr=${display(a)} m. The work is the scalar product F·Δr. Calculate the signed work and classify the result.`,
    fields:[exact("work","Signed work",String(dot),"J"),choice("type","Type of the dot-product result","scalar",[
      {id:"scalar",label:"A scalar, which may be positive, negative, or zero",feedback:"A dot product contracts matching components to one signed scalar. Work has units N m = J."},
      {id:"vector",label:"A vector perpendicular to both inputs",feedback:"That describes a nonzero cross product, not the scalar dot product."},
      {id:"positive",label:"A magnitude that must be positive",feedback:"Opposing force and displacement can give negative work; perpendicular inputs give zero."},
    ])],hints:["Multiply corresponding components, then add all three signed products.",`The products are ${a.map((n,i)=>n*b[i]).join(", ")} N m.`,`Their sum is ${dot} J.`],
    explanation:[`F·Δr = ${a.map((n,i)=>`(${b[i]})(${n})`).join(" + ")} = ${dot} J.`,"A dot product is a scalar. The sign distinguishes a force component helping the displacement from one opposing it.","Swapping the two vectors leaves the dot product unchanged. Zero dot product means orthogonality when both inputs are nonzero; it can also occur when one is zero."],answerSummary:`Work ${dot} J; scalar.`});
  if(variant==="projection")return questionSchema.parse({...base,
    prompt:`Displacement A=${display(a)} m is projected onto the direction represented by the nonzero dimensionless vector B=${display(b)}. Find the signed scalar projection A·B/|B|.`,
    fields:[exact("projection","Signed scalar projection",`${dot}/sqrt(${bSquared})`,"m")],
    hints:["Normalize B first, or divide the scalar product by its magnitude.",`A·B = ${dot} m, and |B| = sqrt(${bSquared}).`,`The scalar projection is ${dot}/sqrt(${bSquared}) m.`],
    explanation:[`The unit direction is B/sqrt(${bSquared}).`,`Taking its dot product with A gives ${dot}/sqrt(${bSquared}) m.`,"A negative scalar projection means a component opposite the selected direction. A vector projection would additionally multiply this scalar by the unit direction.","The absolute scalar projection cannot exceed |A|. Reversing B reverses the scalar projection without changing the geometric line."],answerSummary:`${dot}/sqrt(${bSquared}) m.`});
  const reverse=variant==="order",result=reverse?cross.map(n=>-n):cross;
  return questionSchema.parse({...base,category:reverse?"conceptual":"application",
    prompt:reverse?`In right-handed axes, A=${display(a)} and B=${display(b)} are dimensionless. Compute B×A, then state its relation to A×B.`:`A force F=${display(b)} N acts at position r=${display(a)} m relative to a pivot. In right-handed axes calculate torque τ=r×F, giving all three components.`,
    fields:[...components(result,reverse?"":"N m"),...(reverse?[choice("order","Effect of exchanging the operands","negative",[
      {id:"negative",label:"B cross A equals the negative of A cross B",feedback:"The cross product is antisymmetric, including when both results are zero."},
      {id:"same",label:"The result always stays the same",feedback:"Exchanging operands reverses the right-hand-rule direction. Only a zero cross product equals its own negative."},
      {id:"reciprocal",label:"The result becomes a reciprocal",feedback:"Vectors have no ordinary scalar-like division operation that gives this change."},
    ])]:[])],
    hints:["For U×V the x component is Uy Vz - Uz Vy; cycle x, y, z for the next components.",`A×B has components ${display(cross)}.`,reverse?`Reverse all signs to get B×A = ${display(result)}.`:"Keep the force and position in their stated order. Torque is r cross F."],
    explanation:[`A×B = (${a[1]}·${b[2]} - ${a[2]}·${b[1]}, ${a[2]}·${b[0]} - ${a[0]}·${b[2]}, ${a[0]}·${b[1]} - ${a[1]}·${b[0]}) = ${display(cross)}.`,reverse?`Antisymmetry gives B×A = ${display(result)}.`:`Therefore the torque vector is ${display(result)} N m.`,"Dot the result with each input: both checks give zero. This independently verifies perpendicularity, although it alone does not determine the correct sign or magnitude.","Torque and work share base dimensions but are different physical quantities. Label torque N m and work J to retain that distinction."],answerSummary:`${display(result)}${reverse?"; reverse sign relative to A cross B.":" N m."}`});
}
