import { equalExact,parseExact,type ExactNumber } from "./exact-number";

export function parseRootList(input:string):ExactNumber[]{
  const source=input.trim().replace(/^\{(.*)\}$/,"$1").trim();
  if(["empty","none","∅",""].includes(source.toLowerCase()))return [];
  if(source.length>500)throw new Error("Use at most 500 characters for the root list.");
  const entries=source.split(/[,;]/);
  if(entries.length>12)throw new Error("Enter at most twelve roots, including repetitions.");
  return entries.map(parseExact);
}
export function equalRootLists(actual:ExactNumber[],expected:ExactNumber[]):boolean{
  if(actual.length!==expected.length)return false;
  const remaining=expected.slice();
  for(const root of actual){
    const index=remaining.findIndex(value=>equalExact(value,root));
    if(index<0)return false;
    remaining.splice(index,1);
  }
  return true;
}
