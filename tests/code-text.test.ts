import { expect,it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MathText } from "../components/learning/math-text";
it("preserves Python indentation and escapes code without interpreting math or markup",()=>{
 const code='if x < 3:\n    print("<script>$x$</script>")';
 const html=renderToStaticMarkup(createElement(MathText,{children:"Before\n```python\n"+code+"\n```\nAfter `x == 3` and $x^2$"}));
 expect(html).toContain('tabindex="0"');expect(html).toContain('aria-label="Python code"');expect(html).toContain('    print(&quot;&lt;script&gt;$x$&lt;/script&gt;&quot;)');expect(html).not.toContain("<script>");expect(html).toContain("<code>x == 3</code>");expect(html).toContain('class="katex"');
});

