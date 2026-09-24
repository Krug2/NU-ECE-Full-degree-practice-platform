import type { Question } from "../lib/learning/contracts";
import { formatIntervals } from "../lib/learning/intervals";

export function refresherAnswers(question: Question): Record<string, string> {
  return Object.fromEntries(question.fields.map(field => {
    if (field.kind === "choice") return [field.id, field.correct];
    if (field.kind === "intervals") return [field.id, formatIntervals(field.expected)];
    if (field.kind === "roots") return [field.id, field.expected.join(",") || "none"];
    if (field.kind === "pi-multiple") return [field.id, `(${field.expected})*pi`];
    if (field.kind === "polynomial" && field.form === "factored") {
      const prefix = field.id.match(/^p\d+-/)?.[0] ?? "";
      const parameter = (id: string) => question.parameters[prefix+id];
      const a = parameter("a"), b = parameter("b"), d = parameter("d"), g = parameter("g"), power = parameter("power");
      return [field.id, g !== undefined ? `${g}*x^${power}*(${a}x+(${b}))` : `(${a}x+(${b}))*(x+(${d}))`];
    }
    return [field.id, String(field.expected)];
  }));
}
