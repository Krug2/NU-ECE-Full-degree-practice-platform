import katex from "katex";
import "katex/dist/katex.min.css";

export function Equation({ children, display = false }: { children: string; display?: boolean }) {
  const html = katex.renderToString(children, { displayMode: display, output: "htmlAndMathml", trust: false, strict: "error", throwOnError: false, maxExpand: 100, maxSize: 10 });
  return <span className={display ? "equation display-equation" : "equation"} tabIndex={display ? 0 : undefined} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function MathText({ children }: { children: string }) {
  return <>{children.split(/(```python\n[\s\S]*?\n```|`[^`\n]+`|\$[^$]+\$)/g).map((part,index) =>
    part.startsWith("```python\n") && part.endsWith("\n```") ?
      <span key={index} className="learning-code-block" tabIndex={0} role="region" aria-label="Python code"><code>{part.slice(10,-4)}</code></span> :
    part.startsWith("`") && part.endsWith("`") ?
      <code key={index}>{part.slice(1,-1)}</code> :
    part.startsWith("$") && part.endsWith("$") ? <Equation key={index}>{part.slice(1,-1)}</Equation> : <span key={index}>{part}</span>
  )}</>;
}
