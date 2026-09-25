import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { DataTableFigure } from "../components/learning/data-table-figure";
import { dataTableFigureSchema, questionFigureSchema } from "../lib/learning/figures";
import { createAttempt } from "../lib/learning/attempts";
import { lessonSchema } from "../lib/learning/contracts";
import { emptyProgress, parseBackup } from "../lib/progress";
import { assembleHistory, prepareHistory, readStoredAttempt } from "../lib/progress-records";
import lesson from "../content/lessons/mth-215/m01-l01.json";

const table = { kind: "data-table", title: "Recorded peaks", columns: ["Time (s)", "Position (m)"], rows: [["0", "0.080000"], ["2", "0.040000"]], note: "Printed precision: six decimal places. These are simulated values." };

it("requires a bounded rectangular table with distinct, nonempty column labels", () => {
  expect(questionFigureSchema.parse(table)).toEqual(table);
  for (const patch of [
    { columns: ["Time (s)", "Time (s)"] }, { columns: ["Time (s)", " "] }, { columns: ["Time (s)"] },
    { columns: Array.from({ length: 7 }, (_, i) => `Column ${i}`) }, { rows: [] }, { rows: [["0", "1", "2"]] },
    { rows: [["0", ""]] }, { rows: [["0", " "]] }, { rows: [["0", "x".repeat(161)]] },
    { rows: Array.from({ length: 25 }, () => ["0", "1"]) }, { note: "x".repeat(1001) }, { html: "<script>" },
  ]) expect(questionFigureSchema.safeParse({ ...table, ...patch }).success).toBe(false);
});

it("retains printed precision and units through backup import and the stored-history integrity checks", () => {
  const data = emptyProgress(), attempt = createAttempt(lessonSchema.parse(lesson), "practice", "table-backup");
  attempt.questions[0].figure = dataTableFigureSchema.parse(table);
  attempt.responses[attempt.questions[0].id] = { [attempt.questions[0].fields[0].id]: "3/4" };
  attempt.hints[attempt.questions[0].id] = 1;
  data.learning.attempts = [attempt];
  const restored = parseBackup(JSON.stringify(data));
  expect(restored).toEqual(data);
  const { index, records } = prepareHistory(restored, 4);
  const record = readStoredAttempt(records[0], index.attempts[0]);
  expect(assembleHistory(index, new Map([[attempt.id, record]])).data).toEqual(data);
  const corrupt = structuredClone(data);
  const figure = corrupt.learning.attempts[0].questions[0].figure;
  if (figure?.kind !== "data-table") throw Error("Missing table");
  figure.rows[0].push("unlabeled value");
  expect(() => parseBackup(JSON.stringify(corrupt))).toThrow("invalid progress");
  expect(parseBackup(JSON.stringify(data)).schemaVersion).toBe(2);
});

it("renders supplied text without interpreting HTML, with table headers and a keyboard focus target", () => {
  const figure = dataTableFigureSchema.parse({ ...table, rows: [["0", "<script>alert(1)</script>"], ["2", "<img src=x onerror=alert(1)>"]] });
  const html = renderToStaticMarkup(createElement(DataTableFigure, { figure }));
  expect(html).not.toContain("<script>"); expect(html).not.toContain("<img");
  expect(html).toContain("&lt;script&gt;"); expect(html).toContain('scope="col"'); expect(html).toContain('scope="row"');
  expect(html).toContain('<caption>Recorded peaks</caption>'); expect(html).toContain('tabindex="0"');
  expect(html).toContain('aria-label="Recorded peaks: scrollable table"');
});
