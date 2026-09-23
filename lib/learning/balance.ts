import { addRational, divideRational, equalRational, multiplyRational, negateRational, parseRational, type Rational } from "./rational";

export type BalanceState={leftX:Rational;leftConstant:Rational;rightX:Rational;rightConstant:Rational};
export type BalanceOperation="add"|"subtract"|"multiply"|"divide"|"subtract-x";
export function applyBalance(state:BalanceState,operation:BalanceOperation,input:string,side:"both"|"left"):BalanceState {
  if(side!=="both")throw new Error("Apply the operation to both sides to preserve the solution set.");
  const value=parseRational(input);
  if((operation==="multiply"||operation==="divide")&&value.numerator===0n)throw new Error(operation==="divide"?"Division by zero is undefined.":"Multiplying by zero erases the equation's information.");
  if(operation==="add"||operation==="subtract"){
    const amount=operation==="subtract"?negateRational(value):value;
    return {...state,leftConstant:addRational(state.leftConstant,amount),rightConstant:addRational(state.rightConstant,amount)};
  }
  if(operation==="subtract-x")return {...state,leftX:addRational(state.leftX,negateRational(value)),rightX:addRational(state.rightX,negateRational(value))};
  const fn=operation==="divide"?divideRational:multiplyRational;
  return Object.fromEntries(Object.entries(state).map(([key,number])=>[key,fn(number,value)])) as BalanceState;
}
export function balanceSolved(state:BalanceState){
  return equalRational(state.leftX,parseRational("1"))&&state.leftConstant.numerator===0n&&state.rightX.numerator===0n;
}
