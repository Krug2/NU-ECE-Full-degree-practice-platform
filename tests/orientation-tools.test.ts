import { expect,it } from "vitest";
import { calculatorCheck,entryCases,checkPrediction,createPracticeFile,comparePracticeFile } from "../lib/learning/refreshers/orientation-tools";
function sine(x:number){x=((x+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;let term=x,sum=x;for(let n=1;n<18;n++){term*= -x*x/((2*n)*(2*n+1));sum+=term;}return sum;}
it("matches independent series and exact angle benchmarks in both modes",()=>{
 for(let degrees=-360;degrees<=360;degrees+=5){const radians=degrees*Math.PI/180;expect(calculatorCheck("sin","degrees",degrees).result).toBeCloseTo(sine(radians),12);expect(calculatorCheck("cos","radians",radians).result).toBeCloseTo(sine(radians+Math.PI/2),12);}
 for(const [input,degrees] of[[-1,-90],[-.5,-30],[0,0],[.5,30],[1,90]]){expect(calculatorCheck("asin","degrees",input).result).toBeCloseTo(degrees,12);expect(calculatorCheck("asin","radians",input).result).toBeCloseTo(degrees*Math.PI/180,12);}
 expect(calculatorCheck("sin","degrees",30).result).toBeCloseTo(.5,12);expect(calculatorCheck("sin","radians",30).result).toBeCloseTo(-.988031624,8);
 expect(()=>calculatorCheck("asin","radians",30)).toThrow("between -1 and 1");expect(()=>calculatorCheck("sin","degrees",NaN)).toThrow("finite");
});
it("keeps explicit entry conventions and rejects invalid prediction strings",()=>{
 expect(entryCases.map(c=>c.result)).toEqual([2,10,-9,9,1/400,72000]);
 for(const invalid of[""," ","NaN","Infinity","0x10","1/2","2oops","1e999"])expect(checkPrediction(invalid,2)).toContain("finite");
 expect(checkPrediction("2.5e-3",.0025)).toContain("agrees");expect(checkPrediction("10",2)).toContain("differs");
});
it("verifies file content independent of JSON formatting and rejects wrong or unsafe inputs",()=>{
 const expected=createPracticeFile("A marker note to reopen.",2,"orientation-example-7");
 expect(comparePracticeFile(JSON.stringify({note:expected.note,marker:expected.marker,revision:2,format:expected.format},null,4),expected)).toEqual(expected);
 expect(()=>comparePracticeFile(JSON.stringify({...expected,note:expected.note+" "}),expected)).toThrow("note content differs");
 for(const [change,message] of[[{marker:"orientation-older"},"different practice round"],[{revision:1},"revision differs"],[{note:"A different saved note."},"note content differs"]] as const)expect(()=>comparePracticeFile(JSON.stringify({...expected,...change}),expected)).toThrow(message);
 expect(()=>comparePracticeFile("{broken",expected)).toThrow("not readable JSON");expect(()=>comparePracticeFile(JSON.stringify({schemaVersion:2}),expected)).toThrow("practice-file format");
 expect(()=>comparePracticeFile(" ".repeat(20001),expected)).toThrow("20 KB");expect(()=>createPracticeFile("short",1,"orientation-a")).toThrow();
 expect(()=>comparePracticeFile(JSON.stringify({...expected,extra:"unexpected"}),expected)).toThrow("practice-file format");
});
